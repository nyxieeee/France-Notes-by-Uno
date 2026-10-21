import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Microphone as Mic2, Play, Pause, CaretDown as ChevronDown, CircleNotch as Loader2, Sparkle as Sparkles, Clock, ChatsCircle, FileText, BookmarkSimple as Bookmark, Folder, PencilSimple, Trash as Trash2, Headphones, WarningCircle, MusicNotes, MusicNotesSimple, SkipBack, SkipForward } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'
import { generateCompletion } from '@/lib/ai'
import { startBackgroundMusic, stopBackgroundMusic, getMusicPreference, setMusicPreference } from '@/lib/backgroundMusic'
import { synthesizeSpeech, playClip, speakWithBrowser, stopPlayback, unlockAudio } from '@/lib/elevenLabsTts'
import { toast, confirmDialog } from '@/stores/feedbackStore'
import { usePersonalization } from '@/hooks/usePersonalization'
import { useStudyBoxStore, isReferenceArticle, findReferenceArticle } from '@/stores/studyBoxStore'
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
function TranscriptLine({ line, active, onSelect }: { line: DialogueLine; active: boolean; onSelect: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll only the transcript box, never the page, so the player controls stay put under her finger
    const el = ref.current
    const box = el?.parentElement
    if (active && el && box) {
      box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' })
    }
  }, [active])

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
      title="Play from here"
      className={cn(
        'flex gap-3 items-start px-3 py-2.5 rounded-xl transition-colors duration-300 cursor-pointer',
        active ? 'bg-[var(--rose-soft)]' : 'hover:bg-[var(--rose-soft)]/60'
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
// The model sometimes formats lines with markdown anyway; strip it so it neither shows nor gets read aloud
function cleanLine(text: string): string {
  return text
    .replace(/\*\*|__|\*|`/g, '')
    .replace(/^#+\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^["']|["']$/g, '')
    .trim()
}

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

      text = cleanLine(text)

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
          text: cleanLine(cleaned)
        })
      }
    })
  }

  return lines
}

const SPEEDS = [0.75, 1, 1.25, 1.5]

// Speech runs about 130 words a minute; used to show times and to map the seek bar to lines
const WORDS_PER_SECOND = 130 / 60

const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function SeekBar({ starts, total, current, speed, onSeek }: {
  starts: number[]
  total: number
  current: number
  speed: number
  onSeek: (lineIndex: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragFraction, setDragFraction] = useState<number | null>(null)

  const lineAt = (fraction: number) => {
    const target = fraction * total
    let index = 0
    while (index + 1 < starts.length && starts[index + 1] <= target) index++
    return index
  }
  const fractionFrom = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }

  const playedFraction = total > 0 && current >= 0 ? (starts[current] ?? total) / total : 0
  const shownFraction = dragFraction ?? playedFraction
  const shownSeconds = dragFraction !== null ? starts[lineAt(dragFraction)] ?? 0 : starts[current] ?? 0

  return (
    <div className="mt-3">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, starts.length - 1)}
        aria-valuenow={Math.max(0, current)}
        aria-valuetext={`Line ${Math.max(0, current) + 1} of ${starts.length}`}
        className="group relative h-5 flex items-center cursor-pointer touch-none select-none"
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setDragFraction(fractionFrom(e.clientX))
        }}
        onPointerMove={e => { if (dragFraction !== null) setDragFraction(fractionFrom(e.clientX)) }}
        onPointerUp={e => {
          if (dragFraction === null) return
          const index = lineAt(fractionFrom(e.clientX))
          setDragFraction(null)
          onSeek(index)
        }}
        onPointerCancel={() => setDragFraction(null)}
        onKeyDown={e => {
          if (e.key === 'ArrowRight') { e.preventDefault(); onSeek(Math.min(starts.length - 1, Math.max(0, current) + 1)) }
          if (e.key === 'ArrowLeft') { e.preventDefault(); onSeek(Math.max(0, current - 1)) }
        }}
      >
        <div className="w-full h-1.5 bg-th-pink/15 rounded-full overflow-hidden">
          <div className={cn('h-full bg-[var(--pink)] rounded-full', dragFraction === null && 'transition-[width] duration-300')} style={{ width: `${shownFraction * 100}%` }} />
        </div>
        <div
          className={cn('absolute w-3.5 h-3.5 -ml-[7px] rounded-full bg-[var(--pink)] shadow-fn transition-transform', dragFraction !== null ? 'scale-125' : 'scale-0 group-hover:scale-100 [@media(hover:none)]:scale-100')}
          style={{ left: `${shownFraction * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] tabular-nums text-[var(--text-secondary)] -mt-0.5">
        <span>{formatTime(shownSeconds / speed)}</span>
        <span>{formatTime(total / speed)}</span>
      </div>
    </div>
  )
}
type SourceMode = 'type' | 'topic' | 'file' | 'knowledge'

export default function PodcastReviewPage() {
  const { isFrance } = usePersonalization()
  const { topics, items, savedKnowledge, fetchItems, fetchSavedKnowledge } = useStudyBoxStore()
  const user = useAuthStore(s => s.user)

  // Source selection state
  const [inputMode, setInputMode] = useState<SourceMode>('type')
  const [freeText, setFreeText] = useState('')
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id || '')
  const myFiles = items.filter(i => !isReferenceArticle(i))
  const [selectedItemId, setSelectedItemId] = useState(myFiles[0]?.id || '')
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState(savedKnowledge[0]?.id || '')

  // Episode state
  const [isGenerating, setIsGenerating] = useState(false)
  const [script, setScript] = useState<DialogueLine[]>([])
  const [episodeTitle, setEpisodeTitle] = useState('')
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null)
  // The episode is written in two parts; this is true while the second part is still being written
  const [isWritingMore, setIsWritingMore] = useState(false)
  const scriptRef = useRef<DialogueLine[]>([])
  const writingMoreRef = useRef(false)
  useEffect(() => { scriptRef.current = script }, [script])
  useEffect(() => { writingMoreRef.current = isWritingMore }, [isWritingMore])

  // Saved episodes / History
  const [savedEpisodes, setSavedEpisodes] = useState<PodcastEpisode[]>([])
  const [genError, setGenError] = useState<string | null>(null)

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentLine, setCurrentLine] = useState(-1)
  const [speed, setSpeed] = useState(1)
  const [musicOn, setMusicOn] = useState(getMusicPreference)
  const [progress, setProgress] = useState(0)

  const playRunRef = useRef(0)
  const speedRef = useRef(speed)
  useEffect(() => { speedRef.current = speed }, [speed])
  const currentLineRef = useRef(-1)
  const isPlayingRef = useRef(false)

  // Voice clips fetched ahead of time (current line + the next two) so hosts speak without gaps
  const clipCache = useRef(new Map<number, Promise<string | null>>())
  const resetClips = () => {
    clipCache.current.forEach(p => p.then(url => { if (url) URL.revokeObjectURL(url) }))
    clipCache.current = new Map()
  }
  const prefetch = (index: number) => {
    const line = scriptRef.current[index]
    if (!line || clipCache.current.has(index)) return
    clipCache.current.set(index, synthesizeSpeech({ text: line.text, speaker: line.speaker }))
  }

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
      setSavedEpisodes(initialData.map(ep => ({ ...ep, script: (ep.script || []).map(l => ({ ...l, text: cleanLine(l.text) })) })))
    }

    fetchEpisodes()
  }, [user?.id])

  const stopAllPlayback = () => {
    // Bumping the run id makes any line still being synthesized drop itself instead of playing
    playRunRef.current++
    isPlayingRef.current = false
    stopPlayback()
    stopBackgroundMusic()
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

  const deleteEpisodeFromHistory = async (ep: PodcastEpisode) => {
    const ok = await confirmDialog({ title: `Delete “${ep.title}”?`, message: 'This episode will be removed from your library.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const storageKey = `france_notes_podcast_episodes_${user?.id || 'guest'}`
    const previous = savedEpisodes
    const updated = previous.filter(e => e.id !== ep.id)
    setSavedEpisodes(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))

    // If it's the episode in the player, stop it and clear the player right away
    if (activeEpisodeId === ep.id) {
      stopAllPlayback()
      resetClips()
      setIsPlaying(false)
      setCurrentLine(-1)
      setProgress(0)
      setScript([])
      setEpisodeTitle('')
      setActiveEpisodeId(null)
    }

    if (user?.id) {
      const { error } = await supabase.from('podcast_episodes').delete().eq('id', ep.id).eq('user_id', user.id)
      if (error) {
        // Put it back so the list matches what's actually saved
        setSavedEpisodes(previous)
        localStorage.setItem(storageKey, JSON.stringify(previous))
        toast("Couldn't delete the episode. Check your connection and try again.", 'error')
        return
      }
    }
    toast('Episode deleted', 'success')
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
      const article = kObj ? findReferenceArticle(items, kObj)?.extracted_text : undefined
      const text = kObj ? article || `Title: ${kObj.title}\nSource: ${kObj.source}\nSummary/Description: ${kObj.description}` : undefined
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
    resetClips()
    setIsWritingMore(false)

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
- Pure dialogue only — NO stage directions, NO parentheses, NO bold section headers.
- Plain text only. Never use markdown: no asterisks (* or **) for emphasis, no underscores, no backticks, no # headings.
- Do NOT write section headers like "**SECTION 1**" or "**EPISODE INTRO**". Have the hosts speak naturally without announcing section titles.`

    const brief = `Ensure Doc Uno and Nurse Florence engage in a deep, natural, highly educational professional discussion covering pathophysiology, clinical assessments, pharmacology, priority nursing interventions, and a step-by-step board scenario breakdown.`
    // Part one is short so the hosts can start talking quickly; part two is written while she listens
    const partOnePrompt = `Write PART ONE of a nursing podcast episode about: "${sourceDetails.title}".
Cover only section 1 (EPISODE INTRO) and section 2 (PATHOPHYSIOLOGY & ETIOLOGY), in about 14 to 18 dialogue exchanges. End at a natural hand-off into clinical presentation. Do not write the outro.
${brief}`

    const episodeId = `ep-${crypto.randomUUID()}`
    let partOne: DialogueLine[]
    try {
      partOne = parseScript(await generateCompletion(partOnePrompt, systemPrompt, 'reviewer'))
      if (partOne.length === 0) throw new Error('Empty script')
    } catch (err) {
      console.error('[Podcast] Generation failed:', err)
      setGenError('The episode could not be written. Check your connection and try again.')
      setIsGenerating(false)
      return
    }

    setScript(partOne)
    setEpisodeTitle(sourceDetails.title)
    setActiveEpisodeId(episodeId)
    setIsGenerating(false)
    setIsWritingMore(true)
    prefetch(0)

    let fullScript = partOne
    try {
      const transcript = partOne.map(l => `[${l.speaker === 'DOC_UNO' ? 'DOC UNO' : 'NURSE FLORENCE'}]: ${l.text}`).join('\n')
      const partTwoPrompt = `Here is PART ONE of the episode about "${sourceDetails.title}" that has already aired:
"""
${transcript}
"""
Now write PART TWO, continuing the SAME conversation seamlessly from the last line. Do not greet again or repeat the intro or pathophysiology.
Cover section 3 (CLINICAL PRESENTATION & ASSESSMENT), section 4 (LABS, DIAGNOSTICS & PHARMACOLOGY), section 5 (NURSING MANAGEMENT & PRIORITIZATION), section 6 (NCLEX/PNLE BOARD QUESTION DISSECTION) and section 7 (OUTRO), in about 35 to 45 dialogue exchanges.
${brief}`
      const partTwo = parseScript(await generateCompletion(partTwoPrompt, systemPrompt, 'reviewer'))
      if (partTwo.length > 0) {
        fullScript = [...partOne, ...partTwo]
        // Only extend the player if she is still on this episode
        setScript(current => current === partOne ? fullScript : current)
      }
    } catch (err) {
      console.error('[Podcast] Part two failed:', err)
      toast("The rest of the episode couldn't be written, so this one is shorter.", 'error')
    } finally {
      setIsWritingMore(false)
    }

    try {
      const newEp: PodcastEpisode = {
        id: episodeId,
        title: sourceDetails.title,
        topic: sourceDetails.title,
        script: fullScript,
        created_at: new Date().toISOString(),
        source_type: sourceDetails.sourceType
      }
      await saveEpisodeToHistory(newEp)
    } catch (err) {
      console.error('[Podcast] Saving the episode failed:', err)
      toast("The episode couldn't be saved to your library.", 'error')
    }
  }

  const loadSavedEpisode = (ep: PodcastEpisode) => {
    stopAllPlayback()
    resetClips()
    setIsWritingMore(false)
    setIsPlaying(false)
    setCurrentLine(-1)
    setProgress(0)
    setScript(ep.script)
    scriptRef.current = ep.script
    setEpisodeTitle(ep.title)
    setActiveEpisodeId(ep.id)
    prefetch(0)
  }

  // ─── Playback Engine (ElevenLabs, falling back to the browser's own voices) ──
  const speakLine = useCallback(async (startIndex: number, run: number) => {
    for (let lineIndex = startIndex; ; lineIndex++) {
      if (playRunRef.current !== run) return
      // Reached the end of what's written so far: wait for part two if it's still being written
      while (lineIndex >= scriptRef.current.length && writingMoreRef.current) {
        await new Promise(r => setTimeout(r, 400))
        if (playRunRef.current !== run) return
      }
      if (lineIndex >= scriptRef.current.length) break

      const line = scriptRef.current[lineIndex]
      currentLineRef.current = lineIndex
      setCurrentLine(lineIndex)
      setProgress(lineIndex / scriptRef.current.length)

      prefetch(lineIndex)
      prefetch(lineIndex + 1)
      prefetch(lineIndex + 2)
      const url = await clipCache.current.get(lineIndex)
      clipCache.current.delete(lineIndex)
      if (playRunRef.current !== run) {
        if (url) URL.revokeObjectURL(url)
        return
      }

      let result = url ? await playClip(url, speedRef.current) : 'error'
      if (result === 'error') result = await speakWithBrowser(line.text, line.speaker, speedRef.current)
      if (playRunRef.current !== run) return

      if (result === 'blocked') {
        // iOS refused to start audio; pause on this line so one more tap on Play resumes it
        isPlayingRef.current = false
        setIsPlaying(false)
        stopBackgroundMusic()
        toast('Tap play again to start the audio.', 'info')
        return
      }
      if (result === 'error') {
        // No voice available at all: stop instead of racing silently through the episode
        isPlayingRef.current = false
        setIsPlaying(false)
        stopBackgroundMusic()
        toast('Audio isn\'t available right now. You can still read the transcript.', 'error')
        return
      }
    }
    setIsPlaying(false)
    setCurrentLine(-1)
    setProgress(1)
    isPlayingRef.current = false
    stopBackgroundMusic()
  }, [])

  const startFrom = (lineIndex: number) => {
    // Must run inside the tap so iPad Safari allows audio for the whole episode
    unlockAudio()
    stopAllPlayback()
    const run = playRunRef.current
    isPlayingRef.current = true
    setIsPlaying(true)
    if (musicOn) startBackgroundMusic()
    speakLine(lineIndex, run)
  }

  const toggleMusic = () => {
    const next = !musicOn
    setMusicOn(next)
    setMusicPreference(next)
    if (!isPlayingRef.current) return
    if (next) startBackgroundMusic()
    else stopBackgroundMusic()
  }

  const handlePlay = () => {
    if (script.length === 0) return
    if (isPlaying) {
      stopAllPlayback()
      setIsPlaying(false)
    } else {
      startFrom(currentLine < 0 || currentLine >= script.length ? 0 : currentLine)
    }
  }

  const goToLine = (lineIndex: number) => {
    const index = Math.min(Math.max(0, lineIndex), script.length - 1)
    if (index < 0) return
    if (isPlayingRef.current) {
      startFrom(index)
    } else {
      setCurrentLine(index)
      setProgress(index / script.length)
      prefetch(index)
    }
  }

  // Like Spotify: back goes to the start of the current line first, then to the line before
  const lineStartedAt = useRef(0)
  useEffect(() => { lineStartedAt.current = Date.now() }, [currentLine])
  const handlePrevious = () => {
    if (currentLine < 0) return goToLine(script.length - 1)
    const restartCurrent = isPlayingRef.current && Date.now() - lineStartedAt.current > 3000
    goToLine(restartCurrent ? currentLine : currentLine - 1)
  }
  const handleNext = () => {
    if (currentLine < 0 || currentLine >= script.length - 1) return
    goToLine(currentLine + 1)
  }

  const hasScript = script.length > 0
  const estimatedDuration = hasScript ? Math.max(1, Math.round(script.reduce((acc, l) => acc + l.text.split(' ').length, 0) / 130)) : 0
  const canGenerate = !isGenerating && !isWritingMore && !((inputMode === 'type' && !freeText.trim()) || (inputMode === 'topic' && topics.length === 0) || (inputMode === 'file' && !myFiles.some(i => i.id === selectedItemId)) || (inputMode === 'knowledge' && savedKnowledge.length === 0))
  const activeSpeaker = currentLine >= 0 ? script[currentLine]?.speaker : null
  // Estimated start time of every line, plus the episode's total length
  const { lineStarts, totalSeconds } = useMemo(() => {
    const starts: number[] = []
    let total = 0
    for (const l of script) {
      starts.push(total)
      total += l.text.split(/\s+/).length / WORDS_PER_SECOND + 0.4
    }
    return { lineStarts: starts, totalSeconds: total }
  }, [script])
  const seekLine = currentLine < 0 && progress >= 1 ? script.length : currentLine

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
          {inputMode === 'file' && (myFiles.length > 0
            ? <OptionDropdown icon={FileText} placeholder="Choose an uploaded file" value={selectedItemId} onSelect={setSelectedItemId} options={myFiles.map(i => ({ id: i.id, label: i.file_name }))} />
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
                Doc Uno and Nurse Florence are getting the opening ready. You can start listening in a few seconds while they write the rest.
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

                  <SeekBar starts={lineStarts} total={totalSeconds} current={seekLine} speed={speed} onSeek={goToLine} />
                </div>

                <div className="px-5 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-[var(--border)]">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={toggleMusic}
                      className={cn('btn-icon w-10 h-10 rounded-full flex items-center justify-center', musicOn ? 'text-[var(--pink)]' : 'text-[var(--text-secondary)]')}
                      aria-label={musicOn ? 'Turn off background music' : 'Turn on background music'}
                      aria-pressed={musicOn}
                      title={musicOn ? 'Background music on' : 'Background music off'}
                    >
                      {musicOn ? <MusicNotes size={18} weight="fill" /> : <MusicNotesSimple size={18} />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button onClick={handlePrevious} className="btn-icon w-11 h-11 rounded-full flex items-center justify-center" aria-label="Previous line">
                      <SkipBack size={22} weight="fill" />
                    </button>
                    <button
                      onClick={handlePlay}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                      className="w-14 h-14 rounded-full bg-[var(--pink)] flex items-center justify-center text-white shadow-fn hover:brightness-105 active:scale-95 transition-all"
                    >
                      {isPlaying ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" className="translate-x-px" />}
                    </button>
                    <button onClick={handleNext} disabled={currentLine < 0 || currentLine >= script.length - 1} className="btn-icon w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-35" aria-label="Next line">
                      <SkipForward size={22} weight="fill" />
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
                      className="min-w-[48px] h-8 px-2.5 rounded-full border border-[var(--border)] text-[12px] font-semibold tabular-nums hover:bg-[var(--rose-soft)] transition-colors"
                      aria-label={`Playback speed ${speed}x. Tap to change.`}
                    >
                      {speed}x
                    </button>
                  </div>
                </div>
              </div>

              <div className="fn-card">
                <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-[15px]">Transcript</h3>
                  {currentLine >= 0 && <span className="text-[12px] text-[var(--text-secondary)]">Line {currentLine + 1} of {script.length}{isWritingMore ? '+' : ''}</span>}
                </div>
                <div className="relative p-2 sm:p-3 space-y-0.5 max-h-[520px] overflow-y-auto custom-scrollbar">
                  {script.map((line, i) => <TranscriptLine key={i} line={line} active={currentLine === i} onSelect={() => goToLine(i)} />)}
                  {isWritingMore && (
                    <p className="flex items-center gap-2 px-3 py-3 text-[12.5px] text-[var(--text-secondary)]">
                      <Loader2 size={14} className="animate-spin text-[var(--pink)]" /> Writing the rest of the episode. It will keep playing on its own.
                    </p>
                  )}
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
                    onClick={e => { e.stopPropagation(); deleteEpisodeFromHistory(ep) }}
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
