// ─── Text-to-Speech Client ──────────────────────────────────────────────────
// Routes through the /api/tts (free voices) and /api/elevenlabs Vercel proxies so keys stay server-side.
// Playback helpers below fall back to the Web Speech API if the proxy call fails.

import { HOST_VOICES, findVoice, getVoiceChoice } from '@/lib/voices'

export type ElevenLabsSpeaker = 'DOC_UNO' | 'NURSE_FLORENCE'

export interface ElevenLabsSynthOptions {
  text: string
  speaker: ElevenLabsSpeaker
  /** Override the host's chosen voice (used for previews) */
  voiceId?: string
  /** Surrounding sentences, so a reply spoken in pieces keeps a natural flow */
  previousText?: string
  nextText?: string
}

async function requestAudio(endpoint: string, body: Record<string, unknown>): Promise<string | null> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: response.statusText }))
      console.error(`[TTS ${endpoint}] Status:`, response.status, '| error:', errData.error)
      return null
    }

    // Proxies return base64-encoded audio as JSON
    const data = await response.json()
    if (!data.audio) {
      console.warn(`[TTS ${endpoint}] No audio in proxy response`)
      return null
    }

    // Decode base64 → Blob → object URL
    const byteChars = atob(data.audio)
    const byteNums = new Uint8Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i)
    }
    const blob = new Blob([byteNums], { type: data.contentType || 'audio/mpeg' })
    return URL.createObjectURL(blob)

  } catch (error) {
    console.error(`[TTS ${endpoint}] Error:`, error)
    return null
  }
}

/**
 * Synthesizes speech with the host's chosen voice: free Microsoft neural voices (/api/tts) or
 * ElevenLabs (/api/elevenlabs, uses credits). If the chosen service fails, the other one is tried.
 * Returns a blob object-URL (audio/mpeg) on success, or null on failure.
 */
export async function synthesizeSpeech({
  text,
  speaker,
  voiceId,
  previousText,
  nextText,
}: ElevenLabsSynthOptions): Promise<string | null> {
  const chosen = findVoice(speaker, voiceId || getVoiceChoice(speaker)) ?? HOST_VOICES[speaker][0]
  const viaFree = (voice?: string) => requestAudio('/api/tts', { text, speaker, voice })
  const viaElevenLabs = (voice?: string) =>
    requestAudio('/api/elevenlabs', { text, speaker, voice_id: voice, previous_text: previousText, next_text: nextText })

  if (chosen.provider === 'free') {
    return (await viaFree(chosen.id)) ?? (voiceId ? null : await viaElevenLabs())
  }
  return (await viaElevenLabs(chosen.id)) ?? (voiceId ? null : await viaFree())
}

// ─── Playback that survives iPad Safari's autoplay rules ────────────────────
// iOS only lets audio play from a user gesture. Synthesis is a network round-trip, so by the
// time a clip is ready the tap is long gone. We keep ONE audio element, "unlock" it during the
// tap (unlockAudio), and then reuse it for every clip by swapping its src.

const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

let sharedAudio: HTMLAudioElement | null = null
let currentObjectUrl: string | null = null

function getSharedAudio() {
  if (!sharedAudio) {
    sharedAudio = new Audio()
    sharedAudio.preload = 'auto'
  }
  return sharedAudio
}

/** Call synchronously inside a click/tap handler before any await. */
export function unlockAudio() {
  const audio = getSharedAudio()
  if (!audio.src || audio.src === SILENT_WAV || audio.paused) {
    audio.src = SILENT_WAV
    audio.play().then(() => audio.pause()).catch(() => { /* still locked; play() will report it */ })
  }
  if ('speechSynthesis' in window) {
    // Speaking an empty utterance inside the gesture unlocks speechSynthesis on iOS too
    const primer = new SpeechSynthesisUtterance('')
    primer.volume = 0
    window.speechSynthesis.speak(primer)
  }
}

export type PlaybackResult = 'ended' | 'blocked' | 'error' | 'stopped'

let stopCurrent: (() => void) | null = null

/** Stop whatever clip or browser speech is playing. */
export function stopPlayback() {
  stopCurrent?.()
  stopCurrent = null
  if (sharedAudio) sharedAudio.pause()
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

/** Play an object URL on the shared element. Resolves when it ends or can't play. */
export function playClip(url: string, rate = 1): Promise<PlaybackResult> {
  stopPlayback()
  const audio = getSharedAudio()
  if (currentObjectUrl && currentObjectUrl !== url) URL.revokeObjectURL(currentObjectUrl)
  currentObjectUrl = url
  return new Promise(resolve => {
    let settled = false
    const finish = (result: PlaybackResult) => {
      if (settled) return
      settled = true
      audio.onended = null
      audio.onerror = null
      stopCurrent = null
      resolve(result)
    }
    stopCurrent = () => finish('stopped')
    audio.onended = () => finish('ended')
    audio.onerror = () => finish('error')
    audio.src = url
    audio.playbackRate = rate
    audio.play().catch((err: DOMException) => finish(err?.name === 'NotAllowedError' ? 'blocked' : 'error'))
  })
}

/** Browser text-to-speech fallback for when ElevenLabs is unavailable. */
export function speakWithBrowser(text: string, speaker: ElevenLabsSpeaker, rate = 1): Promise<PlaybackResult> {
  if (!('speechSynthesis' in window)) return Promise.resolve('error')
  stopPlayback()
  return new Promise(resolve => {
    let settled = false
    const finish = (result: PlaybackResult) => {
      if (settled) return
      settled = true
      stopCurrent = null
      resolve(result)
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = rate
    const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'))
    // Rough voice split so the two hosts sound different
    const wantFemale = speaker === 'NURSE_FLORENCE'
    const pick = voices.find(v => wantFemale ? /female|samantha|karen|moira|tessa|victoria|zira/i.test(v.name) : /male|daniel|alex|fred|tom|david|arthur/i.test(v.name))
    if (pick) utterance.voice = pick
    utterance.onend = () => finish('ended')
    utterance.onerror = (e) => finish(e.error === 'not-allowed' ? 'blocked' : e.error === 'interrupted' || e.error === 'canceled' ? 'stopped' : 'error')
    stopCurrent = () => { window.speechSynthesis.cancel(); finish('stopped') }
    window.speechSynthesis.speak(utterance)
  })
}

/** Synthesize with ElevenLabs and play it, falling back to browser speech. */
export async function speak(text: string, speaker: ElevenLabsSpeaker, rate = 1, stillWanted: () => boolean = () => true): Promise<PlaybackResult> {
  const url = await synthesizeSpeech({ text, speaker })
  // Playback may have been stopped or skipped while the clip was being synthesized
  if (!stillWanted()) {
    if (url) URL.revokeObjectURL(url)
    return 'stopped'
  }
  if (url) {
    const result = await playClip(url, rate)
    if (result !== 'error') return result
  }
  return speakWithBrowser(text, speaker, rate)
}

/** Split a reply into short spoken chunks (a sentence or two each) */
function speechChunks(text: string, max = 220): string[] {
  const plain = text.replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim()
  const sentences = plain.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [plain]
  const chunks: string[] = []
  let current = ''
  for (const s of sentences.map(x => x.trim()).filter(Boolean)) {
    if (current && (current + ' ' + s).length > max) { chunks.push(current); current = s }
    else current = current ? `${current} ${s}` : s
  }
  if (current) chunks.push(current)
  return chunks
}

/**
 * Speak a longer reply sentence by sentence: the first sentence starts playing as soon as it is
 * ready while the next one is being voiced, instead of waiting for audio of the whole reply.
 */
export async function speakLong(text: string, speaker: ElevenLabsSpeaker, rate = 1, stillWanted: () => boolean = () => true): Promise<PlaybackResult> {
  const chunks = speechChunks(text)
  if (chunks.length <= 1) return speak(text, speaker, rate, stillWanted)
  const clips = new Map<number, Promise<string | null>>()
  const fetchClip = (i: number) => {
    if (i < chunks.length && !clips.has(i)) {
      clips.set(i, synthesizeSpeech({ text: chunks[i], speaker, previousText: chunks[i - 1], nextText: chunks[i + 1] }))
    }
  }
  const release = () => clips.forEach(p => p.then(url => { if (url) URL.revokeObjectURL(url) }))
  fetchClip(0)
  fetchClip(1)
  for (let i = 0; i < chunks.length; i++) {
    const url = await clips.get(i)!
    clips.delete(i)
    if (!stillWanted()) { if (url) URL.revokeObjectURL(url); release(); return 'stopped' }
    fetchClip(i + 2)
    let result: PlaybackResult = url ? await playClip(url, rate) : 'error'
    if (result === 'error') result = await speakWithBrowser(chunks[i], speaker, rate)
    if (result !== 'ended') { release(); return result }
  }
  return 'ended'
}
