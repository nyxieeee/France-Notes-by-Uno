import { useState, useRef, useEffect } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { Brain as BrainCircuit, Target, Clock, ArrowRight, ArrowLeft, CheckCircle as CheckCircle2, WarningCircle as AlertCircle, Question as HelpCircle, Sparkle as Sparkles, Lightning as Zap, ArrowCounterClockwise as RotateCcw, Layout, Check, Plus, CaretDown as ChevronDown, FileText, Stethoscope, ListNumbers as ListOrdered, ToggleLeft, MagnifyingGlass as Search, PencilSimple as Edit3, BookOpen, ClockCounterClockwise as History, DownloadSimple as Download, Trash as Trash2, CloudArrowDown as DownloadCloud, FileArrowDown as FileDown } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { jsPDF } from 'jspdf'
import { cn, getScoreColor, getScoreLabel, checkAnswerCorrectness } from '@/lib/utils'
import MarkdownText from '@/components/shared/MarkdownText'
import type { QuestionType, QuizSetupConfig } from '@/types'
import { usePersonalization } from '@/hooks/usePersonalization'

export default function QuizPage() {
  const { isFrance, greetingName, aiAssistantName, appName } = usePersonalization()
  const { activeQuiz, isGenerating, generationProgress, isFinished, quizzes, startQuiz, resetQuiz, deleteQuiz } = useQuizStore()
  const { topics } = useStudyBoxStore()
  const [showHistory, setShowHistory] = useState(false)

  const completedQuizzes = quizzes.filter(q => q.completed)

  const exportQuizToPDF = async (quiz: any) => {
    try {
      const pdfWidth = 595.28
      const pdfHeight = 841.89
      const margin = 24
      const contentWidthPt = pdfWidth - margin * 2  // 547pt
      const containerPx = Math.round(contentWidthPt * 96 / 72)  // 730px – exact A4 content width

      const html2canvas = (await import('html2canvas')).default
      const pdf = new jsPDF('p', 'pt', 'a4')
      let yOffset = margin

      const drawBorder = () => {
        pdf.setDrawColor(251, 207, 232)
        pdf.setLineWidth(1.2)
        pdf.roundedRect(margin - 4, margin - 4, pdfWidth - (margin - 4) * 2, pdfHeight - (margin - 4) * 2, 10, 10)
      }
      drawBorder()

      // Render one HTML section as an image, place it in the PDF.
      // If it doesn't fit on current page → add new page first.
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
        yOffset += imgH + 4
      }

      // Header
      await renderAndPlace(`
        <div style="background:#fdf2f8; padding:18px 22px 16px; border-bottom:1.5px solid #fbcfe8;">
          <div style="font-size:8px; font-weight:800; color:#f9a8d4; letter-spacing:2px; text-transform:uppercase; margin-bottom:5px;">✨ ${isFrance ? "Doc Uno's Love Notes" : `${aiAssistantName}'s Clinical Notes`}</div>
          <div style="font-size:18px; font-weight:800; color:#1f2937;">${quiz.title}</div>
          <div style="font-size:10px; color:#9ca3af; font-weight:600; margin-top:4px;">${new Date(quiz.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
      `)

      // Score
      await renderAndPlace(`
        <div style="padding:18px 22px; border-bottom:1.5px solid #fbcfe8; display:flex; align-items:center; gap:20px; background:#fff5fb;">
          <div style="font-size:38px; font-weight:900; color:#ec4899; line-height:1; display:flex; align-items:center; margin-top:-2px;">${quiz.score}%</div>
          <div style="display:flex; flex-direction:column; justify-content:center;">
            <div style="font-size:13px; font-weight:800; color:#be185d; line-height:1.2;">Quiz Complete! 🎉</div>
            <div style="font-size:10px; color:#9ca3af; margin-top:3px; line-height:1.2;">
              ${isFrance ? 'Great job, babe! So proud of you 🧸💖' : `Great job, ${greetingName}! Extremely proud of your effort! 🩺✨`}
            </div>
          </div>
        </div>
      `)

      // Each question individually
      if (quiz.questions && quiz.user_answers) {
        for (let i = 0; i < quiz.questions.length; i++) {
          const q = quiz.questions[i]
          const userAnswer = quiz.user_answers[q.id]
          const isCorrect = checkAnswerCorrectness(q.correct_answer, userAnswer, q.question_type)
          const userAnsText = Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer
          const correctAnsText = Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer

          await renderAndPlace(`
            <div style="padding:14px 16px 14px 20px; border-left:3px solid ${isCorrect ? '#a7f3d0' : '#fbcfe8'}; background:${isCorrect ? '#f0fdf4' : '#fff9fb'};">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-size:9px; font-weight:800; color:#9ca3af; text-transform:uppercase; letter-spacing:1.2px;">Question ${i + 1}</span>
                <span style="font-size:9px; font-weight:800; padding:2px 8px; border-radius:999px; background:${isCorrect ? '#d1fae5' : '#ffe4e6'}; color:${isCorrect ? '#065f46' : '#be123c'};">${isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
              </div>
              <div style="font-size:12px; font-weight:700; color:#1f2937; margin-bottom:8px; line-height:1.5;">${q.question}</div>
              <div style="font-size:10.5px; color:#6b7280; margin-bottom:3px;"><b>Your Answer:</b> ${userAnsText}</div>
              <div style="font-size:10.5px; color:#6b7280; margin-bottom:10px;"><b>Correct Answer:</b> <span style="color:#059669; font-weight:700;">${correctAnsText}</span></div>
              <div style="background:#fce7f3; border-radius:8px; padding:10px 12px;">
                <div style="font-size:8px; font-weight:800; color:#db2777; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:5px;">🩺 ${isFrance ? "Doc Uno's Rationale" : `${aiAssistantName}'s Rationale`}</div>
                <div style="font-size:10.5px; line-height:1.7; color:#6b7280;">${q.rationale}</div>
              </div>
            </div>
          `)
        }
      }

      // Footer
      await renderAndPlace(`
        <div style="background:#fdf2f8; border-top:1.5px solid #fbcfe8; padding:12px 22px; text-align:center;">
          <div style="font-size:8px; font-weight:800; color:#f9a8d4; letter-spacing:2px; text-transform:uppercase;">
            ${isFrance ? 'Made with ❤️ by Doc Uno for France' : `Made with ❤️ by ${aiAssistantName}`}
          </div>
          <div style="font-size:8px; font-weight:700; color:#d1d5db; margin-top:3px; letter-spacing:1px; text-transform:uppercase;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
      `)

      pdf.save(`${quiz.title.replace(/\s+/g, '_')}_Quiz_Results.pdf`)
    } catch (err) {
      console.error('PDF Export error:', err)
    }
  }

  const exportAllToPDF = async () => {
    if (completedQuizzes.length === 0) return

    try {
      const pdfWidth = 595.28
      const pdfHeight = 841.89
      const margin = 24
      const contentWidthPt = pdfWidth - margin * 2
      const containerPx = Math.round(contentWidthPt * 96 / 72)

      const html2canvas = (await import('html2canvas')).default
      const pdf = new jsPDF('p', 'pt', 'a4')
      let yOffset = margin

      const drawBorder = () => {
        pdf.setDrawColor(251, 207, 232)
        pdf.setLineWidth(1.2)
        pdf.roundedRect(margin - 4, margin - 4, pdfWidth - (margin - 4) * 2, pdfHeight - (margin - 4) * 2, 10, 10)
      }
      drawBorder()

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
        yOffset += imgH + 4
      }

      // Master Header
      await renderAndPlace(`
        <div style="background:#fdf2f8; padding:18px 22px 16px; border-bottom:1.5px solid #fbcfe8;">
          <div style="font-size:8px; font-weight:800; color:#f9a8d4; letter-spacing:2px; text-transform:uppercase; margin-bottom:5px;">✨ ${isFrance ? "Doc Uno's Love Notes" : `${aiAssistantName}'s Clinical Notes`}</div>
          <div style="font-size:18px; font-weight:800; color:#1f2937;">Master Quiz History</div>
          <div style="font-size:10px; color:#9ca3af; font-weight:600; margin-top:4px;">${completedQuizzes.length} quiz${completedQuizzes.length !== 1 ? 'zes' : ''} completed 🎉</div>
        </div>
      `)

      // Each quiz
      for (let qIndex = 0; qIndex < completedQuizzes.length; qIndex++) {
        const quiz = completedQuizzes[qIndex]

        // Quiz title/score divider
        await renderAndPlace(`
          <div style="padding:10px 22px 8px; background:#fff5fb; border-top:1.5px solid #fbcfe8; border-bottom:1px solid #fbcfe8;">
            <div style="font-size:11px; font-weight:800; color:#ec4899;">${qIndex + 1}. ${quiz.title}</div>
            <div style="font-size:9px; color:#9ca3af; margin-top:2px;">Score: ${quiz.score}% · ${new Date(quiz.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
        `)

        if (quiz.questions && quiz.user_answers) {
          for (let i = 0; i < quiz.questions.length; i++) {
            const q = quiz.questions[i]
            const userAnswer = quiz.user_answers[q.id]
            const isCorrect = checkAnswerCorrectness(q.correct_answer, userAnswer, q.question_type)
            const userAnsText = Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer
            const correctAnsText = Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer

            await renderAndPlace(`
              <div style="padding:14px 16px 14px 20px; border-left:3px solid ${isCorrect ? '#a7f3d0' : '#fbcfe8'}; background:${isCorrect ? '#f0fdf4' : '#fff9fb'};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:9px; font-weight:800; color:#9ca3af; text-transform:uppercase; letter-spacing:1.2px;">Question ${i + 1}</span>
                  <span style="font-size:9px; font-weight:800; padding:2px 8px; border-radius:999px; background:${isCorrect ? '#d1fae5' : '#ffe4e6'}; color:${isCorrect ? '#065f46' : '#be123c'};">${isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
                </div>
                <div style="font-size:12px; font-weight:700; color:#1f2937; margin-bottom:8px; line-height:1.5;">${q.question}</div>
                <div style="font-size:10.5px; color:#6b7280; margin-bottom:3px;"><b>Your Answer:</b> ${userAnsText}</div>
                <div style="font-size:10.5px; color:#6b7280; margin-bottom:10px;"><b>Correct Answer:</b> <span style="color:#059669; font-weight:700;">${correctAnsText}</span></div>
                <div style="background:#fce7f3; border-radius:8px; padding:10px 12px;">
                  <div style="font-size:8px; font-weight:800; color:#db2777; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:5px;">🩺 ${isFrance ? "Doc Uno's Rationale" : `${aiAssistantName}'s Rationale`}</div>
                  <div style="font-size:10.5px; line-height:1.7; color:#6b7280;">${q.rationale}</div>
                </div>
              </div>
            `)
          }
        }
      }

      // Footer
      await renderAndPlace(`
        <div style="background:#fdf2f8; border-top:1.5px solid #fbcfe8; padding:12px 22px; text-align:center;">
          <div style="font-size:8px; font-weight:800; color:#f9a8d4; letter-spacing:2px; text-transform:uppercase;">
            ${isFrance ? 'Proud of you always, future RN! — Doc Uno ❤️' : `Proud of your dedication to excellence! — ${aiAssistantName} 🩺`}
          </div>
          <div style="font-size:8px; font-weight:700; color:#d1d5db; margin-top:3px; letter-spacing:1px; text-transform:uppercase;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
      `)

      pdf.save(`${isFrance ? 'France_Notes' : 'Clinical_Notes'}_All_Quizzes.pdf`)
    } catch (err) {
      console.error('PDF Export error:', err)
    }
  }

  return (

    <div className="page-container">
      <AnimatePresence mode="wait">
        {isGenerating ? (
          <motion.div 
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
             <div className="w-24 h-24 bg-[var(--secondary-bg)] rounded-2xl flex items-center justify-center text-[var(--pink)] mb-8 shadow-fn animate-float">
                <BrainCircuit size={48} className="animate-pulse-soft" />
             </div>
             <h2 className="text-2xl font-bold mb-2">{aiAssistantName} is curating your quiz... 🩺✨</h2>
             <p className="text-[var(--text-secondary)] max-w-sm">
               {isFrance 
                 ? 'Analyzing your topics, generating high-yield nursing questions, and preparing rationales just for you, babe! 🌸'
                 : 'Analyzing your topics, generating high-yield nursing questions, and preparing detailed clinical rationales! 🩺'
               }
             </p>
             <div className="mt-8 w-64 h-2 bg-[var(--secondary-bg)] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(4, (generationProgress.done / Math.max(1, generationProgress.total)) * 100)}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="h-full bg-[var(--pink)] rounded-full"
                ></motion.div>
             </div>
             <p className="mt-3 text-sm font-bold text-[var(--pink)]">
               {generationProgress.done} of {generationProgress.total} questions ready
             </p>
          </motion.div>
        ) : !activeQuiz ? (
          showHistory ? (
            <QuizHistory 
              quizzes={completedQuizzes} 
              onBack={() => setShowHistory(false)} 
              onDownload={exportQuizToPDF}
              onExportAll={exportAllToPDF}
              onDelete={deleteQuiz}
            />
          ) : topics.length === 0 ? (
            <EmptyQuizState />
          ) : (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <QuizSetup onStart={startQuiz} historyCount={completedQuizzes.length} onShowHistory={() => setShowHistory(true)} />
            </motion.div>
          )
        ) : isFinished ? (
          <motion.div 
            key="results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <QuizResults />
          </motion.div>
        ) : (
          <motion.div 
            key="running"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <QuizEngine />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function QuizSetup({ onStart, historyCount, onShowHistory }: { onStart: (config: QuizSetupConfig) => void; historyCount: number; onShowHistory: () => void }) {
  const { isFrance, aiAssistantName } = usePersonalization()
  const { topics, items, savedKnowledge } = useStudyBoxStore()
  const location = useLocation()
  
  // Topics that have either uploaded files or saved knowledge references
  let activeTopics = topics.filter(topic => 
    items.some(item => item.topic_id === topic.id) ||
    savedKnowledge.some(k => k.category.toLowerCase() === topic.title.toLowerCase())
  )

  // Fallback to all topics if none are active so the user can still generate general quizzes
  if (activeTopics.length === 0) {
    activeTopics = topics
  }

  // Parse state passed via router navigate
  const preSelectedIds = location.state?.selectedItemIds as string[] | undefined
  const preSelectedItems = preSelectedIds ? items.filter(item => preSelectedIds.includes(item.id)) : []

  const preSelectedTopic = location.state?.preSelectedTopic as string | undefined
  const preSelectedText = location.state?.preSelectedText as string | undefined
  const preSelectedName = location.state?.preSelectedName as string | undefined

  const initialTopic = preSelectedTopic || (preSelectedItems.length > 0
    ? (preSelectedItems.length === 1 ? preSelectedItems[0].file_name.split('.')[0] : `${preSelectedItems.length} Notes Combined`)
    : (activeTopics[0]?.title || 'General Nursing'))

  const initialSourceText = preSelectedText || (preSelectedItems.length > 0
    ? preSelectedItems.map(item => `--- DOCUMENT: ${item.file_name} ---\n${item.extracted_text}`).join('\n\n')
    : undefined)

  const initialSourceName = preSelectedName || (preSelectedItems.length > 0
    ? preSelectedItems.map(item => item.file_name).join(', ')
    : undefined)

  const [config, setConfig] = useState<QuizSetupConfig>({
    topic: initialTopic,
    size: 20,
    question_type: 'mixed',
    sourceText: initialSourceText,
    sourceName: initialSourceName,
    timer_type: 'untimed',
    timer_value: 0
  })

  const questionTypes: { id: QuestionType | 'mixed', label: string, icon: any }[] = [
    { id: 'mixed', label: 'Mixed Styles', icon: Layout },
    { id: 'multiple_choice', label: 'Multiple Choice', icon: CheckCircle2 },
    { id: 'sata', label: 'SATA (Select All)', icon: Plus },
    { id: 'prioritization', label: 'Prioritization', icon: ListOrdered },
    { id: 'situational', label: 'Situational', icon: Target },
    { id: 'nclex', label: 'NCLEX Style', icon: Stethoscope },
    { id: 'true_false', label: 'True/False', icon: ToggleLeft },
    { id: 'identification', label: 'Identification', icon: Search },
    { id: 'fill_blank', label: 'Fill in the Blanks', icon: Edit3 },
    { id: 'essay', label: 'Essay / Written', icon: FileText },
    { id: 'clinical_judgment', label: 'Clinical Judgment', icon: HelpCircle },
    { id: 'case_study', label: 'Case Study', icon: BookOpen }
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        icon={BrainCircuit}
        title="Quiz Generator"
        subtitle="Board-style practice questions from your topics and notes, with detailed rationales."
        actions={
          <button onClick={onShowHistory} className="btn-secondary px-4 py-2 text-sm flex items-center gap-2">
            <History size={16} /> My Quizzes ({historyCount})
          </button>
        }
      />

      {preSelectedItems.length > 0 && (
        <div className="mb-6 p-4 bg-th-pink/10 border border-th-pink/30 rounded-2xl flex items-center gap-3 text-[var(--pink)] animate-fade-in shadow-sm">
          <Sparkles className="animate-pulse flex-shrink-0" size={20} />
          <div>
            <p className="font-bold text-sm">Combined Study Material Loaded!</p>
            <p className="text-xs opacity-90 font-medium leading-relaxed">{isFrance ? "Doc Uno" : aiAssistantName} will generate this quiz using the combined content from: {preSelectedItems.map(i => i.file_name).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="fn-card p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* Source Material Selection */}
        <div className="space-y-4">
          <label className="text-sm font-bold text-[var(--text-secondary)] ml-1">Select Source Material</label>
          
          <div className="space-y-4">
            {/* By Topic */}
            <div>
              <p className="text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">By Topic</p>
              <CustomTopicDropdown 
                topics={topics} 
                value={config.topic} 
                onChange={(topicTitle) => {
                  // Collect all extracted text from items in this topic
                  const matchedTopic = topics.find(t => t.title === topicTitle)
                  const topicItems = matchedTopic
                    ? items.filter(i => i.topic_id === matchedTopic.id && i.extracted_text)
                    : []
                  const topicSourceText = topicItems.length > 0
                    ? topicItems.map(i => `--- DOCUMENT: ${i.file_name} ---\n${i.extracted_text}`).join('\n\n')
                    : undefined
                  setConfig({ 
                    ...config, 
                    topic: topicTitle, 
                    sourceText: topicSourceText,
                    sourceName: topicItems.length > 0 ? topicItems.map(i => i.file_name).join(', ') : undefined 
                  })
                }} 
              />
            </div>

            {/* By Uploaded File */}
            {items.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">By Uploaded File</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.slice(0, 4).map(item => (
                    <button
                      key={item.id}
                      onClick={() => setConfig({ ...config, topic: item.file_name, sourceText: item.extracted_text, sourceName: item.file_name })}
                      className={cn(
                        "p-4 rounded-2xl border text-left transition-all",
                        config.sourceName === item.file_name
                          ? "bg-th-pink/10 border-[var(--pink)] shadow-sm" 
                          : "bg-[var(--bg)] border-[var(--border)] hover:border-[var(--pink)]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-[var(--bg)] flex items-center justify-center flex-shrink-0">
                           <FileText size={14} className="text-[var(--text-secondary)]" />
                         </div>
                         <div className="min-w-0">
                           <span className={cn("font-bold text-sm block truncate", config.sourceName === item.file_name ? "text-[var(--pink)]" : "text-[var(--text)]")}>
                             {item.file_name}
                           </span>
                           <span className="text-[10px] text-[var(--text-secondary)]">From Study Box</span>
                         </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Size Selection */}
        <div className="space-y-4">
          <label className="text-sm font-bold text-[var(--text-secondary)] ml-1">Number of Questions</label>
          <CustomSizeDropdown value={config.size} onChange={(val) => setConfig({ ...config, size: val })} />
        </div>

        {/* Type Selection */}
        <div className="space-y-4">
          <label className="text-sm font-bold text-[var(--text-secondary)] ml-1">Question Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {questionTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setConfig({ ...config, question_type: type.id })}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2",
                  config.question_type === type.id 
                    ? "bg-th-pink/10 border-[var(--pink)] text-[var(--pink)] shadow-sm" 
                    : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--pink)] hover:text-[var(--pink)]"
                )}
              >
                <type.icon size={20} />
                <span className="text-xs font-bold">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Timer Selection */}
        <div className="space-y-4">
          <label className="text-sm font-bold text-[var(--text-secondary)] ml-1">Quiz Timer Limit</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              { id: 'untimed', label: 'Untimed', desc: 'Study at your own pace', icon: ToggleLeft, value: 0 },
              { id: 'total_quiz_5', label: '5 Minutes', desc: 'Speed check', icon: Clock, type: 'total_quiz', value: 300 },
              { id: 'total_quiz_10', label: '10 Minutes', desc: 'Standard exam', icon: Clock, type: 'total_quiz', value: 600 },
              { id: 'total_quiz_20', label: '20 Minutes', desc: 'Full review', icon: Clock, type: 'total_quiz', value: 1200 },
              { id: 'total_quiz_60', label: '1 Hour', desc: 'Board simulation', icon: Clock, type: 'total_quiz', value: 3600 },
              { id: 'total_quiz_120', label: '2 Hours', desc: 'Marathon exam', icon: Clock, type: 'total_quiz', value: 7200 },
              { id: 'total_quiz_180', label: '3 Hours', desc: 'Grand PNLE prep', icon: Clock, type: 'total_quiz', value: 10800 },
              { id: 'per_question_30', label: '30s / Question', desc: 'NCLEX speed', icon: Zap, type: 'per_question', value: 30 },
              { id: 'per_question_60', label: '60s / Question', desc: 'PNLE standard', icon: Zap, type: 'per_question', value: 60 },
              { id: 'per_question_90', label: '90s / Question', desc: 'Deep case study', icon: Zap, type: 'per_question', value: 90 }
            ].map(timer => {
              const isSelected = 
                timer.id === 'untimed' 
                  ? config.timer_type === 'untimed' 
                  : config.timer_type === timer.type && config.timer_value === timer.value

              return (
                <button
                  key={timer.id}
                  type="button"
                  onClick={() => setConfig({ 
                    ...config, 
                    timer_type: timer.id === 'untimed' ? 'untimed' : (timer.type as any),
                    timer_value: timer.value
                  })}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-1.5 text-center",
                    isSelected
                      ? "bg-th-pink/10 border-[var(--pink)] text-[var(--pink)] shadow-sm"
                      : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--pink)] hover:text-[var(--pink)]"
                  )}
                >
                  <timer.icon size={18} className={cn(isSelected ? "animate-pulse" : "")} />
                  <div className="font-semibold text-xs">{timer.label}</div>
                  <div className="text-[9px] opacity-80 leading-tight">{timer.desc}</div>
                </button>
              )
            })}
          </div>
        </div>

        <button 
          onClick={() => onStart(config)}
          className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 group shadow-fn-md"
        >
          Generate Quiz <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}

function QuizEngine() {
  const { isFrance, greetingName, aiAssistantName } = usePersonalization()
  const { 
    activeQuiz, 
    questions, 
    currentIndex, 
    answers, 
    submitAnswer, 
    nextQuestion, 
    prevQuestion, 
    finishQuiz 
  } = useQuizStore()
  
  const [showRationale, setShowRationale] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)
  
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (activeQuiz?.timer_type === 'total_quiz') {
      return activeQuiz.timer_value || 600
    } else if (activeQuiz?.timer_type === 'per_question') {
      return activeQuiz.timer_value || 60
    }
    return 0
  })

  const [timesUp, setTimesUp] = useState(false)

  useEffect(() => {
    if (activeQuiz?.timer_type === 'per_question') {
      setTimeLeft(activeQuiz.timer_value || 60)
      setTimesUp(false)
    }
  }, [currentIndex, activeQuiz])

  useEffect(() => {
    if (!activeQuiz || activeQuiz.timer_type === 'untimed') return
    if (showRationale && activeQuiz.timer_type === 'per_question') return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          if (activeQuiz.timer_type === 'total_quiz') {
            setTimesUp(true)
            setTimeout(() => {
              finishQuiz()
            }, 2500)
          } else if (activeQuiz.timer_type === 'per_question') {
            handleCheckAnswer()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [activeQuiz, currentIndex, showRationale])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const question = questions[currentIndex] || questions[0]
  if (!question) return null

  const isSata = question?.question_type === 'sata'
  const isEssayInput = question?.question_type === 'essay'
  const isTextInput = question?.question_type === 'identification' || question?.question_type === 'fill_blank'
  const currentAnswer = answers[question?.id] || (isSata ? [] : '')

  const handleChoiceClick = (choice: string) => {
    if (isSata) {
      const prev = (currentAnswer as string[]) || []
      const next = prev.includes(choice) 
        ? prev.filter(c => c !== choice) 
        : [...prev, choice]
      submitAnswer(question.id, next)
    } else {
      submitAnswer(question.id, choice)
    }
  }

  const handleCheckAnswer = () => {
    const userAnswer = answers[question?.id]
    const correct = checkAnswerCorrectness(question?.correct_answer, userAnswer, question?.question_type)
    setIsCorrect(correct)
    setShowRationale(true)
    // Smooth scroll down to rationale card
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      })
    }, 100)
  }

  const handleNext = () => {
    setShowRationale(false)
    setIsCorrect(null)
    // Scroll back to top smoothly
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
    if (currentIndex === questions.length - 1) {
      finishQuiz()
    } else {
      nextQuestion()
    }
  }

  const progress = ((currentIndex + 1) / questions.length) * 100

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Header */}
        <div className="flex items-start sm:items-center justify-between mb-6 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
           <button onClick={prevQuestion} disabled={currentIndex === 0} className="btn-icon disabled:opacity-30 shrink-0">
              <ArrowLeft size={20} />
           </button>
           <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-bold text-[var(--text-secondary)]">Q{currentIndex + 1}/{questions.length}</p>
              <h3 className="font-bold text-xs sm:text-sm truncate">{activeQuiz?.title}</h3>
           </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
           {/* End Quiz button */}
           {confirmEnd ? (
             <div className="flex items-center gap-1">
               <span className="text-[10px] font-bold text-[var(--text-secondary)] hidden sm:inline">End quiz?</span>
               <button
                 onClick={() => { setConfirmEnd(false); finishQuiz() }}
                 className="text-[10px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl bg-[var(--error)] text-white hover:opacity-90 transition-opacity whitespace-nowrap"
               >
                 <span className="sm:hidden">End ✓</span>
                 <span className="hidden sm:inline">Yes, end</span>
               </button>
               <button
                 onClick={() => setConfirmEnd(false)}
                 className="text-[10px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl bg-[var(--secondary-bg)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
               >✕</button>
             </div>
           ) : (
             <button
               onClick={() => setConfirmEnd(true)}
               className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--error)] px-2.5 py-1.5 rounded-xl border border-[var(--border)] hover:border-th-error/40 transition-all whitespace-nowrap"
               title="End Quiz"
             >
               <span className="sm:hidden">✕ End</span>
               <span className="hidden sm:inline">End Quiz</span>
             </button>
           )}
           {activeQuiz?.timer_type === 'untimed' ? (
              <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] bg-th-secondary-bg/30 px-2 sm:px-3 py-1.5 rounded-full whitespace-nowrap">
                <Clock size={11} />
                <span className="hidden sm:inline">Untimed ☕</span>
                <span className="sm:hidden">∞</span>
              </div>
            ) : (
              <div className={cn(
                "flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-full transition-all duration-300 whitespace-nowrap",
                timeLeft <= 10 
                  ? "bg-red-100 text-red-600 animate-pulse" 
                  : "text-[var(--text-secondary)] bg-th-secondary-bg/30"
              )}>
                <Clock size={11} className={timeLeft <= 10 ? "animate-spin-slow text-red-600" : ""} />
                <span>{formatTime(timeLeft)}</span>
                {activeQuiz?.timer_type === 'per_question' && <span className="text-[8px] opacity-75">/Q</span>}
              </div>
            )}
         </div>
       </div>


      <div className="w-full h-1.5 bg-[var(--border)] rounded-full mb-8 overflow-hidden">
         <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${progress}%` }}
           className="h-full bg-[var(--pink)] transition-all duration-300"
         ></motion.div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={question.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-8"
        >
          <div className="fn-card p-4 sm:p-8 md:p-10 relative overflow-hidden">
             {/* Decor */}
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <BrainCircuit size={120} />
             </div>

             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                   <span className="text-[11px] font-bold px-3 py-1 bg-[var(--secondary-bg)] text-[var(--pink)] rounded-full">
                     {question.question_type?.replace('_', ' ') || 'Question'}
                   </span>
                   {isSata && <span className="text-[11px] font-bold text-[var(--warning)] italic">Select all that apply</span>}
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold leading-relaxed">{question.question}</h2>
             </div>
          </div>

          {isEssayInput ? (
            <div className="mt-4">
               <textarea 
                 value={currentAnswer as string}
                 onChange={(e) => submitAnswer(question.id, e.target.value)}
                 disabled={showRationale}
                 placeholder="Type your clinical explanation / essay response here..."
                 rows={6}
                 className={cn(
                   "w-full bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-6 text-base font-medium outline-none transition-all focus:border-[var(--pink)] focus:ring-4 focus:ring-th-pink/10 placeholder:text-th-text-secondary/50 shadow-sm resize-none",
                   showRationale && "border-[var(--pink)] bg-th-pink/5"
                 )}
               />
               {showRationale && (
                 <div className="mt-4 space-y-4">
                   <div className="p-6 rounded-2xl bg-th-pink/5 border border-th-pink/20 shadow-sm">
                     <h4 className="text-xs font-bold text-[var(--pink)] mb-2">Model Answer / Key Points 🌸</h4>
                     <p className="text-sm font-semibold text-[var(--text)] whitespace-pre-line leading-relaxed">
                       {Array.isArray(question.correct_answer) ? question.correct_answer.join('\n') : question.correct_answer}
                     </p>
                   </div>
                   
                   <div className="p-4 rounded-xl bg-th-secondary-bg/20 border border-[var(--border)] text-xs text-[var(--text-secondary)] leading-relaxed italic">
                     Babe, since this is a written essay question, compare your response with the model response above to evaluate yourself. You're doing amazing! 🩺🌸
                   </div>
                 </div>
               )}
            </div>
          ) : isTextInput ? (
            <div className="mt-4">
               <input 
                 type="text" 
                 value={currentAnswer as string}
                 onChange={(e) => submitAnswer(question.id, e.target.value)}
                 disabled={showRationale}
                 placeholder="Type your answer here..."
                 className={cn(
                   "w-full bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-6 text-lg font-bold outline-none transition-all focus:border-[var(--pink)] focus:ring-4 focus:ring-th-pink/10 placeholder:text-th-text-secondary/50 placeholder:font-medium shadow-sm",
                   showRationale && isCorrect && "border-[var(--success)] bg-th-success/5 text-[var(--success)]",
                   showRationale && !isCorrect && "border-[var(--error)] bg-th-error/5 text-[var(--error)]"
                 )}
               />
               {showRationale && !isCorrect && (
                 <div className="mt-4 p-4 rounded-xl bg-th-success/10 border border-th-success/20">
                   <p className="text-sm font-bold text-[var(--success)]">Correct Answer: {Array.isArray(question.correct_answer) ? question.correct_answer.join(', ') : question.correct_answer}</p>
                 </div>
               )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
               {(question.choices || []).map((choice, i) => {
                 const letter = String.fromCharCode(65 + i)
                 const isSelected = isSata 
                   ? (currentAnswer as string[]).includes(choice)
                   : currentAnswer === choice
                 
                 const isCorrectChoice = checkAnswerCorrectness(question.correct_answer, choice, question.question_type)

                 return (
                   <button
                     key={i}
                     disabled={showRationale}
                     onClick={() => handleChoiceClick(choice)}
                     className={cn(
                       "flex items-center gap-3 sm:gap-4 p-3 sm:p-5 rounded-2xl border-2 text-left transition-all group",
                       isSelected 
                         ? "bg-[var(--pink)] border-[var(--pink)] text-white shadow-fn" 
                         : "bg-[var(--card)] border-[var(--border)] hover:border-th-pink/50",
                       showRationale && isCorrectChoice && "border-[var(--success)] ring-2 ring-[var(--success)] ring-offset-2",
                       showRationale && isSelected && !isCorrectChoice && "border-[var(--error)] opacity-80"
                     )}
                   >
                     <div className={cn(
                       "w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors",
                       isSelected ? "bg-white text-[var(--pink)]" : "bg-[var(--secondary-bg)] text-[var(--text-secondary)] group-hover:bg-th-pink/10 group-hover:text-[var(--pink)]",
                       showRationale && isCorrectChoice && "bg-[var(--success)] text-white"
                     )}>
                       {letter}
                     </div>
                     <span className="font-bold flex-1">{choice}</span>
                     {isSelected && <Check size={20} className="shrink-0" />}
                   </button>
                 )
               })}
            </div>
          )}

          <AnimatePresence>
            {showRationale && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "fn-card p-6 border-l-4",
                  isCorrect ? "border-l-[var(--success)]" : "border-l-[var(--error)]"
                )}
              >
                <div className="flex items-center gap-2 mb-4">
                  {isCorrect ? (
                    <div className="flex items-center gap-2 text-[var(--success)] font-bold">
                      <CheckCircle2 size={20} />
                      <span>{isFrance ? "Correct! Amazing job, France! ✨" : `Correct! Amazing job, ${greetingName}! ✨`}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[var(--error)] font-bold">
                      <AlertCircle size={20} />
                      <span>Not quite, but let's learn! 🩺</span>
                    </div>
                  )}
                </div>
                
                <div className="bg-white/50 rounded-2xl p-4 border border-[var(--border)]">
                   <p className="text-[11px] font-bold text-[var(--pink)] mb-2">{isFrance ? "Doc Uno's Rationale" : `${aiAssistantName}'s Rationale`}</p>
                   <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      <MarkdownText content={question.rationale} />
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Button inside card at the very bottom */}
          <div className="mt-8 pt-6 border-t border-[var(--border)] flex justify-end">
            <button 
               onClick={showRationale ? handleNext : handleCheckAnswer}
               className={cn(
                 "py-3.5 px-8 text-sm rounded-2xl font-bold transition-all shadow-fn w-full sm:w-auto flex items-center justify-center gap-2",
                 showRationale 
                   ? "bg-[var(--pink)] text-white hover:bg-[var(--pink-hover)] active:scale-95" 
                   : "bg-[var(--secondary-bg)] text-[var(--text)] hover:bg-[var(--accent)] active:scale-95 border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed"
               )}
               disabled={!currentAnswer || (isSata && (currentAnswer as string[]).length === 0) || ((isTextInput || isEssayInput) && !(currentAnswer as string).trim())}
            >
               {showRationale 
                 ? (currentIndex === questions.length - 1 ? 'Finish' : 'Next Question') 
                 : 'Check Answer'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {timesUp && (
        <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[var(--card)] p-8 rounded-2xl text-center max-w-sm mx-4 border border-[var(--border)] shadow-2xl"
          >
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Clock size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2">{isFrance ? "Time's Up, Babe! ⏰" : "Time's Up! ⏰"}</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {isFrance 
                ? "Hindi bale, tapos na ang oras! Awtomatikong isinusumite ni Doc Uno ang iyong mga sagot. Proud pa rin ako sa effort mo! 🌸"
                : `Time is up! Your answers have been automatically submitted by ${aiAssistantName}. Great effort! 🩺`
              }
            </p>
          </motion.div>
        </div>
      )}
    </div>
  )
}

const getCuteBoyfriendResponse = (score: number) => {
  if (score === 100) {
    return {
      emoji: "🥺❤️✨🏆",
      message: "OH MY GOSH, babe! A perfect score! You are absolutely brilliant — my future RN is unstoppable! I'm so incredibly proud of you! Let's celebrate, I'll treat you to whatever you want! I love you so much! 🥰🍰✨",
      sticker: "🎀"
    }
  } else if (score >= 90) {
    return {
      emoji: "🎉🌸🧸💖",
      message: "Almost perfect, babe! You are SO smart — a little more and you'll be a PNLE topnotcher for sure! You deserve all the hugs, okay? I love you! 😘🩹✨",
      sticker: "🩺"
    }
  } else if (score >= 75) {
    return {
      emoji: "🩹🌸🌷🧸",
      message: "You passed, babe! So proud of you! We are absolutely going to get through nursing school together, I believe in you. Doc Uno is cheering for you always! Let's take a quick break before we review again! 🥰❤️",
      sticker: "🦦"
    }
  } else {
    return {
      emoji: "🧸🩹🧁❤️",
      message: "It's okay, my future RN! We'll review together — I'm always ready to help you study, every single day. Don't ever give up, okay? Doc Uno is always right here for you. I love you, babe! Drink some water first! 🍼🌸",
      sticker: "🩹"
    }
  }
}

const getNurseFlorenceResponse = (score: number) => {
  if (score === 100) {
    return {
      emoji: "🩺✨🧠🏆",
      message: "Outstanding! A perfect score indicates an exceptional mastery of the subject matter. Your meticulous preparation and clinical reasoning are highly commendable. Keep up the dedication to excellence!",
      sticker: "📋"
    }
  } else if (score >= 90) {
    return {
      emoji: "🩺✨👩‍⚕️📈",
      message: "Excellent performance! You demonstrate a strong clinical foundation and a high level of preparedness for your board examinations. Continue polishing the minor details—you are on the path to top-tier success.",
      sticker: "📖"
    }
  } else if (score >= 75) {
    return {
      emoji: "🩺📋👍✨",
      message: "Good job, you have passed! This represents a solid grasp of key nursing priorities. Take time to review the clinical rationales for any incorrect responses to further consolidate your knowledge.",
      sticker: "📝"
    }
  } else {
    return {
      emoji: "🩺🩹📚🔍",
      message: "Keep persevering. Nursing concepts require continuous application and review. Analyze the incorrect answers, understand the rationales, and try again. Dedication and practice will yield excellent results.",
      sticker: "☕"
    }
  }
}

function QuizResults() {
  const { isFrance, aiAssistantName } = usePersonalization()
  const { activeQuiz, questions, answers, getScore, resetQuiz } = useQuizStore()
  const score = getScore()
  const bfResponse = isFrance ? getCuteBoyfriendResponse(score) : getNurseFlorenceResponse(score)
  const navigate = useNavigate()
  
  return (
    <div className="max-w-3xl mx-auto py-10">
      <div className="fn-card overflow-hidden">
        <div className="p-10 text-center bg-gradient-to-br from-th-secondary-bg/30 to-th-pink/5 border-b border-[var(--border)]">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-fn mb-6 text-[var(--pink)]">
             <Target size={40} />
          </div>
          <h2 className="text-3xl font-bold mb-2">Quiz Complete! ✨</h2>
          <p className="text-[var(--text-secondary)] font-medium mb-8">You've finished the {activeQuiz?.title} review.</p>
          
          <div className="flex flex-col items-center">
             <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                <svg className="w-full h-full transform -rotate-90">
                   <circle 
                     cx="80" cy="80" r="70" 
                     stroke="currentColor" 
                     strokeWidth="12" 
                     fill="transparent" 
                     className="text-[var(--border)]"
                   />
                   <motion.circle 
                     cx="80" cy="80" r="70" 
                     stroke="currentColor" 
                     strokeWidth="12" 
                     fill="transparent" 
                     strokeDasharray={440}
                     initial={{ strokeDashoffset: 440 }}
                     animate={{ strokeDashoffset: 440 - (440 * score) / 100 }}
                     transition={{ duration: 1, ease: 'easeOut' }}
                     className={getScoreColor(score)}
                   />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className={cn("text-3xl font-bold tracking-tight", getScoreColor(score))}>{score}%</span>
                   <span className="text-[11px] font-bold text-[var(--text-secondary)]">Score</span>
                </div>
             </div>
             <p className={cn("font-heading font-bold text-lg mb-8", getScoreColor(score))}>
               {getScoreLabel(score)}
             </p>
             
             {/* Doc Uno's Cute Boyfriend Response Card */}
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
               className="max-w-md w-full bg-white/80 backdrop-blur-sm border-2 border-th-pink/20 p-6 rounded-2xl shadow-fn-md flex items-start gap-4 text-left relative overflow-hidden group"
             >
               {/* Cute Sticker background */}
               <div className="absolute -bottom-4 -right-4 text-6xl opacity-10 select-none pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
                 {bfResponse.sticker}
               </div>
               
               <div className="text-3xl select-none pt-1">{bfResponse.emoji.substring(0, 4)}</div>
               <div className="space-y-1.5 relative z-10">
                 <p className="text-[11px] font-bold text-[var(--pink)] flex items-center gap-1.5">
                   <Sparkles size={12} className="animate-pulse text-[var(--pink)]" />
                   {isFrance ? "Love Letter from Doc Uno" : `${aiAssistantName}'s Clinical Appraisal`}
                 </p>
                 <p className="text-sm text-[var(--text)] font-semibold leading-relaxed">
                   {isFrance ? `"${bfResponse.message}"` : bfResponse.message}
                 </p>
               </div>
             </motion.div>
          </div>
        </div>
 
        <div className="p-8 space-y-6">
           <h3 className="section-title">Review Rationales</h3>
           <div className="space-y-4">
              {questions.map((q, i) => {
                const userAnswer = answers[q.id]
                const isCorrect = checkAnswerCorrectness(q.correct_answer, userAnswer, q.question_type)
 
                return (
                  <div key={q.id} className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)]">
                     <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-[var(--text-secondary)]">Question {i+1}</span>
                        {isCorrect ? (
                          <span className="text-[var(--success)] flex items-center gap-1 text-xs font-bold">
                            <CheckCircle2 size={14} /> Correct
                          </span>
                        ) : (
                          <span className="text-[var(--error)] flex items-center gap-1 text-xs font-bold">
                            <AlertCircle size={14} /> Incorrect
                          </span>
                        )}
                     </div>
                     <p className="text-sm font-bold mb-4">{q.question}</p>
                     <div className="p-4 rounded-2xl bg-white border border-[var(--border)]">
                        <p className="text-[11px] font-bold text-[var(--pink)] mb-1">{isFrance ? "Doc Uno's Rationale 🩺" : `${aiAssistantName}'s Rationale 🩺`}</p>
                        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                           <MarkdownText content={q.rationale} />
                        </div>
                        <p className="text-xs font-bold mt-2 text-[var(--text)]">Correct Answer: <span className="text-[var(--success)]">{Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}</span></p>
                     </div>
                  </div>
                )
              })}
           </div>
        </div>
 
        <div className="p-8 border-t border-[var(--border)] bg-th-bg/50 flex flex-col sm:flex-row gap-3">
           <button onClick={() => { resetQuiz(); navigate('/study-box') }} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <RotateCcw size={18} /> Review Again
           </button>
           <button onClick={resetQuiz} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <BrainCircuit size={18} /> New Quiz
           </button>
        </div>
      </div>
    </div>
  )
}

function EmptyQuizState() {
  const { isFrance, aiAssistantName } = usePersonalization()
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-24 h-24 bg-[var(--secondary-bg)] rounded-2xl flex items-center justify-center text-[var(--pink)] mb-8 shadow-sm">
        <BrainCircuit size={48} />
      </div>
      <h2 className="text-2xl font-bold mb-2">No topics found yet! 🧪</h2>
      <p className="text-[var(--text-secondary)] max-w-sm mb-10 leading-relaxed font-medium">
        {isFrance 
          ? "Doc Uno needs some study materials to generate your custom quizzes. Upload your notes to the Study Box first! 🌸"
          : `${aiAssistantName} needs clinical study materials to generate custom practice quizzes. Please upload your notes or clinical files to the Study Box first! 🩺`
        }
      </p>
      <Link to="/study-box" className="btn-primary flex items-center gap-2 px-8">
        Go to Study Box <ArrowRight size={18} />
      </Link>
    </div>
  )
}

function QuizHistory({ quizzes, onBack, onDownload, onExportAll, onDelete }: { 
  quizzes: any[], 
  onBack: () => void, 
  onDownload: (quiz: any) => void,
  onExportAll: () => void,
  onDelete: (id: string) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--pink)] transition-colors mb-2"
          >
            <ArrowLeft size={18} /> Back to Generator
          </button>
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-tight">My Quizzes</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Review your scores and rationales, or download them as study material.</p>
        </div>
        
        {quizzes.length > 0 && (
          <button 
            onClick={onExportAll}
            className="btn-primary flex items-center gap-2 py-3 px-6 shadow-fn-md"
          >
            <DownloadCloud size={18} />
            Export All to PDF
          </button>
        )}
      </div>

      {quizzes.length === 0 ? (
        <div className="fn-card p-20 text-center">
          <div className="w-16 h-16 bg-[var(--secondary-bg)] rounded-2xl flex items-center justify-center text-[var(--text-secondary)] mx-auto mb-4">
            <History size={32} />
          </div>
          <h3 className="text-lg font-bold mb-2">No history yet!</h3>
          <p className="text-sm text-[var(--text-secondary)]">Complete your first quiz to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {quizzes.map((quiz) => (
            <motion.div 
              key={quiz.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="fn-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-th-pink/50 transition-all"
            >
              <div className="flex items-center gap-5 w-full md:w-auto">
                <div className={cn(
                  "w-16 h-16 rounded-[1.5rem] flex flex-col items-center justify-center font-bold shadow-sm shrink-0",
                  getScoreColor(quiz.score || 0).replace('text-', 'bg-').replace('text-', 'bg-').replace('secondary-', 'secondary-bg').replace('success', 'success/10').replace('warning', 'warning/10').replace('error', 'error/10'),
                  getScoreColor(quiz.score || 0)
                )}>
                  <span className="text-xl leading-none">{quiz.score || 0}</span>
                  <span className="text-[8px] uppercase tracking-tighter">%</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-lg truncate pr-4">{quiz.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-1 font-medium">
                    <span className="flex items-center gap-1"><FileText size={12} /> {quiz.total_items} Questions</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(quiz.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-[var(--border)]">
                <button 
                  onClick={() => onDownload(quiz)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-th-secondary-bg/50 text-[var(--pink)] font-bold text-sm hover:bg-[var(--pink)] hover:text-white transition-all group"
                  title="Download PDF"
                >
                  <FileDown size={18} className="group-hover:scale-110 transition-transform" />
                  <span className="md:hidden lg:inline">Download</span>
                </button>
                <button 
                  onClick={() => onDelete(quiz.id)}
                  className="w-10 md:w-11 h-10 md:h-11 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-th-error/10 transition-all"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function StethoscopeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.8 2.3A.3.3 0 1 0 5 2a.3.3 0 0 0-.2.3Z" />
      <path d="M10 22v-2" />
      <path d="M11 14a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z" />
      <path d="M15 8h4" />
      <path d="M17 11v-3" />
      <path d="M17 16a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z" />
      <path d="M21 12V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4" />
      <path d="M9 14h6" />
    </svg>
  )
}

function CustomSizeDropdown({ value, onChange }: { value: number, onChange: (val: number) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const options = [...Array.from({ length: 19 }, (_, i) => (i + 1) * 5), 100]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[var(--bg)] border-2 border-[var(--border)] rounded-2xl py-4 px-6 font-bold flex items-center justify-between hover:border-th-pink/50 transition-all shadow-sm"
      >
        <span>{value} Questions</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="text-[var(--pink)]"
        >
          <ChevronDown size={20} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 right-0 z-[70] bg-white border-2 border-[var(--border)] rounded-2xl shadow-fn-lg overflow-hidden py-3 max-h-64 overflow-y-auto custom-scrollbar"
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt)
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full px-6 py-3 text-left font-bold text-sm transition-all flex items-center justify-between group",
                  value === opt ? "bg-th-pink/10 text-[var(--pink)]" : "hover:bg-th-secondary-bg/50 text-[var(--text-secondary)]"
                )}
              >
                {opt === 100 ? "100 Questions (Full Mock)" : `${opt} Questions`}
                {value === opt && <Check size={16} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CustomTopicDropdown({ topics, value, onChange }: { topics: any[], value: string, onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredTopics = topics.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
  const selectedTopic = topics.find(t => t.title === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[var(--bg)] border-2 border-[var(--border)] rounded-2xl py-4 px-6 font-bold flex items-center justify-between hover:border-th-pink/50 transition-all shadow-sm"
      >
        <div className="flex items-center gap-3">
          {selectedTopic ? (
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedTopic.color }}></div>
          ) : (
            <div className="w-3 h-3 rounded-full bg-[var(--pink)]"></div>
          )}
          <span>{value}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="text-[var(--pink)]"
        >
          <ChevronDown size={20} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 right-0 z-[70] bg-white border-2 border-[var(--border)] rounded-2xl shadow-fn-lg overflow-hidden py-3 flex flex-col max-h-72"
          >
            <div className="px-4 pb-2 pt-1 border-b border-[var(--border)] mb-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search topic..."
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2 px-4 text-sm font-medium outline-none focus:border-[var(--pink)] transition-all"
              />
            </div>
            
            <div className="overflow-y-auto custom-scrollbar flex-1 max-h-48">
              {filteredTopics.length > 0 ? (
                filteredTopics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => {
                      onChange(topic.title)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={cn(
                      "w-full px-6 py-3 text-left font-bold text-sm transition-all flex items-center justify-between group",
                      value === topic.title ? "bg-th-pink/10 text-[var(--pink)]" : "hover:bg-th-secondary-bg/50 text-[var(--text-secondary)]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: topic.color }}></div>
                      <span>{topic.title}</span>
                    </div>
                    {value === topic.title && <Check size={16} />}
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-xs font-bold text-[var(--text-secondary)]">
                  No matching topics found 🧸
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
