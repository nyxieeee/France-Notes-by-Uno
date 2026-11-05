export type FileDownload = {
  save: (blob: Blob, filename: string) => Promise<void>
  cancel: () => void
}

function dataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the download'))
    reader.onabort = () => reject(new Error('Download was cancelled'))
    reader.readAsDataURL(blob)
  })
}

/** Download through the browser's download manager without opening a preview tab. */
export function prepareFileDownload(): FileDownload {
  const webkit = /AppleWebKit/i.test(navigator.userAgent) && !/Chrome\/|Chromium\/|Edg\/|OPR\/|Android/i.test(navigator.userAgent)
  let cancelled = false
  return {
    cancel: () => { cancelled = true },
    save: async (blob, filename) => {
      if (cancelled) return
      // Safari gets embedded file bytes to avoid WebKitBlobResource errors.
      // The download attribute requests a file download in the browser's
      // configured folder; no target or window.open means no preview tab.
      const href = webkit ? await dataURL(blob) : URL.createObjectURL(blob)
      if (cancelled) { if (!webkit) URL.revokeObjectURL(href); return }
      const link = document.createElement('a')
      link.href = href
      link.download = filename
      link.hidden = true
      document.body.append(link)
      try { link.click() } finally {
        // Retain the resource while the browser reads it. Safari's data URL
        // has no dependency on a blob URL or on URL.revokeObjectURL.
        setTimeout(() => {
          link.remove()
          if (!webkit) URL.revokeObjectURL(href)
        }, 5 * 60_000)
      }
    },
  }
}
