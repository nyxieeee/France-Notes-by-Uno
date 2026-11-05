import type { IncomingMessage, ServerResponse } from 'node:http'

export const MAX_DOWNLOAD_BYTES: number
export function handleDownloadRequest(req: IncomingMessage & { body?: unknown }, res: ServerResponse): Promise<void>
