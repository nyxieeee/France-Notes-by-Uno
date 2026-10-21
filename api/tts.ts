import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

// Free neural voices (the same ones Microsoft Edge's Read Aloud uses). No API key or quota.
const DEFAULT_VOICES: Record<string, string> = {
  DOC_UNO: 'en-US-AndrewMultilingualNeural',
  NURSE_FLORENCE: 'en-US-AvaMultilingualNeural',
}

const VOICE_PATTERN = /^[a-z]{2,3}-[A-Z]{2}-[A-Za-z]+Neural$/
const MAX_CHARS = 5000

function synthesize(text: string, voice: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tts = new MsEdgeTTS({ connectionTimeoutMs: 10000 })
    const chunks: Buffer[] = []
    const timer = setTimeout(() => { tts.close(); reject(new Error('Speech timed out')) }, 25000)
    const finish = (err?: Error) => {
      clearTimeout(timer)
      tts.close()
      if (err) reject(err)
      else if (!chunks.length) reject(new Error('No audio returned'))
      else resolve(Buffer.concat(chunks))
    }
    tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3)
      .then(() => {
        const { audioStream } = tts.toStream(text)
        audioStream.on('data', (d: Buffer) => chunks.push(d))
        audioStream.on('close', () => finish())
        audioStream.on('error', (e: Error) => finish(e))
      })
      .catch(finish)
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { text, speaker, voice } = req.body ?? {}
  if (typeof text !== 'string' || !text.trim() || !speaker) {
    return res.status(400).json({ error: 'Missing required fields: text, speaker' })
  }
  if (!DEFAULT_VOICES[speaker]) {
    return res.status(400).json({ error: `Unknown speaker: ${speaker}` })
  }

  const voiceName = typeof voice === 'string' && VOICE_PATTERN.test(voice) ? voice : DEFAULT_VOICES[speaker]

  try {
    const audio = await synthesize(text.slice(0, MAX_CHARS), voiceName)
    return res.status(200).json({ audio: audio.toString('base64'), contentType: 'audio/mpeg' })
  } catch (error) {
    console.error('[TTS proxy] Error:', error)
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Speech failed' })
  }
}
