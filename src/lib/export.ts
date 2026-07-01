import { jsPDF } from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import type { ReviewerItem } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { isFranceUser } from '@/lib/personalization'

export const exportToPDF = async (reviewer: ReviewerItem) => {
  const { user } = useAuthStore.getState()
  const isFrance = isFranceUser(user)
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
  const isFrance = isFranceUser(user)
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

export const exportToPPTX = async (reviewer: ReviewerItem) => {
  if (!reviewer.content.slides || reviewer.content.slides.length === 0) return

  try {
    const pptxgen = (await import('pptxgenjs')).default
    const pptx = new pptxgen()
    pptx.layout = 'LAYOUT_16x9'

    const { user } = useAuthStore.getState()
    const isFrance = isFranceUser(user)

    // Brand Palette
    const bgColor = 'FFF8F6'
    const cardBgColor = 'FFFFFF'
    const binderColor = 'F7A8B8'
    const borderColor = 'F3D8DE'
    const titleTextColor = '5B4636'
    const bodyTextColor = '8C6A74'

    // 1. Cover Slide
    const coverSlide = pptx.addSlide()
    
    // Set base background
    coverSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: '100%',
      fill: { color: bgColor }
    })

    // Left binder notebook strip
    coverSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.4, h: 7.5,
      fill: { color: binderColor }
    })

    // Main Cover Card (looks like a clean, premium note card)
    coverSlide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: 0.6, w: 11.7, h: 6.3,
      fill: { color: cardBgColor },
      line: { color: borderColor, width: 1.5 }
    })

    // Decorative stethoscope emoji
    coverSlide.addText(isFrance ? "🩺 🌸 🧸 🎀" : "🩺 🧠 👩‍⚕️ ✨", {
      x: 9.5, y: 0.9, w: 2.5,
      fontSize: 18,
      align: 'right'
    })

    // Cover title
    coverSlide.addText(reviewer.title, {
      x: 1.3, y: 1.8, w: 10.7, h: 1.6,
      fontSize: 30,
      bold: true,
      color: titleTextColor,
      fontFace: 'Arial'
    })

    // Source description
    coverSlide.addText(`Clinical Resource: ${reviewer.source_file}`, {
      x: 1.3, y: 3.6, w: 10.7,
      fontSize: 13,
      bold: true,
      color: bodyTextColor,
      fontFace: 'Arial'
    })

    // Sweet footer note
    coverSlide.addText(
      isFrance 
        ? 'Prepared with love by Doc Uno for France 🌸🩺' 
        : 'Clinical Lecture Series • Prepared by Nurse Florence 🩺👩‍⚕️',
      {
        x: 1.3, y: 5.6, w: 10.7,
        fontSize: 12,
        italic: true,
        color: bodyTextColor,
        fontFace: 'Arial'
      }
    )

    // 2. Individual content slides
    reviewer.content.slides.forEach((slideData) => {
      const slide = pptx.addSlide()

      // Background
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: '100%',
        fill: { color: bgColor }
      })

      // Left binder notebook strip
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 0.4, h: 7.5,
        fill: { color: binderColor }
      })

      // Inner content card
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.8, y: 0.6, w: 11.7, h: 6.3,
        fill: { color: cardBgColor },
        line: { color: borderColor, width: 1.5 }
      })

      // Slide Title
      slide.addText(slideData.title, {
        x: 1.3, y: 0.9, w: 10.7, h: 0.6,
        fontSize: 22,
        bold: true,
        color: titleTextColor,
        fontFace: 'Arial'
      })

      // Title divider line
      slide.addShape(pptx.ShapeType.rect, {
        x: 1.3, y: 1.6, w: 10.7, h: 0.03,
        fill: { color: borderColor }
      })

      // Paragraph explanation (prose)
      let contentY = 1.9
      if (slideData.paragraph) {
        slide.addText(slideData.paragraph, {
          x: 1.3, y: contentY, w: 10.7, h: 1.2,
          fontSize: 12,
          fontFace: 'Arial',
          color: bodyTextColor,
          lineSpacing: 18,
          valign: 'top',
          wrap: true,
        })
        contentY += 1.4
      }

      // Content bullet points
      if (slideData.bullet_points && slideData.bullet_points.length > 0) {
        const bullets = slideData.bullet_points.map((pt: string) => {
          return { text: pt, options: { bullet: true, color: titleTextColor, fontSize: 13 } }
        })

        const bulletHeight = Math.max(4.4 - (contentY - 1.9), 2.0)
        slide.addText(bullets, {
          x: 1.3, y: contentY, w: 10.7, h: bulletHeight,
          fontSize: 13,
          fontFace: 'Arial',
          lineSpacing: 22,
          valign: 'top'
        })
      }

      // Presenter Notes
      if (slideData.presenter_notes) {
        slide.addNotes(slideData.presenter_notes)
      }

      // Footer branding
      slide.addText(isFrance ? "Doc Uno's Reviewer 🌸" : "France Notes 🩺", {
        x: 9.0, y: 6.4, w: 3.0,
        fontSize: 9,
        color: bodyTextColor,
        align: 'right',
        fontFace: 'Arial'
      })
    })

    // 3. Save / Download presentation
    await pptx.writeFile({ fileName: `${reviewer.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_Slides.pptx` })
  } catch (err) {
    console.error("Failed to export PPTX slide deck:", err)
  }
}

export const printFlashcards = (reviewer: ReviewerItem) => {
  const cards = reviewer.content.flashcards
  if (!cards || cards.length === 0) {
    alert("Babe, there are no flashcards generated for this reviewer yet! 🌸")
    return
  }

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert("Please allow popups to print your flashcards! 🩺")
    return
  }

  const { user } = useAuthStore.getState()
  const isFrance = isFranceUser(user)

  // Build the print HTML
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Flashcards - ${reviewer.title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');
        
        body {
          font-family: 'Outfit', 'Segoe UI', sans-serif;
          background-color: #ffffff;
          color: #5b4636;
          margin: 0;
          padding: 20px;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px dashed #f3d8de;
          padding-bottom: 15px;
        }

        .header h1 {
          font-size: 24px;
          margin: 0 0 5px 0;
          color: #db2777;
        }

        .header p {
          font-size: 13px;
          color: #8c6a74;
          margin: 0;
        }

        .grid-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 25px;
          max-width: 800px;
          margin: 0 auto;
        }

        /* Printable Flashcard layout: Front and Back side-by-side with fold crease */
        .card-pair {
          display: flex;
          border: 2px dashed #f7a8b8;
          border-radius: 16px;
          overflow: hidden;
          background-color: #fff8f6;
          page-break-inside: avoid;
          min-height: 180px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        }

        .card-half {
          flex: 1;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          box-sizing: border-box;
        }

        .card-front {
          background-color: #ffffff;
          border-right: 2px dotted #f7a8b8;
        }

        .card-back {
          background-color: #fff8f6;
        }

        .badge {
          position: absolute;
          top: 10px;
          left: 15px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 2px 8px;
          border-radius: 99px;
        }

        .badge-front {
          background-color: #ffd6e0;
          color: #db2777;
        }

        .badge-back {
          background-color: #a8d8b9;
          color: #2f6a4f;
        }

        .card-text {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.5;
          text-align: center;
          margin-top: 15px;
          word-break: break-word;
        }

        .instructions {
          background-color: #fff0f3;
          border: 1px solid #ffd6e0;
          padding: 15px;
          border-radius: 12px;
          margin-bottom: 25px;
          font-size: 12px;
          color: #8c6a74;
          text-align: center;
          max-width: 800px;
          margin: 0 auto 25px auto;
        }

        @media print {
          body {
            padding: 0;
          }
          .instructions {
            display: none;
          }
          .card-pair {
            box-shadow: none;
            page-break-inside: avoid;
            margin-bottom: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${reviewer.title} - Printable Flashcards</h1>
        <p>${isFrance ? "Prepared with love by Doc Uno for France 🌸" : "Clinical Practice Series • France Notes App 🩺"}</p>
      </div>

      <div class="instructions">
        <strong>💡 Printing & Folding Instructions:</strong> Print this sheet on standard paper or cardstock. Cut along the outer <strong>dashed lines</strong>. Fold along the middle <strong>dotted vertical crease</strong> to align the Front and Back, then tape or glue them together to create your double-sided flashcard!
      </div>

      <div class="grid-container">
        ${cards.map((c, idx) => `
          <div class="card-pair">
            <div class="card-half card-front">
              <span class="badge badge-front">Card ${idx + 1} (Front)</span>
              <div class="card-text">${c.front}</div>
            </div>
            <div class="card-half card-back">
              <span class="badge badge-back">Rationale (Back)</span>
              <div class="card-text">${c.back}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `

  printWindow.document.write(htmlContent)
  printWindow.document.close()
}

