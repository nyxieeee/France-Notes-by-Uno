import { useState, useRef, useEffect } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { useStudyBoxStore, isReferenceArticle, materialDisplayName } from '@/stores/studyBoxStore'
import { Globe, Brain as BrainCircuit, Target, Clock, ArrowRight, ArrowLeft, CheckCircle as CheckCircle2, WarningCircle as AlertCircle, Question as HelpCircle, Sparkle as Sparkles, ArrowCounterClockwise as RotateCcw, Layout, Check, Plus, CaretDown as ChevronDown, FileText, Stethoscope, ListNumbers as ListOrdered, ToggleLeft, MagnifyingGlass as Search, PencilSimple as Edit3, BookOpen, ClockCounterClockwise as History, Trash as Trash2, CloudArrowDown as DownloadCloud, FileArrowDown as FileDown, X } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { jsPDF } from 'jspdf'
import { cn, getScoreColor, getScoreLabel, checkAnswerCorrectness, formatRelativeDate } from '@/lib/utils'
import MarkdownText from '@/components/shared/MarkdownText'
import type { QuestionType, QuizSetupConfig, Quiz, Topic, StudyBoxItem } from '@/types'
import { usePersonalization } from '@/hooks/usePersonalization'
import { confirmDialog } from '@/stores/feedbackStore'
import { downloadName } from '@/lib/fileNames'
import { useBackToClose } from '@/hooks/useBackToClose'

// router location keys of quiz handoffs already applied this session
const handledHandoffs = new Set<string>()

export default function QuizPage() {
  const { isFrance, greetingName, aiAssistantName } = usePersonalization()
  const { activeQuiz, isGenerating, generationProgress, isFinished, quizzes, startQuiz, deleteQuiz, resetQuiz, generationError, lastConfig } = useQuizStore()
  const { topics } = useStudyBoxStore()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showHistory, setShowHistory] = useState(() => searchParams.get('view') === 'history')
  useBackToClose(showHistory, () => setShowHistory(false))

  // "Quiz me on this" from another page starts a fresh setup, even if an old quiz is still open.
  // Each handoff is honored once, so coming back to this history entry later doesn't wipe a quiz.
  useEffect(() => {
    const state = location.state as { selectedItemIds?: string[]; preSelectedTopic?: string; preSelectedText?: string } | null
    const isHandoff = !!(state?.selectedItemIds?.length || state?.preSelectedTopic || state?.preSelectedText)
    if (!isHandoff || handledHandoffs.has(location.key)) return
    handledHandoffs.add(location.key)
    if (useQuizStore.getState().activeQuiz && !useQuizStore.getState().isGenerating) resetQuiz()
  }, [location.key, location.state, resetQuiz])

  // Dashboard "Quiz history" link: /quiz?view=history opens the history list (showHistory starts true)
  useEffect(() => {
    if (searchParams.get('view') !== 'history') return
    if (useQuizStore.getState().isFinished) resetQuiz()
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams, resetQuiz])

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
          <div style="font-size:8px; font-weight:800; color:#f9a8d4; letter-spacing:2px; text-transform:uppercase; margin-bottom:5px;">${isFrance ? "Doc Uno's Love Notes" : `${aiAssistantName}'s Clinical Notes`}</div>
          <div style="font-size:18px; font-weight:800; color:#1f2937;">${quiz.title}</div>
          <div style="font-size:10px; color:#9ca3af; font-weight:600; margin-top:4px;">${new Date(quiz.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
      `)

      // Score
      await renderAndPlace(`
        <div style="padding:18px 22px; border-bottom:1.5px solid #fbcfe8; display:flex; align-items:center; gap:20px; background:#fff5fb;">
          <div style="font-size:38px; font-weight:900; color:#ec4899; line-height:1; display:flex; align-items:center; margin-top:-2px;">${quiz.score}%</div>
          <div style="display:flex; flex-direction:column; justify-content:center;">
            <div style="font-size:13px; font-weight:800; color:#be185d; line-height:1.2;">Quiz Complete!</div>
            <div style="font-size:10px; color:#9ca3af; margin-top:3px; line-height:1.2;">
              ${isFrance ? 'Great job, babe! So proud of you' : `Great job, ${greetingName}! Extremely proud of your effort!`}
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
                <span style="font-size:9px; font-weight:800; padding:2px 8px; border-radius:999px; background:${isCorrect ? '#d1fae5' : '#ffe4e6'}; color:${isCorrect ? '#065f46' : '#be123c'};">${isCorrect ? '✓ Correct' : 'Incorrect'}</span>
              </div>
              <div style="font-size:12px; font-weight:700; color:#1f2937; margin-bottom:8px; line-height:1.5;">${q.question}</div>
              <div style="font-size:10.5px; color:#6b7280; margin-bottom:3px;"><b>Your Answer:</b> ${userAnsText}</div>
              <div style="font-size:10.5px; color:#6b7280; margin-bottom:10px;"><b>Correct Answer:</b> <span style="color:#059669; font-weight:700;">${correctAnsText}</span></div>
              <div style="background:#fce7f3; border-radius:8px; padding:10px 12px;">
                <div style="font-size:8px; font-weight:800; color:#db2777; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:5px;">${isFrance ? "Doc Uno's Rationale" : `${aiAssistantName}'s Rationale`}</div>
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
            ${isFrance ? 'Made with love by Doc Uno for France' : `Made by ${aiAssistantName}`}
          </div>
          <div style="font-size:8px; font-weight:700; color:#d1d5db; margin-top:3px; letter-spacing:1px; text-transform:uppercase;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
      `)

      pdf.save(downloadName(quiz.title, 'Quiz Results', 'pdf'))
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
          <div style="font-size:8px; font-weight:800; color:#f9a8d4; letter-spacing:2px; text-transform:uppercase; margin-bottom:5px;">${isFrance ? "Doc Uno's Love Notes" : `${aiAssistantName}'s Clinical Notes`}</div>
          <div style="font-size:18px; font-weight:800; color:#1f2937;">Master Quiz History</div>
          <div style="font-size:10px; color:#9ca3af; font-weight:600; margin-top:4px;">${completedQuizzes.length} quiz${completedQuizzes.length !== 1 ? 'zes' : ''} completed</div>
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
                  <span style="font-size:9px; font-weight:800; padding:2px 8px; border-radius:999px; background:${isCorrect ? '#d1fae5' : '#ffe4e6'}; color:${isCorrect ? '#065f46' : '#be123c'};">${isCorrect ? '✓ Correct' : 'Incorrect'}</span>
                </div>
                <div style="font-size:12px; font-weight:700; color:#1f2937; margin-bottom:8px; line-height:1.5;">${q.question}</div>
                <div style="font-size:10.5px; color:#6b7280; margin-bottom:3px;"><b>Your Answer:</b> ${userAnsText}</div>
                <div style="font-size:10.5px; color:#6b7280; margin-bottom:10px;"><b>Correct Answer:</b> <span style="color:#059669; font-weight:700;">${correctAnsText}</span></div>
                <div style="background:#fce7f3; border-radius:8px; padding:10px 12px;">
                  <div style="font-size:8px; font-weight:800; color:#db2777; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:5px;">${isFrance ? "Doc Uno's Rationale" : `${aiAssistantName}'s Rationale`}</div>
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
            ${isFrance ? 'Proud of you always, future RN! — Doc Uno' : `Proud of your dedication to excellence! — ${aiAssistantName}`}
          </div>
          <div style="font-size:8px; font-weight:700; color:#d1d5db; margin-top:3px; letter-spacing:1px; text-transform:uppercase;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
      `)

      pdf.save(downloadName(`Quiz History ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, null, 'pdf'))
    } catch (err) {
      console.error('PDF Export error:', err)
    }
  }

  return (
    <div className="page-container max-w-6xl">
      <AnimatePresence mode="wait">
        {isGenerating ? (
          <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GeneratingState done={generationProgress.done} total={generationProgress.total} />
          </motion.div>
        ) : !activeQuiz && generationError ? (
          <motion.div key="gen-error" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="fn-card max-w-lg mx-auto mt-6 p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-th-error/10 text-[var(--error)] flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} weight="duotone" />
              </div>
              <h2 className="font-heading font-semibold text-lg">Quiz couldn't be generated</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1.5">{generationError}</p>
              <div className="flex justify-center gap-2 mt-6">
                <button onClick={resetQuiz} className="btn-secondary px-5 py-2.5 text-sm flex items-center gap-2"><ArrowLeft size={15} /> Back to setup</button>
                {lastConfig && (
                  <button onClick={() => startQuiz(lastConfig)} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2"><RotateCcw size={15} /> Try again</button>
                )}
              </div>
            </div>
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
            <motion.div key="setup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <QuizSetup onStart={startQuiz} recent={completedQuizzes} onShowHistory={() => setShowHistory(true)} />
            </motion.div>
          )
        ) : isFinished ? (
          <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <QuizResults />
          </motion.div>
        ) : (
          <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <QuizEngine />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const QUESTION_TYPES: { id: QuestionType | 'mixed', label: string, icon: Icon }[] = [
  { id: 'mixed', label: 'Mixed', icon: Layout },
  { id: 'multiple_choice', label: 'Multiple Choice', icon: CheckCircle2 },
  { id: 'sata', label: 'SATA', icon: Plus },
  { id: 'prioritization', label: 'Prioritization', icon: ListOrdered },
  { id: 'situational', label: 'Situational', icon: Target },
  { id: 'nclex', label: 'NCLEX Style', icon: Stethoscope },
  { id: 'true_false', label: 'True / False', icon: ToggleLeft },
  { id: 'identification', label: 'Identification', icon: Search },
  { id: 'fill_blank', label: 'Fill in the Blank', icon: Edit3 },
  { id: 'essay', label: 'Essay', icon: FileText },
  { id: 'clinical_judgment', label: 'Clinical Judgment', icon: HelpCircle },
  { id: 'case_study', label: 'Case Study', icon: BookOpen },
]

const QUESTION_COUNTS = [5, 10, 15, 20, 30, 50, 75, 100]

const TIMERS: { id: string; label: string; type: NonNullable<QuizSetupConfig['timer_type']>; value: number }[] = [
  { id: 'untimed', label: 'No timer', type: 'untimed', value: 0 },
  { id: 'q30', label: '30s / question', type: 'per_question', value: 30 },
  { id: 'q60', label: '60s / question', type: 'per_question', value: 60 },
  { id: 'q90', label: '90s / question', type: 'per_question', value: 90 },
  { id: 't5', label: '5 min', type: 'total_quiz', value: 300 },
  { id: 't10', label: '10 min', type: 'total_quiz', value: 600 },
  { id: 't20', label: '20 min', type: 'total_quiz', value: 1200 },
  { id: 't60', label: '1 hour', type: 'total_quiz', value: 3600 },
  { id: 't120', label: '2 hours', type: 'total_quiz', value: 7200 },
  { id: 't180', label: '3 hours', type: 'total_quiz', value: 10800 },
]

function SetupSection({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="fn-card p-5">
      <div className="flex items-baseline gap-2.5 mb-3.5">
        <span className="w-6 h-6 rounded-full bg-[var(--rose-soft)] border border-[var(--border)] text-[var(--pink)] text-xs font-semibold flex items-center justify-center shrink-0">{step}</span>
        <h2 className="font-heading font-semibold text-[15px]">{title}</h2>
        {hint && <span className="text-xs text-[var(--text-secondary)] ml-auto">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors flex items-center gap-1.5',
        active ? 'bg-[var(--pink)] border-[var(--pink)] text-white' : 'border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]'
      )}
    >
      {children}
    </button>
  )
}

function SourceOption({ item, active, onPick }: { item: StudyBoxItem; active: boolean; onPick: (item: StudyBoxItem) => void }) {
  const reference = isReferenceArticle(item)
  return (
    <button
      onClick={() => onPick(item)}
      className={cn(
        'flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-colors',
        active ? 'border-[var(--pink)] bg-[var(--rose-soft)]' : 'border-[var(--border)] hover:bg-[var(--rose-soft)]'
      )}
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', active ? 'bg-[var(--pink)] text-white' : 'bg-[var(--rose-soft)] text-[var(--pink)]')}>
        {active ? <Check size={15} weight="bold" /> : reference ? <Globe size={15} /> : <FileText size={15} />}
      </div>
      <span className="text-[13px] font-medium truncate">{materialDisplayName(item)}</span>
    </button>
  )
}

function QuizSetup({ onStart, recent, onShowHistory }: { onStart: (config: QuizSetupConfig) => void; recent: Quiz[]; onShowHistory: () => void }) {
  const { isFrance, aiAssistantName } = usePersonalization()
  const { topics, items, savedKnowledge } = useStudyBoxStore()
  const location = useLocation()
  const [showAllFiles, setShowAllFiles] = useState(false)
  const [showAllRefs, setShowAllRefs] = useState(false)

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
    ? (preSelectedItems.length === 1 ? materialDisplayName(preSelectedItems[0]) : `${preSelectedItems.length} Notes Combined`)
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

  const pickTopic = (topicTitle: string) => {
    // Collect all extracted text from items in this topic
    const matchedTopic = topics.find(t => t.title === topicTitle)
    const topicItems = matchedTopic ? items.filter(i => i.topic_id === matchedTopic.id && i.extracted_text) : []
    setConfig({
      ...config,
      topic: topicTitle,
      sourceText: topicItems.length > 0 ? topicItems.map(i => `--- DOCUMENT: ${i.file_name} ---\n${i.extracted_text}`).join('\n\n') : undefined,
      sourceName: topicItems.length > 0 ? topicItems.map(i => i.file_name).join(', ') : undefined
    })
  }

  // Her own uploads and saved Knowledge Garden references are offered separately
  const myFiles = items.filter(i => !isReferenceArticle(i))
  const refArticles = items.filter(isReferenceArticle)
  const files = showAllFiles ? myFiles : myFiles.slice(0, 6)
  const refs = showAllRefs ? refArticles : refArticles.slice(0, 4)
  const pickMaterial = (item: StudyBoxItem) =>
    setConfig({ ...config, topic: materialDisplayName(item), sourceText: item.extracted_text, sourceName: item.file_name })
  const selectedTimer = TIMERS.find(t => t.type === config.timer_type && (t.type === 'untimed' || t.value === config.timer_value)) || TIMERS[0]
  const selectedType = QUESTION_TYPES.find(t => t.id === config.question_type) || QUESTION_TYPES[0]
  const usingFile = !!config.sourceName && items.some(i => i.file_name === config.sourceName)

  return (
    <div>
      <PageHeader
        icon={BrainCircuit}
        title="Quiz Generator"
        subtitle="Board-style practice questions from your topics and notes, with detailed rationales."
        actions={
          <button onClick={onShowHistory} className="btn-secondary px-4 py-2.5 text-sm flex items-center gap-2">
            <History size={16} /> My Quizzes ({recent.length})
          </button>
        }
      />

      {preSelectedItems.length > 0 && (
        <div className="mb-5 fn-card p-4 bg-[var(--rose-soft)] flex items-start gap-3">
          <Sparkles size={18} className="text-[var(--pink)] mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Quizzing you on {preSelectedItems.length} selected material{preSelectedItems.length > 1 ? 's' : ''}</p>
            <p className="text-xs text-[var(--text-secondary)] truncate">{preSelectedItems.map(i => i.file_name).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div className="space-y-4 min-w-0">
          <SetupSection step={1} title="What to study" hint={`${aiAssistantName} writes questions only from this material`}>
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Topic</p>
            <CustomTopicDropdown topics={topics} value={usingFile ? '' : config.topic} onChange={pickTopic} />

            {myFiles.length > 0 && (
              <>
                <p className="text-xs font-medium text-[var(--text-secondary)] mt-4 mb-2">Or one of your files</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {files.map(item => (
                    <SourceOption key={item.id} item={item} active={config.sourceName === item.file_name} onPick={pickMaterial} />
                  ))}
                </div>
                {myFiles.length > 6 && (
                  <button onClick={() => setShowAllFiles(s => !s)} className="mt-2 text-xs font-medium text-[var(--pink)] hover:underline">
                    {showAllFiles ? 'Show fewer' : `Show all ${myFiles.length} files`}
                  </button>
                )}
              </>
            )}

            {refArticles.length > 0 && (
              <>
                <p className="text-xs font-medium text-[var(--text-secondary)] mt-4 mb-2">Or a saved reference</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {refs.map(item => (
                    <SourceOption key={item.id} item={item} active={config.sourceName === item.file_name} onPick={pickMaterial} />
                  ))}
                </div>
                {refArticles.length > 4 && (
                  <button onClick={() => setShowAllRefs(s => !s)} className="mt-2 text-xs font-medium text-[var(--pink)] hover:underline">
                    {showAllRefs ? 'Show fewer' : `Show all ${refArticles.length} references`}
                  </button>
                )}
              </>
            )}
          </SetupSection>

          <SetupSection step={2} title="Number of questions">
            <div className="flex flex-wrap gap-1.5">
              {QUESTION_COUNTS.map(n => (
                <Chip key={n} active={config.size === n} onClick={() => setConfig({ ...config, size: n })}>
                  {n}{n === 100 ? ' · full mock' : ''}
                </Chip>
              ))}
            </div>
          </SetupSection>

          <SetupSection step={3} title="Question style">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {QUESTION_TYPES.map(type => {
                const active = config.question_type === type.id
                return (
                  <button
                    key={type.id}
                    onClick={() => setConfig({ ...config, question_type: type.id })}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-[13px] font-medium transition-colors',
                      active ? 'border-[var(--pink)] bg-[var(--rose-soft)] text-[var(--pink)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]'
                    )}
                  >
                    <type.icon size={16} weight={active ? 'fill' : 'regular'} className="shrink-0" /> <span className="truncate">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </SetupSection>

          <SetupSection step={4} title="Timer">
            <div className="space-y-2.5">
              {([['No timer', ['untimed']], ['Per question', ['per_question']], ['Whole quiz', ['total_quiz']]] as const).map(([label, kinds]) => (
                <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <span className="text-xs font-medium text-[var(--text-secondary)] sm:w-24 shrink-0">{label}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {TIMERS.filter(t => (kinds as readonly string[]).includes(t.type)).map(t => (
                      <Chip key={t.id} active={selectedTimer.id === t.id} onClick={() => setConfig({ ...config, timer_type: t.type, timer_value: t.value })}>
                        {t.type !== 'untimed' && <Clock size={13} />}{t.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SetupSection>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-4 space-y-4">
          <section className="fn-card p-5">
            <h2 className="font-heading font-semibold text-[15px] mb-3">Your quiz</h2>
            <dl className="space-y-2.5 text-[13px]">
              {[
                ['Source', config.topic],
                ['Questions', `${config.size}`],
                ['Style', selectedType.label],
                ['Timer', selectedTimer.label],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-[var(--text-secondary)] shrink-0">{k}</dt>
                  <dd className="font-medium text-right truncate">{v}</dd>
                </div>
              ))}
            </dl>
            <button onClick={() => onStart(config)} className="btn-primary w-full py-3 mt-5 flex items-center justify-center gap-2">
              Generate Quiz <ArrowRight size={17} />
            </button>
            <p className="text-[11px] text-[var(--text-secondary)] text-center mt-2.5">
              {config.size > 20 ? 'Bigger quizzes take a minute or two to write.' : 'Usually ready in under a minute.'}
            </p>
          </section>

          {recent.length > 0 && (
            <section className="fn-card p-5">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="font-heading font-semibold text-[15px]">Recent scores</h2>
                <button onClick={onShowHistory} className="text-xs font-medium text-[var(--pink)] hover:underline">See all</button>
              </div>
              <div className="space-y-2">
                {recent.slice(0, 4).map(q => (
                  <div key={q.id} className="flex items-center gap-3">
                    <ScoreBadge score={q.score || 0} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate">{q.title}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">{q.total_items} questions · {formatRelativeDate(q.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {isFrance && (
            <p className="text-center font-script text-lg text-[var(--pink)]">You've got this, future RN ♡</p>
          )}
        </aside>
      </div>
    </div>
  )
}

function ScoreBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'lg' }) {
  return (
    <div className={cn(
      'rounded-full border-[3px] flex items-center justify-center font-semibold shrink-0',
      size === 'sm' ? 'w-10 h-10 text-[11px]' : 'w-14 h-14 text-sm',
      score >= 80 ? 'border-[var(--success)] text-[var(--success)]' : score >= 60 ? 'border-[var(--warning)] text-[var(--warning)]' : 'border-[var(--error)] text-[var(--error)]'
    )}>
      {score}%
    </div>
  )
}

function GeneratingState({ done, total }: { done: number; total: number }) {
  const { isFrance, aiAssistantName } = usePersonalization()
  return (
    <div className="max-w-md mx-auto py-16">
      <div className="fn-card p-8 text-center">
        <img src={isFrance ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'} alt={aiAssistantName} className="w-20 h-20 rounded-2xl object-cover border border-[var(--border)] mx-auto mb-5 animate-float" />
        <h2 className="font-heading font-semibold text-lg">{aiAssistantName} is writing your quiz</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {isFrance ? 'Board-style questions and rationales, just for you, babe.' : 'Board-style questions with detailed clinical rationales.'}
        </p>
        <div className="mt-6 h-2 bg-[var(--secondary-bg)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(4, (done / Math.max(1, total)) * 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-[var(--pink)] rounded-full"
          />
        </div>
        <p className="mt-2.5 text-sm font-medium text-[var(--pink)]">{done} of {total} questions ready</p>
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
  // Mirrors timeLeft so the interval can count down without side effects inside a state updater
  const timeRef = useRef(timeLeft)
  // What to do when time runs out, refreshed every render so it never acts on stale answers
  const onExpireRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (activeQuiz?.timer_type === 'per_question') {
      timeRef.current = activeQuiz.timer_value || 60
      setTimeLeft(timeRef.current)
      setTimesUp(false)
    }
  }, [currentIndex, activeQuiz])

  useEffect(() => {
    if (!activeQuiz || activeQuiz.timer_type === 'untimed') return
    if (showRationale && activeQuiz.timer_type === 'per_question') return
    if (timeRef.current <= 0) return

    const interval = setInterval(() => {
      timeRef.current = Math.max(0, timeRef.current - 1)
      setTimeLeft(timeRef.current)
      if (timeRef.current === 0) {
        clearInterval(interval)
        onExpireRef.current()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [activeQuiz, currentIndex, showRationale])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  useEffect(() => {
    onExpireRef.current = () => {
      if (activeQuiz?.timer_type === 'total_quiz') {
        setTimesUp(true)
        setTimeout(() => { finishQuiz() }, 2500)
      } else if (activeQuiz?.timer_type === 'per_question') {
        // Same as pressing Check, using whatever is selected at the moment time runs out
        const { questions: qs, currentIndex: idx, answers: latest } = useQuizStore.getState()
        const q = qs[idx]
        if (!q) return
        setIsCorrect(checkAnswerCorrectness(q.correct_answer, latest[q.id], q.question_type))
        setShowRationale(true)
      }
    }
  })

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
    // Read from the store so a timer firing from an older render still sees the latest pick
    const userAnswer = useQuizStore.getState().answers[question?.id]
    const correct = checkAnswerCorrectness(question?.correct_answer, userAnswer, question?.question_type)
    setIsCorrect(correct)
    setShowRationale(true)
    // Bring the rationale into view
    setTimeout(() => document.getElementById('quiz-rationale')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
  }

  const handleBack = () => {
    setShowRationale(false)
    setIsCorrect(null)
    prevQuestion()
  }

  const handleNext = () => {
    setShowRationale(false)
    setIsCorrect(null)
    document.getElementById('quiz-top')?.scrollIntoView({ behavior: 'smooth' })
    if (currentIndex === questions.length - 1) {
      finishQuiz()
    } else {
      nextQuestion()
    }
  }

  const progress = ((currentIndex + 1) / questions.length) * 100
  const cannotCheck = !currentAnswer || (isSata && (currentAnswer as string[]).length === 0) || ((isTextInput || isEssayInput) && !(currentAnswer as string).trim())
  const lowTime = activeQuiz?.timer_type !== 'untimed' && timeLeft <= 10

  return (
    <div className="max-w-3xl mx-auto" id="quiz-top">
      {/* Quiz bar */}
      <div className="fn-card px-4 py-3 mb-5">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} disabled={currentIndex === 0} className="btn-icon p-2 disabled:opacity-30 shrink-0" aria-label="Previous question">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold truncate">{activeQuiz?.title}</p>
            <p className="text-[11.5px] text-[var(--text-secondary)]">Question {currentIndex + 1} of {questions.length}</p>
          </div>
          <span className={cn(
            'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border shrink-0',
            lowTime ? 'border-[var(--error)] text-[var(--error)] bg-th-error/10 animate-pulse' : 'border-[var(--border)] text-[var(--text-secondary)]'
          )}>
            <Clock size={13} />
            {activeQuiz?.timer_type === 'untimed' ? 'Untimed' : <>{formatTime(timeLeft)}{activeQuiz?.timer_type === 'per_question' && <span className="opacity-70">/q</span>}</>}
          </span>
          {confirmEnd ? (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => { setConfirmEnd(false); finishQuiz() }} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--error)] text-white">End quiz</button>
              <button onClick={() => setConfirmEnd(false)} className="btn-icon p-1.5" aria-label="Keep going"><X size={15} /></button>
            </div>
          ) : (
            <button onClick={() => setConfirmEnd(true)} className="text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--error)] hover:border-th-error/40 shrink-0">
              End
            </button>
          )}
          <button
            onClick={async () => {
              if (await confirmDialog({ title: 'Leave this quiz?', message: "You'll go back to the quiz setup and this attempt won't be scored. Use End if you want your score.", confirmLabel: 'Leave', danger: true })) {
                useQuizStore.getState().resetQuiz()
              }
            }}
            className="btn-icon p-1.5 -mr-1 shrink-0"
            aria-label="Leave quiz"
            title="Leave quiz"
          >
            <X size={17} />
          </button>
        </div>
        <div className="mt-3 h-1.5 bg-[var(--secondary-bg)] rounded-full overflow-hidden">
          <motion.div animate={{ width: `${progress}%` }} className="h-full bg-[var(--pink)] rounded-full" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={question.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
          <div className="fn-card p-5 sm:p-7">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-[var(--rose-soft)] text-[var(--pink)] rounded-full capitalize border border-[var(--border)]">
                {question.question_type?.replace(/_/g, ' ') || 'Question'}
              </span>
              {isSata && <span className="text-[11.5px] font-medium text-[var(--warning)]">Select all that apply</span>}
            </div>
            <h2 className="text-[17px] sm:text-[19px] font-semibold leading-relaxed">{question.question}</h2>
          </div>

          {isEssayInput ? (
            <div className="space-y-3">
              <textarea
                value={currentAnswer as string}
                onChange={(e) => submitAnswer(question.id, e.target.value)}
                disabled={showRationale}
                placeholder="Write your answer and clinical reasoning…"
                rows={6}
                className="fn-input rounded-2xl bg-[var(--card)] p-4 text-[15px] leading-relaxed resize-none"
              />
              {showRationale && (
                <div className="fn-card p-4 bg-[var(--rose-soft)]">
                  <p className="text-xs font-semibold text-[var(--pink)] mb-1.5">Model answer</p>
                  <p className="text-sm whitespace-pre-line leading-relaxed">
                    {Array.isArray(question.correct_answer) ? question.correct_answer.join('\n') : question.correct_answer}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-3">Compare your answer with the model answer to grade yourself.</p>
                </div>
              )}
            </div>
          ) : isTextInput ? (
            <div className="space-y-3">
              <input
                type="text"
                value={currentAnswer as string}
                onChange={(e) => submitAnswer(question.id, e.target.value)}
                disabled={showRationale}
                placeholder="Type your answer…"
                className={cn(
                  'fn-input rounded-2xl bg-[var(--card)] px-4 py-3.5 text-[16px] font-medium',
                  showRationale && isCorrect && 'border-[var(--success)] text-[var(--success)]',
                  showRationale && !isCorrect && 'border-[var(--error)] text-[var(--error)]'
                )}
              />
              {showRationale && !isCorrect && (
                <p className="text-sm font-medium text-[var(--success)] px-1">
                  Correct answer: {Array.isArray(question.correct_answer) ? question.correct_answer.join(', ') : question.correct_answer}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {(question.choices || []).map((choice, i) => {
                const letter = String.fromCharCode(65 + i)
                const isSelected = isSata ? (currentAnswer as string[]).includes(choice) : currentAnswer === choice
                // For SATA each correct option is highlighted on its own
                const isCorrectChoice = isSata
                  ? (Array.isArray(question.correct_answer) ? question.correct_answer : [question.correct_answer]).some(c => checkAnswerCorrectness(c, choice))
                  : checkAnswerCorrectness(question.correct_answer, choice, question.question_type)
                const showRight = showRationale && isCorrectChoice
                const showWrong = showRationale && isSelected && !isCorrectChoice
                return (
                  <button
                    key={i}
                    disabled={showRationale}
                    onClick={() => handleChoiceClick(choice)}
                    className={cn(
                      'w-full flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border text-left transition-colors',
                      showRight ? 'border-[var(--success)] bg-th-success/10'
                        : showWrong ? 'border-[var(--error)] bg-th-error/10'
                        : isSelected ? 'border-[var(--pink)] bg-[var(--rose-soft)]'
                        : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)] hover:bg-[var(--rose-soft)]'
                    )}
                  >
                    <span className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 border',
                      showRight ? 'bg-[var(--success)] border-[var(--success)] text-white'
                        : showWrong ? 'bg-[var(--error)] border-[var(--error)] text-white'
                        : isSelected ? 'bg-[var(--pink)] border-[var(--pink)] text-white'
                        : 'border-[var(--border)] text-[var(--text-secondary)]'
                    )}>
                      {showRight ? <Check size={15} weight="bold" /> : showWrong ? <X size={15} weight="bold" /> : letter}
                    </span>
                    <span className="text-[14.5px] font-medium flex-1">{choice}</span>
                  </button>
                )
              })}
            </div>
          )}

          <AnimatePresence>
            {showRationale && (
              <motion.div id="quiz-rationale" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="fn-card p-5">
                <div className={cn('flex items-center gap-2 mb-3 font-semibold text-[15px]', isCorrect ? 'text-[var(--success)]' : 'text-[var(--error)]')}>
                  {isCorrect ? <CheckCircle2 size={20} weight="fill" /> : <AlertCircle size={20} weight="fill" />}
                  {isCorrect
                    ? (isFrance ? 'Correct! Amazing job, France!' : `Correct! Nice work, ${greetingName}.`)
                    : "Not quite — here's why."}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <img src={isFrance ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'} alt={aiAssistantName} className="w-6 h-6 rounded-full object-cover" />
                  <p className="text-xs font-semibold text-[var(--pink)]">{aiAssistantName}'s rationale</p>
                </div>
                <div className="text-sm text-[var(--text)] leading-relaxed">
                  <MarkdownText content={question.rationale} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end pt-1">
            <button
              onClick={showRationale ? handleNext : handleCheckAnswer}
              disabled={!showRationale && cannotCheck}
              className={cn('px-7 py-3 text-sm w-full sm:w-auto flex items-center justify-center gap-2', showRationale ? 'btn-primary' : 'btn-primary disabled:opacity-40')}
            >
              {showRationale ? (currentIndex === questions.length - 1 ? 'See results' : 'Next question') : 'Check answer'}
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {timesUp && (
        <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="fn-card p-7 text-center max-w-sm">
            <div className="w-14 h-14 bg-th-error/10 text-[var(--error)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock size={28} weight="duotone" />
            </div>
            <h3 className="font-heading font-semibold text-lg">{isFrance ? "Time's up, babe!" : "Time's up!"}</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {isFrance ? 'Your answers are being submitted. Proud of your effort!' : `Your answers have been submitted by ${aiAssistantName}. Great effort!`}
            </p>
          </motion.div>
        </div>
      )}
    </div>
  )
}

const getCuteBoyfriendResponse = (score: number) => {
  if (score === 100) return "OH MY GOSH, babe! A perfect score! You are absolutely brilliant — my future RN is unstoppable! I'm so incredibly proud of you! Let's celebrate, I'll treat you to whatever you want! I love you so much!"
  if (score >= 90) return "Almost perfect, babe! You are SO smart — a little more and you'll be a PNLE topnotcher for sure! You deserve all the hugs, okay? I love you!"
  if (score >= 75) return "You passed, babe! So proud of you! We are absolutely going to get through nursing school together, I believe in you. Doc Uno is cheering for you always! Let's take a quick break before we review again!"
  return "It's okay, my future RN! We'll review together — I'm always ready to help you study, every single day. Don't ever give up, okay? Doc Uno is always right here for you. I love you, babe! Drink some water first!"
}

const getNurseFlorenceResponse = (score: number) => {
  if (score === 100) return 'Outstanding! A perfect score indicates an exceptional mastery of the subject matter. Your meticulous preparation and clinical reasoning are highly commendable. Keep up the dedication to excellence!'
  if (score >= 90) return 'Excellent performance! You demonstrate a strong clinical foundation and a high level of preparedness for your board examinations. Continue polishing the minor details—you are on the path to top-tier success.'
  if (score >= 75) return 'Good job, you have passed! This represents a solid grasp of key nursing priorities. Take time to review the clinical rationales for any incorrect responses to further consolidate your knowledge.'
  return 'Keep persevering. Nursing concepts require continuous application and review. Analyze the incorrect answers, understand the rationales, and try again. Dedication and practice will yield excellent results.'
}

const RESULT_RING = 2 * Math.PI * 54

function QuizResults() {
  const { isFrance, aiAssistantName } = usePersonalization()
  const { activeQuiz, questions, answers, getScore, resetQuiz } = useQuizStore()
  const score = getScore()
  const message = isFrance ? getCuteBoyfriendResponse(score) : getNurseFlorenceResponse(score)
  const navigate = useNavigate()
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'wrong'>('all')

  const graded = questions.map(q => ({ q, correct: checkAnswerCorrectness(q.correct_answer, answers[q.id], q.question_type) }))
  const correctCount = graded.filter(g => g.correct).length
  const shown = filter === 'wrong' ? graded.filter(g => !g.correct) : graded
  const answerText = (a: string | string[] | undefined) => (Array.isArray(a) ? a.join(', ') : a) || 'No answer'

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <section className="fn-card overflow-hidden">
        <div className="p-6 sm:p-8 bg-[var(--rose-soft)] border-b border-[var(--border)] flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-32 h-32 shrink-0">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="54" fill="none" stroke="var(--card)" strokeWidth="10" />
              <motion.circle
                cx="60" cy="60" r="54" fill="none" strokeWidth="10" strokeLinecap="round" stroke="currentColor"
                strokeDasharray={RESULT_RING}
                initial={{ strokeDashoffset: RESULT_RING }}
                animate={{ strokeDashoffset: RESULT_RING * (1 - score / 100) }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={getScoreColor(score)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-3xl font-heading font-semibold', getScoreColor(score))}>{score}%</span>
              <span className="text-[11px] text-[var(--text-secondary)]">{getScoreLabel(score)}</span>
            </div>
          </div>
          <div className="text-center sm:text-left min-w-0">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Quiz complete</p>
            <h1 className="font-heading font-semibold text-xl mt-0.5">{activeQuiz?.title}</h1>
            <div className="flex justify-center sm:justify-start gap-5 mt-3 text-sm">
              <span><b className="text-[var(--success)]">{correctCount}</b> correct</span>
              <span><b className="text-[var(--error)]">{questions.length - correctCount}</b> to review</span>
              <span><b>{questions.length}</b> total</span>
            </div>
          </div>
        </div>
        <div className="p-5 flex gap-3 items-start">
          <img src={isFrance ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'} alt={aiAssistantName} className="w-10 h-10 rounded-full object-cover border border-[var(--border)] shrink-0" />
          <div>
            <p className="text-xs font-semibold text-[var(--pink)]">{isFrance ? 'A note from Doc Uno' : `${aiAssistantName}'s appraisal`}</p>
            <p className="text-sm leading-relaxed mt-0.5">{message}</p>
          </div>
        </div>
        <div className="px-5 pb-5 flex flex-col sm:flex-row gap-2">
          <button onClick={() => { resetQuiz(); navigate('/study-box') }} className="btn-secondary flex-1 py-2.5 text-sm flex items-center justify-center gap-2">
            <RotateCcw size={16} /> Review materials
          </button>
          <button onClick={resetQuiz} className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2">
            <BrainCircuit size={16} /> New quiz
          </button>
        </div>
      </section>

      <section className="fn-card p-4">
        <div className="flex items-center justify-between px-1 mb-3">
          <h2 className="font-heading font-semibold text-[15px]">Review answers</h2>
          <div className="flex gap-1.5">
            <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
            <Chip active={filter === 'wrong'} onClick={() => setFilter('wrong')}>To review</Chip>
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] text-center py-6">Nothing to review — every answer was correct.</p>
        ) : (
          <div className="space-y-1">
            {shown.map(({ q, correct }) => {
              const index = questions.indexOf(q)
              const isOpen = open === q.id
              return (
                <div key={q.id} className={cn('rounded-xl transition-colors', isOpen ? 'bg-[var(--rose-soft)]' : 'hover:bg-[var(--rose-soft)]')}>
                  <button onClick={() => setOpen(isOpen ? null : q.id)} className="w-full flex items-start gap-3 p-3 text-left">
                    <span className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white', correct ? 'bg-[var(--success)]' : 'bg-[var(--error)]')}>
                      {correct ? <Check size={14} weight="bold" /> : <X size={14} weight="bold" />}
                    </span>
                    <span className="text-[13.5px] font-medium flex-1"><span className="text-[var(--text-secondary)]">{index + 1}.</span> {q.question}</span>
                    <ChevronDown size={16} className={cn('text-[var(--text-secondary)] mt-1 shrink-0 transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-4 pl-[52px] space-y-2.5 text-[13px]">
                      {!correct && <p><span className="text-[var(--text-secondary)]">Your answer:</span> <span className="text-[var(--error)] font-medium">{answerText(answers[q.id])}</span></p>}
                      <p><span className="text-[var(--text-secondary)]">Correct answer:</span> <span className="text-[var(--success)] font-medium">{answerText(q.correct_answer)}</span></p>
                      <div className="leading-relaxed text-[var(--text)]"><MarkdownText content={q.rationale} /></div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function EmptyQuizState() {
  const { isFrance, aiAssistantName } = usePersonalization()
  return (
    <div className="max-w-md mx-auto py-16">
      <div className="fn-card p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center mx-auto mb-4">
          <BrainCircuit size={30} weight="duotone" />
        </div>
        <h2 className="font-heading font-semibold text-lg">No study materials yet</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1 mb-6">
          {isFrance
            ? 'Doc Uno needs your notes to write custom quizzes. Upload them to the Study Box first!'
            : `${aiAssistantName} needs your notes to write custom quizzes. Upload them to the Study Box first.`}
        </p>
        <Link to="/study-box" className="btn-primary px-6 py-2.5 text-sm inline-flex items-center gap-2">
          Go to Study Box <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}

function QuizHistory({ quizzes, onBack, onDownload, onExportAll, onDelete }: {
  quizzes: Quiz[],
  onBack: () => void,
  onDownload: (quiz: Quiz) => void,
  onExportAll: () => void,
  onDelete: (id: string) => void
}) {
  const average = quizzes.length ? Math.round(quizzes.reduce((sum, q) => sum + (q.score || 0), 0) / quizzes.length) : 0

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto">
      <button onClick={onBack} className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--pink)] flex items-center gap-1.5 mb-4">
        <ArrowLeft size={16} /> Back to Quiz Generator
      </button>
      <PageHeader
        icon={History}
        title="My Quizzes"
        subtitle="Your scores and rationales. Download any quiz as a study PDF."
        actions={quizzes.length > 0 ? (
          <button onClick={onExportAll} className="btn-secondary px-4 py-2.5 text-sm flex items-center gap-2">
            <DownloadCloud size={16} /> Export all
          </button>
        ) : undefined}
      />

      {quizzes.length === 0 ? (
        <div className="fn-card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center mx-auto mb-3">
            <History size={26} weight="duotone" />
          </div>
          <p className="font-medium">No quizzes yet</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Finish your first quiz to see it here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[['Quizzes taken', `${quizzes.length}`], ['Average score', `${average}%`], ['Questions answered', `${quizzes.reduce((n, q) => n + (q.total_items || 0), 0)}`]].map(([label, value]) => (
              <div key={label} className="fn-card p-4">
                <p className="text-[11.5px] text-[var(--text-secondary)]">{label}</p>
                <p className="text-xl font-heading font-semibold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <div className="fn-card p-2">
            {quizzes.map(quiz => (
              <div key={quiz.id} className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-[var(--rose-soft)] transition-colors">
                <ScoreBadge score={quiz.score || 0} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium truncate">{quiz.title}</p>
                  <p className="text-[11.5px] text-[var(--text-secondary)]">{quiz.total_items} questions · {formatRelativeDate(quiz.created_at)}</p>
                </div>
                <button onClick={() => onDownload(quiz)} className="btn-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5 shrink-0" title="Download PDF">
                  <FileDown size={14} /> <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={async () => {
                    if (await confirmDialog({ title: 'Delete this quiz?', message: `“${quiz.title}” and its score will be removed from your history.`, confirmLabel: 'Delete', danger: true })) onDelete(quiz.id)
                  }}
                  className="btn-icon p-2 hover:text-[var(--error)] shrink-0"
                  aria-label="Delete quiz"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}

function CustomTopicDropdown({ topics, value, onChange }: { topics: Topic[], value: string, onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredTopics = topics.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))

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
        className="w-full fn-input rounded-xl bg-[var(--card)] py-2.5 flex items-center justify-between text-sm text-left"
      >
        <span className={cn('truncate', !value && 'text-[var(--text-secondary)]')}>{value || 'Choose a topic'}</span>
        <ChevronDown size={16} className={cn('text-[var(--text-secondary)] transition-transform shrink-0', isOpen && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-[70] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-fn-lg overflow-hidden"
          >
            <div className="p-2 border-b border-[var(--border)]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search topics…"
                autoFocus
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg py-1.5 px-3 text-sm outline-none focus:border-[var(--pink)]"
              />
            </div>
            <div className="overflow-y-auto custom-scrollbar max-h-60 p-1">
              {filteredTopics.length > 0 ? filteredTopics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => { onChange(topic.title); setIsOpen(false); setSearch('') }}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-left text-sm flex items-center justify-between',
                    value === topic.title ? 'bg-[var(--rose-soft)] text-[var(--pink)] font-medium' : 'hover:bg-[var(--rose-soft)]'
                  )}
                >
                  <span className="truncate">{topic.title}</span>
                  {value === topic.title && <Check size={15} />}
                </button>
              )) : (
                <p className="text-center py-4 text-xs text-[var(--text-secondary)]">No matching topics</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
