import { jsPDF } from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import type { ReviewerItem } from '@/types'
import { useAuthStore } from '@/stores/authStore'

export const exportToPDF = async (reviewer: ReviewerItem) => {
  const { user } = useAuthStore.getState()
  const FRANCE_EMAILS = [
    'franceregraceceles@gmail.com',
    'fraceles@gbox.ncf.edu.ph',
    'regraceceles97@gmail.com',
  ]
  const isFrance = FRANCE_EMAILS.includes(user?.email?.toLowerCase() ?? '')
  const aiAssistantName = isFrance ? 'Doc Uno' : 'Nurse Florence'

  try {
    const pdfWidth = 595.28
    const pdfHeight = 841.89
    const margin = 24
    const contentWidthPt = pdfWidth - margin * 2 // 547pt
    const containerPx = Math.round(contentWidthPt * 96 / 72) // 730px

    const html2canvas = (await import('html2canvas')).default
    const pdf = new jsPDF('p', 'pt', 'a4')
    let yOffset = margin

    const drawBorder = () => {
      pdf.setDrawColor(251, 207, 232)
      pdf.setLineWidth(1.2)
      pdf.roundedRect(margin - 4, margin - 4, pdfWidth - (margin - 4) * 2, pdfHeight - (margin - 4) * 2, 10, 10)
    }
    drawBorder()

    const parseMarkdown = (text: string) => {
      if (!text) return ''
      let parsed = text
        .replace(/### (.*?)(?=\n|$)/g, '<strong style="color:#db2777; display:block; margin-top:12px; margin-bottom:6px; font-size:13px;">$1</strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1f2937;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em style="color:#4b5563;">$1</em>')
        .replace(/- (.*?)(?=\n|$)/g, '<li style="margin-bottom:6px; line-height:1.6;">$1</li>')
      
      if (parsed.includes('<li')) {
        parsed = `<ul style="padding-left:20px; margin:8px 0; color:#4b5563;">${parsed.split('\n').filter(line => line.trim().startsWith('<li')).join('')}</ul>` + 
                 parsed.split('\n').filter(line => !line.trim().startsWith('<li')).join('<br/>')
      } else {
        parsed = parsed.split('\n').join('<br/>')
      }
      return parsed
    }

    const renderAndPlace = async (html: string) => {
      const div = document.createElement('div')
      div.style.cssText = `width:${containerPx}px; font-family:'Outfit','Segoe UI',sans-serif; background:#ffffff; position:fixed; left:-${containerPx + 50}px; top:0; z-index:9999;`
      div.innerHTML = html
      document.body.appendChild(div)
      await new Promise(r => setTimeout(r, 80))

      const canvas = await html2canvas(div, {
        scale: 2, useCORS: true, logging: false,
        backgroundColor: '#ffffff', width: containerPx, windowWidth: containerPx
      })
      document.body.removeChild(div)

      const imgH = (canvas.height * contentWidthPt) / canvas.width
      if (yOffset + imgH > pdfHeight - margin) {
        pdf.addPage(); drawBorder(); yOffset = margin
      }
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, yOffset, contentWidthPt, imgH)
      yOffset += imgH + 6
    }

    // Header
    await renderAndPlace(`
      <div style="background:#fdf2f8; padding:18px 22px 16px; border-bottom:1.5px solid #fbcfe8;">
        <div style="font-size:8px; font-weight:800; color:#f9a8d4; letter-spacing:2px; text-transform:uppercase; margin-bottom:5px;">✨ ${isFrance ? "Doc Uno's Love Notes" : `${aiAssistantName}'s Clinical Study Notes`}</div>
        <div style="font-size:18px; font-weight:800; color:#1f2937; line-height:1.2;">${reviewer.title}</div>
      </div>
    `)

    // Summary / Overview
    if (reviewer.content.summary) {
      await renderAndPlace(`
        <div style="padding:16px 22px 10px;">
          <div style="color:#ec4899; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">📖 Core Concepts / Overview</div>
          <div style="color:#4b5563; font-size:11px; line-height:1.8;">
            ${parseMarkdown(reviewer.content.summary)}
          </div>
        </div>
      `)
    }

    // Key points / Priorities
    if (reviewer.content.key_points && reviewer.content.key_points.length > 0) {
      const lis = reviewer.content.key_points.map(pt => `<li style="margin-bottom:8px;">${pt}</li>`).join('')
      await renderAndPlace(`
        <div style="padding:10px 22px 10px;">
          <div style="color:#ec4899; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">🩺 Key Nursing Priorities & Board-Exam High Yields</div>
          <div style="color:#4b5563; font-size:11px; line-height:1.8;">
            <ul style="padding-left:20px; margin:0;">
              ${lis}
            </ul>
          </div>
        </div>
      `)
    }

    // Study Tips / Pearls
    if (reviewer.content.mnemonics && reviewer.content.mnemonics.length > 0) {
      const pearls = reviewer.content.mnemonics.map(m => `
        <div style="margin-bottom:12px;">
          <strong style="color:#ec4899; font-size:11px;">🧸 ${m.title}</strong>
          <div style="color:#4b5563; font-size:11px; line-height:1.7; margin-top:2px;">${m.content}</div>
        </div>
      `).join('')

      await renderAndPlace(`
        <div style="padding:12px 22px;">
          <div style="background:#fff5fb; border:1px solid #fbcfe8; border-radius:10px; padding:16px 18px;">
            <div style="color:#be185d; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:12px;">💡 ${isFrance ? "Doc Uno's Clinical Pearls & Study Tips" : `${aiAssistantName}'s Clinical Pearls & Key Insights`}</div>
            <div style="font-size:11px; color:#4b5563; line-height:1.6; margin-bottom:12px;">
              ${isFrance 
                ? "Kaya mo 'yan, future RN! Master these high-yield memory aids:"
                : "Master these high-yield clinical memory aids and definitions:"
              }
            </div>
            ${pearls}
          </div>
        </div>
      `)
    }

    // Footer
    await renderAndPlace(`
      <div style="background:#fdf2f8; border-top:1.5px solid #fbcfe8; padding:12px 22px; text-align:center;">
        <div style="font-size:8px; font-weight:800; color:#f9a8d4; letter-spacing:2px; text-transform:uppercase;">
          ${isFrance ? "Made with ❤️ by Doc Uno for France" : `Prepared with ❤️ by ${aiAssistantName}`}
        </div>
        <div style="font-size:8px; font-weight:700; color:#d1d5db; margin-top:3px; letter-spacing:1px; text-transform:uppercase;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
      </div>
    `)

    pdf.save(`${reviewer.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_Study_Guide.pdf`)
  } catch (err) {
    console.error("PDF Export error:", err)
  }
}

export const exportToDOCX = async (reviewer: ReviewerItem) => {
  const { user } = useAuthStore.getState()
  const FRANCE_EMAILS = [
    'franceregraceceles@gmail.com',
    'fraceles@gbox.ncf.edu.ph',
    'regraceceles97@gmail.com',
  ]
  const isFrance = FRANCE_EMAILS.includes(user?.email?.toLowerCase() ?? '')
  const aiAssistantName = isFrance ? 'Doc Uno' : 'Nurse Florence'

  const children: any[] = [
    new Paragraph({
      text: reviewer.title,
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      text: `Source: ${reviewer.source_file}`,
      spacing: { after: 400 },
    })
  ]

  // Summary
  if (reviewer.content.summary) {
    children.push(
      new Paragraph({ text: "AI Summary", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: reviewer.content.summary, spacing: { after: 400 } })
    )
  }

  // Key Points
  if (reviewer.content.key_points && reviewer.content.key_points.length > 0) {
    children.push(new Paragraph({ text: "Key Concepts", heading: HeadingLevel.HEADING_2 }))
    reviewer.content.key_points.forEach((point, index) => {
      children.push(new Paragraph({
        text: `${index + 1}. ${point}`,
        spacing: { after: 200 }
      }))
    })
    children.push(new Paragraph({ text: "", spacing: { after: 200 } })) // Add space
  }

  // Mnemonics
  if (reviewer.content.mnemonics && reviewer.content.mnemonics.length > 0) {
    children.push(new Paragraph({ text: "Mnemonics", heading: HeadingLevel.HEADING_2 }))
    reviewer.content.mnemonics.forEach(m => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${m.title}: `, bold: true }),
          new TextRun({ text: m.content })
        ],
        spacing: { after: 200 }
      }))
    })
  }

  // Cute Footer
  children.push(new Paragraph({ text: "", spacing: { after: 400 } }))
  children.push(new Paragraph({
    children: [
      new TextRun({ 
        text: isFrance 
          ? "Prepared with love by Doc Uno. You've got this, babe! <3" 
          : `Prepared with care by ${aiAssistantName}. Wish you the best in your study!`, 
        italics: true, 
        color: isFrance ? "EC4899" : "3B82F6" 
      })
    ]
  }))

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }]
  })

  const blob = await Packer.toBlob(doc)
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${reviewer.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`
  link.click()
  window.URL.revokeObjectURL(url)
}
