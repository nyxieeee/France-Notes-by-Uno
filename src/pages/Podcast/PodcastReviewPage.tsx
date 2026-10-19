import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Microphone as Mic2, Play, Pause, ArrowCounterClockwise as RotateCcw, CaretDown as ChevronDown, CircleNotch as Loader2, MagnifyingGlass as Search, Sparkle as Sparkles, SpeakerHigh as Volume2, Clock, BookOpen, FileText, BookmarkSimple as Bookmark, ClockCounterClockwise as History, Trash as Trash2, BookmarkSimple as BookmarkCheck } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { generateCompletion } from '@/lib/ai'
import { synthesizeSpeechElevenLabs } from '@/lib/elevenLabsTts'
import { usePersonalization } from '@/hooks/usePersonalization'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

interface DialogueLine {
  speaker: 'DOC_UNO' | 'NURSE_FLORENCE'
  text: string
}

export interface PodcastEpisode {
  id: string
  title: string
  topic: string
  script: DialogueLine[]
  created_at: string
  source_type: string
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

  const cleanRaw = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()

  const lineRegex = /^\s*(?:\*\*|\*|#)*\s*\[?\s*(DOC[_ ]?UNO|NURSE[_ ]?FLORENCE|UNO|FLORENCE)\s*\]?\s*(?:\*\*|\*|#)*\s*:?\s*(.*)/i

  const splitLines = cleanRaw.split('\n')
  for (const line of splitLines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const match = lineRegex.exec(trimmed)
    if (match) {
      const speakerRaw = match[1].toUpperCase().replace(/\s/g, '_')
      let text = match[2].trim()

      text = text
        .replace(/^(\*\*|\*|#)+/, '')
        .replace(/(\*\*|\*|#)+$/, '')
        .replace(/^["']|["']$/g, '')
        .trim()

      if (!text || text === '**' || text === '*' || /^SECTION\s*\d+/i.test(text) || /^EPISODE\s*INTRO/i.test(text)) {
        continue
      }

      const speaker: 'DOC_UNO' | 'NURSE_FLORENCE' =
        speakerRaw.includes('UNO') ? 'DOC_UNO' : 'NURSE_FLORENCE'

      lines.push({ speaker, text })
    }
  }

  if (lines.length === 0) {
    const paragraphs = cleanRaw.split('\n\n').filter(p => p.trim())
    paragraphs.forEach((p, i) => {
      const cleaned = p.trim().replace(/^\[.*?\]:?\s*/, '').replace(/^(\*\*|\*)+|(\*\*|\*)+$/g, '').trim()
      if (cleaned && cleaned !== '**') {
        lines.push({
          speaker: i % 2 === 0 ? 'DOC_UNO' : 'NURSE_FLORENCE',
          text: cleaned
        })
      }
    })
  }

  return lines
}

const SPEEDS = [0.75, 1, 1.25, 1.5]
type SourceMode = 'type' | 'topic' | 'file' | 'knowledge'

export default function PodcastReviewPage() {
  const { isFrance } = usePersonalization()
  const { topics, items, savedKnowledge, fetchItems, fetchSavedKnowledge } = useStudyBoxStore()
  const user = useAuthStore(s => s.user)

  // Source selection state
  const [inputMode, setInputMode] = useState<SourceMode>('type')
  const [freeText, setFreeText] = useState('')
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id || '')
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || '')
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState(savedKnowledge[0]?.id || '')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Episode state
  const [isGenerating, setIsGenerating] = useState(false)
  const [script, setScript] = useState<DialogueLine[]>([])
  const [episodeTitle, setEpisodeTitle] = useState('')
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null)

  // Saved episodes / History
  const [savedEpisodes, setSavedEpisodes] = useState<PodcastEpisode[]>([])
  const [showHistoryView, setShowHistoryView] = useState(false)

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentLine, setCurrentLine] = useState(-1)
  const [speed, setSpeed] = useState(1)
  const [progress, setProgress] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentLineRef = useRef(-1)
  const isPlayingRef = useRef(false)

  useEffect(() => {
    fetchItems()
    fetchSavedKnowledge()
  }, [])

  useEffect(() => {
    const fetchEpisodes = async () => {
      const storageKey = `france_notes_podcast_episodes_${user?.id || 'guest'}`
      const localData = localStorage.getItem(storageKey)
      let initialData: PodcastEpisode[] = localData ? JSON.parse(localData) : []

      if (user?.id) {
        const { data, error } = await supabase
          .from('podcast_episodes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (!error && data) {
          initialData = data as PodcastEpisode[]
          localStorage.setItem(storageKey, JSON.stringify(initialData))
        }
      }
      setSavedEpisodes(initialData)
    }

    fetchEpisodes()
  }, [user?.id])

  const stopAllPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    isPlayingRef.current = false
  }

  const saveEpisodeToHistory = async (newEpisode: PodcastEpisode) => {
    const storageKey = `france_notes_podcast_episodes_${user?.id || 'guest'}`
    setSavedEpisodes(prev => {
      const filtered = prev.filter(e => e.id !== newEpisode.id)
      const updated = [newEpisode, ...filtered]
      localStorage.setItem(storageKey, JSON.stringify(updated))
      return updated
    })

    if (user?.id) {
      try {
        await supabase.from('podcast_episodes').insert([{
          id: newEpisode.id,
          user_id: user.id,
          title: newEpisode.title,
          topic: newEpisode.topic,
          script: newEpisode.script,
          source_type: newEpisode.source_type,
          created_at: newEpisode.created_at
        }])
      } catch (err) {
        console.warn('Failed to insert episode to Supabase:', err)
      }
    }
  }

  const deleteEpisodeFromHistory = async (id: string) => {
    const storageKey = `france_notes_podcast_episodes_${user?.id || 'guest'}`
    setSavedEpisodes(prev => {
      const updated = prev.filter(e => e.id !== id)
      localStorage.setItem(storageKey, JSON.stringify(updated))
      return updated
    })

    if (activeEpisodeId === id) {
      setActiveEpisodeId(null)
    }

    if (user?.id) {
      await supabase.from('podcast_episodes').delete().eq('id', id).eq('user_id', user.id)
    }
  }


  useEffect(() => {
    return () => {
      stopAllPlayback()
    }
  }, [])

  const getSelectedSourceDetails = (): { title: string; sourceText?: string; sourceType: string } => {
    if (inputMode === 'type') {
      return { title: freeText.trim(), sourceType: 'Custom Topic' }
    } else if (inputMode === 'topic') {
      const topicObj = topics.find(t => t.id === selectedTopicId)
      const topicItems = topicObj ? items.filter(i => i.topic_id === topicObj.id && i.extracted_text) : []
      const text = topicItems.length > 0 ? topicItems.map(i => `--- DOCUMENT: ${i.file_name} ---\n${i.extracted_text}`).join('\n\n') : topicObj?.description
      return { title: topicObj?.title || 'Nursing Topic', sourceText: text, sourceType: 'Study Box Topic' }
    } else if (inputMode === 'file') {
      const itemObj = items.find(i => i.id === selectedItemId)
      return { title: itemObj?.file_name || 'Uploaded File', sourceText: itemObj?.extracted_text || itemObj?.summary, sourceType: 'Uploaded File' }
    } else {
      const kObj = savedKnowledge.find(k => k.id === selectedKnowledgeId)
      const text = kObj ? `Title: ${kObj.title}\nSource: ${kObj.source}\nSummary/Description: ${kObj.description}` : undefined
      return { title: kObj?.title || 'Knowledge Reference', sourceText: text, sourceType: 'Saved Reference' }
    }
  }

  const generatePodcast = async () => {
    const sourceDetails = getSelectedSourceDetails()
    if (!sourceDetails.title) return

    setIsGenerating(true)
    stopAllPlayback()
    setIsPlaying(false)
    setCurrentLine(-1)
    setProgress(0)
    setScript([])

    let systemPrompt = `You are an elite medical and nursing podcast showrunner producing "Nursepod" — a premier, highly engaging clinical education podcast.
Write an extensive, highly professional, naturally flowing podcast episode script between TWO expert co-hosts:
- DOC UNO: An insightful, experienced physician & educator. Warm, engaging, articulate. Explains complex pathophysiology with brilliant analogies and clinical wisdom. Uses natural conversational transitions ("That's a vital point, Florence...", "Let me break down why that happens at the cellular level...", "In clinical practice, what you'll often notice is...").
- NURSE FLORENCE: A master clinical nurse specialist & board exam strategist. Sharp, professional, evidence-based. Focuses on nursing process, priority interventions, patient safety, and NCLEX/PNLE exam nuances. Uses natural peer-to-peer dialogue ("Spot on, Doc. And from a nursing priority perspective...", "That's exactly where so many candidates fall into a trap...", "Let me walk through a real bedside scenario...").

CONVERSATIONAL & HUMAN INTERACTION STYLE:
- Write like TWO REAL HUMANS having an enthusiastic, professional clinical conversation.
- They bounce ideas back and forth seamlessly: agreeing, building on each other's points, asking follow-up questions, sharing clinical anecdotes, and analyzing edge cases.
- NO robotic lectures or textbook reading! Include natural conversational elements ("Right", "Exactly", "Here's what's fascinating about that", "Let that sink in for a moment").`

    if (sourceDetails.sourceText) {
      systemPrompt += `\n\nCRITICAL SOURCE MATERIAL INSTRUCTION:
You MUST base the podcast discussion directly on the provided study material below. Discuss the specific pathophysiologies, clinical findings, drug mechanisms, and nursing interventions mentioned in this text:
"""
${sourceDetails.sourceText.substring(0, 10000)}
"""`
    }

    systemPrompt += `\n\nEPISODE STRUCTURE (MUST COVER ALL 6 SECTIONS IN DEPTH):
1. EPISODE INTRO: Warm professional welcome, setting up today's clinical focus and why it matters for both board exams and bedside practice.
2. PATHOPHYSIOLOGY & ETIOLOGY: Deep dive into cellular/organ mechanisms with intuitive analogies.
3. CLINICAL PRESENTATION & ASSESSMENT: Early vs. late signs, priority assessments, critical red flags.
4. LABS, DIAGNOSTICS & PHARMACOLOGY: Key lab thresholds, diagnostic findings, drug mechanisms, side effects, and nursing precautions.
5. NURSING MANAGEMENT & PRIORITIZATION: Airway/Breathing/Circulation priorities, positionings, emergency protocols, and patient teaching.
6. NCLEX/PNLE BOARD QUESTION DISSECTION: Co-hosts walk through a tricky clinical scenario question together, dissecting why distractor options are wrong and why the priority choice is correct.
7. OUTRO: Top key takeaways summary and professional sign-off.

CRITICAL REQUIREMENTS:
- Write AT LEAST 50 to 70 rich dialogue exchanges total.
- Format EVERY line EXACTLY as: [DOC UNO]: text OR [NURSE FLORENCE]: text
- Alternate naturally between the hosts (1-4 sentences per turn).
- Pure dialogue only — NO stage directions, NO parentheses, NO asterisks (**), NO bold section headers.
- Do NOT write section headers like "**SECTION 1**" or "**EPISODE INTRO**". Have the hosts speak naturally without announcing section titles.`

    const prompt = `Create a comprehensive, full-length, professional nursing podcast episode about: "${sourceDetails.title}". 
Ensure Doc Uno and Nurse Florence engage in a deep, natural, highly educational professional discussion covering pathophysiology, clinical assessments, pharmacology, priority nursing interventions, and a step-by-step board scenario breakdown.`

    try {
      const raw = await generateCompletion(prompt, systemPrompt, 'reviewer')
      const lines = parseScript(raw)
      const episodeId = `ep-${Date.now()}`
      setScript(lines)
      setEpisodeTitle(sourceDetails.title)
      setActiveEpisodeId(episodeId)

      const newEp: PodcastEpisode = {
        id: episodeId,
        title: sourceDetails.title,
        topic: sourceDetails.title,
        script: lines,
        created_at: new Date().toISOString(),
        source_type: sourceDetails.sourceType
      }
      await saveEpisodeToHistory(newEp)
    } catch (err) {
      console.error('[Podcast] Generation failed:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const loadSavedEpisode = (ep: PodcastEpisode) => {
    stopAllPlayback()
    setIsPlaying(false)
    setCurrentLine(-1)
    setProgress(0)
    setScript(ep.script)
    setEpisodeTitle(ep.title)
    setActiveEpisodeId(ep.id)
    setShowHistoryView(false)
  }

  // ─── Playback Engine (Google Cloud TTS Neural2 + WebSpeech Fallback) ──────
  const speakLine = useCallback(async (lineIndex: number) => {
    if (lineIndex >= script.length || !isPlayingRef.current) {
      setIsPlaying(false)
      setCurrentLine(-1)
      setProgress(1)
      isPlayingRef.current = false
      return
    }

    const line = script[lineIndex]
    currentLineRef.current = lineIndex
    setCurrentLine(lineIndex)
    setProgress(lineIndex / script.length)

    // Attempt 1: Synthesize with ElevenLabs Turbo v2.5
    const audioUrl = await synthesizeSpeechElevenLabs({
      text: line.text,
      speaker: line.speaker,
    })

    if (audioUrl && isPlayingRef.current) {
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.playbackRate = speed

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        if (isPlayingRef.current) {
          speakLine(lineIndex + 1)
        }
      }
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl)
        if (isPlayingRef.current) speakLine(lineIndex + 1)
      }
      audio.play().catch(() => {
        URL.revokeObjectURL(audioUrl)
        if (isPlayingRef.current) speakLine(lineIndex + 1)
      })
      return
    }

    // If ElevenLabs fails, skip line and continue
    if (isPlayingRef.current) speakLine(lineIndex + 1)
  }, [script, speed])

  const handlePlay = () => {
    if (script.length === 0) return
    if (isPlaying) {
      stopAllPlayback()
      setIsPlaying(false)
    } else {
      isPlayingRef.current = true
      setIsPlaying(true)
      const start = currentLine < 0 || currentLine >= script.length ? 0 : currentLine
      speakLine(start)
    }
  }

  const handleRestart = () => {
    stopAllPlayback()
    setIsPlaying(false)
    setCurrentLine(-1)
    setProgress(0)
    setTimeout(() => {
      isPlayingRef.current = true
      setIsPlaying(true)
      speakLine(0)
    }, 150)
  }

  const selectedTopicObj = topics.find(t => t.id === selectedTopicId)
  const selectedItemObj = items.find(i => i.id === selectedItemId)
  const selectedKnowledgeObj = savedKnowledge.find(k => k.id === selectedKnowledgeId)

  const hasScript = script.length > 0
  const estimatedDuration = hasScript ? Math.round(script.reduce((acc, l) => acc + l.text.split(' ').length, 0) / 130) : 0

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-16 h-16 bg-gradient-to-br from-[var(--pink)] to-[#FF7FA3] text-white rounded-[2rem] flex items-center justify-center mb-4 shadow-lg"
        >
          <Mic2 size={30} />
        </motion.div>
        <h1 className="text-4xl font-black mb-2 font-heading">Nursepod 🎙️</h1>
        <p className="text-[var(--text-secondary)] text-sm max-w-lg">
          {isFrance
            ? 'Listen to Doc Uno & Nurse Florence break down nursing topics powered by Google Neural AI voices! 🌷'
            : 'Doc Uno & Nurse Florence bring your nursing topics to life with Google Cloud Neural AI voices! 🩺'}
        </p>

        {/* History Toggle Button */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setShowHistoryView(p => !p)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all border",
              showHistoryView
                ? "bg-[var(--pink)] text-white border-[var(--pink)] shadow-md"
                : "bg-[var(--card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--pink)]/50"
            )}
          >
            <History size={15} />
            Podcast History ({savedEpisodes.length})
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* HISTORY VIEW */}
        {showHistoryView ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fn-card p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-black text-lg flex items-center gap-2">
                <History size={20} className="text-[var(--pink)]" /> Saved Episodes & History
              </h3>
              <button
                onClick={() => setShowHistoryView(false)}
                className="text-xs font-bold text-[var(--pink)] hover:underline"
              >
                + New Episode
              </button>
            </div>

            {savedEpisodes.length === 0 ? (
              <div className="text-center py-10 text-[var(--text-secondary)]">
                <Mic2 size={36} className="mx-auto mb-2 opacity-30" />
                <p className="font-bold text-sm">No saved episodes yet</p>
                <p className="text-xs opacity-70 mt-1">Generated podcasts automatically save to Supabase so you can replay them anytime!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedEpisodes.map(ep => (
                  <div
                    key={ep.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer",
                      activeEpisodeId === ep.id
                        ? "bg-[var(--pink)]/10 border-[var(--pink)]"
                        : "bg-[var(--bg)] border-[var(--border)] hover:border-[var(--pink)]/40"
                    )}
                    onClick={() => loadSavedEpisode(ep)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[var(--pink)]/20 text-[var(--pink)] flex items-center justify-center font-black shrink-0">
                        🎙️
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm truncate">{ep.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] font-semibold mt-0.5">
                          <span className="bg-[var(--secondary-bg)] px-2 py-0.5 rounded-full">{ep.source_type || 'Podcast'}</span>
                          <span>•</span>
                          <span>{ep.script.length} lines</span>
                          <span>•</span>
                          <span>{new Date(ep.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => loadSavedEpisode(ep)}
                        className="px-3 py-1.5 bg-[var(--pink)] text-white text-xs font-bold rounded-xl flex items-center gap-1 hover:scale-105 transition-all shadow-sm"
                      >
                        <Play size={12} fill="white" /> Play
                      </button>
                      <button
                        onClick={() => deleteEpisodeFromHistory(ep.id)}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors"
                        title="Delete Episode"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* GENERATOR & TOPIC SELECTOR VIEW */
          <div className="fn-card p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-4">Select Source Material</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-[2rem] p-1.5 mb-4">
              {([
                { id: 'type' as SourceMode, label: '✏️ Free Text' },
                { id: 'topic' as SourceMode, label: '📚 Topics' },
                { id: 'file' as SourceMode, label: '📄 Files' },
                { id: 'knowledge' as SourceMode, label: '🌿 Saved Refs' },
              ]).map(m => (
                <button
                  key={m.id}
                  onClick={() => setInputMode(m.id)}
                  className={cn(
                    'py-2 rounded-[1.2rem] text-xs font-bold transition-all text-center truncate px-2',
                    inputMode === m.id
                      ? 'bg-[var(--pink)] text-white shadow-md'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {inputMode === 'type' && (
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
            )}

            {inputMode === 'topic' && (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(p => !p)}
                  className="w-full flex items-center justify-between bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-4 py-3 text-sm font-semibold text-left hover:border-[var(--pink)]/50 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedTopicObj?.color || 'var(--pink)' }} />
                    <span className="truncate">{selectedTopicObj?.title || 'Select a Topic'}</span>
                  </div>
                  <ChevronDown size={16} className={cn('text-[var(--text-secondary)] transition-transform', dropdownOpen && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {dropdownOpen && (
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
                          onClick={() => { setSelectedTopicId(t.id); setDropdownOpen(false) }}
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

            {inputMode === 'file' && (
              items.length > 0 ? (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(p => !p)}
                    className="w-full flex items-center justify-between bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-4 py-3 text-sm font-semibold text-left hover:border-[var(--pink)]/50 transition-all"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={16} className="text-[var(--pink)] shrink-0" />
                      <span className="truncate">{selectedItemObj?.file_name || 'Select an Uploaded File'}</span>
                    </div>
                    <ChevronDown size={16} className={cn('text-[var(--text-secondary)] transition-transform', dropdownOpen && 'rotate-180')} />
                  </button>
                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 z-50 mt-2 bg-[var(--card)] border border-[var(--border)] rounded-[1.5rem] shadow-fn-lg max-h-52 overflow-y-auto custom-scrollbar p-2"
                      >
                        {items.map(item => (
                          <button
                            key={item.id}
                            onClick={() => { setSelectedItemId(item.id); setDropdownOpen(false) }}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all hover:bg-[var(--pink)]/5',
                              selectedItemId === item.id ? 'bg-[var(--pink)]/10 text-[var(--pink)]' : 'text-[var(--text)]'
                            )}
                          >
                            <FileText size={14} className="text-[var(--pink)] shrink-0" />
                            <span className="truncate">{item.file_name}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl text-center text-xs text-[var(--text-secondary)]">
                  No files uploaded in Study Box yet. Upload a PDF/document in Study Box to use it as a podcast source!
                </div>
              )
            )}

            {inputMode === 'knowledge' && (
              savedKnowledge.length > 0 ? (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(p => !p)}
                    className="w-full flex items-center justify-between bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-4 py-3 text-sm font-semibold text-left hover:border-[var(--pink)]/50 transition-all"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Bookmark size={16} className="text-[var(--pink)] shrink-0" />
                      <span className="truncate">{selectedKnowledgeObj?.title || 'Select a Saved Reference'}</span>
                    </div>
                    <ChevronDown size={16} className={cn('text-[var(--text-secondary)] transition-transform', dropdownOpen && 'rotate-180')} />
                  </button>
                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 z-50 mt-2 bg-[var(--card)] border border-[var(--border)] rounded-[1.5rem] shadow-fn-lg max-h-52 overflow-y-auto custom-scrollbar p-2"
                      >
                        {savedKnowledge.map(k => (
                          <button
                            key={k.id}
                            onClick={() => { setSelectedKnowledgeId(k.id); setDropdownOpen(false) }}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all hover:bg-[var(--pink)]/5',
                              selectedKnowledgeId === k.id ? 'bg-[var(--pink)]/10 text-[var(--pink)]' : 'text-[var(--text)]'
                            )}
                          >
                            <Bookmark size={14} className="text-[var(--pink)] shrink-0" />
                            <span className="truncate">{k.title}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl text-center text-xs text-[var(--text-secondary)]">
                  No references saved in Knowledge Garden yet. Search & save topics in Knowledge Garden to generate podcasts from them!
                </div>
              )
            )}

            <button
              onClick={generatePodcast}
              disabled={isGenerating || (inputMode === 'type' && !freeText.trim()) || (inputMode === 'file' && items.length === 0) || (inputMode === 'knowledge' && savedKnowledge.length === 0)}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <><Loader2 size={16} className="animate-spin" /> Generating Full Podcast Episode...</>
              ) : (
                <><Sparkles size={16} /> Generate Episode</>
              )}
            </button>
          </div>
        )}

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
              <h3 className="text-xl font-black mb-2">Writing full podcast episode... 🎙️</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md">
                Doc Uno & Nurse Florence are developing an extensive professional episode with clinical case breakdowns and board exam strategies!
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
          {hasScript && !isGenerating && !showHistoryView && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="fn-card overflow-hidden">
                <div className="bg-gradient-to-br from-[#F7A8B8] via-[#FF7FA3] to-[#FF5A87] p-6 md:p-8 relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                  <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-6 -translate-x-4" />

                  <div className="relative z-10 flex items-start gap-4">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 flex items-center justify-center text-3xl shrink-0 shadow-lg">
                      🎙️
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Now Playing</p>
                        <span className="text-[10px] font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <BookmarkCheck size={10} /> Google Neural AI Voice
                        </span>
                      </div>
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

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRestart}
                      className="w-10 h-10 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--pink)]/50 hover:text-[var(--pink)] transition-all"
                      title="Restart episode"
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
                  <div className="w-[88px]" />
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
        {!hasScript && !isGenerating && !showHistoryView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fn-card p-10 flex flex-col items-center text-center border-dashed"
          >
            <div className="text-5xl mb-4">🎙️</div>
            <p className="text-lg font-bold mb-2">No episode yet</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Select a source above (Custom Topic, Study Box, Uploaded Files, or Knowledge References) and click <span className="font-bold text-[var(--pink)]">Generate Episode</span>!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
