import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Microphone as Mic2, Play, Pause, ArrowCounterClockwise as RotateCcw, CaretDown as ChevronDown, CircleNotch as Loader2, Sparkle as Sparkles, Clock, ChatsCircle, FileText, BookmarkSimple as Bookmark, Folder, PencilSimple, Trash as Trash2, Headphones, WarningCircle } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
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

const HOSTS = {
  DOC_UNO: { name: 'Doc Uno', avatar: '/doc-uno-avatar.jpg' },
  NURSE_FLORENCE: { name: 'Nurse Florence', avatar: '/nurse-florence-avatar.jpg' },
} as const

// ─── Animated Waveform ────────────────────────────────────────────────────────
function Waveform({ playing }: { playing: boolean }) {
  const bars = [4, 8, 12, 16, 14, 10, 6, 12, 16, 10, 8, 14, 6, 10, 16, 12, 8, 14, 10, 6]
  return (
    <div className="flex items-center gap-[3px] h-8">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-[var(--pink)]"
          animate={playing
            ? { height: [h * 0.5, h, h * 0.3, h * 0.8, h * 0.5], opacity: [0.6, 1, 0.7, 1, 0.6] }
            : { height: 3, opacity: 0.35 }
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

function HostAvatar({ speaker, size = 36, active = true }: { speaker: DialogueLine['speaker']; size?: number; active?: boolean }) {
  return (
    <img
      src={HOSTS[speaker].avatar}
      alt={HOSTS[speaker].name}
      width={size}
      height={size}
      className={cn('rounded-full object-cover shrink-0 border-2 border-[var(--card)] transition-opacity', !active && 'opacity-60')}
      style={{ width: size, height: size }}
    />
  )
}

// ─── Transcript Line ──────────────────────────────────────────────────────────
function TranscriptLine({ line, active }: { line: DialogueLine; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [active])

  return (
    <div
      ref={ref}
      className={cn(
        'flex gap-3 items-start px-3 py-2.5 rounded-xl transition-colors duration-300',
        active ? 'bg-[var(--rose-soft)]' : ''
      )}
    >
      <HostAvatar speaker={line.speaker} size={32} active={active} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-[12px] font-semibold mb-0.5', active ? 'text-[var(--pink)]' : 'text-[var(--text)]')}>
          {HOSTS[line.speaker].name}
        </p>
        <p className={cn('text-[13.5px] leading-relaxed', active ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]')}>
          {line.text}
        </p>
      </div>
    </div>
  )
}

// ─── Source dropdown ──────────────────────────────────────────────────────────
function OptionDropdown({ icon: OptionIcon, placeholder, value, options, onSelect }: {
  icon: Icon
  placeholder: string
  value: string
  options: { id: string; label: string; color?: string }[]
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.id === value)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between gap-2 bg-[var(--card)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-left hover:border-[var(--accent)] transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          {current?.color
            ? <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: current.color }} />
            : <OptionIcon size={16} className="text-[var(--pink)] shrink-0" />}
          <span className={cn('truncate', !current && 'text-[var(--text-secondary)]')}>{current?.label || placeholder}</span>
        </span>
        <ChevronDown size={15} className={cn('text-[var(--text-secondary)] transition-transform shrink-0', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-fn-lg max-h-56 overflow-y-auto custom-scrollbar p-1.5"
          >
            {options.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => { onSelect(o.id); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-left transition-colors hover:bg-[var(--rose-soft)]',
                  value === o.id ? 'bg-[var(--rose-soft)] text-[var(--pink)] font-medium' : 'text-[var(--text)]'
                )}
              >
                {o.color
                  ? <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} />
                  : <OptionIcon size={14} className="text-[var(--pink)] shrink-0" />}
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

  // Episode state
  const [isGenerating, setIsGenerating] = useState(false)
  const [script, setScript] = useState<DialogueLine[]>([])
  const [episodeTitle, setEpisodeTitle] = useState('')
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null)

  // Saved episodes / History
  const [savedEpisodes, setSavedEpisodes] = useState<PodcastEpisode[]>([])
  const [genError, setGenError] = useState<string | null>(null)

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
    setGenError(null)
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
      if (lines.length === 0) throw new Error('Empty script')
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
      setGenError('The episode could not be written. Check your connection and try again.')
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

  const hasScript = script.length > 0
  const estimatedDuration = hasScript ? Math.max(1, Math.round(script.reduce((acc, l) => acc + l.text.split(' ').length, 0) / 130)) : 0
  const canGenerate = !isGenerating && !((inputMode === 'type' && !freeText.trim()) || (inputMode === 'topic' && topics.length === 0) || (inputMode === 'file' && items.length === 0) || (inputMode === 'knowledge' && savedKnowledge.length === 0))
  const activeSpeaker = currentLine >= 0 ? script[currentLine]?.speaker : null

  const SOURCES: { id: SourceMode; label: string; icon: Icon }[] = [
    { id: 'type', label: 'Topic', icon: PencilSimple },
    { id: 'topic', label: 'Folder', icon: Folder },
    { id: 'file', label: 'File', icon: FileText },
    { id: 'knowledge', label: 'Saved ref', icon: Bookmark },
  ]

  return (
    <div className="page-container max-w-6xl">
      <PageHeader
        icon={Mic2}
        title="Nursepod"
        subtitle={isFrance ? 'Listen to Doc Uno and Nurse Florence talk through your topics, babe.' : 'Doc Uno and Nurse Florence talk through your nursing topics as a podcast.'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] gap-5 items-start">
        {/* New episode */}
        <section className="fn-card p-5 lg:col-start-2 lg:row-start-1">
          <h2 className="font-heading font-semibold text-[15px] mb-3">New episode</h2>

          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--bg)] border border-[var(--border)] mb-3">
            {SOURCES.map(m => (
              <button
                key={m.id}
                onClick={() => setInputMode(m.id)}
                className={cn(
                  'py-1.5 rounded-lg text-[11.5px] font-medium flex flex-col items-center gap-0.5 transition-colors',
                  inputMode === m.id ? 'bg-[var(--card)] text-[var(--pink)] shadow-fn' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                )}
              >
                <m.icon size={16} weight={inputMode === m.id ? 'fill' : 'regular'} />
                {m.label}
              </button>
            ))}
          </div>

          {inputMode === 'type' && (
            <input
              type="text"
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canGenerate && generatePodcast()}
              placeholder="e.g. Hypovolemic shock, sepsis"
              className="fn-input rounded-xl bg-[var(--card)] py-2.5 text-sm"
            />
          )}
          {inputMode === 'topic' && (topics.length > 0
            ? <OptionDropdown icon={Folder} placeholder="Choose a Study Box folder" value={selectedTopicId} onSelect={setSelectedTopicId} options={topics.map(t => ({ id: t.id, label: t.title, color: t.color }))} />
            : <EmptySource text="No Study Box folders yet." />)}
          {inputMode === 'file' && (items.length > 0
            ? <OptionDropdown icon={FileText} placeholder="Choose an uploaded file" value={selectedItemId} onSelect={setSelectedItemId} options={items.map(i => ({ id: i.id, label: i.file_name }))} />
            : <EmptySource text="Upload a PDF or document in Study Box to use it here." />)}
          {inputMode === 'knowledge' && (savedKnowledge.length > 0
            ? <OptionDropdown icon={Bookmark} placeholder="Choose a saved reference" value={selectedKnowledgeId} onSelect={setSelectedKnowledgeId} options={savedKnowledge.map(k => ({ id: k.id, label: k.title }))} />
            : <EmptySource text="Save references in Knowledge Garden to use them here." />)}

          <button onClick={generatePodcast} disabled={!canGenerate} className="btn-primary w-full mt-3 py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Writing episode</> : <><Sparkles size={16} /> Generate episode</>}
          </button>
          {genError && (
            <p className="mt-2.5 text-[12.5px] text-[var(--error)] flex items-start gap-1.5"><WarningCircle size={15} className="shrink-0 mt-px" /> {genError}</p>
          )}
        </section>

        {/* Player */}
        <section className="lg:col-start-1 lg:row-start-1 lg:row-span-2 space-y-4 min-w-0">
          {isGenerating ? (
            <div className="fn-card p-10 flex flex-col items-center text-center">
              <div className="flex -space-x-3 mb-5">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 1.2, repeat: Infinity }}><HostAvatar speaker="DOC_UNO" size={64} /></motion.div>
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.6 }}><HostAvatar speaker="NURSE_FLORENCE" size={64} /></motion.div>
              </div>
              <h3 className="font-heading font-semibold text-lg">Writing your episode</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm mt-1">
                Doc Uno and Nurse Florence are outlining the pathophysiology, nursing priorities and a board-style question. This takes about a minute.
              </p>
              <div className="flex gap-1.5 mt-5">
                {[0, 150, 300].map(d => <span key={d} className="w-2 h-2 rounded-full bg-[var(--pink)] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          ) : hasScript ? (
            <>
              <div className="fn-card overflow-hidden">
                <div className="p-5 sm:p-6 bg-gradient-to-br from-[var(--rose-soft)] to-transparent">
                  <div className="flex items-start gap-4">
                    <div className="relative w-[84px] h-[84px] shrink-0">
                      <div className="absolute top-0 left-0"><HostAvatar speaker="DOC_UNO" size={56} active={!activeSpeaker || activeSpeaker === 'DOC_UNO'} /></div>
                      <div className="absolute bottom-0 right-0"><HostAvatar speaker="NURSE_FLORENCE" size={56} active={!activeSpeaker || activeSpeaker === 'NURSE_FLORENCE'} /></div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-medium text-[var(--pink)]">{isPlaying ? 'Now playing' : 'Episode'}</p>
                      <h2 className="font-heading font-semibold text-lg sm:text-xl leading-snug line-clamp-2">{episodeTitle}</h2>
                      <p className="text-[12.5px] text-[var(--text-secondary)] mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>Doc Uno &amp; Nurse Florence</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> about {estimatedDuration} min</span>
                        <span className="flex items-center gap-1"><ChatsCircle size={12} /> {script.length} lines</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-3 h-8">
                    <Waveform playing={isPlaying} />
                    {isPlaying && activeSpeaker && (
                      <motion.p key={currentLine} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} className="text-[12.5px] text-[var(--text-secondary)] truncate">
                        {HOSTS[activeSpeaker].name} is speaking
                      </motion.p>
                    )}
                  </div>

                  <div className="mt-3 h-1.5 bg-th-pink/15 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-[var(--pink)] rounded-full" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>

                <div className="px-5 py-4 flex items-center justify-between gap-3 border-t border-[var(--border)]">
                  <div className="flex gap-1">
                    {SPEEDS.map(s => (
                      <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={cn('px-2 py-1 rounded-lg text-[11.5px] font-medium transition-colors', speed === s ? 'bg-[var(--pink)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]')}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button onClick={handleRestart} className="btn-icon w-10 h-10 border border-[var(--border)] rounded-full flex items-center justify-center" aria-label="Restart episode">
                      <RotateCcw size={16} />
                    </button>
                    <button
                      onClick={handlePlay}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                      className="w-12 h-12 rounded-full bg-[var(--pink)] flex items-center justify-center text-white shadow-fn hover:brightness-105 active:scale-95 transition-all"
                    >
                      {isPlaying ? <Pause size={22} weight="fill" /> : <Play size={22} weight="fill" className="translate-x-px" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="fn-card">
                <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-[15px]">Transcript</h3>
                  {currentLine >= 0 && <span className="text-[12px] text-[var(--text-secondary)]">Line {currentLine + 1} of {script.length}</span>}
                </div>
                <div className="p-2 sm:p-3 space-y-0.5 max-h-[520px] overflow-y-auto custom-scrollbar">
                  {script.map((line, i) => <TranscriptLine key={i} line={line} active={currentLine === i} />)}
                </div>
              </div>
            </>
          ) : (
            <div className="fn-card p-8 sm:p-12 flex flex-col items-center text-center">
              <div className="flex -space-x-3 mb-5">
                <HostAvatar speaker="DOC_UNO" size={64} />
                <HostAvatar speaker="NURSE_FLORENCE" size={64} />
              </div>
              <h3 className="font-heading font-semibold text-lg">Learn by listening</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mt-1">
                Pick a topic, a Study Box folder, a file or a saved reference. Doc Uno and Nurse Florence will turn it into a conversation covering pathophysiology, assessment, meds, nursing priorities and a board-style question.
              </p>
            </div>
          )}
        </section>

        {/* Library */}
        <section className="fn-card p-5 lg:col-start-2 lg:row-start-2">
          <h2 className="font-heading font-semibold text-[15px] mb-3 flex items-center justify-between">
            Your episodes <span className="text-[12px] font-normal text-[var(--text-secondary)]">{savedEpisodes.length}</span>
          </h2>
          {savedEpisodes.length === 0 ? (
            <p className="text-[13px] text-[var(--text-secondary)] py-2">Episodes you generate are saved here so you can replay them.</p>
          ) : (
            <div className="space-y-1 -mx-2 max-h-[420px] overflow-y-auto custom-scrollbar">
              {savedEpisodes.map(ep => (
                <div
                  key={ep.id}
                  onClick={() => loadSavedEpisode(ep)}
                  className={cn('group flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer transition-colors', activeEpisodeId === ep.id ? 'bg-[var(--rose-soft)]' : 'hover:bg-[var(--rose-soft)]')}
                >
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', activeEpisodeId === ep.id ? 'bg-[var(--pink)] text-white' : 'bg-th-pink/10 text-[var(--pink)]')}>
                    {activeEpisodeId === ep.id && isPlaying ? <Headphones size={17} weight="fill" /> : <Play size={15} weight="fill" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate">{ep.title}</p>
                    <p className="text-[11.5px] text-[var(--text-secondary)] truncate">
                      {ep.source_type || 'Episode'} · {new Date(ep.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteEpisodeFromHistory(ep.id) }}
                    className="btn-icon p-1.5 hover:text-[var(--error)] sm:opacity-0 group-hover:opacity-100"
                    aria-label={`Delete ${ep.title}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function EmptySource({ text }: { text: string }) {
  return <p className="px-3.5 py-3 rounded-xl border border-dashed border-[var(--accent)] text-[12.5px] text-[var(--text-secondary)]">{text}</p>
}
