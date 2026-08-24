// ─── ElevenLabs Text-to-Speech Client ───────────────────────────────────────
// Routes through /api/elevenlabs Vercel proxy so the API key stays server-side.
// Fallback: Web Speech API if the proxy call fails.

export type ElevenLabsSpeaker = 'DOC_UNO' | 'NURSE_FLORENCE'

export interface ElevenLabsSynthOptions {
  text: string
  speaker: ElevenLabsSpeaker
  /** 0.0–1.0 — lower = more stable/monotone. Defaults to 0.5 */
  stability?: number
  /** 0.0–1.0 — higher = closer to original voice. Defaults to 0.75 */
  similarityBoost?: number
}

/**
 * Synthesizes speech via the /api/elevenlabs proxy (ElevenLabs Turbo v2.5).
 * Returns a blob object-URL (audio/mpeg) on success, or null on failure.
 * The caller is responsible for revoking the URL when done (URL.revokeObjectURL).
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
      const err = await response.text().catch(() => response.statusText)
      console.warn('[ElevenLabs TTS] Proxy error:', response.status, err)
      return null
    }

    const blob = await response.blob()
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('[ElevenLabs TTS] Proxy fetch failed:', error)
    return null
  }
}
