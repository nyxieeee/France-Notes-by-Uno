// Keep full document titles separate from short, readable download filenames.
export const MAX_DOWNLOAD_NAME_LENGTH = 64

/** Remove generated labels and source-file extensions from a document title. */
export const cleanDeckTitle = (title: string) =>
  title
    .replace(/^AI (PPTX|Review)\s*[-\u2013\u2014:]\s*/i, '')
    .replace(/\[(Reference|Case Study|Pathophysiology)\]\s*/gi, '')
    .replace(/\.(txt|pdf|docx?|pptx?|md|csv|jpe?g|png|webp)\b/gi, '')
    .trim()

function cleanFilenamePart(value: string): string {
  return value.normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/[_\\/:*?"<>|#\x60~]+/g, ' ')
    .replace(/[\u2013\u2014]+/g, ' - ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.-]+|[\s.-]+$/g, '')
}

function shorten(value: string, limit: number): string {
  const characters = Array.from(value)
  if (characters.length <= limit) return value
  const clipped = characters.slice(0, limit).join('')
  // Prefer whole words, while still handling very long single-word titles.
  const boundary = clipped.lastIndexOf(' ')
  const result = boundary >= limit / 2 ? clipped.slice(0, boundary) : clipped
  return result.replace(/[\s.\-,;:]+$/g, '')
}

/** Short filename with spaces, a useful export label, and the correct extension. */
export function downloadName(title: string, kind: string | null, ext: string): string {
  const extension = ext.replace(/^\.+/, '').replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 10) || 'file'
  const stemLimit = MAX_DOWNLOAD_NAME_LENGTH - extension.length - 1
  const label = shorten(cleanFilenamePart(kind ?? ''), Math.min(20, stemLimit - 16))
  const suffix = label ? ' - ' + label : ''
  let base = cleanFilenamePart(cleanDeckTitle(title))
    .replace(/^(Doc Uno|Nurse Florence)\s+/i, '')
  if (label && base.toLowerCase().endsWith(suffix.toLowerCase())) base = base.slice(0, -suffix.length).trim()
  if (!base) base = 'France Notes'
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(base)) base = 'Notes ' + base
  base = shorten(base, stemLimit - Array.from(suffix).length)
  return base + suffix + '.' + extension
}

/** Enforce naming rules at the shared download boundary, including future exports. */
export function normalizeDownloadFilename(filename: string): string {
  const match = filename.match(/^(.*)\.([a-z0-9]{1,10})$/is)
  return match ? downloadName(match[1], null, match[2]) : downloadName(filename, null, 'file')
}
