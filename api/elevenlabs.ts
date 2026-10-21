import type { VercelRequest, VercelResponse } from '@vercel/node'

const ELEVENLABS_API_KEY = process.env.VITE_ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY || ''

const VOICE_IDS: Record<string, string> = {
  DOC_UNO:        process.env.VITE_ELEVENLABS_VOICE_DOC_UNO        || 'iP95p4xoKVk53GtZA4qT', // Chris (Premade, natural and conversational)
  NURSE_FLORENCE: process.env.VITE_ELEVENLABS_VOICE_NURSE_FLORENCE || 'EXAVITQu4vr4xnSDxMaL', // Sarah (Premade - Free Tier Supported)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!ELEVENLABS_API_KEY) {
    console.error('[ElevenLabs proxy] No API key configured')
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' })
  }

  const { text, speaker, voice_id, previous_text, next_text } = req.body ?? {}

  if (!text || !speaker) {
    return res.status(400).json({ error: 'Missing required fields: text, speaker' })
  }

  // A voice picked in the app (ElevenLabs ids are 20 letters/digits), else the host's default
  const voiceId = typeof voice_id === 'string' && /^[A-Za-z0-9]{20}$/.test(voice_id) ? voice_id : VOICE_IDS[speaker]
  if (!voiceId || !VOICE_IDS[speaker]) {
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
          // Turbo: natural, expressive delivery while still quick enough for conversation
          model_id: 'eleven_turbo_v2_5',
          previous_text: previous_text || undefined,
          next_text: next_text || undefined,
          // Lower stability and some style = more natural variation, less flat "AI" reading
          voice_settings: {
            stability: 0.38,
            similarity_boost: 0.8,
            style: 0.3,
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
