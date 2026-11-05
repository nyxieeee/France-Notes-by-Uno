import { normalizeDownloadFilename } from '@/lib/fileNames'

/** Save generated files locally, without an API upload or server size limit. */
export function downloadFile(blob: Blob, filename: string): void {
  const downloadFilename = normalizeDownloadFilename(filename)
  const webkit = /AppleWebKit/i.test(navigator.userAgent) && !/Chrome\/|Chromium\/|Edg\/|OPR\/|Android/i.test(navigator.userAgent)
  const pdf = blob.type.split(';')[0].toLowerCase() === 'application/pdf' || /\.pdf$/i.test(downloadFilename)
  // WebKit can ignore `download` for application/pdf and navigate to its PDF
  // viewer instead. A binary MIME type avoids that inline-preview route;
  // the original PDF bytes and .pdf filename are preserved.
  const file = webkit && pdf ? new Blob([blob], { type: 'application/octet-stream' }) : blob
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = downloadFilename
  link.hidden = true
  document.body.append(link)
  try { link.click() } finally {
    // Safari may still be reading the URL after the click handler completes.
    setTimeout(() => { link.remove(); URL.revokeObjectURL(url) }, 5 * 60_000)
  }
}
