// Readable titles and download names, e.g. "Chronic Kidney Disease - Slides.pptx"

/** Title without app tags: "AI PPTX —", "[Reference]", file extensions */
export const cleanDeckTitle = (title: string) =>
  title
    .replace(/^AI (PPTX|Review)\s*[—-]\s*/i, '')
    .replace(/\[(Reference|Case Study|Pathophysiology)\]\s*/gi, '')
    .replace(/\.(txt|pdf|docx?|pptx?|md|csv|jpe?g|png|webp)\b/gi, '')
    .trim()

/** A tidy file name: clean title, " - kind", extension; no characters Windows or iOS reject */
export function downloadName(title: string, kind: string | null, ext: string) {
  let base = cleanDeckTitle(title)
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (base.length > 110) base = base.slice(0, 110).replace(/\s+\S*$/, '').trim()
  if (!base) base = 'France Notes'
  return `${kind ? `${base} - ${kind}` : base}.${ext}`
}
