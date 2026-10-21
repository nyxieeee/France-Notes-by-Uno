// Dev server for local API proxy
// Run with: node api/dev.mjs
// Then start Vite: npm run dev

const { createServer } = await import('http')
const { readFileSync, existsSync } = await import('fs')
const { join, dirname } = await import('path')
const { fileURLToPath } = await import('url')

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env')

// Load .env
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim()
        const value = trimmed.slice(eqIdx + 1).trim()
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    }
  }
}

const MISTRAL_API_KEY = process.env.VITE_MISTRAL_API_KEY
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY
const ELEVENLABS_API_KEY = process.env.VITE_ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY

const ELEVENLABS_VOICES = {
  DOC_UNO:        process.env.VITE_ELEVENLABS_VOICE_DOC_UNO        || 'pNInz6obpgDQGcFmaJgB', // Adam
  NURSE_FLORENCE: process.env.VITE_ELEVENLABS_VOICE_NURSE_FLORENCE || 'EXAVITQu4vr4xnSDxMaL', // Sarah
}

if (!MISTRAL_API_KEY && !GEMINI_API_KEY) {
  console.warn('⚠ No API keys found in .env. Create a .env file from .env.example')
}

async function handleRequest(req, res) {
  const url = new URL(req.url, 'http://localhost:3001')
  const path = url.pathname

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  let body
  try {
    body = await new Promise((resolve, reject) => {
      let data = ''
      req.on('data', chunk => data += chunk)
      req.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { reject(new Error('Invalid JSON')) }
      })
      req.on('error', reject)
    })
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid JSON body' }))
    return
  }

  try {
    if (path === '/api/mistral') {
      if (!MISTRAL_API_KEY) throw new Error('VITE_MISTRAL_API_KEY not set')
      const apiRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_API_KEY}` },
        body: JSON.stringify(body),
      })
      const data = await apiRes.json()
      res.writeHead(apiRes.status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data))

    } else if (path === '/api/gemini') {
      if (!GEMINI_API_KEY) throw new Error('VITE_GEMINI_API_KEY not set')
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${body.model}:generateContent?key=${GEMINI_API_KEY}`
      const apiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await apiRes.json()
      res.writeHead(apiRes.status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data))

    } else if (path === '/api/elevenlabs') {
      if (!ELEVENLABS_API_KEY) throw new Error('VITE_ELEVENLABS_API_KEY not set')
      const { text, speaker, stability = 0.5, similarity_boost = 0.75 } = body
      const voiceId = ELEVENLABS_VOICES[speaker]
      if (!voiceId) throw new Error(`Unknown speaker: ${speaker}`)
      const apiRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_flash_v2_5',
          voice_settings: { stability, similarity_boost, style: 0.0, use_speaker_boost: true },
        }),
      })
      if (!apiRes.ok) {
        const errText = await apiRes.text().catch(() => apiRes.statusText)
        res.writeHead(apiRes.status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: errText }))
        return
      }
      const audioBuffer = await apiRes.arrayBuffer()
      const base64Audio = Buffer.from(audioBuffer).toString('base64')
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({ audio: base64Audio, contentType: 'audio/mpeg' }))

    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not found' }))
    }
  } catch (error) {
    console.error(`Proxy error [${path}]:`, error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: error.message || 'Internal server error' }))
  }
}

const PORT = 3001
createServer(handleRequest).listen(PORT, () => {
  console.log(`✅ API dev server running on http://localhost:${PORT}`)
  console.log(`   Routes: /api/mistral, /api/gemini, /api/elevenlabs`)
  console.log(`   Start Vite in another terminal: npm run dev`)
})
