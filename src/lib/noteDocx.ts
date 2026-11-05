import {
  AlignmentType, Document, HeadingLevel, ImageRun, LevelFormat, Packer, Paragraph,
  ShadingType, TextRun, UnderlineType,
} from 'docx'
import type { IParagraphOptions, IRunOptions, INumberingOptions } from 'docx'
import type { Note } from '@/types'
import { noteContentHTML, NOTE_CONTENT_CSS } from '@/lib/noteContent'
import { PAGE_RATIO, drawPaper, drawStroke, strokeBounds } from '@/lib/handwriting'
import { downloadName } from '@/lib/fileNames'
import { downloadFile } from '@/lib/fileDownload'

type ExportNote = Pick<Note, 'title' | 'content' | 'kind' | 'drawing'>

function hexColor(value: string): string | undefined {
  if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return undefined
  const rgb = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  return rgb ? rgb.slice(1, 4).map(n => Number(n).toString(16).padStart(2, '0')).join('') : undefined
}

export async function createNoteDOCX(note: ExportNote): Promise<Blob> {
  const title = note.title.trim() || 'Untitled note'
  const children: Paragraph[] = []
  const numbering: INumberingOptions['config'][number][] = []
  const addTitle = (pageBreakBefore = false) => children.push(new Paragraph({
    heading: HeadingLevel.TITLE, pageBreakBefore,
    children: [new TextRun({ text: title, bold: true, size: 42, color: '202020' })],
    spacing: { after: 280 },
  }))

  if (note.kind === 'handwriting') {
    const drawing = note.drawing ?? { paper: 'lined', pages: 1, strokes: [] }
    const canvas = document.createElement('canvas')
    canvas.width = 1640
    canvas.height = Math.round(canvas.width * PAGE_RATIO)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not create the drawing canvas')
    for (let page = 0; page < drawing.pages; page++) {
      addTitle(page > 0)
      drawPaper(ctx, drawing.paper, canvas.width, canvas.height)
      for (const stroke of drawing.strokes) {
        const [top, bottom] = strokeBounds(stroke)
        if (bottom >= page * PAGE_RATIO && top <= (page + 1) * PAGE_RATIO) drawStroke(ctx, stroke, canvas.width, page * PAGE_RATIO)
      }
      const data = new Uint8Array(await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer())
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({
        type: 'png', data, transformation: { width: 610, height: Math.round(610 * PAGE_RATIO) },
      })] }))
    }
  } else {
    addTitle()
    // Resolve inherited inline formatting using the same styles as the editor.
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:730px;color:#202020;font:16px/1.6 Arial,sans-serif;'
    const style = document.createElement('style')
    style.textContent = NOTE_CONTENT_CSS
    const body = document.createElement('div')
    body.className = 'note-rich-content'
    body.innerHTML = noteContentHTML(note.content)
    host.append(style, body)
    document.body.append(host)
    try {
      const blocks = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'LI'])
      const alignment = (element: Element) => {
        const value = getComputedStyle(element).textAlign
        return value === 'center' ? AlignmentType.CENTER : value === 'right' ? AlignmentType.RIGHT
          : value === 'justify' ? AlignmentType.JUSTIFIED : AlignmentType.LEFT
      }
      const run = (text: string, element: Element): TextRun => {
        const css = getComputedStyle(element)
        let decorations = '', background: string | undefined
        for (let ancestor: Element | null = element; ancestor && host.contains(ancestor); ancestor = ancestor.parentElement) {
          const inherited = getComputedStyle(ancestor)
          decorations += ` ${inherited.textDecorationLine}`
          background ??= hexColor(inherited.backgroundColor)
        }
        const options: IRunOptions = {
          text, font: 'Arial', size: Math.round(parseFloat(css.fontSize) * 1.5),
          bold: Number(css.fontWeight) >= 600 || css.fontWeight === 'bold', italics: css.fontStyle === 'italic',
          strike: decorations.includes('line-through'),
          underline: decorations.includes('underline') ? { type: UnderlineType.SINGLE } : undefined,
          color: hexColor(css.color),
          shading: background ? { type: ShadingType.CLEAR, fill: background } : undefined,
          subScript: !!element.closest('sub'), superScript: !!element.closest('sup'),
        }
        return new TextRun(options)
      }
      const walk = (container: Element, list?: { reference: string; level: number }) => {
        let runs: TextRun[] = []
        let emitted = false
        let listUsed = false
        const flush = (force = false) => {
          if (!runs.length && !force) return
          const heading = ({ H1: HeadingLevel.HEADING_1, H2: HeadingLevel.HEADING_2, H3: HeadingLevel.HEADING_3 } as Record<string, IParagraphOptions['heading']>)[container.tagName]
          children.push(new Paragraph({ children: runs, heading,
            alignment: alignment(container), numbering: list && !listUsed ? list : undefined,
            indent: container.tagName === 'BLOCKQUOTE' ? { left: 360 } : undefined,
            spacing: { after: heading ? 160 : 0, line: 384 }, widowControl: true,
          }))
          runs = []; emitted = true; listUsed = true
        }
        const inline = (node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const parts = (node.textContent ?? '').split('\n')
            parts.forEach((part, i) => { if (i) flush(true); if (part) runs.push(run(part, node.parentElement ?? container)) })
          } else if (node instanceof Element) {
            if (node.tagName === 'BR') { flush(true); return }
            if (node.tagName === 'UL' || node.tagName === 'OL') {
              flush()
              const reference = `note-list-${numbering.length}`
              const level = Math.min(list ? list.level + 1 : 0, 8)
              numbering.push({ reference, levels: Array.from({ length: 9 }, (_, n) => ({
                level: n, format: node.tagName === 'OL' ? LevelFormat.DECIMAL : LevelFormat.BULLET,
                text: node.tagName === 'OL' ? `%${n + 1}.` : '\u2022', start: 1,
                alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360 * (n + 1), hanging: 240 } } },
              })) })
              for (const item of Array.from(node.children)) walk(item, { reference, level })
              emitted = true
            } else if (blocks.has(node.tagName)) {
              flush(); walk(node, list && !listUsed ? list : undefined); emitted = true; listUsed = true
            } else Array.from(node.childNodes).forEach(inline)
          }
        }
        Array.from(container.childNodes).forEach(inline)
        flush(!emitted || runs.length > 0)
      }
      walk(body)
    } finally { host.remove() }
  }
  return Packer.toBlob(new Document({
    title, creator: 'France Notes', numbering: { config: numbering },
    styles: { default: { document: { run: { font: 'Arial', size: 24, color: '202020' } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children }],
  }))
}

export async function exportNoteToDOCX(note: ExportNote) {
  const blob = await createNoteDOCX(note)
  downloadFile(blob, downloadName(note.title || 'Untitled note', null, 'docx'))
}
