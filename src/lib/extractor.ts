import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

// Correct way to load pdf.js worker in Vite
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

import { visionExtractText } from './groq'

// pdf.js 5.7 calls Map#getOrInsertComputed when rendering pages, which older
// browsers (e.g. older iOS Safari) don't have yet — polyfill it so scanned-PDF OCR works there
for (const Ctor of [Map, WeakMap] as any[]) {
  if (!Ctor.prototype.getOrInsertComputed) {
    Ctor.prototype.getOrInsertComputed = function (key: any, compute: (key: any) => any) {
      if (!this.has(key)) this.set(key, compute(key))
      return this.get(key)
    }
  }
  if (!Ctor.prototype.getOrInsert) {
    Ctor.prototype.getOrInsert = function (key: any, value: any) {
      if (!this.has(key)) this.set(key, value)
      return this.get(key)
    }
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''

  try {
    if (ext === 'pdf') {
      return await extractTextFromPDF(file)
    } else if (ext === 'docx') {
      return await extractTextFromDOCX(file)
    } else if (ext === 'txt' || ext === 'md' || ext === 'csv') {
      return await file.text()
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      const base64 = await fileToBase64(file)
      return await visionExtractText(base64)
    } else {
      throw new Error(`Unsupported file type: ${ext}`)
    }
  } catch (error) {
    console.error('Extraction Error:', error)
    throw new Error(`Failed to extract text from ${file.name}`)
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  let fullText = ''
  let ocrPages = 0
  
  // Extract text from each page
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    let pageText = textContent.items.map((item: any) => item.str).join(' ')

    // Scanned page (just an image, no text layer) — read it with OCR instead
    if (pageText.trim().length < MIN_TEXT_CHARS && ocrPages < MAX_OCR_PAGES) {
      ocrPages++
      try {
        pageText = await visionExtractText(await renderPageToImage(page))
      } catch (error) {
        console.warn(`OCR failed for page ${i} of ${file.name}:`, error)
      }
    }

    fullText += pageText + '\n\n'
  }
  
  return fullText.trim()
}

// A page with less text than this is treated as scanned
const MIN_TEXT_CHARS = 20
// Each scanned page is one OCR request, so cap it to keep huge scans from taking forever
const MAX_OCR_PAGES = 50
// Long edge in pixels — sharp enough for handwriting, small enough for the API upload limit
const OCR_IMAGE_MAX_PX = 1600

async function renderPageToImage(page: pdfjsLib.PDFPageProxy): Promise<string> {
  const base = page.getViewport({ scale: 1 })
  const scale = OCR_IMAGE_MAX_PX / Math.max(base.width, base.height)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const canvasContext = canvas.getContext('2d')
  if (!canvasContext) throw new Error('Canvas not supported')

  await page.render({ canvasContext, canvas, viewport }).promise
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  page.cleanup()
  return dataUrl
}

async function extractTextFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value.trim()
}
