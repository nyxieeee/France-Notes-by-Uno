import type { VercelRequest, VercelResponse } from '@vercel/node'

const MISTRAL_API_KEY = process.env.VITE_MISTRAL_API_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!MISTRAL_API_KEY) {
    return res.status(500).json({ error: 'MISTRAL_API_KEY not configured' })
  }

  const { model, messages, temperature, max_tokens, response_format } = req.body

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        ...(response_format ? { response_format: { type: 'json_object' } } : {}),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || response.statusText })
    }

    return res.status(200).json(data)
  } catch (error: any) {
    console.error('Mistral proxy error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
