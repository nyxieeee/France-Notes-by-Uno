import type { VercelRequest, VercelResponse } from '@vercel/node'

const ELEVENLABS_API_KEY = process.env.VITE_ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY || ''

const VOICE_IDS = {
  DOC_UNO:        process.env.VITE_ELEVENLABS_VOICE_DOC_UNO        || 'pNInz6obpgDQGcFmaJgB', // Adam
  NURSE_FLORENCE: process.env.VITE_ELEVENLABS_VOICE_NURSE_FLORENCE || '21m00Tcm4TlvDq8ikWAM', // Rachel
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' })
  }

  const { text, speaker, stability = 0.5, similarity_boost = 0.75 } = req.body

  if (!text || !speaker) {
    return res.status(400).json({ error: 'Missing required fields: text, speaker' })
  }

  const voiceId = VOICE_IDS[speaker as keyof typeof VOICE_IDS]
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
          model_id: 'eleven_turbo_v2_5',
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

    // Stream audio/mpeg back to the browser
    const audioBuffer = await response.arrayBuffer()
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(Buffer.from(audioBuffer))
  } catch (error: any) {
    console.error('[ElevenLabs proxy] Network error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
