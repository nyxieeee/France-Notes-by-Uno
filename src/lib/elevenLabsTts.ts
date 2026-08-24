// ─── ElevenLabs Text-to-Speech Client ───────────────────────────────────────
// Routes through /api/elevenlabs Vercel proxy so the API key stays server-side.
// Fallback: Web Speech API if the proxy call fails.

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
      console.error('[ElevenLabs TTS] ❌ Status:', response.status, '| ElevenLabs error:', errData.error)
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
