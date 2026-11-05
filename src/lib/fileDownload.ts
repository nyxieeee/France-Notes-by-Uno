export type FileDownload = {
  save: (blob: Blob, filename: string) => Promise<void>
  cancel: () => void
}

export class FileDownloadError extends Error {}

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
      if (webkit) {
        // An HTTP attachment works through Safari's download manager without
        // relying on an async synthetic click on a blob/data URL.
        const response = await fetch('/api/download', { cache: 'no-store' }).catch(() => null)
        const config = await response?.json().catch(() => null)
        if (!response?.ok || config?.ready !== true || typeof config.maxBytes !== 'number') {
          throw new FileDownloadError('The download service is unavailable. Refresh the app and try again.')
        }
        if (blob.size > config.maxBytes) {
          throw new FileDownloadError('This export is too large for the iPad download service (2.8 MB). Split the note into smaller notes and try again.')
        }
        const encoded = await dataURL(blob)
        if (cancelled) return
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = '/api/download'
        form.target = '_self'
        form.hidden = true
        for (const [name, value] of Object.entries({ filename, data: encoded.slice(encoded.indexOf(',') + 1) })) {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = name
          input.value = value
          form.append(input)
        }
        document.body.append(form)
        // The attachment response leaves the current app page in place.
        try { form.submit() } finally { setTimeout(() => form.remove(), 60_000) }
        return
      }
      const href = URL.createObjectURL(blob)
      if (cancelled) { URL.revokeObjectURL(href); return }
      const link = document.createElement('a')
      link.href = href
      link.download = filename
      link.hidden = true
      document.body.append(link)
      try { link.click() } finally {
        // Retain the resource while the browser reads it.
        setTimeout(() => {
          link.remove()
          URL.revokeObjectURL(href)
        }, 5 * 60_000)
      }
    },
  }
}
