/** Save generated files locally, without an API upload or server size limit. */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.hidden = true
  document.body.append(link)
  try { link.click() } finally {
    // Safari may still be reading the URL after the click handler completes.
    setTimeout(() => { link.remove(); URL.revokeObjectURL(url) }, 5 * 60_000)
  }
}
