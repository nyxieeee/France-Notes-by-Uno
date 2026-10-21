// The AI sometimes formats text with markdown even when asked not to. These helpers make sure
// no raw "**", "#" or backticks ever show on screen.

/** Strip markdown symbols from text that is shown as plain text (quiz questions, steps, flashcards…) */
export function stripMarkdown(s: string): string {
  if (!s) return s
  return s
    .replace(/\*\*\*|\*\*/g, '')
    .replace(/__(?=\S)([^_\n]+?)__/g, '$1')
    .replace(/^(\s*)\*\s+/gm, '$1• ')
    .replace(/(^|[\s(["'])\*(?=\S)([^*\n]+?)\*(?=[\s).,;:!?"']|$)/g, '$1$2')
    .replace(/(^|[\s(["'])_(?=\S)([^_\n]+?)_(?=[\s).,;:!?"']|$)/g, '$1$2')
    .replace(/`+/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/** Apply stripMarkdown to every string inside an AI JSON result */
export function deepStripMarkdown<T>(value: T): T {
  if (typeof value === 'string') return stripMarkdown(value) as T
  if (Array.isArray(value)) return value.map(deepStripMarkdown) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, deepStripMarkdown(v)])) as T
  }
  return value
}

/**
 * Repair sloppy markdown before rendering it, so formatting shows instead of symbols:
 * "** Heading**" becomes bold, and a lone "**" on a line is dropped.
 */
export function tidyMarkdown(s: string): string {
  if (!s) return s
  return s.split('\n').map(line => {
    let l = line.replace(/\*\*\*(.+?)\*\*\*/g, '**$1**')
    // A lone "**" with spaces on both sides (not opening the line) is a leftover, not formatting
    l = l.replace(/(\S)\s+\*\*\s+/g, '$1 ')
    l = pairMarkers(l, '**')
    if ((l.match(/`/g) || []).length % 2 === 1) l = l.replace(/`/g, '')
    return l
  }).join('\n')
}

// Pair markers in order (1st with 2nd, 3rd with 4th) and trim the spaces just inside each pair,
// so "** Heading**" renders bold. An odd count can't be paired safely, so the markers are dropped.
function pairMarkers(line: string, marker: string) {
  const parts = line.split(marker)
  if (parts.length === 1) return line
  if (parts.length % 2 === 0) return parts.join('')
  return parts.map((part, i) => (i % 2 === 1 ? part.trim() : part)).join(marker)
}
