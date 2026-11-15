import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  NotePencil, Plus, MagnifyingGlass, PushPin, Trash, ArrowLeft, CheckCircle, CircleNotch, Folder, Scribble,
  DownloadSimple, FileDoc, Brain, Sparkle, Presentation, CaretDown, Lightning, FileText, ArrowSquareOut, Clock, X, ArrowRight
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import HandwritingCanvas from '@/components/notes/HandwritingCanvas'
import PageHeader from '@/components/shared/PageHeader'
import RichTextEditor from '@/components/notes/RichTextEditor'
import { noteContentText } from '@/lib/noteContent'
import { useNotesStore } from '@/stores/notesStore'
import { useBackToClose } from '@/hooks/useBackToClose'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { useQuizStore } from '@/stores/quizStore'
import { useReviewerStore } from '@/stores/reviewerStore'
import { exportToPDF, exportToPPTX } from '@/lib/export'
import { cn, formatRelativeDate } from '@/lib/utils'
import type { Note, HandwritingDrawing, QuestionType } from '@/types'
import { exportNoteToPDF } from '@/lib/notePdf'
import { confirmDialog, toast } from '@/stores/feedbackStore'

const SAVE_DELAY_MS = 600

export default function NotesPage() {
  const { notes, isLoading, error, fetchNotes, createNote, updateNote, deleteNote } = useNotesStore()
  const { topics } = useStudyBoxStore()
  const location = useLocation()

  const [query, setQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState<string>('all')
  const [activeId, setActiveId] = useState<string | null>((location.state as { openNoteId?: string } | null)?.openNoteId ?? null)
  useBackToClose(activeId !== null, () => setActiveId(null))

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const topicName = (id: string | null) => topics.find(t => t.id === id)?.title

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes.filter(n =>
      (topicFilter === 'all' || n.topic_id === topicFilter) &&
      (!q || n.title.toLowerCase().includes(q) || (n.kind !== 'handwriting' && noteContentText(n.content).toLowerCase().includes(q)))
    )
  }, [notes, query, topicFilter])

  // Only show topic chips that actually have notes
  const usedTopics = topics.filter(t => notes.some(n => n.topic_id === t.id))
  const active = notes.find(n => n.id === activeId) || null

  const handleNew = async (kind: Note['kind']) => {
    const note = await createNote(kind, topicFilter === 'all' ? null : topicFilter)
    if (note) setActiveId(note.id)
  }

  return (
    <div className="page-container max-w-7xl">
      <PageHeader
        icon={NotePencil}
        title="Notes"
        subtitle="Type or handwrite your own notes, filed under your study topics."
        actions={<>
          <button onClick={() => handleNew('handwriting')} className="btn-secondary px-4 py-2.5 text-sm flex items-center gap-2">
            <Scribble size={17} /> Handwritten
          </button>
          <button onClick={() => handleNew('text')} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
            <Plus size={16} weight="bold" /> New Note
          </button>
        </>}
      />

      {error && (
        <div role="alert" className="mb-4 px-4 py-3 rounded-xl bg-th-error/10 border border-th-error/25 text-[var(--error)] text-sm">
          Notes couldn't be loaded or saved: {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-5">
        {/* List */}
        <section className={cn('fn-card p-4 flex flex-col min-h-[60vh]', active && 'hidden lg:flex')}>
          <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-full px-3.5 py-2 mb-3">
            <MagnifyingGlass size={16} className="text-[var(--text-secondary)]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search notes..."
              className="bg-transparent outline-none text-sm w-full placeholder:text-th-text-secondary/70"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap mb-3">
            {[{ id: 'all', title: 'All' }, ...usedTopics].map(t => (
              <button
                key={t.id}
                onClick={() => setTopicFilter(t.id)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  topicFilter === t.id
                    ? 'bg-[var(--pink)] border-[var(--pink)] text-white'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]'
                )}
              >
                {t.title}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar -mx-1 px-1 space-y-1">
            {isLoading && notes.length === 0 ? (
              <div className="flex justify-center py-10 text-[var(--pink)]"><CircleNotch size={22} className="animate-spin" /></div>
            ) : visible.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center mb-3">
                  <NotePencil size={26} weight="duotone" />
                </div>
                <p className="text-sm font-medium">{notes.length === 0 ? 'No notes yet' : 'No matching notes'}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {notes.length === 0 ? 'Start a typed note, or a handwritten page for your Apple Pencil.' : 'Try another search or topic.'}
                </p>
              </div>
            ) : (
              visible.map(note => (
                <button
                  key={note.id}
                  onClick={() => setActiveId(note.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-xl flex gap-3 items-start transition-colors',
                    note.id === activeId ? 'bg-[var(--secondary-bg)]' : 'hover:bg-[var(--rose-soft)]'
                  )}
                >
                  <div className="w-9 h-9 rounded-xl bg-[var(--rose-soft)] border border-[var(--border)] text-[var(--pink)] flex items-center justify-center shrink-0">
                    {note.kind === 'handwriting' ? <Scribble size={17} /> : <NotePencil size={17} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium truncate flex items-center gap-1.5">
                      {note.is_pinned && <PushPin size={12} weight="fill" className="text-[var(--pink)] shrink-0" />}
                      {note.title || 'Untitled note'}
                    </p>
                    <p className="text-[11.5px] text-[var(--text-secondary)] truncate">
                      {note.kind === 'handwriting'
                        ? `Handwritten · ${note.drawing?.pages ?? 1} page${(note.drawing?.pages ?? 1) > 1 ? 's' : ''}`
                        : noteContentText(note.content).trim().slice(0, 80) || 'Empty note'}
                    </p>
                    <p className="text-[10.5px] text-th-text-secondary/80 mt-0.5">
                      {topicName(note.topic_id) ? `${topicName(note.topic_id)} · ` : ''}Updated {formatRelativeDate(note.updated_at).toLowerCase()}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Editor */}
        {active?.kind === 'handwriting' ? (
          <HandwritingEditor
            key={active.id}
            note={active}
            topics={topics}
            onBack={() => setActiveId(null)}
            onSave={updates => updateNote(active.id, updates)}
            onDelete={() => { deleteNote(active.id); setActiveId(null) }}
          />
        ) : active ? (
          <NoteEditor
            key={active.id}
            note={active}
            topics={topics}
            onBack={() => setActiveId(null)}
            onSave={updates => updateNote(active.id, updates)}
            onDelete={() => { deleteNote(active.id); setActiveId(null) }}
          />
        ) : (
          <section className="fn-card hidden lg:flex flex-col items-center justify-center text-center p-10 min-h-[60vh]">
            <div className="w-16 h-16 rounded-2xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center mb-4">
              <NotePencil size={30} weight="duotone" />
            </div>
            <p className="font-heading font-semibold">Pick a note or start a new one</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xs">Format your notes with headings, lists, bold, colors, and more.</p>
          </section>
        )}
      </div>
    </div>
  )
}

type NoteUpdates = Partial<Pick<Note, 'title' | 'content' | 'drawing' | 'topic_id' | 'is_pinned'>>
type EditorProps = {
  note: Note
  topics: { id: string; title: string }[]
  onBack: () => void
  onSave: (updates: NoteUpdates) => void
  onDelete: () => void
}

// Debounced autosave shared by both editors; flushes on unmount so nothing is lost when switching notes
function useAutosave(onSave: (updates: NoteUpdates) => void) {
  const [saveState, setSaveState] = useState<'saved' | 'pending'>('saved')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<NoteUpdates | null>(null)

  const flush = () => {
    if (timer.current) clearTimeout(timer.current)
    if (pending.current) {
      onSave(pending.current)
      pending.current = null
      setSaveState('saved')
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => flush(), [])

  const queue = (updates: NoteUpdates) => {
    pending.current = { ...pending.current, ...updates }
    setSaveState('pending')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY_MS)
  }

  return { saveState, queue, flush }
}

function EditorBar({ note, topics, saveState, onBack, onSave, onDelete, children }: Omit<EditorProps, 'onBack'> & {
  saveState: 'saved' | 'pending'
  onBack: () => void
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
      <button onClick={onBack} className="btn-icon lg:hidden" aria-label="Back to notes">
        <ArrowLeft size={18} />
      </button>

      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg)] border border-[var(--border)] rounded-full pl-2.5 pr-1 py-0.5">
        <Folder size={14} className="text-[var(--pink)]" />
        <select
          value={note.topic_id ?? ''}
          onChange={e => onSave({ topic_id: e.target.value || null })}
          className="bg-transparent outline-none py-1 pr-1 max-w-[130px] sm:max-w-[220px]"
          aria-label="Topic"
        >
          <option value="">No topic</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      <span className="ml-auto text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
        {saveState === 'pending'
          ? <><CircleNotch size={12} className="animate-spin" /> Saving</>
          : <><CheckCircle size={12} weight="fill" className="text-[var(--success)]" /> Saved</>}
      </span>

      {children}

      <button
        onClick={() => onSave({ is_pinned: !note.is_pinned })}
        className={cn('btn-icon', note.is_pinned && 'text-[var(--pink)]')}
        aria-label={note.is_pinned ? 'Unpin note' : 'Pin note'}
        title={note.is_pinned ? 'Unpin' : 'Pin'}
      >
        <PushPin size={18} weight={note.is_pinned ? 'fill' : 'regular'} />
      </button>
      <button
        onClick={async () => { if (await confirmDialog({ title: 'Delete this note?', message: 'This can’t be undone.', confirmLabel: 'Delete', danger: true })) onDelete() }}
        className="btn-icon hover:text-[var(--error)]"
        aria-label="Delete note"
        title="Delete"
      >
        <Trash size={18} />
      </button>
    </div>
  )
}

/** Export & Convert Dropdown Menu */
function NoteExportDropdown({
  onExportPDFReviewer,
  onExportPPTX,
  onExportRawPDF,
  onExportDOCX,
  exportingType,
}: {
  onExportPDFReviewer: () => void
  onExportPPTX: () => void
  onExportRawPDF: () => void
  onExportDOCX: () => void
  exportingType: string | null
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={!!exportingType}
        className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 hover:text-[var(--pink)] font-medium disabled:opacity-50"
        title="Export or turn note into PPTX, PDF Reviewer, Word"
      >
        {exportingType ? (
          <CircleNotch size={14} className="animate-spin text-[var(--pink)]" />
        ) : (
          <DownloadSimple size={14} className="text-[var(--pink)]" weight="bold" />
        )}
        <span>Export</span>
        <CaretDown size={11} className={cn('transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 w-72 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-fn-lg p-1.5 z-50 text-left"
          >
            <div className="px-3 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--pink)]">
              Turn into Reviewer &amp; Slides
            </div>

            <button
              onClick={() => { setOpen(false); onExportPDFReviewer() }}
              disabled={!!exportingType}
              className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-[var(--rose-soft)] transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center shrink-0 border border-[var(--border)] group-hover:bg-[var(--card)]">
                <FileText size={17} weight="duotone" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-[var(--text)]">PDF Reviewer</p>
                  <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--rose-soft)] text-[var(--pink)]">Study Guide</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1">Board-ready clinical guide &amp; priorities</p>
              </div>
            </button>

            <button
              onClick={() => { setOpen(false); onExportPPTX() }}
              disabled={!!exportingType}
              className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-[var(--rose-soft)] transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center shrink-0 border border-[var(--border)] group-hover:bg-[var(--card)]">
                <Presentation size={17} weight="duotone" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-[var(--text)]">PowerPoint (.pptx)</p>
                  <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--rose-soft)] text-[var(--pink)]">16:9 Slides</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1">Formatted slide deck with presenter notes</p>
              </div>
            </button>

            <div className="my-1.5 border-t border-[var(--border)]" />
            <div className="px-3 pt-1 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Raw Note Files
            </div>

            <button
              onClick={() => { setOpen(false); onExportRawPDF() }}
              disabled={!!exportingType}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-[var(--rose-soft)] transition-colors text-[13px]"
            >
              <DownloadSimple size={16} className="text-[var(--text-secondary)] shrink-0" />
              <span>Download Note as PDF</span>
            </button>

            <button
              onClick={() => { setOpen(false); onExportDOCX() }}
              disabled={!!exportingType}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-[var(--rose-soft)] transition-colors text-[13px]"
            >
              <FileDoc size={16} className="text-[var(--text-secondary)] shrink-0" />
              <span>Download Word (.docx)</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Quick Modal to Turn Note into a Quiz */
function QuizFromNoteModal({
  noteTitle,
  noteText,
  onClose,
  onStartQuiz,
  onCustomizeInQuizHub,
}: {
  noteTitle: string
  noteText: string
  onClose: () => void
  onStartQuiz: (options: { size: number; questionType: QuestionType; timerType: 'untimed' | 'per_question'; timerValue: number }) => void
  onCustomizeInQuizHub: () => void
}) {
  const [size, setSize] = useState<number>(10)
  const [questionType, setQuestionType] = useState<QuestionType>('mixed')
  const [isTimed, setIsTimed] = useState<boolean>(false)

  const wordCount = noteText.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        className="bg-[var(--card)] border border-[var(--border)] rounded-t-3xl sm:rounded-2xl shadow-fn-lg w-full max-w-lg p-5 sm:p-6 overflow-hidden flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--rose-soft)] border border-[var(--border)] text-[var(--pink)] flex items-center justify-center shrink-0">
              <Brain size={22} weight="duotone" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg text-[var(--text)]">Turn Note into Quiz</h3>
              <p className="text-xs text-[var(--text-secondary)]">Practice questions created directly from this note</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon -mr-1" aria-label="Close">
            <X size={17} />
          </button>
        </div>

        {/* Note Preview Box */}
        <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] mb-4">
          <p className="text-xs font-semibold text-[var(--text)] truncate">{noteTitle || 'Untitled note'}</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            {wordCount} words · {noteText.length} characters loaded as study material
          </p>
        </div>

        {/* Question Count */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            Number of Questions
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[5, 10, 20, 30].map(n => (
              <button
                key={n}
                onClick={() => setSize(n)}
                className={cn(
                  'py-2 rounded-xl text-xs font-semibold border transition-colors',
                  size === n
                    ? 'bg-[var(--pink)] border-[var(--pink)] text-white shadow-xs'
                    : 'border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]'
                )}
              >
                {n} items
              </button>
            ))}
          </div>
        </div>

        {/* Question Type */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            Question Style
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'mixed', label: 'Mixed Board' },
              { id: 'multiple_choice', label: 'Multiple Choice' },
              { id: 'situational', label: 'Case Studies' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setQuestionType(t.id as QuestionType)}
                className={cn(
                  'py-2 px-2 rounded-xl text-xs font-medium border truncate transition-colors',
                  questionType === t.id
                    ? 'bg-[var(--pink)] border-[var(--pink)] text-white shadow-xs font-semibold'
                    : 'border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mode / Timer */}
        <div className="mb-5 flex items-center justify-between p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[var(--pink)]" />
            <span className="text-xs font-medium text-[var(--text)]">Timed Mode (1 min / question)</span>
          </div>
          <button
            onClick={() => setIsTimed(t => !t)}
            className={cn(
              'w-10 h-6 rounded-full transition-colors relative p-0.5',
              isTimed ? 'bg-[var(--pink)]' : 'bg-[var(--border)]'
            )}
            aria-label="Toggle Timed Mode"
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full bg-white transition-transform shadow-xs',
                isTimed && 'translate-x-4'
              )}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 mt-auto">
          <button
            onClick={onCustomizeInQuizHub}
            className="btn-secondary py-2.5 px-4 text-xs flex items-center justify-center gap-1.5 order-2 sm:order-1"
          >
            <ArrowSquareOut size={14} /> Open in Quiz Hub
          </button>
          <button
            onClick={() => onStartQuiz({
              size,
              questionType,
              timerType: isTimed ? 'per_question' : 'untimed',
              timerValue: isTimed ? 60 : 0,
            })}
            className="btn-primary py-2.5 px-5 text-xs flex items-center justify-center gap-2 flex-1 order-1 sm:order-2"
          >
            <Lightning size={15} weight="fill" /> Start Quiz Now <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function HandwritingEditor({ note, topics, onBack, onSave, onDelete }: EditorProps) {
  const [title, setTitle] = useState(note.title)
  const { saveState, queue, flush } = useAutosave(onSave)
  const latestDrawing = useRef(note.drawing)
  const drawing: HandwritingDrawing = note.drawing ?? { paper: 'lined', pages: 1, strokes: [] }
  const [exportingType, setExportingType] = useState<string | null>(null)

  const handleExportRawPDF = async () => {
    setExportingType('raw-pdf')
    try {
      await exportNoteToPDF({ ...note, title, drawing: latestDrawing.current })
      toast('Handwritten note exported as PDF!', 'success')
    } catch {
      toast("Couldn't create the PDF file.", 'error')
    } finally {
      setExportingType(null)
    }
  }

  const handleExportDOCX = async () => {
    setExportingType('docx')
    try {
      const { exportNoteToDOCX } = await import('@/lib/noteDocx')
      await exportNoteToDOCX({ ...note, title, drawing: latestDrawing.current })
      toast('Note exported as Word document!', 'success')
    } catch {
      toast("Couldn't create the Word document.", 'error')
    } finally {
      setExportingType(null)
    }
  }

  return (
    <section className="fn-card flex flex-col min-h-[60vh] overflow-hidden">
      <EditorBar note={note} topics={topics} saveState={saveState} onBack={() => { flush(); onBack() }} onSave={onSave} onDelete={onDelete}>
        <NoteExportDropdown
          onExportPDFReviewer={handleExportRawPDF}
          onExportPPTX={handleExportRawPDF}
          onExportRawPDF={handleExportRawPDF}
          onExportDOCX={handleExportDOCX}
          exportingType={exportingType}
        />
      </EditorBar>
      <div className="p-4 sm:p-6 bg-th-bg/60 flex-1">
        <input
          value={title}
          onChange={e => { setTitle(e.target.value); queue({ title: e.target.value }) }}
          placeholder="Untitled handwritten note"
          className="w-full bg-transparent outline-none text-2xl font-heading font-semibold placeholder:text-th-text-secondary/50 mb-3"
        />
        <HandwritingCanvas drawing={drawing} onChange={next => { latestDrawing.current = next; queue({ drawing: next }) }} />
      </div>
    </section>
  )
}

function NoteEditor({ note, topics, onBack, onSave, onDelete }: EditorProps) {
  const navigate = useNavigate()
  const { startQuiz } = useQuizStore()
  const { generateReviewerFromNote, generatePresentationFromNote } = useReviewerStore()

  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const { saveState, queue, flush } = useAutosave(onSave)

  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false)
  const [exportingType, setExportingType] = useState<string | null>(null)
  const [exportingStatus, setExportingStatus] = useState<string>('')

  const getNoteText = () => noteContentText(content).trim()

  const handleTurnIntoQuizClick = () => {
    flush()
    const text = getNoteText()
    if (!text && !title.trim()) {
      toast('Please write some content in this note before turning it into a quiz.', 'info')
      return
    }
    setIsQuizModalOpen(true)
  }

  const handleStartQuizFromNote = async (options: {
    size: number
    questionType: QuestionType
    timerType: 'untimed' | 'per_question'
    timerValue: number
  }) => {
    flush()
    const text = getNoteText()
    const noteName = title.trim() || 'Study Note'
    setIsQuizModalOpen(false)

    // Launch quiz and navigate directly into the active quiz view
    startQuiz({
      topic: noteName,
      size: options.size,
      question_type: options.questionType,
      sourceText: text || title,
      sourceName: noteName,
      timer_type: options.timerType,
      timer_value: options.timerValue,
    })
    navigate('/quiz')
  }

  const handleCustomizeInQuizHub = () => {
    flush()
    const text = getNoteText()
    const noteName = title.trim() || 'Study Note'
    setIsQuizModalOpen(false)
    navigate('/quiz', {
      state: {
        preSelectedTopic: noteName,
        preSelectedText: text || title,
        preSelectedName: noteName,
      }
    })
  }

  const handleExportPDFReviewer = async () => {
    flush()
    const text = getNoteText()
    if (!text && !title.trim()) {
      toast('Please add some content to this note first to generate a PDF Reviewer.', 'info')
      return
    }

    setExportingType('pdf-reviewer')
    setExportingStatus('Formatting your note into a clinical study guide...')

    try {
      const reviewer = await generateReviewerFromNote({
        title: title.trim() || 'Study Note Reviewer',
        contentText: text || title,
        topicId: note.topic_id,
      })
      setExportingStatus('Creating your PDF Reviewer...')
      await exportToPDF(reviewer)
      toast('PDF Reviewer downloaded! Saved to your Reviewer Library.', 'success')
    } catch (err) {
      console.error('PDF Reviewer export failed:', err)
      toast("Couldn't generate the PDF Reviewer. Please try again.", 'error')
    } finally {
      setExportingType(null)
      setExportingStatus('')
    }
  }

  const handleExportPPTX = async () => {
    flush()
    const text = getNoteText()
    if (!text && !title.trim()) {
      toast('Please add some content to this note first to generate PowerPoint slides.', 'info')
      return
    }

    setExportingType('pptx')
    setExportingStatus('Formatting your note into 16:9 presentation slides...')

    try {
      const presentation = await generatePresentationFromNote({
        title: title.trim() || 'Lecture Presentation',
        contentText: text || title,
        topicId: note.topic_id,
      })
      setExportingStatus('Building your PowerPoint file...')
      await exportToPPTX(presentation)
      toast('PowerPoint presentation downloaded! Saved to your Reviewer Library.', 'success')
    } catch (err) {
      console.error('PPTX export failed:', err)
      toast("Couldn't generate the PowerPoint file. Please try again.", 'error')
    } finally {
      setExportingType(null)
      setExportingStatus('')
    }
  }

  const handleExportRawPDF = async () => {
    flush()
    setExportingType('raw-pdf')
    try {
      await exportNoteToPDF({ ...note, title, content })
      toast('Note exported as PDF!', 'success')
    } catch {
      toast("Couldn't create the PDF.", 'error')
    } finally {
      setExportingType(null)
    }
  }

  const handleExportDOCX = async () => {
    flush()
    setExportingType('docx')
    try {
      const { exportNoteToDOCX } = await import('@/lib/noteDocx')
      await exportNoteToDOCX({ ...note, title, content })
      toast('Note exported as Word document!', 'success')
    } catch {
      toast("Couldn't create the Word document.", 'error')
    } finally {
      setExportingType(null)
    }
  }

  return (
    <section className="fn-card flex flex-col min-h-[60vh] overflow-hidden relative">
      <EditorBar note={note} topics={topics} saveState={saveState} onBack={() => { flush(); onBack() }} onSave={onSave} onDelete={onDelete}>
        {/* Turn note into Quiz without downloading */}
        <button
          onClick={handleTurnIntoQuizClick}
          className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 hover:text-[var(--pink)] font-medium transition-colors shrink-0"
          title="Turn note into a quiz without downloading"
        >
          <Brain size={15} className="text-[var(--pink)]" weight="duotone" />
          <span className="hidden sm:inline">Turn into </span>Quiz
        </button>

        {/* Turn into Reviewer & Download Menu */}
        <NoteExportDropdown
          onExportPDFReviewer={handleExportPDFReviewer}
          onExportPPTX={handleExportPPTX}
          onExportRawPDF={handleExportRawPDF}
          onExportDOCX={handleExportDOCX}
          exportingType={exportingType}
        />
      </EditorBar>

      {/* Floating Status Notification for PPTX & PDF Reviewer Generation */}
      <AnimatePresence>
        {exportingType && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-4 right-4 z-40 bg-[var(--card)]/95 backdrop-blur-md border border-[var(--border)] shadow-fn-lg rounded-2xl px-4 py-3 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center shrink-0 border border-[var(--border)]">
              <CircleNotch size={18} className="animate-spin" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text)]">
                {exportingType === 'pdf-reviewer' ? 'Generating PDF Reviewer' : exportingType === 'pptx' ? 'Generating PowerPoint Slides' : 'Creating File'}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">{exportingStatus || 'Please wait a moment...'}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col p-5 sm:p-7">
        <input
          value={title}
          onChange={e => { setTitle(e.target.value); queue({ title: e.target.value }) }}
          placeholder="Untitled note"
          className="bg-transparent outline-none text-2xl font-heading font-semibold placeholder:text-th-text-secondary/50 mb-1"
        />
        <p className="text-[11px] text-[var(--text-secondary)] mb-4">Created {formatRelativeDate(note.created_at).toLowerCase()}</p>

        <RichTextEditor initialContent={note.content} onChange={next => { setContent(next); queue({ content: next }) }} />
      </div>

      {/* Quiz Modal */}
      <AnimatePresence>
        {isQuizModalOpen && (
          <QuizFromNoteModal
            noteTitle={title}
            noteText={getNoteText()}
            onClose={() => setIsQuizModalOpen(false)}
            onStartQuiz={handleStartQuizFromNote}
            onCustomizeInQuizHub={handleCustomizeInQuizHub}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
