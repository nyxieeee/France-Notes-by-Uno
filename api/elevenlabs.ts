import type { VercelRequest, VercelResponse } from '@vercel/node'

const ELEVENLABS_API_KEY = process.env.VITE_ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY || ''

const VOICE_IDS: Record<string, string> = {
  DOC_UNO:        process.env.VITE_ELEVENLABS_VOICE_DOC_UNO        || 'pNInz6obpgDQGcFmaJgB', // Adam
  NURSE_FLORENCE: process.env.VITE_ELEVENLABS_VOICE_NURSE_FLORENCE || '21m00Tcm4TlvDq8ikWAM', // Rachel
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!ELEVENLABS_API_KEY) {
    console.error('[ElevenLabs proxy] No API key configured')
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' })
  }

  const { text, speaker, stability = 0.5, similarity_boost = 0.75 } = req.body ?? {}

  if (!text || !speaker) {
    return res.status(400).json({ error: 'Missing required fields: text, speaker' })
  }

  const voiceId = VOICE_IDS[speaker]
  if (!voiceId) {
    return res.status(400).json({ error: `Unknown speaker: ${speaker}` })
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability,
            similarity_boost,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText)
      console.error('[ElevenLabs proxy] API error:', response.status, errText)
      return res.status(response.status).json({ error: errText })
    }

    // Return as base64 JSON — avoids any binary streaming issues on Vercel
    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    return res.status(200).json({ audio: base64Audio, contentType: 'audio/mpeg' })

  } catch (error: any) {
    console.error('[ElevenLabs proxy] Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
