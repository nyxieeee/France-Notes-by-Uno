import { useState, useRef, useEffect, useCallback } from 'react'
import { Microphone as Mic, MicrophoneSlash as MicOff, PaperPlaneRight as Send, User, CircleNotch as Loader2, ShieldWarning as ShieldAlert, SpeakerHigh as Volume2, Headphones, Check, ArrowUpRight, Warning, ArrowLeft, StopCircle, ArrowClockwise, Target, WarningCircle as WarningCircleIcon } from '@phosphor-icons/react'
import { useSimulationStore } from '@/stores/simulationStore'
import { useAuthStore } from '@/stores/authStore'
import { generateChatCompletion } from '@/lib/ai'
import { getRecitationPrompt, getRetDemPrompt, weakPointsBrief } from '@/lib/simulationPrompts'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import MarkdownText from '@/components/shared/MarkdownText'
import { usePersonalization } from '@/hooks/usePersonalization'
import { speakLong, stopPlayback, unlockAudio } from '@/lib/elevenLabsTts'
import { motion } from 'framer-motion'
import { toast, confirmDialog } from '@/stores/feedbackStore'

// Pause after she stops talking before her spoken answer is sent
const AUTO_SEND_MS = 3500

let lastStartedSessionId = '';

export function SimulationEngine() {
  const { isEvaluating } = useSimulationStore()

  if (isEvaluating) return <SimulationReport />
  return <SimulationSession />
}

function SimulationSession() {
  const { isFrance, aiAssistantName } = usePersonalization()
  const { activeMode, topic, difficulty, messages, addMessage, endSession, gradeSession, sourceName, reset } = useSimulationStore()
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [voiceMode, setVoiceMode] = useState(true)
  // Set when iOS refused to play the reply aloud; shows a "Tap to hear" button
  const [blockedReply, setBlockedReply] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spokenIdsRef = useRef<Set<string>>(new Set())
  const speechRunRef = useRef(0)
  // True from when she starts answering until she sends or stops; Safari ends recognition on
  // its own after a pause, so we restart it while this is set
  const wantListeningRef = useRef(false)
  // When the spoken answer will be sent automatically (shown as a countdown)
  const [autoSendAt, setAutoSendAt] = useState<number | null>(null)
  // Set when a reply couldn't be fetched; shows a retry instead of a fake examiner message
  const [turnFailed, setTurnFailed] = useState<{ isFirst: boolean } | null>(null)

  // Speech-recognition callbacks are registered once, so they read live values through refs
  const voiceModeRef = useRef(voiceMode)
  const listeningRef = useRef(false)
  const busyRef = useRef(false)
  const inputRef = useRef('')
  const doSendRef = useRef<(text: string) => void>(() => {})
  useEffect(() => { voiceModeRef.current = voiceMode }, [voiceMode])
  useEffect(() => { inputRef.current = input }, [input])
  useEffect(() => { busyRef.current = isTyping || isSpeaking }, [isTyping, isSpeaking])

  const speechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  const speaker = isFrance ? 'DOC_UNO' : 'NURSE_FLORENCE'

  const setListening = (value: boolean) => {
    listeningRef.current = value
    setIsListening(value)
  }

  const cancelAutoSend = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    setAutoSendAt(null)
  }, [])

  const stopVoiceRecognition = useCallback(() => {
    wantListeningRef.current = false
    cancelAutoSend()
    // Always stop, whatever React state says, so the mic never hears the AI's own voice
    try { recognitionRef.current?.stop() } catch { /* not running */ }
    setListening(false)
    setInterimText('')
  }, [cancelAutoSend])

  const startVoiceRecognition = useCallback(() => {
    if (!recognitionRef.current || listeningRef.current || busyRef.current) return
    wantListeningRef.current = true
    try {
      setInterimText('')
      recognitionRef.current.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }, [])

  const speakMessage = useCallback(async (text: string) => {
    stopVoiceRecognition()
    stopPlayback()
    const run = ++speechRunRef.current
    setBlockedReply(null)
    setIsSpeaking(true)
    busyRef.current = true
    const result = await speakLong(text, speaker, 1, () => speechRunRef.current === run)
    if (speechRunRef.current !== run) return
    setIsSpeaking(false)
    busyRef.current = false
    if (result === 'blocked') {
      setBlockedReply(text)
      return
    }
    // Hands-free: listen for the answer once the reply has finished
    if (result === 'ended' && voiceModeRef.current) startVoiceRecognition()
  }, [speaker, startVoiceRecognition, stopVoiceRecognition])

  const runTurn = useCallback(async (isFirst = false) => {
    setTurnFailed(null)
    setIsTyping(true)
    try {
      const currentStore = useSimulationStore.getState()
      const systemPrompt = activeMode === 'recitation'
        ? getRecitationPrompt(topic!, difficulty, currentStore.sourceText || undefined)
        : getRetDemPrompt(topic!, difficulty, currentStore.sourceText || undefined)

      const chatHistory: { role: 'system' | 'user' | 'assistant', content: string }[] = currentStore.messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content
      }))
      // Spoken replies need to be short; a long monologue is tiring to listen to
      const spoken = voiceModeRef.current
        ? '\n\nVOICE MODE: Your reply is read aloud. Keep every turn to at most 3 short sentences (about 60 words), ask exactly ONE question, and never use lists, headings or symbols.'
        : ''
      chatHistory.unshift({ role: 'system', content: systemPrompt + spoken })
      // The AI needs the conversation to end with the student; the opening turn has nothing yet
      if (isFirst || !chatHistory.some(m => m.role === 'user')) {
        chatHistory.push({ role: 'user', content: 'I am ready. Please greet me briefly and ask your first question.' })
      }

      const response = await generateChatCompletion(chatHistory, 'recitation')
      if (!response || !response.trim()) throw new Error('Empty response received from the AI.')

      const cleanedResponse = response
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\((?:waiting|smiles|giggles|nods|sighs|chuckles|pauses)[^)]*\)/gi, '')
        .replace(/\*(?:smiles|giggles|nods|sighs|chuckles|pauses)\*/gi, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim()

      addMessage('assistant', cleanedResponse)
    } catch (e) {
      console.error('Chat API failure:', e)
      // Not added to the conversation: a fake reply would be graded and sent back to the AI
      setTurnFailed({ isFirst })
    } finally {
      setIsTyping(false)
    }
  }, [activeMode, topic, difficulty, addMessage])

  const doSend = useCallback((text: string) => {
    if (!text.trim()) return
    stopVoiceRecognition()
    inputRef.current = ''
    addMessage('user', text.trim())
    setInput('')
    setInterimText('')
    runTurn()
  }, [addMessage, runTurn, stopVoiceRecognition])
  useEffect(() => { doSendRef.current = doSend }, [doSend])

  // Init speech recognition + first message trigger
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          } else {
            interimTranscript += event.results[i][0].transcript
          }
        }
        setInterimText(interimTranscript)
        // Still talking: hold off sending
        if (interimTranscript && silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = null
          setAutoSendAt(null)
        }
        if (finalTranscript) {
          const textSoFar = `${inputRef.current} ${finalTranscript.trim()}`.trim()
          inputRef.current = textSoFar
          setInput(textSoFar)
          // Voice mode sends after a real pause; with voice off, dictation only fills the box
          if (voiceModeRef.current) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
            setAutoSendAt(Date.now())
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null
              setAutoSendAt(null)
              if (inputRef.current.trim()) doSendRef.current(inputRef.current)
            }, AUTO_SEND_MS)
          }
        }
      }

      recognition.onerror = (event: any) => {
        if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
          wantListeningRef.current = false
          toast('Allow microphone access for this site to answer out loud.', 'error')
        }
        setInterimText('')
      }
      recognition.onend = () => {
        setInterimText('')
        // Safari stops after a pause; keep listening until she sends or taps stop
        if (wantListeningRef.current && !busyRef.current) {
          setTimeout(() => {
            if (!wantListeningRef.current || busyRef.current) return
            try { recognition.start() } catch { /* already running */ }
          }, 150)
          return
        }
        setListening(false)
      }
    }

    const currentSessionId = useSimulationStore.getState().sessionId || '';
    if (messages.length === 0 && topic && lastStartedSessionId !== currentSessionId) {
      lastStartedSessionId = currentSessionId;
      runTurn(true);
    }
  }, [])

  // Speak new assistant messages in voice mode
  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant' || spokenIdsRef.current.has(lastMsg.id) || !voiceMode) return
    spokenIdsRef.current.add(lastMsg.id)
    speakMessage(lastMsg.content)
  }, [messages, voiceMode, speakMessage])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechRunRef.current++
      stopVoiceRecognition()
      stopPlayback()
    }
  }, [stopVoiceRecognition])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const toggleListen = () => {
    unlockAudio()
    if (isListening) {
      stopVoiceRecognition()
      return
    }
    if (!recognitionRef.current) {
      toast('Voice input isn\'t supported in this browser. You can type your answer instead.', 'info')
      return
    }
    // Talking over the AI interrupts it
    speechRunRef.current++
    stopPlayback()
    setIsSpeaking(false)
    busyRef.current = isTyping
    setBlockedReply(null)
    setInput('')
    inputRef.current = ''
    setInterimText('')
    cancelAutoSend()
    wantListeningRef.current = true
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch {
      // Already running: treat the tap as "stop"
      stopVoiceRecognition()
    }
  }

  const toggleVoiceMode = () => {
    unlockAudio()
    if (voiceMode) {
      speechRunRef.current++
      stopPlayback()
      setIsSpeaking(false)
      busyRef.current = isTyping
      setBlockedReply(null)
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    }
    setVoiceMode(v => !v)
  }

  const handleSend = () => {
    unlockAudio()
    doSend(input)
  }

  // Leave without grading, back to the setup screen she came from
  const handleLeave = async () => {
    const hasAnswers = messages.some(m => m.role === 'user')
    if (hasAnswers && !(await confirmDialog({ title: 'Leave this session?', message: "Your answers so far won't be graded. Use End & grade if you want a score.", confirmLabel: 'Leave', danger: true }))) return
    stopPlayback()
    reset()
  }

  const handleEnd = () => {
    endSession()
    gradeSession()
  }

  const assistantAvatar = isFrance ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'
  const modeLabel = activeMode === 'recitation' ? difficulty.replace('_', ' ') : 'Clinical instructor'

  return (
    <div className="page-container max-w-4xl h-[calc(100dvh-80px)] flex flex-col pb-24 lg:pb-6">
      {/* Session header */}
      <div className="fn-card px-4 py-3 mb-3 flex items-center gap-3">
        <button onClick={handleLeave} className="btn-icon p-2 -ml-1.5 shrink-0" aria-label="Leave session" title="Leave session">
          <ArrowLeft size={18} />
        </button>
        <div className="relative shrink-0">
          <img src={assistantAvatar} alt={aiAssistantName} className="w-11 h-11 rounded-full object-cover border border-th-pink/20" />
          <span className={cn('absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--card)]', isSpeaking || isTyping ? 'bg-[var(--pink)] animate-pulse' : 'bg-[var(--success)]')} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-medium text-[var(--pink)]">{activeMode === 'recitation' ? 'Live recitation' : 'RetDem practice'}</p>
          <h2 className="font-heading font-semibold text-[15px] leading-tight truncate">{sourceName || topic}</h2>
          <p className="text-[11.5px] text-[var(--text-secondary)] capitalize">{modeLabel}</p>
        </div>
        {('speechSynthesis' in window || 'webkitSpeechRecognition' in window) && (
          <button
            onClick={toggleVoiceMode}
            className={cn(
              'flex text-[12.5px] font-medium p-2 sm:px-3 sm:py-1.5 rounded-full transition-colors items-center gap-1.5 border shrink-0',
              voiceMode ? 'bg-[var(--rose-soft)] text-[var(--pink)] border-th-pink/20' : 'text-[var(--text-secondary)] border-[var(--border)]'
            )}
            aria-pressed={voiceMode}
            aria-label={voiceMode ? 'Turn voice off' : 'Turn voice on'}
          >
            <Headphones size={14} weight={voiceMode ? 'fill' : 'regular'} />
            <span className="hidden sm:inline">{voiceMode ? 'Voice on' : 'Voice off'}</span>
          </button>
        )}
        <button onClick={handleEnd} className="text-[13px] font-medium text-[var(--error)] border border-th-error/20 hover:bg-th-error/5 px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5 shrink-0">
          <StopCircle size={15} /> <span className="hidden sm:inline">End &amp; grade</span><span className="sm:hidden">End</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar fn-card p-4 sm:p-6 space-y-5">
        {/* Session brief: what's being tested and how it's scored */}
        <div className="rounded-xl bg-[var(--rose-soft)] border border-th-pink/15 p-4">
          <p className="text-[12px] font-medium text-[var(--pink)] mb-1.5">
            {sourceName?.startsWith('Weak points') ? 'Focused review of what you missed last time' : activeMode === 'retdem' ? 'Return demonstration' : 'Oral recitation'}
          </p>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            {activeMode === 'retdem'
              ? 'Talk through each step as if you were performing it, and give the rationale. '
              : 'Answer the way you would to your clinical instructor, and explain your reasoning. '}
            You'll be scored on <strong className="text-[var(--text)]">accuracy</strong>, <strong className="text-[var(--text)]">safety</strong>, <strong className="text-[var(--text)]">reasoning</strong> and <strong className="text-[var(--text)]">confidence</strong>. Tap <strong className="text-[var(--text)]">End &amp; grade</strong> whenever you're ready for feedback.
          </p>
        </div>
        {messages.map(m => (
          <div key={m.id} className={cn('flex gap-3 max-w-[88%] sm:max-w-[80%]', m.role === 'user' ? 'ml-auto flex-row-reverse' : '')}>
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-th-pink/15">
              {m.role === 'user' ? (
                user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--rose-soft)] text-[var(--pink)] font-semibold text-sm">
                    {user?.full_name ? user.full_name.charAt(0) : <User size={16} />}
                  </div>
                )
              ) : (
                <img src={assistantAvatar} alt={aiAssistantName} className="w-full h-full object-cover" />
              )}
            </div>
            <div className={cn('px-4 py-3 rounded-2xl text-[14px] leading-relaxed min-w-0', m.role === 'user' ? 'bg-[var(--pink)] text-white rounded-tr-md' : 'bg-[var(--rose-soft)] rounded-tl-md')}>
              <MarkdownText content={m.content} className={m.role === 'user' ? 'text-white' : undefined} />
            </div>
          </div>
        ))}
        {turnFailed && !isTyping && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-th-error/25 bg-th-error/5 text-[13px]">
            <WarningCircleIcon size={18} className="text-[var(--error)] shrink-0" />
            <p className="flex-1 text-[var(--text-secondary)]">{aiAssistantName} couldn't be reached. Check your connection, then try again.</p>
            <button onClick={() => runTurn(turnFailed.isFirst)} className="btn-primary px-4 py-1.5 text-xs shrink-0">Try again</button>
          </div>
        )}
        {isTyping && (
          <div className="flex gap-3">
            <img src={assistantAvatar} alt={aiAssistantName} className="w-8 h-8 rounded-full object-cover shrink-0 border border-th-pink/15" />
            <div className="px-4 py-3.5 rounded-2xl bg-[var(--rose-soft)] rounded-tl-md flex items-center gap-1">
              {[0, 0.2, 0.4].map(d => <span key={d} className="w-2 h-2 rounded-full bg-[var(--pink)] animate-bounce" style={{ animationDelay: `${d}s` }} />)}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice status */}
      <div className="min-h-[44px] flex items-center px-1 text-[12.5px] text-[var(--text-secondary)]">
        {autoSendAt && isListening ? (
          <div className="w-full flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="flex items-center gap-1.5 text-[var(--text)]"><Send size={13} className="text-[var(--pink)]" /> Sending your answer… keep talking to add more</p>
              <div className="mt-1.5 h-1 rounded-full bg-th-pink/15 overflow-hidden">
                <motion.div key={autoSendAt} className="h-full bg-[var(--pink)] rounded-full" initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: AUTO_SEND_MS / 1000, ease: 'linear' }} />
              </div>
            </div>
            <button onClick={cancelAutoSend} className="px-3 py-1.5 rounded-full border border-[var(--border)] text-[12px] font-medium hover:bg-[var(--rose-soft)] shrink-0">Not yet</button>
            <button onClick={() => doSend(inputRef.current)} className="px-3 py-1.5 rounded-full bg-[var(--pink)] text-white text-[12px] font-medium shrink-0">Send now</button>
          </div>
        ) : blockedReply && !isSpeaking ? (
          <button
            onClick={() => { unlockAudio(); speakMessage(blockedReply) }}
            className="flex items-center gap-1.5 text-[var(--pink)] font-medium hover:underline"
          >
            <Volume2 size={15} /> Tap to hear {aiAssistantName}&rsquo;s reply
          </button>
        ) : isSpeaking ? (
          <span className="flex items-center gap-1.5 text-[var(--pink)]"><Volume2 size={15} className="animate-pulse" /> {aiAssistantName} is speaking · tap the mic to answer</span>
        ) : isListening ? (
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="relative flex w-2.5 h-2.5 shrink-0"><span className="absolute inset-0 rounded-full bg-[var(--success)] animate-ping opacity-60" /><span className="relative w-2.5 h-2.5 rounded-full bg-[var(--success)]" /></span>
            <span className="shrink-0">Listening, take your time</span>
            {interimText && <span className="italic truncate">&ldquo;{interimText}&rdquo;</span>}
          </span>
        ) : isTyping ? (
          <span className="flex items-center gap-1.5"><Loader2 size={15} className="animate-spin text-[var(--pink)]" /> {aiAssistantName} is thinking</span>
        ) : (
          <span>{voiceMode && speechSupported ? 'Tap the mic and answer out loud. It sends after you pause, or type below.' : 'Type your answer below.'}</span>
        )}
      </div>

      {/* Composer */}
      <div className="fn-card p-2 flex items-end gap-2">
        <button
          onClick={toggleListen}
          aria-label={!speechSupported ? 'Voice input not supported in this browser' : isListening ? 'Stop listening' : 'Start speaking'}
          title={!speechSupported ? 'Voice input isn\'t supported in this browser' : undefined}
          aria-disabled={!speechSupported}
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors',
            !speechSupported ? 'bg-[var(--bg)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed'
              : isListening ? 'bg-[var(--error)] text-white animate-pulse' : 'bg-[var(--rose-soft)] text-[var(--pink)] hover:bg-th-pink/20'
          )}
        >
          {isListening || !speechSupported ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <div className="flex-1 relative">
          <textarea
            value={input + (isListening && interimText && !input ? interimText : '')}
            onChange={(e) => { cancelAutoSend(); setInput(e.target.value); inputRef.current = e.target.value }}
            placeholder={isListening ? 'Speak now...' : voiceMode ? 'Speak or type your answer...' : 'Type your response here...'}
            className="w-full bg-transparent px-2 py-2.5 text-[15px] outline-none resize-none block max-h-32"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          {isListening && interimText && !input && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5">
              {[3, 4, 2].map((h, i) => <span key={i} className="w-1 bg-[var(--pink)] rounded-full animate-pulse" style={{ height: h * 4, animationDelay: `${i * 0.2}s` }} />)}
            </div>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={(!input.trim() && !isListening) || isTyping}
          aria-label="Send answer"
          className="w-11 h-11 rounded-xl bg-[var(--pink)] text-white flex items-center justify-center disabled:opacity-40 shrink-0 transition-opacity"
        >
          <Send size={18} weight="fill" />
        </button>
      </div>
    </div>
  )
}

function SimulationReport() {
  const { isFrance, aiAssistantName } = usePersonalization()
  const { scores, feedback, reset, gradingFailed, gradeSession, topic, sourceName, sourceText, difficulty, activeMode, startSession } = useSimulationStore()
  const navigate = useNavigate()
  const examinerName = isFrance ? 'Doc Uno' : aiAssistantName
  const examinerAvatar = isFrance ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'

  if (gradingFailed) {
    return (
      <div className="page-container flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center mb-4">
          <ShieldAlert size={30} weight="duotone" />
        </div>
        <h2 className="font-heading text-xl font-semibold">Couldn't grade this session</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-sm">
          {examinerName} couldn't finish the evaluation. Your conversation is still here, so try grading again.
        </p>
        <div className="flex gap-2 mt-6">
          <button onClick={() => gradeSession()} className="btn-primary px-6 py-2.5 text-sm">Try grading again</button>
          <button onClick={reset} className="btn-secondary px-6 py-2.5 text-sm">Back to hub</button>
        </div>
      </div>
    )
  }

  if (!scores || !feedback) {
    return (
      <div className="page-container flex flex-col items-center justify-center h-[55vh] text-center">
        <div className="relative mb-5">
          <img src={examinerAvatar} alt={examinerName} className="w-20 h-20 rounded-full object-cover border-2 border-th-pink/20" />
          <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center">
            <Loader2 size={18} className="animate-spin text-[var(--pink)]" />
          </span>
        </div>
        <h2 className="font-heading font-semibold text-lg">Grading your session</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{examinerName} is reviewing your answers for accuracy, safety, reasoning and confidence.</p>
      </div>
    )
  }

  const overall = Math.round((scores.accuracy + scores.safety + scores.reasoning + scores.confidence) / 4)
  const verdict = overall >= 85 ? 'Excellent work' : overall >= 70 ? 'Solid performance' : overall >= 50 ? 'Getting there' : 'Keep practicing'

  return (
    <div className="page-container max-w-4xl pb-20">
      <button onClick={reset} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--pink)] mb-4">
        <ArrowLeft size={15} /> Simulation hub
      </button>

      {/* Overall */}
      <section className="fn-card p-5 sm:p-6 mb-5 flex flex-col sm:flex-row sm:items-center gap-5">
        <ScoreRing value={overall} />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-[var(--pink)]">Performance evaluation</p>
          <h1 className="font-heading font-semibold text-2xl">{verdict}</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 truncate">{sourceName || topic}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:w-[260px] shrink-0">
          <ScoreBar label="Accuracy" score={scores.accuracy} />
          <ScoreBar label="Safety" score={scores.safety} />
          <ScoreBar label="Reasoning" score={scores.reasoning} />
          <ScoreBar label="Confidence" score={scores.confidence} />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FeedbackList title="What you did right" icon={Check} tone="success" items={feedback.correct} />
        <FeedbackList title="Areas to improve" icon={ArrowUpRight} tone="warning" items={feedback.missed} />
        {feedback.safetyViolations.length > 0 && (
          <div className="md:col-span-2">
            <FeedbackList title="Critical safety violations" icon={Warning} tone="error" items={feedback.safetyViolations} />
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row justify-center gap-2">
        <button
          onClick={() => { unlockAudio(); startSession(activeMode, topic || 'General Nursing', difficulty, sourceText, sourceName) }}
          className="btn-primary px-6 py-3 text-sm flex items-center justify-center gap-2"
        >
          <ArrowClockwise size={16} /> Practice again
        </button>
        {(feedback.missed.length > 0 || feedback.safetyViolations.length > 0) && (
          <button
            onClick={() => {
              unlockAudio()
              startSession('recitation', topic || 'General Nursing', difficulty, weakPointsBrief(topic || 'General Nursing', feedback), `Weak points: ${sourceName || topic || 'review'}`)
              navigate('/recitation')
            }}
            className="btn-secondary px-6 py-3 text-sm flex items-center justify-center gap-2"
          >
            <Target size={16} /> Drill my weak points
          </button>
        )}
        <button onClick={reset} className="btn-secondary px-6 py-3 text-sm">Back to hub</button>
      </div>
    </div>
  )
}

export function ScoreRing({ value }: { value: number }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-th-pink/15" />
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" strokeLinecap="round" stroke="var(--pink)" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold leading-none">{value}</span>
        <span className="text-[10.5px] text-[var(--text-secondary)]">overall</span>
      </div>
    </div>
  )
}

export function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex justify-between text-[12px] mb-1">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-semibold">{score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-th-pink/15 overflow-hidden">
        <div className="h-full rounded-full bg-[var(--pink)]" style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

const TONES = {
  success: { text: 'text-[var(--success)]', chip: 'bg-th-success/15 text-[var(--success)]' },
  warning: { text: 'text-[var(--warning)]', chip: 'bg-th-warning/15 text-[var(--warning)]' },
  error: { text: 'text-[var(--error)]', chip: 'bg-th-error/10 text-[var(--error)]' },
}

export function FeedbackList({ title, icon: ToneIcon, tone, items }: { title: string; icon: typeof Check; tone: keyof typeof TONES; items: string[] }) {
  return (
    <section className={cn('fn-card p-5', tone === 'error' && 'border-th-error/30')}>
      <h3 className={cn('font-heading font-semibold text-[15px] mb-3', tone === 'error' && TONES.error.text)}>{title}</h3>
      {items.length === 0 ? (
        <p className="text-[13px] text-[var(--text-secondary)]">Nothing noted here.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((f, i) => (
            <li key={i} className="text-[13.5px] leading-relaxed flex items-start gap-2.5">
              <span className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5', TONES[tone].chip)}><ToneIcon size={12} weight="bold" /></span>
              <span className={tone === 'error' ? TONES.error.text : 'text-[var(--text-secondary)]'}>{f}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
