import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

// Correct way to load pdf.js worker in Vite
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

import { visionExtractText } from './groq'

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
  
  // Extract text from each page
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item: any) => item.str).join(' ')
    fullText += pageText + '\n\n'
  }
  
  return fullText.trim()
}

async function extractTextFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value.trim()
}
