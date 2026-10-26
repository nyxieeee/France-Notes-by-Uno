// Forgiving search for her own library: ignores spacing ("chemo therapy" finds "chemotherapy"),
// small typos ("drigs" finds "drugs"), word order and filler words.

const STOP_WORDS = new Set(['a', 'an', 'the', 'of', 'and', 'or', 'for', 'in', 'on', 'to', 'with', 'is', 'are', 'what', 'how', 'about'])

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

// Edit distance with an early exit once it exceeds `max`
function withinEdits(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return false
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      best = Math.min(best, cur[j])
    }
    if (best > max) return false
    prev = cur
  }
  return prev[b.length] <= max
}

export interface SearchQuery { terms: string[]; compact: string; raw: string }

export function parseQuery(query: string): SearchQuery {
  const words = normalize(query).split(' ').filter(Boolean)
  const terms = words.filter(w => !STOP_WORDS.has(w))
  return { terms: terms.length ? terms : words, compact: words.join(''), raw: query.trim() }
}

/** The word in `word` list that satisfies `term`, if any */
function matchTerm(term: string, words: string[]): string | null {
  for (const w of words) if (w === term) return w
  for (const w of words) if (term.length >= 3 && w.startsWith(term)) return w
  for (const w of words) if (term.length >= 4 && w.includes(term)) return w
  const maxEdits = term.length >= 8 ? 2 : term.length >= 4 ? 1 : 0
  if (maxEdits) for (const w of words) if (withinEdits(term, w, maxEdits)) return w
  return null
}

/**
 * Score one text against the query: 0 means no match. Higher is better.
 * Also returns a word from the text to center the preview snippet on.
 */
export function scoreText(text: string | null | undefined, q: SearchQuery): { score: number; anchor: string | null } {
  if (!text || !q.terms.length) return { score: 0, anchor: null }
  const norm = normalize(text)
  // Whole phrase, ignoring spaces: "chemo therapy" ~ "chemotherapy"
  if (q.compact.length >= 4 && norm.replace(/ /g, '').includes(q.compact)) {
    const anchor = norm.split(' ').find(w => q.compact.startsWith(w) && w.length >= 3) || q.terms[0]
    return { score: 3, anchor }
  }
  const words = Array.from(new Set(norm.split(' ')))
  let matched = 0
  let anchor: string | null = null
  for (const t of q.terms) {
    const hit = matchTerm(t, words)
    if (hit) { matched++; anchor ??= hit }
  }
  const needed = q.terms.length >= 3 ? Math.ceil(q.terms.length * 0.67) : q.terms.length
  if (matched < needed) return { score: 0, anchor: null }
  return { score: 1 + matched / q.terms.length, anchor }
}

/** Best score across fields; the first field (the title) counts double */
export function scoreFields(q: SearchQuery, title: string | null | undefined, ...rest: (string | null | undefined)[]) {
  const t = scoreText(title, q)
  let best = { score: t.score * 2, anchor: t.anchor }
  for (const f of rest) {
    const r = scoreText(f, q)
    if (r.score > best.score) best = r
  }
  return best
}

/** A short excerpt around `anchor` */
export function excerptAround(text: string, anchor: string | null, length = 140) {
  const clean = text.replace(/\s+/g, ' ').replace(/[#*_`>]/g, '').trim()
  const at = anchor ? clean.toLowerCase().indexOf(anchor.toLowerCase()) : -1
  if (at < 0) return clean.slice(0, length)
  const start = Math.max(0, at - 40)
  return (start > 0 ? '…' : '') + clean.slice(start, start + length) + (start + length < clean.length ? '…' : '')
}
