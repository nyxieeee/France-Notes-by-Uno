import { create } from 'zustand'
import {
  synthesizeSpeech,
  playClip,
  speakWithBrowser,
  stopPlayback,
  unlockAudio,
  getAudioCurrentTime,
  setPlaybackRate,
} from '@/lib/elevenLabsTts'
import {
  startBackgroundMusic,
  stopBackgroundMusic,
  getMusicPreference,
  setMusicPreference,
} from '@/lib/backgroundMusic'
import { toast } from '@/stores/feedbackStore'

export interface DialogueLine {
  speaker: 'DOC_UNO' | 'NURSE_FLORENCE'
  text: string
}

export interface PodcastEpisode {
  id: string
  title: string
  topic: string
  source_type?: string
  script: DialogueLine[]
  created_at: string
}

export const WORDS_PER_SECOND = 130 / 60

export function computeLineStarts(script: DialogueLine[]): { starts: number[]; totalSeconds: number } {
  const starts: number[] = []
  let elapsed = 0
  for (const line of script) {
    starts.push(elapsed)
    elapsed += Math.max(1.5, line.text.split(/\s+/).filter(Boolean).length / WORDS_PER_SECOND)
  }
  const last = script[script.length - 1]
  const totalSeconds = starts.length > 0
    ? starts[starts.length - 1] + Math.max(1.5, (last ? last.text.split(/\s+/).filter(Boolean).length : 0) / WORDS_PER_SECOND)
    : 0
  return { starts, totalSeconds }
}

// ─── Module-Level Playback Engine (Persists across page navigation) ───────────
let playRunId = 0
let isPlayingActive = false
let activeSpeed = 1
let lineStartedAt = 0
let tickTimer: ReturnType<typeof setInterval> | null = null
const clipCache = new Map<number, Promise<string | null>>()

function resetClips() {
  clipCache.forEach(p => p.then(url => { if (url) URL.revokeObjectURL(url) }))
  clipCache.clear()
}

function prefetch(index: number) {
  const state = usePodcastStore.getState()
  const line = state.script[index]
  if (!line || clipCache.has(index)) return
  clipCache.set(index, synthesizeSpeech({ text: line.text, speaker: line.speaker }))
}

function startTickTimer() {
  stopTickTimer()
  tickTimer = setInterval(() => {
    const { script, currentLine, speed, lineStarts, totalSeconds, isPlaying } = usePodcastStore.getState()
    if (!isPlaying || currentLine < 0 || currentLine >= script.length) return

    const base = lineStarts[currentLine] ?? 0
    const audioTime = getAudioCurrentTime()
    const lineTime = audioTime > 0 ? audioTime : Math.max(0, ((Date.now() - lineStartedAt) / 1000) * speed)
    const currentSec = Math.min(totalSeconds, base + lineTime)
    const prog = totalSeconds > 0 ? currentSec / totalSeconds : 0

    usePodcastStore.setState({
      elapsedSeconds: currentSec,
      progress: prog,
    })
  }, 150)
}

function stopTickTimer() {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

async function runPlayback(startIndex: number, run: number) {
  for (let lineIndex = startIndex; ; lineIndex++) {
    if (playRunId !== run) return

    // Reached the end of what's written so far: wait if part two is still being generated
    while (lineIndex >= usePodcastStore.getState().script.length && usePodcastStore.getState().isWritingMore) {
      await new Promise(r => setTimeout(r, 400))
      if (playRunId !== run) return
    }
    if (lineIndex >= usePodcastStore.getState().script.length) break

    const line = usePodcastStore.getState().script[lineIndex]
    lineStartedAt = Date.now()

    const { lineStarts, totalSeconds } = usePodcastStore.getState()
    const currentBase = lineStarts[lineIndex] ?? 0

    usePodcastStore.setState({
      currentLine: lineIndex,
      elapsedSeconds: currentBase,
      progress: totalSeconds > 0 ? currentBase / totalSeconds : 0,
    })

    prefetch(lineIndex)
    prefetch(lineIndex + 1)
    prefetch(lineIndex + 2)

    const url = await clipCache.get(lineIndex)
    clipCache.delete(lineIndex)
    if (playRunId !== run) {
      if (url) URL.revokeObjectURL(url)
      return
    }

    let result = url ? await playClip(url, activeSpeed) : 'error'
    if (result === 'error') {
      result = await speakWithBrowser(line.text, line.speaker, activeSpeed)
    }
    if (result === 'stopped' || playRunId !== run) return

    if (result === 'blocked') {
      isPlayingActive = false
      stopTickTimer()
      usePodcastStore.setState({ isPlaying: false })
      stopBackgroundMusic()
      toast('Tap play again to start the audio.', 'info')
      return
    }

    if (result === 'error') {
      isPlayingActive = false
      stopTickTimer()
      usePodcastStore.setState({ isPlaying: false })
      stopBackgroundMusic()
      toast("Audio isn't available right now. You can still read the transcript.", 'error')
      return
    }
  }

  isPlayingActive = false
  stopTickTimer()
  usePodcastStore.setState({ isPlaying: false, progress: 1 })
  stopBackgroundMusic()
}

interface PodcastState {
  activeEpisodeId: string | null
  episodeTitle: string
  episodeTopic: string
  script: DialogueLine[]
  lineStarts: number[]
  totalSeconds: number
  elapsedSeconds: number
  isWritingMore: boolean
  isPlaying: boolean
  currentLine: number
  speed: number
  musicOn: boolean
  progress: number
  isDismissed: boolean

  // Actions
  setScript: (scriptOrFn: DialogueLine[] | ((prev: DialogueLine[]) => DialogueLine[])) => void
  setEpisodeTitle: (title: string) => void
  setEpisodeTopic: (topic: string) => void
  setActiveEpisodeId: (id: string | null) => void
  setIsWritingMore: (isWritingMore: boolean) => void
  setIsDismissed: (isDismissed: boolean) => void
  setSpeed: (speed: number) => void
  toggleMusic: () => void

  // Playback commands
  startFrom: (lineIndex: number) => void
  togglePlay: () => void
  pause: () => void
  stopAll: () => void
  goToLine: (lineIndex: number) => void
  handlePrevious: () => void
  handleNext: () => void
  loadEpisode: (ep: PodcastEpisode) => void
  prefetchLine: (index: number) => void
  resetPlayback: () => void
}

export const usePodcastStore = create<PodcastState>()((set, get) => ({
  activeEpisodeId: null,
  episodeTitle: '',
  episodeTopic: '',
  script: [],
  lineStarts: [],
  totalSeconds: 0,
  elapsedSeconds: 0,
  isWritingMore: false,
  isPlaying: false,
  currentLine: -1,
  speed: 1,
  musicOn: getMusicPreference(),
  progress: 0,
  isDismissed: false,

  setScript: (scriptOrFn) => {
    set(state => {
      const nextScript = typeof scriptOrFn === 'function' ? scriptOrFn(state.script) : scriptOrFn
      const { starts, totalSeconds } = computeLineStarts(nextScript)
      return {
        script: nextScript,
        lineStarts: starts,
        totalSeconds,
      }
    })
  },

  setEpisodeTitle: (title) => set({ episodeTitle: title }),
  setEpisodeTopic: (topic) => set({ episodeTopic: topic }),
  setActiveEpisodeId: (id) => set({ activeEpisodeId: id }),
  setIsWritingMore: (isWritingMore) => set({ isWritingMore }),
  setIsDismissed: (isDismissed) => set({ isDismissed }),

  setSpeed: (newSpeed) => {
    activeSpeed = newSpeed
    setPlaybackRate(newSpeed)
    set({ speed: newSpeed })
  },

  toggleMusic: () => {
    const next = !get().musicOn
    setMusicPreference(next)
    set({ musicOn: next })
    if (!isPlayingActive) return
    if (next) startBackgroundMusic()
    else stopBackgroundMusic()
  },

  startFrom: (lineIndex: number) => {
    unlockAudio()
    get().stopAll()
    playRunId++
    const run = playRunId
    isPlayingActive = true

    const base = get().lineStarts[lineIndex] ?? 0
    set({
      isPlaying: true,
      isDismissed: false,
      currentLine: lineIndex,
      elapsedSeconds: base,
    })

    if (get().musicOn) startBackgroundMusic()
    startTickTimer()
    runPlayback(lineIndex, run)
  },

  togglePlay: () => {
    const { script, isPlaying, currentLine } = get()
    if (script.length === 0) return
    if (isPlaying) {
      get().stopAll()
    } else {
      const startIdx = Math.max(0, Math.min(currentLine < 0 ? 0 : currentLine, script.length - 1))
      get().startFrom(startIdx)
    }
  },

  pause: () => {
    get().stopAll()
  },

  stopAll: () => {
    playRunId++
    isPlayingActive = false
    stopTickTimer()
    set({ isPlaying: false })
    stopPlayback()
    stopBackgroundMusic()
  },

  goToLine: (lineIndex: number) => {
    const { script, lineStarts, totalSeconds } = get()
    const index = Math.min(Math.max(0, lineIndex), script.length - 1)
    if (index < 0) return

    const base = lineStarts[index] ?? 0
    lineStartedAt = Date.now()

    if (isPlayingActive) {
      get().startFrom(index)
    } else {
      set({
        currentLine: index,
        elapsedSeconds: base,
        progress: totalSeconds > 0 ? base / totalSeconds : 0,
      })
      prefetch(index)
    }
  },

  handlePrevious: () => {
    const { script, currentLine } = get()
    if (currentLine < 0) return get().goToLine(script.length - 1)
    const restartCurrent = isPlayingActive && Date.now() - lineStartedAt > 3000
    get().goToLine(restartCurrent ? currentLine : currentLine - 1)
  },

  handleNext: () => {
    const { script, currentLine } = get()
    if (currentLine < 0 || currentLine >= script.length - 1) return
    get().goToLine(currentLine + 1)
  },

  loadEpisode: (ep: PodcastEpisode) => {
    get().stopAll()
    resetClips()
    const { starts, totalSeconds } = computeLineStarts(ep.script)
    set({
      activeEpisodeId: ep.id,
      episodeTitle: ep.title,
      episodeTopic: ep.topic || ep.title,
      script: ep.script,
      lineStarts: starts,
      totalSeconds,
      elapsedSeconds: 0,
      isWritingMore: false,
      isPlaying: false,
      currentLine: 0,
      progress: 0,
      isDismissed: false,
    })
    prefetch(0)
  },

  prefetchLine: (index: number) => {
    prefetch(index)
  },

  resetPlayback: () => {
    get().stopAll()
    resetClips()
    set({
      script: [],
      lineStarts: [],
      totalSeconds: 0,
      elapsedSeconds: 0,
      episodeTitle: '',
      episodeTopic: '',
      activeEpisodeId: null,
      isWritingMore: false,
      isPlaying: false,
      currentLine: -1,
      progress: 0,
      isDismissed: false,
    })
  },
}))
