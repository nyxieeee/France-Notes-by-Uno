import { getStroke } from 'perfect-freehand'
import type { HandwritingDrawing, InkStroke } from '@/types'
export const PAGE_RATIO = 1.294
const PAPER_COLOR = '#FFFDF9'
const DEFAULT_PRESSURE = 0.5
type Paper = HandwritingDrawing['paper']
function strokePath(stroke: InkStroke, width: number, yOffset: number) {
  const simulated = stroke.points.every(p => p[2] === DEFAULT_PRESSURE)
  const outline = getStroke(
    stroke.points.map(([x, y, p]) => [x * width, (y - yOffset) * width, p]),
    {
      size: stroke.size * width,
      thinning: stroke.tool === 'pen' ? 0.6 : 0,
      smoothing: 0.5,
      streamline: 0.45,
      simulatePressure: simulated,
      last: true,
    },
  )
  const path = new Path2D()
  if (outline.length === 0) return path
  path.moveTo(outline[0][0], outline[0][1])
  for (let i = 1; i < outline.length; i++) {
    const [x0, y0] = outline[i - 1]
    const [x1, y1] = outline[i]
    path.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
  }
  path.closePath()
  return path
}

export function drawStroke(ctx: CanvasRenderingContext2D, stroke: InkStroke, width: number, yOffset: number) {
  ctx.save()
  ctx.fillStyle = stroke.color
  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = 0.38
    ctx.globalCompositeOperation = 'multiply'
  }
  ctx.fill(strokePath(stroke, width, yOffset))
  ctx.restore()
}

export function drawPaper(ctx: CanvasRenderingContext2D, paper: Paper, width: number, height: number) {
  ctx.fillStyle = PAPER_COLOR
  ctx.fillRect(0, 0, width, height)
  if (paper === 'lined') {
    const gap = width * 0.036
    ctx.strokeStyle = '#D6E2F0'
    ctx.lineWidth = 1
    for (let y = width * 0.1; y < height - gap / 2; y += gap) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
    }
    ctx.strokeStyle = '#F0B4BE'
    ctx.beginPath(); ctx.moveTo(width * 0.1, 0); ctx.lineTo(width * 0.1, height); ctx.stroke()
  } else if (paper === 'grid') {
    const gap = width * 0.03
    ctx.strokeStyle = '#E4E7EE'
    ctx.lineWidth = 1
    for (let x = gap; x < width; x += gap) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke() }
    for (let y = gap; y < height; y += gap) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke() }
  } else if (paper === 'dotted') {
    const gap = width * 0.03
    ctx.fillStyle = '#C9CED8'
    for (let x = gap; x < width; x += gap) {
      for (let y = gap; y < height; y += gap) { ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill() }
    }
  }
}

export function strokeBounds(stroke: InkStroke) {
  let min = Infinity, max = -Infinity
  for (const [, y] of stroke.points) { if (y < min) min = y; if (y > max) max = y }
  return [min - stroke.size, max + stroke.size]
}

