import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleDownloadRequest } from '../server/download.mjs'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await handleDownloadRequest(req, res)
}
