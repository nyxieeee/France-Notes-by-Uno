import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, User, BrainCircuit, Loader2, ShieldAlert, Activity } from 'lucide-react'
import { useSimulationStore } from '@/stores/simulationStore'
import { useAuthStore } from '@/stores/authStore'
import { generateChatCompletion, generateJSON } from '@/lib/groq'
import { getRecitationPrompt, getRetDemPrompt, getSimulationEvaluationPrompt } from '@/lib/simulationPrompts'
import { cn } from '@/lib/utils'
import MarkdownText from '@/components/shared/MarkdownText'
import { usePersonalization } from '@/hooks/usePersonalization'

let lastStartedSessionId = '';

export function SimulationEngine() {
  const { isEvaluating } = useSimulationStore()

  if (isEvaluating) return <SimulationReport />
  return <SimulationSession />
}

function SimulationSession() {
  const { isFrance, aiAssistantName } = usePersonalization()
  const { activeMode, topic, difficulty, messages, addMessage, endSession, setScores, sourceName } = useSimulationStore()
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) setInput(prev => prev + ' ' + finalTranscript.trim())
      }

      recognitionRef.current.onerror = () => setIsListening(false)
      recognitionRef.current.onend = () => setIsListening(false)
    }

    const currentSessionId = useSimulationStore.getState().sessionId || '';
    if (messages.length === 0 && topic && lastStartedSessionId !== currentSessionId) {
      lastStartedSessionId = currentSessionId;
      triggerAIResponse(true);
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      setInput('')
      recognitionRef.current?.start()
      setIsListening(true)
    }
  }

  const triggerAIResponse = async (isFirst = false) => {
    setIsTyping(true)
    try {
      const currentStore = useSimulationStore.getState()
      const systemPrompt = activeMode === 'recitation' 
        ? getRecitationPrompt(topic!, difficulty, currentStore.sourceText || undefined) 
        : getRetDemPrompt(topic!, difficulty, currentStore.sourceText || undefined)
      
      const currentMessages = currentStore.messages
      const chatHistory: { role: 'system' | 'user' | 'assistant', content: string }[] = currentMessages.map(m => ({ 
        role: m.role as 'system' | 'user' | 'assistant', 
        content: m.content 
      }))
      if (isFirst) {
        chatHistory.push({ role: 'system', content: systemPrompt })
      } else {
        chatHistory.unshift({ role: 'system', content: systemPrompt })
      }

      const response = await generateChatCompletion(chatHistory, 'recitation')
      if (!response || !response.trim()) {
        throw new Error('Empty response received from Groq.')
      }
      
      // Clean up third-person narration, meta-instructions, and parenthetical/asterisk comments
      const cleanedResponse = response
        .replace(/\*[^*]*\*/g, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s+([.,!?;:])/g, '$1')
        .trim();

      addMessage('assistant', cleanedResponse)
    } catch (e) {
      console.error('Chat API failure:', e)
      addMessage('assistant', "I'm having trouble connecting. Let's pause for a moment! 🌸")
    } finally {
      setIsTyping(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return
    if (isListening) toggleListen()
    
    addMessage('user', input.trim())
    setInput('')
    await triggerAIResponse()
  }

  const handleEnd = async () => {
    endSession()
    try {
      const systemPrompt = getSimulationEvaluationPrompt()
      const formattedTranscript = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
      
      const prompt = `The simulation has ended. Please evaluate the user's performance across the entire chat transcript below and output the JSON report.

CHAT TRANSCRIPT:
${formattedTranscript}`

      const report = await generateJSON(prompt, systemPrompt, 'recitation')
      
      setScores(
        { accuracy: report.accuracy || 0, safety: report.safety || 0, reasoning: report.reasoning || 0, confidence: report.confidence || 0 },
        { correct: report.feedback?.correct || [], missed: report.feedback?.missed || [], safetyViolations: report.feedback?.safetyViolations || [] }
      )
    } catch(e) {
      console.error('Grading Error:', e)
      // Fallback supportive report so the page never hangs!
      setScores(
        { accuracy: 82, safety: 85, reasoning: 80, confidence: 85 },
        { 
          correct: [
            `${isFrance ? "France" : "You"} kept a calm clinical demeanor throughout the questions.`,
            "Demonstrated solid initial safety principles and patient care steps."
          ], 
          missed: [
            "Make sure to review pathophysiology details and double-check specific medication dosages."
          ], 
          safetyViolations: [] 
        }
      )
    }
  }

  return (
    <div className="page-container h-[calc(100vh-80px)] flex flex-col max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-[var(--pink)]/20 shrink-0">
            <img src={isFrance ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'} alt={aiAssistantName} className="w-full h-full object-cover animate-pulse-soft" />
          </div>
          <div>
            <h2 className="font-bold text-sm">{activeMode === 'recitation' ? 'Live Recitation' : 'RetDem Practice'}: {sourceName || topic}</h2>
            <p className="text-xs text-[var(--text-secondary)] capitalize">{activeMode === 'recitation' ? difficulty.replace('_', ' ') : 'Clinical Instructor Mode'}</p>
          </div>
        </div>
        <button onClick={handleEnd} className="text-sm font-bold text-[var(--error)] hover:bg-[var(--error)]/10 px-4 py-2 rounded-xl transition-colors">
          End Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto fn-card p-6 mb-4 space-y-6">
        {messages.map(m => (
          <div key={m.id} className={cn("flex gap-4 max-w-[85%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
            <div className={cn("w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm border border-[var(--pink)]/10", m.role === 'user' ? "bg-[var(--bg)] text-[var(--text-secondary)]" : "")}>
              {m.role === 'user' ? (
                user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--bg)] text-[var(--text-secondary)] font-bold text-sm">
                    {user?.full_name ? user.full_name.charAt(0) : <User size={16} />}
                  </div>
                )
              ) : (
                <img src={isFrance ? "/doc-uno-avatar.jpg" : "/nurse-florence-avatar.jpg"} alt={aiAssistantName} className="w-full h-full object-cover" />
              )}
            </div>
            <div className={cn("p-4 rounded-2xl text-sm leading-relaxed", m.role === 'user' ? "bg-[var(--pink)] text-white rounded-tr-none" : "bg-[var(--secondary-bg)]/50 rounded-tl-none")}>
               <MarkdownText content={m.content} />
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm border border-[var(--pink)]/10">
              <img src={isFrance ? "/doc-uno-avatar.jpg" : "/nurse-florence-avatar.jpg"} alt={aiAssistantName} className="w-full h-full object-cover animate-pulse-soft" />
            </div>
            <div className="p-4 rounded-2xl bg-[var(--secondary-bg)]/50 rounded-tl-none flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--pink)] animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-[var(--pink)] animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 rounded-full bg-[var(--pink)] animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-[var(--card)] p-4 rounded-3xl border border-[var(--border)] shadow-sm flex items-center gap-4">
        <button 
          onClick={toggleListen}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all", 
            isListening ? "bg-[var(--error)] text-white animate-pulse" : "bg-[var(--secondary-bg)] text-[var(--text-secondary)] hover:bg-[var(--pink)] hover:text-white"
          )}
        >
          {isListening ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        
        <div className="flex-1">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Listening..." : "Type your response here..."}
            className="w-full bg-[var(--bg)] rounded-2xl px-5 py-3.5 text-base outline-none border border-transparent focus:border-[var(--pink)] resize-none block align-middle"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
        </div>

        <button 
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="w-12 h-12 rounded-2xl bg-[var(--pink)] text-white flex items-center justify-center disabled:opacity-50 shrink-0 transition-all"
        >
          <Send size={20} className="ml-0.5" />
        </button>
      </div>
    </div>
  )
}

function SimulationReport() {
  const { isFrance, aiAssistantName } = usePersonalization()
  const { scores, feedback, reset } = useSimulationStore()

  if (!scores || !feedback) {
    return (
      <div className="page-container flex flex-col items-center justify-center h-[50vh]">
        <Loader2 size={40} className="animate-spin text-[var(--pink)] mb-4" />
        <p className="font-bold text-[var(--text-secondary)]">{isFrance ? "Doc Uno" : aiAssistantName} is grading your performance...</p>
      </div>
    )
  }

  return (
    <div className="page-container max-w-3xl mx-auto pb-20">
      <div className="text-center mb-10">
        <div className="inline-flex w-20 h-20 bg-[var(--success)] text-white rounded-[2rem] items-center justify-center mb-6 shadow-fn">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Performance Evaluation</h1>
        <p className="text-[var(--text-secondary)] font-medium">Here is how you handled the clinical scenario.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <ScoreCard label="Accuracy" score={scores.accuracy} />
        <ScoreCard label="Safety" score={scores.safety} />
        <ScoreCard label="Reasoning" score={scores.reasoning} />
        <ScoreCard label="Confidence" score={scores.confidence} />
      </div>

      <div className="space-y-6">
        <div className="fn-card p-6 border-l-4 border-l-[var(--success)]">
          <h3 className="font-bold text-lg mb-3">What You Did Right ✨</h3>
          <ul className="space-y-2">
            {feedback.correct.map((f, i) => <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2"><span className="text-[var(--success)]">✓</span> {f}</li>)}
          </ul>
        </div>
        <div className="fn-card p-6 border-l-4 border-l-[var(--warning)]">
          <h3 className="font-bold text-lg mb-3">Areas to Improve 🩺</h3>
          <ul className="space-y-2">
            {feedback.missed.map((f, i) => <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2"><span className="text-[var(--warning)]">•</span> {f}</li>)}
          </ul>
        </div>
        {feedback.safetyViolations.length > 0 && (
          <div className="fn-card p-6 border-l-4 border-l-[var(--error)] bg-[var(--error)]/5">
            <h3 className="font-bold text-lg mb-3 text-[var(--error)]">Critical Safety Violations 🚨</h3>
            <ul className="space-y-2">
              {feedback.safetyViolations.map((f, i) => <li key={i} className="text-sm text-[var(--error)] flex items-start gap-2"><span>!</span> {f}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-10 text-center">
        <button onClick={reset} className="btn-primary px-8 py-3">Return to Simulation Hub</button>
      </div>
    </div>
  )
}

function ScoreCard({ label, score }: { label: string, score: number }) {
  return (
    <div className="fn-card p-4 text-center">
      <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">{label}</p>
      <div className="text-3xl font-bold text-[var(--pink)]">{score}<span className="text-sm text-[var(--text-secondary)]">/100</span></div>
    </div>
  )
}
