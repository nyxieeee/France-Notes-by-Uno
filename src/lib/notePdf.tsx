import { renderToStaticMarkup } from 'react-dom/server'
import MarkdownText from '@/components/shared/MarkdownText'
import { downloadName } from '@/lib/fileNames'
import { PAGE_RATIO, drawPaper, drawStroke, strokeBounds } from '@/lib/handwriting'
import type { Note } from '@/types'

export async function exportNoteToPDF(note: Pick<Note, 'title' | 'content' | 'kind' | 'drawing'>) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF('p', 'pt', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 32
  const width = pageWidth - margin * 2
  const height = pageHeight - margin * 2
  const title = note.title.trim() || 'Untitled note'
  pdf.setProperties({ title, creator: 'France Notes' })

  if (note.kind === 'handwriting') {
    const drawing = note.drawing ?? { paper: 'lined', pages: 1, strokes: [] }
    const canvas = document.createElement('canvas')
    canvas.width = 1640
    canvas.height = Math.round(canvas.width * PAGE_RATIO)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not create the drawing canvas')
    for (let page = 0; page < drawing.pages; page++) {
      if (page) pdf.addPage()
      drawPaper(ctx, drawing.paper, canvas.width, canvas.height)
      const offset = page * PAGE_RATIO
      for (const stroke of drawing.strokes) {
        const [top, bottom] = strokeBounds(stroke)
        if (bottom >= offset && top <= offset + PAGE_RATIO) drawStroke(ctx, stroke, canvas.width, offset)
      }
      pdf.setFontSize(12)
      pdf.text(title, margin, margin, { maxWidth: width })
      const titleHeight = pdf.getTextDimensions(title, { maxWidth: width }).h
      const availableHeight = height - titleHeight - 24
      const imageWidth = Math.min(width, availableHeight / PAGE_RATIO)
      pdf.addImage(canvas, 'PNG', (pageWidth - imageWidth) / 2, margin + titleHeight + 12, imageWidth, imageWidth * PAGE_RATIO)
      pdf.setFontSize(9)
      pdf.text(`${page + 1} / ${drawing.pages}`, pageWidth / 2, pageHeight - 16, { align: 'center' })
    }
  } else {
    const { default: html2canvas } = await import('html2canvas')
    const element = document.createElement('div')
    element.style.cssText = 'position:fixed;left:-10000px;top:0;width:730px;padding:0;background:#fff;color:#202020;font:16px/1.6 Arial,sans-serif;overflow-wrap:anywhere;'
    element.innerHTML = renderToStaticMarkup(<><style>{`
      .markdown-content { color:#202020; }
      h1,h2,h3,h4 { color:#202020; line-height:1.3; }
      pre { white-space:pre-wrap; } table { border-collapse:collapse; width:100%; }
      th,td { border:1px solid #ccc; padding:6px; } img { max-width:100%; }
    `}</style><h1 style={{ fontSize: 28, margin: '0 0 20px' }}>{title}</h1><MarkdownText content={note.content} /></>)
    document.body.appendChild(element)
    try {
      await document.fonts.ready
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true })
      // Slice into separate images so long notes never extend beyond a PDF page.
      // Whole raster rows are retained across pages, including very long paragraphs.
      const rows = Math.floor(height * canvas.width / width)
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      const ctx = slice.getContext('2d')
      if (!ctx) throw new Error('Could not create the PDF canvas')
      for (let y = 0; y < canvas.height; y += rows) {
        if (y) pdf.addPage()
        slice.height = Math.min(rows, canvas.height - y)
        ctx.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, slice.width, slice.height)
        pdf.addImage(slice, 'PNG', margin, margin, width, slice.height * width / canvas.width)
      }
    } finally {
      element.remove()
    }
  }
  await pdf.save(downloadName(title, null, 'pdf'), { returnPromise: true })
}
