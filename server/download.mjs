// Echo generated note bytes as an attachment; nothing is stored or logged.
export const MAX_DOWNLOAD_BYTES = 2_800_000
const MAX_REQUEST_BYTES = 4_100_000

export async function handleDownloadRequest(req, res) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  const fail = (status, message) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: message }))
  }
  if (req.headers['sec-fetch-site'] === 'cross-site') return fail(403, 'Cross-site downloads are not allowed')
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ready: true, maxBytes: MAX_DOWNLOAD_BYTES }))
    return
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return fail(405, 'Method not allowed')
  }
  try {
    let fields = req.body
    if (fields === undefined) {
      const chunks = []
      let size = 0
      for await (const chunk of req) {
        size += chunk.length
        if (size > MAX_REQUEST_BYTES) return fail(413, 'File is too large')
        chunks.push(chunk)
      }
      fields = Buffer.concat(chunks).toString('utf8')
    }
    if (Buffer.isBuffer(fields)) fields = fields.toString('utf8')
    if (typeof fields === 'string') fields = Object.fromEntries(new URLSearchParams(fields))
    const { filename, data } = fields ?? {}
    if (typeof filename !== 'string' || typeof data !== 'string' || !data.length || data.length > Math.ceil(MAX_DOWNLOAD_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
      return fail(400, 'Invalid download')
    }
    const bytes = Buffer.from(data, 'base64')
    if (bytes.length > MAX_DOWNLOAD_BYTES) return fail(413, 'File is too large')
    const pdf = filename.toLowerCase().endsWith('.pdf') && bytes.subarray(0, 5).toString() === '%PDF-'
    const docx = filename.toLowerCase().endsWith('.docx') && bytes[0] === 0x50 && bytes[1] === 0x4b
    if (!pdf && !docx) return fail(400, 'Only PDF and Word files are supported')
    const safeName = filename.replace(/[\x00-\x1f\x7f\\/":*?<>|]/g, '_').slice(0, 160)
    const asciiName = safeName.replace(/[^\x20-\x7e]/g, '_')
    const encodedName = encodeURIComponent(safeName).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    res.setHeader('Content-Type', pdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`)
    res.setHeader('Content-Length', bytes.length)
    res.end(bytes)
  } catch {
    fail(400, 'Could not read the download')
  }
}
