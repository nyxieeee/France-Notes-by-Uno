// ─── ElevenLabs Text-to-Speech Client ───────────────────────────────────────
// Routes through /api/elevenlabs Vercel proxy so the API key stays server-side.
// Playback helpers below fall back to the Web Speech API if the proxy call fails.

export type ElevenLabsSpeaker = 'DOC_UNO' | 'NURSE_FLORENCE'

export interface ElevenLabsSynthOptions {
  text: string
  speaker: ElevenLabsSpeaker
  stability?: number
  similarityBoost?: number
}

/**
 * Synthesizes speech via the /api/elevenlabs proxy (ElevenLabs Turbo v2.5).
 * Returns a blob object-URL (audio/mpeg) on success, or null on failure.
 */
export async function synthesizeSpeechElevenLabs({
  text,
  speaker,
  stability = 0.5,
  similarityBoost = 0.75,
}: ElevenLabsSynthOptions): Promise<string | null> {
  try {
    const response = await fetch('/api/elevenlabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        speaker,
        stability,
        similarity_boost: similarityBoost,
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: response.statusText }))
      console.error('[ElevenLabs TTS] Status:', response.status, '| ElevenLabs error:', errData.error)
      return null
    }

    // Proxy returns base64-encoded audio as JSON
    const data = await response.json()
    if (!data.audio) {
      console.warn('[ElevenLabs TTS] No audio in proxy response')
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
    console.error('[ElevenLabs TTS] Error:', error)
    return null
  }
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
  const url = await synthesizeSpeechElevenLabs({ text, speaker })
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
