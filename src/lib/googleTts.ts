// ─── Google Cloud Text-to-Speech Client ─────────────────────────────────────
// Uses Google Neural2 / WaveNet voice models for ultra-natural human speech.
// Fallback: Web Speech API if API key is not configured or fails.

const GOOGLE_TTS_KEY = import.meta.env.VITE_GOOGLE_TTS_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || ''

export interface SynthesizeOptions {
  text: string
  speaker: 'DOC_UNO' | 'NURSE_FLORENCE'
  speakingRate?: number
}

// Google Neural2 Voice Configurations
const VOICE_CONFIGS = {
  DOC_UNO: {
    languageCode: 'en-US',
    name: 'en-US-Neural2-D', // Warm, articulate, deep male voice
    ssmlGender: 'MALE'
  },
  NURSE_FLORENCE: {
    languageCode: 'en-US',
    name: 'en-US-Neural2-F', // Clear, empathetic, professional female voice
    ssmlGender: 'FEMALE'
  }
}

export async function synthesizeSpeechGoogle({ text, speaker, speakingRate = 1.0 }: SynthesizeOptions): Promise<string | null> {
  if (!GOOGLE_TTS_KEY) {
    console.warn('[Google TTS] No VITE_GOOGLE_TTS_API_KEY found, fallback to WebSpeech.')
    return null
  }

  const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`
  const voiceConfig = VOICE_CONFIGS[speaker]

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: voiceConfig,
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: Math.max(0.75, Math.min(1.5, speakingRate)),
          pitch: 0.0
        }
      })
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.warn('[Google TTS] API error:', response.statusText, err)
      return null
    }

    const data = await response.json()
    if (data.audioContent) {
      return `data:audio/mp3;base64,${data.audioContent}`
    }
    return null
  } catch (error) {
    console.error('[Google TTS] Network/synthesize error:', error)
    return null
  }
}
