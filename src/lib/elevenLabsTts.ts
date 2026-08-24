// ─── ElevenLabs Text-to-Speech Client ───────────────────────────────────────
// Uses ElevenLabs Turbo v2.5 for ultra-low latency, high-quality voice synthesis.
// Fallback: Web Speech API if API key is not configured or the call fails.

const ELEVEN_LABS_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || ''

// ── ElevenLabs Voice IDs ─────────────────────────────────────────────────────
// Adam  (en, male)   — warm, deep, authoritative → Doc Uno
// Rachel (en, female) — calm, clear, professional → Nurse Florence
export const ELEVENLABS_VOICES = {
  DOC_UNO:       import.meta.env.VITE_ELEVENLABS_VOICE_DOC_UNO       || 'pNInz6obpgDQGcFmaJgB', // Adam
  NURSE_FLORENCE: import.meta.env.VITE_ELEVENLABS_VOICE_NURSE_FLORENCE || '21m00Tcm4TlvDq8ikWAM', // Rachel
} as const

export type ElevenLabsSpeaker = keyof typeof ELEVENLABS_VOICES

export interface ElevenLabsSynthOptions {
  text: string
  speaker: ElevenLabsSpeaker
  /** 0.0–1.0  — lower = slower. Defaults to 0.9 */
  stability?: number
  /** 0.0–1.0  — higher = more expressive. Defaults to 0.75 */
  similarityBoost?: number
}

/**
 * Synthesizes speech via ElevenLabs Turbo v2.5.
 * Returns an object-URL (audio/mpeg) string on success, or null on failure.
 * The caller is responsible for revoking the URL when done (URL.revokeObjectURL).
 */
export async function synthesizeSpeechElevenLabs({
  text,
  speaker,
  stability = 0.5,
  similarityBoost = 0.75,
}: ElevenLabsSynthOptions): Promise<string | null> {
  if (!ELEVEN_LABS_KEY) {
    console.warn('[ElevenLabs TTS] No VITE_ELEVENLABS_API_KEY found — falling back to Web Speech.')
    return null
  }

  const voiceId = ELEVENLABS_VOICES[speaker]
  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_LABS_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text().catch(() => '')
      console.warn('[ElevenLabs TTS] API error:', response.status, err)
      return null
    }

    const blob = await response.blob()
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('[ElevenLabs TTS] Network error:', error)
    return null
  }
}
