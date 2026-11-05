const RICH_PREFIX = 'france-notes:richtext:v1:'
const TAGS = new Set(['P', 'DIV', 'BR', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'SUB', 'SUP', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'UL', 'OL', 'LI'])
const STYLES = ['font-weight', 'font-style', 'text-decoration', 'text-decoration-line', 'text-align', 'font-size', 'color', 'background-color']

export function sanitizeNoteHTML(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const clean = (parent: Element) => {
    for (const node of Array.from(parent.children)) {
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'].includes(node.tagName)) { node.remove(); continue }
      clean(node)
      if (!TAGS.has(node.tagName)) { node.replaceWith(...Array.from(node.childNodes)); continue }
      const style = (node as HTMLElement).style
      const kept = STYLES.map(key => [key, style.getPropertyValue(key)]).filter(([, value]) => value && !/url|expression|var\(/i.test(value))
      for (const attr of Array.from(node.attributes)) node.removeAttribute(attr.name)
      for (const [key, value] of kept) (node as HTMLElement).style.setProperty(key, value)
    }
  }
  clean(doc.body)
  return doc.body.innerHTML
}

export function noteContentHTML(content: string): string {
  if (content.startsWith(RICH_PREFIX)) return sanitizeNoteHTML(content.slice(RICH_PREFIX.length))
  const div = document.createElement('div')
  div.textContent = content
  return div.innerHTML
}

export function encodeNoteHTML(html: string): string {
  return RICH_PREFIX + sanitizeNoteHTML(html)
}

export function noteContentText(content: string): string {
  if (!content.startsWith(RICH_PREFIX)) return content
  const doc = new DOMParser().parseFromString(noteContentHTML(content), 'text/html')
  doc.querySelectorAll('br').forEach(node => node.replaceWith('\n'))
  doc.querySelectorAll('p,div,li,h1,h2,h3,blockquote').forEach(node => node.append('\n'))
  return doc.body.textContent ?? ''
}

// Used by both the editor and PDF so paragraph spacing, lists and headings agree.
export const NOTE_CONTENT_CSS = `
.note-rich-content { white-space:pre-wrap; overflow-wrap:anywhere; tab-size:4; line-height:1.6; }
.note-rich-content p, .note-rich-content div { margin:0; min-height:1.6em; }
.note-rich-content h1 { font-size:2em; font-weight:700; margin:0.5em 0; line-height:1.3; }
.note-rich-content h2 { font-size:1.5em; font-weight:700; margin:0.5em 0; line-height:1.3; }
.note-rich-content h3 { font-size:1.2em; font-weight:700; margin:0.5em 0; line-height:1.3; }
.note-rich-content ul { list-style:disc; padding-left:1.8em; margin:0.5em 0; }
.note-rich-content ol { list-style:decimal; padding-left:1.8em; margin:0.5em 0; }
.note-rich-content b, .note-rich-content strong { font-weight:700; }
.note-rich-content i, .note-rich-content em { font-style:italic; }
.note-rich-content u { text-decoration:underline; }
.note-rich-content s, .note-rich-content strike { text-decoration:line-through; }
.note-rich-content blockquote { border-left:3px solid #be5b6c; padding-left:1em; margin:0.5em 0; }
`
