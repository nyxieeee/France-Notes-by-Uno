import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic2, Play, Pause, RotateCcw, ChevronDown, Loader2,
  Search, Sparkles, Volume2, Clock, BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateCompletion } from '@/lib/groq'
import { usePersonalization } from '@/hooks/usePersonalization'
import { useStudyBoxStore } from '@/stores/studyBoxStore'

interface DialogueLine {
  speaker: 'DOC_UNO' | 'NURSE_FLORENCE'
  text: string
}

// ─── Web Speech Voice Selection ───────────────────────────────────────────────
function getBestVoice(voices: SpeechSynthesisVoice[], gender: 'male' | 'female'): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null

  const preferred = gender === 'female'
    ? [
        'Google UK English Female',
        'Microsoft Hazel - English (United Kingdom)',
        'Microsoft Zira - English (United States)',
        'Karen',
        'Samantha',
        'Victoria',
      ]
    : [
        'Google UK English Male',
        'Microsoft George - English (United Kingdom)',
        'Microsoft David - English (United States)',
        'Daniel',
        'Alex',
        'Fred',
      ]

  for (const name of preferred) {
    const found = voices.find(v => v.name === name)
    if (found) return found
  }

  // Fallback: any en-GB or en-US voice matching gender heuristic
  const enVoices = voices.filter(v => v.lang.startsWith('en'))
  if (gender === 'female') {
    const fem = enVoices.find(v =>
      v.name.toLowerCase().includes('female') ||
      v.name.toLowerCase().includes('woman') ||
      ['karen', 'samantha', 'victoria', 'zira', 'hazel', 'eva', 'susan', 'fiona'].some(n => v.name.toLowerCase().includes(n))
    )
    if (fem) return fem
  } else {
    const male = enVoices.find(v =>
      v.name.toLowerCase().includes('male') ||
      v.name.toLowerCase().includes('man') ||
      ['daniel', 'alex', 'fred', 'david', 'george', 'tom', 'mark'].some(n => v.name.toLowerCase().includes(n))
    )
    if (male) return male
  }

  return enVoices[0] || voices[0]
}

// ─── Animated Waveform ────────────────────────────────────────────────────────
function Waveform({ playing }: { playing: boolean }) {
  const bars = [4, 8, 12, 16, 14, 10, 6, 12, 16, 10, 8, 14, 6, 10, 16]
  return (
    <div className="flex items-center gap-0.5 h-8">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-white/70"
          animate={playing
            ? { height: [h * 0.5, h, h * 0.3, h * 0.8, h * 0.5], opacity: [0.6, 1, 0.7, 1, 0.6] }
            : { height: 3, opacity: 0.4 }
          }
          transition={playing
            ? { duration: 0.8 + (i % 5) * 0.12, repeat: Infinity, ease: 'easeInOut', delay: i * 0.06 }
            : { duration: 0.3 }
          }
          style={{ height: playing ? undefined : 3 }}
        />
      ))}
    </div>
  )
}

// ─── Speaker Avatar ───────────────────────────────────────────────────────────
function SpeakerAvatar({ speaker, active }: { speaker: 'DOC_UNO' | 'NURSE_FLORENCE'; active: boolean }) {
  const isUno = speaker === 'DOC_UNO'
  return (
    <motion.div
      animate={active ? { scale: 1.08, boxShadow: '0 0 0 4px rgba(247,168,184,0.5)' } : { scale: 1, boxShadow: 'none' }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 shrink-0 transition-all',
        active
          ? 'border-[var(--pink)] bg-[var(--pink)]/20'
          : 'border-[var(--border)] bg-[var(--secondary-bg)]/30 opacity-50'
      )}
    >
      {isUno ? '🩺' : '👩‍⚕️'}
    </motion.div>
  )
}

// ─── Transcript Line ──────────────────────────────────────────────────────────
function TranscriptLine({ line, active, index }: { line: DialogueLine; active: boolean; index: number }) {
  const isUno = line.speaker === 'DOC_UNO'
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [active])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className={cn(
        'flex gap-3 items-start p-3 rounded-2xl transition-all duration-300',
        active ? 'bg-[var(--pink)]/10 border border-[var(--pink)]/20' : 'hover:bg-[var(--secondary-bg)]/30'
      )}
    >
      <SpeakerAvatar speaker={line.speaker} active={active} />
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-[10px] font-bold uppercase tracking-widest mb-1',
          active ? 'text-[var(--pink)]' : 'text-[var(--text-secondary)]'
        )}>
          {isUno ? 'Doc Uno 🩺' : 'Nurse Florence 👩‍⚕️'}
        </p>
        <p className={cn('text-sm leading-relaxed', active ? 'text-[var(--text)] font-medium' : 'text-[var(--text-secondary)]')}>
          {line.text}
        </p>
      </div>
    </motion.div>
  )
}

// ─── Parse script ─────────────────────────────────────────────────────────────
function parseScript(raw: string): DialogueLine[] {
  const lines: DialogueLine[] = []
  const regex = /\[(DOC[_ ]?UNO|NURSE[_ ]?FLORENCE|UNO|FLORENCE)\]:?\s*(.*)/gi
  let match

  while ((match = regex.exec(raw)) !== null) {
    const speakerRaw = match[1].toUpperCase().replace(/\s/g, '_')
    const text = match[2].trim()
    if (!text) continue
    const speaker: 'DOC_UNO' | 'NURSE_FLORENCE' =
      speakerRaw.includes('UNO') ? 'DOC_UNO' : 'NURSE_FLORENCE'
    lines.push({ speaker, text })
  }

  // Fallback: if no tags found, alternate by newline groups
  if (lines.length === 0) {
    const paragraphs = raw.split('\n\n').filter(p => p.trim())
    paragraphs.forEach((p, i) => {
      lines.push({
        speaker: i % 2 === 0 ? 'DOC_UNO' : 'NURSE_FLORENCE',
        text: p.trim().replace(/^\[.*?\]:?\s*/, '')
      })
    })
  }

  return lines
}

const SPEEDS = [0.75, 1, 1.25, 1.5]

export default function PodcastReviewPage() {
  const { isFrance } = usePersonalization()
  const { topics } = useStudyBoxStore()

  // Topic input state
  const [inputMode, setInputMode] = useState<'type' | 'topic'>('type')
  const [freeText, setFreeText] = useState('')
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id || '')
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false)

  // Generation
  const [isGenerating, setIsGenerating] = useState(false)
  const [script, setScript] = useState<DialogueLine[]>([])
  const [episodeTitle, setEpisodeTitle] = useState('')

  // Playback
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentLine, setCurrentLine] = useState(-1)
  const [speed, setSpeed] = useState(1)
  const [progress, setProgress] = useState(0)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const currentLineRef = useRef(-1)
  const isPlayingRef = useRef(false)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  // Load voices
  useEffect(() => {
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices()
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  const getTopic = () => {
    if (inputMode === 'type') return freeText.trim()
    return topics.find(t => t.id === selectedTopicId)?.title || ''
  }

  const generatePodcast = async () => {
    const topic = getTopic()
    if (!topic) return

    setIsGenerating(true)
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setCurrentLine(-1)
    setProgress(0)
    setScript([])

    const systemPrompt = `You are a script writer for a nursing education podcast called "Nursepod". 
Write an engaging, educational, conversational podcast script between TWO hosts:
- DOC UNO: A warm, supportive male host who explains things with relatable analogies and occasional humor. Slightly casual. Uses phrases like "Exactly!", "Great point!", "Think of it this way..."
- NURSE FLORENCE: A professional, insightful female host who adds clinical depth and evidence-based perspective. Uses phrases like "Clinically speaking...", "That's a critical point...", "Remember for the boards..."

RULES:
1. Format EVERY line EXACTLY as: [DOC UNO]: text OR [NURSE FLORENCE]: text
2. Alternate naturally between them — don't monologue too long
3. Keep lines SHORT (1-3 sentences each) — conversational, not lecture-style
4. Include mnemonics, clinical pearls, board exam tips naturally in conversation
5. Cover: definition, pathophysiology, clinical signs, nursing interventions, complications
6. Write 20-28 dialogue exchanges total
7. NO asterisks, NO stage directions, NO parentheses — pure dialogue only`

    const prompt = `Create a full nursing podcast episode script about: "${topic}". Make it informative, engaging, and board-exam focused. Include clinical pearls and memory aids naturally in the conversation.`

    try {
      const raw = await generateCompletion(prompt, systemPrompt, 'chat')
      const lines = parseScript(raw)
      setScript(lines)
      setEpisodeTitle(topic)
    } catch (err) {
      console.error('[Podcast] Generation failed:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const speakLine = useCallback((lineIndex: number) => {
    if (lineIndex >= script.length || !isPlayingRef.current) {
      setIsPlaying(false)
      setCurrentLine(-1)
      setProgress(1)
      isPlayingRef.current = false
      return
    }

    const line = script[lineIndex]
    const utter = new SpeechSynthesisUtterance(line.text)
    utteranceRef.current = utter

    const voices = voicesRef.current
    utter.voice = getBestVoice(voices, line.speaker === 'DOC_UNO' ? 'male' : 'female')
    utter.rate = speed
    utter.pitch = line.speaker === 'DOC_UNO' ? 0.9 : 1.1
    utter.volume = 1

    currentLineRef.current = lineIndex
    setCurrentLine(lineIndex)
    setProgress(lineIndex / script.length)

    utter.onend = () => {
      if (isPlayingRef.current) {
        speakLine(lineIndex + 1)
      }
    }
    utter.onerror = () => {
      if (isPlayingRef.current) speakLine(lineIndex + 1)
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
  }, [script, speed])

  const handlePlay = () => {
    if (script.length === 0) return
    if (isPlaying) {
      window.speechSynthesis.cancel()
      isPlayingRef.current = false
      setIsPlaying(false)
    } else {
      isPlayingRef.current = true
      setIsPlaying(true)
      const start = currentLine < 0 || currentLine >= script.length ? 0 : currentLine
      speakLine(start)
    }
  }

  const handleRestart = () => {
    window.speechSynthesis.cancel()
    isPlayingRef.current = false
    setIsPlaying(false)
    setCurrentLine(-1)
    setProgress(0)
    setTimeout(() => {
      isPlayingRef.current = true
      setIsPlaying(true)
      speakLine(0)
    }, 150)
  }

  const selectedTopic = topics.find(t => t.id === selectedTopicId)
  const hasScript = script.length > 0
  const estimatedDuration = hasScript ? Math.round(script.reduce((acc, l) => acc + l.text.split(' ').length, 0) / 130) : 0

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-16 h-16 bg-gradient-to-br from-[var(--pink)] to-[#FF7FA3] text-white rounded-[2rem] flex items-center justify-center mb-6 shadow-lg"
        >
          <Mic2 size={30} />
        </motion.div>
        <h1 className="text-4xl font-black mb-3 font-heading">Nursepod 🎙️</h1>
        <p className="text-[var(--text-secondary)] text-base">
          {isFrance
            ? 'Listen to Doc Uno & Nurse Florence break down nursing topics just for you, babe! 🌷'
            : 'Doc Uno & Nurse Florence bring your nursing topics to life in podcast format! 🩺'}
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Topic Input Panel */}
        <div className="fn-card p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-4">Choose Episode Topic</p>

          {/* Mode Toggle */}
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[2rem] p-1.5 flex gap-1.5 mb-4">
            {(['type', 'topic'] as const).map(m => (
              <button
                key={m}
                onClick={() => setInputMode(m)}
                className={cn(
                  'flex-1 py-2.5 rounded-[1.5rem] text-xs font-bold transition-all',
                  inputMode === m
                    ? 'bg-[var(--pink)] text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                )}
              >
                {m === 'type' ? '✏️ Type a Topic' : '📚 Study Box Topics'}
              </button>
            ))}
          </div>

          {inputMode === 'type' ? (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
              <input
                type="text"
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isGenerating && generatePodcast()}
                placeholder="e.g. Hypovolemic Shock, Sepsis, Heart Failure..."
                className="fn-input pl-10"
              />
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setTopicDropdownOpen(p => !p)}
                className="w-full flex items-center justify-between bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-4 py-3 text-sm font-semibold text-left hover:border-[var(--pink)]/50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedTopic?.color || 'var(--pink)' }} />
                  <span className="truncate">{selectedTopic?.title || 'Select a Topic'}</span>
                </div>
                <ChevronDown size={16} className={cn('text-[var(--text-secondary)] transition-transform', topicDropdownOpen && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {topicDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 z-50 mt-2 bg-[var(--card)] border border-[var(--border)] rounded-[1.5rem] shadow-fn-lg max-h-52 overflow-y-auto custom-scrollbar p-2"
                  >
                    {topics.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedTopicId(t.id); setTopicDropdownOpen(false) }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all hover:bg-[var(--pink)]/5',
                          selectedTopicId === t.id ? 'bg-[var(--pink)]/10 text-[var(--pink)]' : 'text-[var(--text)]'
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="truncate">{t.title}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={generatePodcast}
            disabled={isGenerating || (!freeText.trim() && inputMode === 'type') || (inputMode === 'topic' && !selectedTopicId)}
            className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <><Loader2 size={16} className="animate-spin" /> Generating Episode...</>
            ) : (
              <><Sparkles size={16} /> Generate Episode</>
            )}
          </button>
        </div>

        {/* Generating State */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fn-card p-8 flex flex-col items-center text-center"
            >
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-[var(--pink)]/20 blur-xl rounded-full scale-150 animate-pulse" />
                <div className="w-20 h-20 bg-gradient-to-br from-[var(--pink)] to-[#FF7FA3] rounded-full flex items-center justify-center relative shadow-lg">
                  <Mic2 size={36} className="text-white animate-bounce" />
                </div>
              </div>
              <h3 className="text-xl font-black mb-2">Writing your episode... 🎙️</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Doc Uno & Nurse Florence are getting ready to record.
              </p>
              <div className="flex gap-1.5 mt-4">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2 h-2 rounded-full bg-[var(--pink)] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Podcast Player */}
        <AnimatePresence>
          {hasScript && !isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Album Art / Now Playing Card */}
              <div className="fn-card overflow-hidden">
                <div className="bg-gradient-to-br from-[#F7A8B8] via-[#FF7FA3] to-[#FF5A87] p-6 md:p-8 relative">
                  {/* Background decorative circles */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                  <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-6 -translate-x-4" />

                  <div className="relative z-10 flex items-start gap-4">
                    {/* Album art */}
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 flex items-center justify-center text-3xl shrink-0 shadow-lg">
                      🎙️
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Now Playing</p>
                      <h2 className="text-white font-black text-lg leading-tight truncate">{episodeTitle}</h2>
                      <p className="text-white/80 text-xs font-semibold mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-1"><span>🩺</span> Doc Uno</span>
                        <span className="text-white/50">×</span>
                        <span className="flex items-center gap-1"><span>👩‍⚕️</span> Nurse Florence</span>
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-white/60 text-[10px] font-bold">
                          <Clock size={10} /> ~{estimatedDuration} min
                        </span>
                        <span className="flex items-center gap-1 text-white/60 text-[10px] font-bold">
                          <BookOpen size={10} /> {script.length} lines
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Waveform */}
                  <div className="mt-5 flex items-center gap-3 relative z-10">
                    <Waveform playing={isPlaying} />
                    {isPlaying && currentLine >= 0 && (
                      <motion.p
                        key={currentLine}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-white/80 text-xs font-semibold truncate flex-1"
                      >
                        {script[currentLine]?.speaker === 'DOC_UNO' ? '🩺 Doc Uno speaking...' : '👩‍⚕️ Nurse Florence speaking...'}
                      </motion.p>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden relative z-10">
                    <motion.div
                      className="h-full bg-white/80 rounded-full"
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Player Controls */}
                <div className="p-5 flex items-center justify-between gap-4">
                  {/* Speed */}
                  <div className="flex items-center gap-1.5">
                    <Volume2 size={14} className="text-[var(--text-secondary)]" />
                    <div className="flex gap-1">
                      {SPEEDS.map(s => (
                        <button
                          key={s}
                          onClick={() => setSpeed(s)}
                          className={cn(
                            'px-2 py-1 rounded-lg text-[10px] font-black transition-all',
                            speed === s
                              ? 'bg-[var(--pink)] text-white'
                              : 'bg-[var(--bg)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
                          )}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRestart}
                      className="w-10 h-10 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--pink)]/50 hover:text-[var(--pink)] transition-all"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      onClick={handlePlay}
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--pink)] to-[#FF7FA3] flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                      {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" className="translate-x-0.5" />}
                    </button>
                  </div>
                  <div className="w-[88px]" /> {/* Spacer for symmetry */}
                </div>
              </div>

              {/* Transcript */}
              <div className="fn-card">
                <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Episode Transcript</p>
                </div>
                <div className="p-4 space-y-2 max-h-[480px] overflow-y-auto custom-scrollbar">
                  {script.map((line, i) => (
                    <TranscriptLine key={i} line={line} active={currentLine === i} index={i} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!hasScript && !isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fn-card p-10 flex flex-col items-center text-center border-dashed"
          >
            <div className="text-5xl mb-4">🎙️</div>
            <p className="text-lg font-bold mb-2">No episode yet</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Choose a topic above and hit <span className="font-bold text-[var(--pink)]">Generate Episode</span> to start your first Nursepod session!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
