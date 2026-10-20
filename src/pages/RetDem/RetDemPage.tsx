import { useState, useRef, useCallback, useEffect } from 'react'
import { useRetDemStore, RetDemError } from '@/stores/retDemStore'
import type { HistoryFile } from '@/stores/retDemStore'
import { Stethoscope, CaretRight as ChevronRight, Clock, Check, ArrowLeft, Play, Heart, MagnifyingGlass as Search, Info, ListChecks, Sparkle as Sparkles, UploadSimple as Upload, X, FileText, CircleNotch as Loader2, CheckCircle as CheckCircle2, Trash as Trash2, ClockCounterClockwise as History, WarningCircle, Eye, Microphone, ChalkboardTeacher, HandHeart, UserCircle } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { tintFor } from '@/lib/tints'
import MarkdownText from '@/components/shared/MarkdownText'
import type { RetDemProcedure, RecitationMode } from '@/types'
import { useSimulationStore } from '@/stores/simulationStore'
import { unlockAudio } from '@/lib/elevenLabsTts'
import { SimulationEngine } from '@/components/shared/SimulationEngine'
import { visionExtractText } from '@/lib/ai'
import { extractTextFromFile } from '@/lib/extractor'
import { toast } from '@/stores/feedbackStore'
import { usePersonalization } from '@/hooks/usePersonalization'

const SUGGESTED_PROCEDURES = ['Foley Catheter', 'IV Insertion', 'Wound Dressing', 'NG Tube Insertion', 'Blood Transfusion', 'Nasogastric Suction']

export default function RetDemPage() {
  const { isFrance, aiAssistantName, retdemName } = usePersonalization()
  const {
    procedures, activeProcedure, setActiveProcedure,
    recitationMode, setRecitationMode,
    uploadedFiles, addUploadedFile, removeUploadedFile, clearUploadedFiles,
    generateProcedureFromUpload, isGenerating, deleteProcedure,
    uploadHistory, deleteHistoryFile
  } = useRetDemStore()
  const { isActive, isEvaluating, activeMode, reset } = useSimulationStore()

  useEffect(() => {
    // Clear an old finished report (it's saved in history), but keep a session that is still
    // being graded or whose grading failed, so the transcript and "Try again" aren't lost
    const sim = useSimulationStore.getState()
    const gradingPending = sim.isEvaluating && !sim.scores
    if (!sim.isActive && !gradingPending) {
      reset()
    }
  }, [])
  const [activeTab, setActiveTab] = useState<'library' | 'history'>('library')
  const [search, setSearch] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractingCount, setExtractingCount] = useState(0)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateTopic, setGenerateTopic] = useState('')
  const [generateError, setGenerateError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const generateInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setIsExtracting(true)
    setExtractingCount(files.length)
    const fileArr = Array.from(files)
    for (const file of fileArr) {
      try {
        let extractedText = ''
        if (file.type.startsWith('image/')) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.readAsDataURL(file)
          })
          extractedText = await visionExtractText(base64)
        } else {
          // PDFs (including scanned ones) and DOCX need real parsing, not readAsText
          extractedText = await extractTextFromFile(file)
        }
        if (!extractedText.trim() || extractedText.startsWith('[SYSTEM MESSAGE')) throw new Error('No readable text')
        addUploadedFile(file.name, extractedText)
      } catch (e) {
        console.error('File extraction failed for', file.name, e)
        toast(`Couldn't read text from “${file.name}”. Try a clearer photo, or a PDF or Word file.`, 'error')
      }
    }
    setIsExtracting(false)
    setExtractingCount(0)
    // reset file input so the same file can be re-added
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [])

  if ((isActive || isEvaluating) && activeMode === 'retdem') return <SimulationEngine />

  const connectionError = isFrance
    ? "Babe, nagka-error sa pagkonek kay Doc Uno. Please try again!"
    : `Nagka-error sa pagkonek kay ${aiAssistantName}. Please try again!`

  const openGenerateModal = () => {
    setShowGenerateModal(true)
    setTimeout(() => generateInputRef.current?.focus(), 50)
  }

  const filtered = procedures.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  const filteredHistory = uploadHistory.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.text.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-container max-w-6xl">
      <AnimatePresence mode="wait">
        {activeProcedure ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <RetDemDetail
              procedure={activeProcedure}
              onBack={() => setActiveProcedure(null)}
              mode={recitationMode}
              onModeChange={setRecitationMode}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PageHeader
              icon={Stethoscope}
              title={retdemName}
              subtitle={isFrance ? 'Master your nursing procedures with step-by-step guides and rationales, babe!' : 'Master your nursing procedures with step-by-step guides and rationales.'}
              actions={
                <button onClick={openGenerateModal} disabled={isGenerating} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {isGenerating ? 'Generating' : 'Generate procedure'}
                </button>
              }
            />

            {/* Upload reference material */}
            <section className="fn-card p-5 mb-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.txt,.pdf,.docx"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="flex flex-col md:flex-row gap-4 md:items-stretch">
                <div className="md:w-60 shrink-0">
                  <h2 className="font-heading font-semibold text-[15px]">Practice from your own guide</h2>
                  <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                    Upload your school's RetDem checklist and {isFrance ? 'Doc Uno' : aiAssistantName} will turn it into a practice procedure.
                  </p>
                </div>

                <div className="flex-1 min-w-0 space-y-2.5">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => !isExtracting && fileInputRef.current?.click()}
                    className={cn(
                      'rounded-xl border-2 border-dashed px-4 py-4 flex items-center gap-3.5 cursor-pointer transition-colors',
                      isDragging ? 'border-[var(--pink)] bg-[var(--rose-soft)]' : 'border-[var(--accent)] hover:bg-[var(--rose-soft)]'
                    )}
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', isDragging ? 'bg-[var(--pink)] text-white' : 'bg-th-pink/10 text-[var(--pink)]')}>
                      {isExtracting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium">
                        {isExtracting
                          ? `Reading ${extractingCount} file${extractingCount > 1 ? 's' : ''}`
                          : uploadedFiles.length > 0 ? 'Add more files' : 'Drop files here or browse'}
                      </p>
                      <p className="text-[12px] text-[var(--text-secondary)]">
                        {isExtracting
                          ? (isFrance ? 'Doc Uno is reading your files' : `${aiAssistantName} is reading your files`)
                          : 'Photos, PDF, DOCX or TXT. You can select several at once.'}
                      </p>
                    </div>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {uploadedFiles.map((f) => (
                          <span key={f.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-th-success/10 text-[12px] font-medium max-w-full">
                            <CheckCircle2 size={13} weight="fill" className="text-[var(--success)] shrink-0" />
                            <span className="truncate">{f.name}</span>
                            <button onClick={() => removeUploadedFile(f.id)} className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-th-error/10 shrink-0" aria-label={`Remove ${f.name}`}>
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              setGenerateError(null)
                              await generateProcedureFromUpload()
                              setActiveTab('library')
                            } catch (e) {
                              console.error(e)
                              setGenerateError(e instanceof RetDemError ? e.message : connectionError)
                            }
                          }}
                          disabled={isGenerating}
                          className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {isGenerating
                            ? <><Loader2 size={15} className="animate-spin" /> Generating from {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}</>
                            : <><Sparkles size={15} /> Generate practice from {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}</>}
                        </button>
                        <button onClick={clearUploadedFiles} className="btn-secondary px-4 py-2.5 text-sm">Clear</button>
                      </div>
                    </>
                  )}

                  {generateError && (
                    <p className="text-[12.5px] text-[var(--error)] flex items-start gap-1.5"><WarningCircle size={15} className="shrink-0 mt-px" /> {generateError}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
              <div className="flex p-1 rounded-full bg-[var(--card)] border border-[var(--border)] w-max">
                {([['library', `Procedures · ${procedures.length}`, Stethoscope], ['history', `Uploads · ${uploadHistory.length}`, History]] as const).map(([id, label, TabIcon]) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={cn('px-4 py-1.5 rounded-full text-[13px] font-medium flex items-center gap-1.5 transition-colors', activeTab === id ? 'bg-[var(--pink)] text-white' : 'text-[var(--text-secondary)]')}
                  >
                    <TabIcon size={15} /> {label}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 sm:max-w-sm sm:ml-auto">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                <input
                  type="text"
                  placeholder={activeTab === 'library' ? 'Search procedures' : 'Search uploads'}
                  className="fn-input rounded-full bg-[var(--card)] pl-10 py-2.5 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {activeTab === 'library' ? (
              filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.map((proc) => (
                    <ProcedureCard
                      key={proc.id}
                      proc={proc}
                      onOpen={() => setActiveProcedure(proc)}
                      onDelete={() => deleteProcedure(proc.id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Stethoscope}
                  title={search ? 'No matching procedures' : 'No procedures yet'}
                  text={search ? 'Try a different name or category.' : 'Generate a procedure by name, or upload your own RetDem guide above.'}
                  action={!search && <button onClick={openGenerateModal} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2"><Sparkles size={16} /> Generate procedure</button>}
                />
              )
            ) : (
              filteredHistory.length > 0 ? (
                <div className="fn-card divide-y divide-[var(--border)]">
                  {filteredHistory.map((file) => (
                    <HistoryFileRow
                      key={file.id}
                      file={file}
                      onDelete={() => deleteHistoryFile(file.id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={History}
                  title={search ? 'No matching uploads' : 'No uploads yet'}
                  text={search ? 'Try a different file name or phrase.' : 'Files you upload for RetDem practice are kept here so you can review the extracted text.'}
                />
              )
            )}

            {/* Generate modal */}
            <AnimatePresence>
              {showGenerateModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGenerateModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    className="relative z-10 w-full max-w-lg bg-[var(--card)] border border-[var(--border)] rounded-t-3xl sm:rounded-2xl shadow-fn-lg"
                  >
                    <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 border-b border-[var(--border)]">
                      <div>
                        <h2 className="font-heading font-semibold text-[17px]">Generate a procedure</h2>
                        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                          {isFrance
                            ? 'Anong procedure ang kailangan mo? Doc Uno will write the steps with rationales.'
                            : `Which procedure do you need? ${aiAssistantName} will write the steps with rationales.`}
                        </p>
                      </div>
                      <button onClick={() => setShowGenerateModal(false)} className="btn-icon p-2 -mr-1" aria-label="Close"><X size={18} /></button>
                    </div>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        if (!generateTopic.trim()) return
                        setShowGenerateModal(false)
                        setGenerateTopic('')
                        try {
                          setGenerateError(null)
                          await useRetDemStore.getState().generateProcedure(generateTopic.trim())
                          setActiveTab('library')
                        } catch (err) {
                          console.error(err)
                          setGenerateError(err instanceof RetDemError ? err.message : connectionError)
                        }
                      }}
                      className="p-6 space-y-4"
                    >
                      <input
                        ref={generateInputRef}
                        type="text"
                        value={generateTopic}
                        onChange={(e) => setGenerateTopic(e.target.value)}
                        placeholder="e.g. Foley catheter insertion"
                        className="fn-input rounded-xl bg-[var(--card)] py-2.5 text-sm"
                        autoComplete="off"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_PROCEDURES.map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setGenerateTopic(s)}
                            className={cn('px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors', generateTopic === s ? 'border-[var(--pink)] bg-[var(--rose-soft)] text-[var(--pink)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]')}
                          >{s}</button>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => setShowGenerateModal(false)} className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
                        <button type="submit" disabled={!generateTopic.trim() || isGenerating} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
                          {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Generating</> : <><Sparkles size={16} /> Generate</>}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EmptyState({ icon: EmptyIcon, title, text, action }: { icon: Icon; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="fn-card p-10 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center mb-3"><EmptyIcon size={26} weight="duotone" /></div>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-sm">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

function ProcedureCard({ proc, onOpen, onDelete }: {
  proc: RetDemProcedure
  onOpen: () => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      className="fn-card overflow-hidden group cursor-pointer hover:shadow-fn-md transition-shadow flex flex-col"
      onClick={() => { if (!confirmDelete) onOpen() }}
    >
      <div className={`h-20 bg-gradient-to-br ${tintFor(proc.id)} relative flex items-center px-5`}>
        <div className="w-11 h-11 rounded-xl bg-white/70 dark:bg-white/10 text-[var(--pink)] flex items-center justify-center shadow-sm">
          <Stethoscope size={22} weight="duotone" />
        </div>
        {proc.is_favorite && <Heart size={16} weight="fill" className="absolute top-3 right-12 text-[var(--pink)]" />}
        <div className="absolute top-2.5 right-2.5" onClick={(e) => e.stopPropagation()}>
          {confirmDelete ? (
            <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--border)] rounded-full pl-2.5 pr-1 py-1 shadow-sm">
              <span className="text-[11.5px] font-medium text-[var(--error)]">Delete?</span>
              <button onClick={onDelete} className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-[var(--error)] text-white">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[11.5px] font-medium px-2 py-0.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]">No</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/70 dark:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--error)] sm:opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Delete ${proc.title}`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2 text-[11.5px]">
          <span className="font-medium px-2 py-0.5 rounded-full bg-th-pink/10 text-[var(--pink)]">{proc.category}</span>
          <span className="text-[var(--text-secondary)] flex items-center gap-1"><Clock size={12} /> {proc.duration}</span>
        </div>
        <h3 className="font-heading font-semibold text-[16px] leading-snug group-hover:text-[var(--pink)] transition-colors">{proc.title}</h3>
        <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 mt-1">{proc.description}</p>
        <div className="flex items-center justify-between mt-auto pt-4 text-[12px] text-[var(--text-secondary)]">
          <span>{proc.steps.length} step{proc.steps.length === 1 ? '' : 's'} · {proc.materials.length} material{proc.materials.length === 1 ? '' : 's'}</span>
          <span className="flex items-center gap-0.5 font-medium text-[var(--pink)]">Open <ChevronRight size={13} /></span>
        </div>
      </div>
    </div>
  )
}

const PRACTICE_MODES: { id: RecitationMode; label: string; desc: string; icon: Icon; franceOnly?: boolean }[] = [
  { id: 'gentle', label: 'Gentle', desc: 'Supportive, corrects you kindly', icon: HandHeart },
  { id: 'clinical_instructor', label: 'Clinical instructor', desc: 'Strict, asks why, rationales hidden', icon: ChalkboardTeacher },
  { id: 'doc_uno', label: 'Doc Uno', desc: 'Playful but challenging', icon: UserCircle, franceOnly: true },
]

function RetDemDetail({ procedure, onBack, mode: storedMode, onModeChange }: {
  procedure: RetDemProcedure,
  onBack: () => void,
  mode: RecitationMode,
  onModeChange: (m: RecitationMode) => void
}) {
  const [checkedMaterials, setCheckedMaterials] = useState<string[]>([])
  const [revealedSteps, setRevealedSteps] = useState<number[]>([])
  const { startSession } = useSimulationStore()
  const { uploadedFiles, toggleProcedureFavorite } = useRetDemStore()
  const { isFrance, aiAssistantName } = usePersonalization()
  // Doc Uno mode is France-only; everyone else falls back to Gentle
  const mode: RecitationMode = !isFrance && storedMode === 'doc_uno' ? 'gentle' : storedMode

  const isCIMode = mode === 'clinical_instructor'

  const toggleMaterial = (m: string) => {
    setCheckedMaterials(prev =>
      prev.includes(m) ? prev.filter(item => item !== m) : [...prev, m]
    )
  }

  const buildProcedureSourceText = () => {
    const stepsText = procedure.steps
      .map(s => `Step ${s.step}: ${s.action}\nRationale: ${s.rationale}`)
      .join('\n\n')
    const base = `Procedure: ${procedure.title}\n\nDescription: ${procedure.description}\n\nMain Rationale: ${procedure.rationale}\n\nMaterials: ${procedure.materials.join(', ')}\n\nSteps:\n${stepsText}`
    if (uploadedFiles.length > 0) {
      const refs = uploadedFiles
        .map((f, i) => `--- Reference ${i + 1}: ${f.name} ---\n${f.text}`)
        .join('\n\n')
      return `${base}\n\n---\nADDITIONAL REFERENCES (uploaded by student):\n${refs}`
    }
    return base
  }

  const sourceName = uploadedFiles.length > 0
    ? `${procedure.title} + ${uploadedFiles.length} uploaded file${uploadedFiles.length > 1 ? 's' : ''}`
    : procedure.title

  const modes = PRACTICE_MODES.filter(m => !m.franceOnly || isFrance)

  return (
    <div className="pb-20">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--pink)] transition-colors mb-4"
      >
        <ArrowLeft size={16} /> All procedures
      </button>

      {/* Hero */}
      <section className="fn-card overflow-hidden mb-5">
        <div className={`bg-gradient-to-br ${tintFor(procedure.id)} px-5 sm:px-7 py-6`}>
          <div className="flex items-center gap-2 mb-2 text-[12px]">
            <span className="font-medium px-2.5 py-0.5 rounded-full bg-white/70 dark:bg-white/10 text-[var(--pink)]">{procedure.category}</span>
            <span className="text-[var(--text-secondary)] flex items-center gap-1"><Clock size={13} /> {procedure.duration}</span>
          </div>
          <h1 className="font-heading font-semibold text-2xl sm:text-[28px] leading-tight">{procedure.title}</h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1.5 max-w-2xl leading-relaxed">{procedure.description}</p>
        </div>
        <div className="px-5 sm:px-7 py-4 flex flex-col sm:flex-row sm:items-center gap-3 border-t border-[var(--border)]">
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
            {uploadedFiles.length > 0 ? uploadedFiles.map(f => (
              <span key={f.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-th-success/10 text-[12px] font-medium max-w-full">
                <FileText size={12} className="text-[var(--success)] shrink-0" /><span className="truncate">{f.name}</span>
              </span>
            )) : (
              <span className="text-[12.5px] text-[var(--text-secondary)]">{procedure.steps.length} steps · {procedure.materials.length} materials</span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => toggleProcedureFavorite(procedure.id)}
              className="btn-secondary px-4 py-2.5 text-sm flex items-center gap-2"
            >
              <Heart size={16} weight={procedure.is_favorite ? 'fill' : 'regular'} className={procedure.is_favorite ? 'text-[var(--pink)]' : ''} /> {procedure.is_favorite ? 'Saved' : 'Save'}
            </button>
            <button
              onClick={() => { unlockAudio(); startSession('retdem', procedure.title, mode, buildProcedureSourceText(), sourceName) }}
              className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2"
            >
              <Play size={16} weight="fill" /> Start practice
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        {/* Side column (first on phones) */}
        <div className="space-y-5 lg:order-2 lg:sticky lg:top-4">
          <section className="fn-card p-5">
            <h3 className="font-heading font-semibold text-[15px] flex items-center gap-2"><Microphone size={17} className="text-[var(--pink)]" /> Practice mode</h3>
            <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5 mb-3">
              {isFrance ? 'Doc Uno will guide you through verbalizing steps and rationales, babe!' : `${aiAssistantName} will guide you through verbalizing steps and rationales.`}
            </p>
            <div className="space-y-1.5">
              {modes.map(m => (
                <button
                  key={m.id}
                  onClick={() => onModeChange(m.id)}
                  className={cn('w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors', mode === m.id ? 'border-[var(--pink)] bg-[var(--rose-soft)]' : 'border-[var(--border)] hover:bg-[var(--rose-soft)]')}
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', mode === m.id ? 'bg-[var(--pink)] text-white' : 'bg-th-pink/10 text-[var(--pink)]')}><m.icon size={16} /></div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{m.label}</p>
                    <p className="text-[11.5px] text-[var(--text-secondary)]">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="fn-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-[15px] flex items-center gap-2"><ListChecks size={17} className="text-[var(--pink)]" /> Materials</h3>
              <span className="text-[12px] text-[var(--text-secondary)]">{checkedMaterials.length}/{procedure.materials.length} ready</span>
            </div>
            <div className="space-y-1">
              {procedure.materials.map(m => {
                const checked = checkedMaterials.includes(m)
                return (
                  <button key={m} onClick={() => toggleMaterial(m)} className="w-full flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--rose-soft)] text-left">
                    <span className={cn('w-[18px] h-[18px] mt-px rounded-md border-2 flex items-center justify-center shrink-0 transition-colors', checked ? 'bg-[var(--pink)] border-[var(--pink)] text-white' : 'border-[var(--accent)]')}>
                      {checked && <Check size={11} weight="bold" />}
                    </span>
                    <span className={cn('text-[13px] leading-snug', checked && 'line-through text-[var(--text-secondary)]')}>{m}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {procedure.rationale && (
            <section className="fn-card p-5">
              <h3 className="font-heading font-semibold text-[15px] flex items-center gap-2 mb-2"><Info size={17} className="text-[var(--pink)]" /> Key rationale</h3>
              <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                <MarkdownText content={procedure.rationale} />
              </div>
            </section>
          )}
        </div>

        {/* Steps */}
        <section className="fn-card p-5 sm:p-6 lg:order-1 min-w-0">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-heading font-semibold text-[16px]">Procedure steps</h3>
            <span className="text-[12px] text-[var(--text-secondary)]">{procedure.steps.length} steps{isCIMode && ' · rationales hidden'}</span>
          </div>

          <ol className="relative">
            {procedure.steps.map((step, i) => {
              const isRevealed = revealedSteps.includes(step.step) || !isCIMode
              const isLast = i === procedure.steps.length - 1
              return (
                <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                  {!isLast && <span className="absolute left-[15px] top-9 bottom-0 w-px bg-[var(--border)]" />}
                  <span className="w-8 h-8 rounded-full bg-th-pink/10 text-[var(--pink)] text-[13px] font-semibold flex items-center justify-center shrink-0 relative">{step.step}</span>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-[14.5px] font-medium leading-snug">{step.action}</p>
                    {isRevealed ? (
                      <div className="mt-2 px-3.5 py-2.5 rounded-xl bg-[var(--rose-soft)] text-[13px] text-[var(--text-secondary)] leading-relaxed">
                        <span className="block text-[11.5px] font-semibold text-[var(--pink)] mb-0.5">Rationale</span>
                        <MarkdownText content={step.rationale} />
                      </div>
                    ) : (
                      <button
                        onClick={() => setRevealedSteps(prev => [...prev, step.step])}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-[var(--accent)] text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--pink)] hover:bg-[var(--rose-soft)]"
                      >
                        <Eye size={14} /> Reveal rationale
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      </div>
    </div>
  )
}

function HistoryFileRow({ file, onDelete }: {
  file: HistoryFile
  onDelete: () => void
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="p-4 flex items-center gap-3.5">
      <div className="w-10 h-10 rounded-xl bg-th-pink/10 text-[var(--pink)] flex items-center justify-center shrink-0">
        <FileText size={19} />
      </div>
      <button onClick={() => setShowPreview(true)} className="flex-1 min-w-0 text-left">
        <p className="text-[13.5px] font-medium truncate">{file.name}</p>
        <p className="text-[12px] text-[var(--text-secondary)] truncate">
          {formatDate(file.uploaded_at)} · {file.text.length.toLocaleString()} characters
        </p>
      </button>

      <div className="flex items-center gap-1 shrink-0">
        {showConfirm ? (
          <div className="flex items-center gap-1 border border-[var(--border)] rounded-full pl-2.5 pr-1 py-1">
            <span className="text-[11.5px] font-medium text-[var(--error)]">Delete?</span>
            <button onClick={onDelete} className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-[var(--error)] text-white">Yes</button>
            <button onClick={() => setShowConfirm(false)} className="text-[11.5px] font-medium px-2 py-0.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]">No</button>
          </div>
        ) : (
          <>
            <button onClick={() => setShowPreview(true)} className="btn-icon p-2" aria-label={`View text of ${file.name}`}><Eye size={16} /></button>
            <button onClick={() => setShowConfirm(true)} className="btn-icon p-2 hover:text-[var(--error)]" aria-label={`Delete ${file.name}`}><Trash2 size={16} /></button>
          </>
        )}
      </div>

      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPreview(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="relative z-10 w-full max-w-2xl bg-[var(--card)] border border-[var(--border)] rounded-t-3xl sm:rounded-2xl shadow-fn-lg max-h-[85vh] flex flex-col"
            >
              <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4 border-b border-[var(--border)]">
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-[16px] truncate">{file.name}</h3>
                  <p className="text-[12.5px] text-[var(--text-secondary)]">Extracted text</p>
                </div>
                <button onClick={() => setShowPreview(false)} className="btn-icon p-2 -mr-1" aria-label="Close"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 text-[13px] leading-relaxed whitespace-pre-wrap text-[var(--text-secondary)]">
                {file.text}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

