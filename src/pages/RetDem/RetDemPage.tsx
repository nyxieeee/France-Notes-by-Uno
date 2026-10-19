import { useState, useRef, useCallback, useEffect } from 'react'
import { useRetDemStore } from '@/stores/retDemStore'
import { Stethoscope, CaretRight as ChevronRight, Clock, CheckSquare, ArrowLeft, Play, Heart, MagnifyingGlass as Search, BookOpen, Info, ListChecks, Sparkle as Sparkles, UploadSimple as Upload, X, FileText, Image, CircleNotch as Loader2, CheckCircle as CheckCircle2, Trash as Trash2, ClockCounterClockwise as History } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import MarkdownText from '@/components/shared/MarkdownText'
import type { RetDemProcedure } from '@/types'
import { useSimulationStore } from '@/stores/simulationStore'
import { SimulationEngine } from '@/components/shared/SimulationEngine'
import { visionExtractText } from '@/lib/ai'
import { extractTextFromFile } from '@/lib/extractor'
import { usePersonalization } from '@/hooks/usePersonalization'

export default function RetDemPage() {
  const { isFrance, greetingName, aiAssistantName, retdemName } = usePersonalization()
  const { 
    procedures, activeProcedure, setActiveProcedure, 
    recitationMode, setRecitationMode,
    uploadedFiles, addUploadedFile, removeUploadedFile, clearUploadedFiles,
    generateProcedureFromUpload, isGenerating, deleteProcedure,
    uploadHistory, deleteHistoryFile
  } = useRetDemStore()
  const { isActive, isEvaluating, activeMode, reset } = useSimulationStore()

  useEffect(() => {
    // Clear old completed evaluation reports on mount if not in an active session
    if (!isActive) {
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
        addUploadedFile(file.name, extractedText)
      } catch (e) {
        console.error('File extraction failed for', file.name, e)
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

  const filtered = procedures.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  const filteredHistory = uploadHistory.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.text.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-container">
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
              subtitle={isFrance ? 'Master your nursing procedures with step-by-step guides and rationales, babe! 🌸' : 'Master your nursing procedures with step-by-step guides and rationales.'}
            />

            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50" size={18} />
                <input 
                  type="text" 
                  placeholder="Search procedures (e.g., wound care, IV, injections)..." 
                  className="fn-input pl-11"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button 
                onClick={() => { setShowGenerateModal(true); setTimeout(() => generateInputRef.current?.focus(), 50) }}
                className="btn-primary whitespace-nowrap flex items-center gap-2"
                disabled={isGenerating}
              >
                <Sparkles size={18} />
                {isGenerating ? 'Generating...' : 'AI Generate'}
              </button>
            </div>

            {/* AI Generate Modal */}
            <AnimatePresence>
              {showGenerateModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                  onClick={() => setShowGenerateModal(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 10 }}
                    className="bg-[var(--card)] w-full max-w-lg rounded-[2rem] shadow-2xl border border-[var(--border)] p-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-14 h-14 bg-[var(--pink)] rounded-[1.2rem] flex items-center justify-center text-white mb-6 shadow-fn">
                      <Sparkles size={26} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight mb-1">AI Generate Procedure</h2>
                    <p className="text-sm text-[var(--text-secondary)] font-medium mb-6">
                      {isFrance 
                        ? 'Anong procedure ang kailangan mo? Doc Uno will generate a complete step-by-step guide with rationales. 🩺'
                        : `Which clinical procedure do you need? ${aiAssistantName} will generate a complete step-by-step guide with professional rationales. 🩺`
                      }
                    </p>
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
                          setGenerateError(isFrance 
                            ? "Babe, nagka-error sa pagkonek kay Doc Uno. Please try again! 🩺🌸"
                            : `Nagka-error sa pagkonek kay ${aiAssistantName}. Please try again! 🩺`
                          )
                        }
                      }}
                      className="space-y-4"
                    >
                      <input
                        ref={generateInputRef}
                        type="text"
                        value={generateTopic}
                        onChange={(e) => setGenerateTopic(e.target.value)}
                        placeholder="e.g. Foley Catheter Insertion, Wound Dressing Change, IV Insertion..."
                        className="fn-input w-full"
                        autoComplete="off"
                      />
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setShowGenerateModal(false)}
                          className="btn-secondary flex-1 py-3"
                        >Cancel</button>
                        <button
                          type="submit"
                          disabled={!generateTopic.trim() || isGenerating}
                          className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                        >
                          {isGenerating
                            ? <><Loader2 size={16} className="animate-spin" /> Generating...</>
                            : <><Sparkles size={16} /> Generate Procedure</>
                          }
                        </button>
                      </div>
                    </form>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {['Foley Catheter', 'IV Insertion', 'Wound Dressing', 'NG Tube Insertion', 'Blood Transfusion', 'Nasogastric Suction'].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setGenerateTopic(s)}
                          className="text-xs font-bold px-3 py-1.5 rounded-full bg-[var(--secondary-bg)] hover:bg-[var(--pink)] hover:text-white transition-all border border-[var(--border)] hover:border-[var(--pink)]"
                        >{s}</button>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload Reference Material */}
            <div className="mb-8">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.txt,.pdf,.docx"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              {/* Files already uploaded */}
              {uploadedFiles.length > 0 && (
                <div className="mb-3 space-y-2">
                  {uploadedFiles.map((f, i) => (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex items-center gap-3 px-4 py-2.5 fn-card bg-gradient-to-r from-[var(--success)]/5 to-transparent border-[var(--success)]/30"
                    >
                      <CheckCircle2 size={14} className="text-[var(--success)] shrink-0" />
                      <span className="text-xs font-bold text-[var(--success)] shrink-0">#{i + 1}</span>
                      <span className="text-sm font-semibold truncate flex-1">{f.name}</span>
                      <span className="text-xs text-[var(--text-secondary)] shrink-0">{f.text.length} chars</span>
                      <button
                        onClick={() => removeUploadedFile(f.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--error)]/10 text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors shrink-0"
                      ><X size={13} /></button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Drop zone / Add More */}
              <motion.div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => !isExtracting && fileInputRef.current?.click()}
                className={cn(
                  "fn-card border-2 border-dashed p-5 flex items-center gap-4 cursor-pointer transition-all",
                  isDragging ? "border-[var(--pink)] bg-[var(--pink)]/5 scale-[1.01]" : "border-[var(--border)] hover:border-[var(--pink)]/50 hover:bg-[var(--secondary-bg)]/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                  isDragging ? "bg-[var(--pink)] text-white" : "bg-[var(--secondary-bg)] text-[var(--pink)]"
                )}>
                  {isExtracting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">
                    {isExtracting
                      ? `Reading ${extractingCount} file${extractingCount > 1 ? 's' : ''}...`
                      : uploadedFiles.length > 0 ? 'Add more files' : 'Upload your RetDem reference material'}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {isExtracting 
                      ? (isFrance ? 'Doc Uno is reading your files 🩺' : `${aiAssistantName} is reading your files 🩺`) 
                      : 'Drag & drop or click — images, TXT, PDF • Select multiple at once'
                    }
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--secondary-bg)] text-xs font-bold text-[var(--text-secondary)]">
                    <Image size={11} /> Image
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--secondary-bg)] text-xs font-bold text-[var(--text-secondary)]">
                    <FileText size={11} /> TXT
                  </span>
                </div>
              </motion.div>

              {/* Generate + Clear row */}
              {uploadedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex gap-3"
                >
                  <button
                    onClick={async () => {
                      try {
                        setGenerateError(null)
                        await generateProcedureFromUpload()
                        setActiveTab('library')
                      } catch (e) {
                        console.error(e)
                        setGenerateError(isFrance 
                          ? "Babe, nagka-error sa pagkonek kay Doc Uno. Please try again! 🩺🌸"
                          : `Nagka-error sa pagkonek kay ${aiAssistantName}. Please try again! 🩺`
                        )
                      }
                    }}
                    disabled={isGenerating}
                    className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 rounded-2xl"
                  >
                    {isGenerating
                      ? <><Loader2 size={15} className="animate-spin" /> Generating from {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}...</>
                      : <><Sparkles size={15} /> Generate RetDem Practice ({uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''})</>
                    }
                  </button>
                  <button
                    onClick={clearUploadedFiles}
                    className="px-4 py-3 rounded-2xl border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:border-[var(--error)]/40 hover:text-[var(--error)] transition-colors"
                  >Clear all</button>
                </motion.div>
              )}

              {generateError && (
                <div className="mt-3 p-3 rounded-2xl bg-[var(--error)]/10 border border-[var(--error)]/20 text-xs font-semibold text-[var(--error)] text-center">
                  {generateError}
                </div>
              )}
            </div>

            {/* Premium Tab Bar */}
            <div className="mb-8 flex border-b border-[var(--border)] relative">
              <button
                onClick={() => setActiveTab('library')}
                className={cn(
                  "px-6 py-3 font-bold text-sm transition-all flex items-center gap-2 relative",
                  activeTab === 'library' ? "text-[var(--pink)]" : "text-[var(--text-secondary)] hover:text-[var(--pink)]/80"
                )}
              >
                <BookOpen size={16} />
                Procedures Library
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-[var(--pink)]/10 text-[var(--pink)] font-bold">
                  {procedures.length}
                </span>
                {activeTab === 'library' && (
                  <motion.div 
                    layoutId="activeRetDemTab" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--pink)]" 
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={cn(
                  "px-6 py-3 font-bold text-sm transition-all flex items-center gap-2 relative",
                  activeTab === 'history' ? "text-[var(--pink)]" : "text-[var(--text-secondary)] hover:text-[var(--pink)]/80"
                )}
              >
                <History size={16} />
                Upload History
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-[var(--pink)]/10 text-[var(--pink)] font-bold">
                  {uploadHistory.length}
                </span>
                {activeTab === 'history' && (
                  <motion.div 
                    layoutId="activeRetDemTab" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--pink)]" 
                  />
                )}
              </button>
            </div>

            {activeTab === 'library' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filtered.length > 0 ? (
                  filtered.map((proc) => (
                    <ProcedureCard
                      key={proc.id}
                      proc={proc}
                      onOpen={() => setActiveProcedure(proc)}
                      onDelete={() => deleteProcedure(proc.id)}
                    />
                  ))
                ) : (
                  <div className="md:col-span-2 flex flex-col items-center justify-center py-20 text-center fn-card border-dashed">
                    <div className="w-20 h-20 bg-[var(--secondary-bg)] rounded-[2rem] flex items-center justify-center text-[var(--pink)] mb-6 shadow-sm">
                      <Stethoscope size={40} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No procedures found 🩺</h3>
                    <p className="text-[var(--text-secondary)] max-w-xs mb-8">
                      Master your RetDem by uploading your clinical procedure guides to the Study Box.
                    </p>
                    <Link to="/study-box" className="btn-secondary px-8">
                      Upload Guides
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((file) => (
                    <HistoryFileCard
                      key={file.id}
                      file={file}
                      onDelete={() => deleteHistoryFile(file.id)}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center fn-card border-dashed">
                    <div className="w-20 h-20 bg-[var(--secondary-bg)] rounded-[2rem] flex items-center justify-center text-[var(--pink)] mb-6 shadow-sm">
                      <History size={40} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No upload history yet 🩺</h3>
                    <p className="text-[var(--text-secondary)] max-w-xs mb-8">
                      Upload your clinical guidelines above and generate custom RetDem practice steps!
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
      className="fn-card p-6 group hover:border-[var(--pink)] transition-all cursor-pointer relative overflow-hidden"
      onClick={() => { if (!confirmDelete) onOpen() }}
    >
      {/* Background decor */}
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all">
        <Stethoscope size={64} />
      </div>

      {/* Delete button — top-right corner */}
      <div
        className="absolute top-3 right-3 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        {confirmDelete ? (
          <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--error)]/30 rounded-xl px-2 py-1 shadow-sm">
            <span className="text-[10px] font-bold text-[var(--error)]">Delete?</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[var(--error)] text-white hover:opacity-90"
            >Yes</button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
              className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[var(--secondary-bg)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
            >No</button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
            className="w-8 h-8 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--error)] hover:border-[var(--error)]/40 transition-all"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-[var(--secondary-bg)] text-[var(--pink)] rounded-full">
            {proc.category}
          </span>
          {(proc as any).is_generated && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-[var(--pink)] text-white rounded-full flex items-center gap-1 shadow-sm shrink-0">
              <Sparkles size={10} /> AI
            </span>
          )}
          <span className="text-[10px] text-[var(--text-secondary)] font-medium flex items-center gap-1">
            <Clock size={12} /> {proc.duration}
          </span>
        </div>
        <h3 className="text-xl font-bold mb-2 group-hover:text-[var(--pink)] transition-colors pr-8">{proc.title}</h3>
        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-6 max-w-[80%]">
          {proc.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-[var(--bg)] flex items-center justify-center text-xs">🩺</div>
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-white bg-[var(--secondary-bg)] flex items-center justify-center text-[10px] font-bold text-[var(--pink)]">+12</div>
          </div>
          <button className="btn-primary p-3 rounded-2xl flex items-center justify-center shadow-fn">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

function RetDemDetail({ procedure, onBack, mode, onModeChange }: { 
  procedure: RetDemProcedure, 
  onBack: () => void,
  mode: string,
  onModeChange: (m: any) => void
}) {
  const [checkedMaterials, setCheckedMaterials] = useState<string[]>([])
  const [revealedSteps, setRevealedSteps] = useState<number[]>([])
  const { startSession } = useSimulationStore()
  const { uploadedFiles, toggleProcedureFavorite } = useRetDemStore()
  const { isFrance, greetingName, aiAssistantName } = usePersonalization()

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

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--pink)] transition-colors mb-6"
      >
        <ArrowLeft size={18} /> Back to procedures
      </button>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
         <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-[var(--secondary-bg)] text-[var(--pink)] rounded-full">
                {procedure.category}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] font-medium flex items-center gap-1">
                <Clock size={12} /> {procedure.duration}
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">{procedure.title}</h1>
            <p className="text-[var(--text-secondary)] font-medium leading-relaxed max-w-2xl">
              {procedure.description}
            </p>
            {uploadedFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {uploadedFiles.map((f, i) => (
                  <div key={f.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--success)]/10 text-[var(--success)] text-xs font-bold border border-[var(--success)]/20">
                    <CheckCircle2 size={11} />
                    #{i + 1} {f.name}
                  </div>
                ))}
              </div>
            )}
         </div>
         <div className="flex gap-2 shrink-0">
            <button 
              onClick={() => toggleProcedureFavorite(procedure.id)}
              className="btn-secondary px-6 py-3 flex items-center gap-2"
            >
               <Heart size={18} weight={procedure.is_favorite ? 'fill' : 'regular'} className={procedure.is_favorite ? 'text-[var(--pink)]' : ''} /> {procedure.is_favorite ? 'Saved' : 'Save'}
            </button>
            <button 
              onClick={() => startSession('retdem', procedure.title, mode as any, buildProcedureSourceText(), sourceName)}
              className="btn-primary px-8 py-3 flex items-center gap-2 shadow-fn-md"
            >
               <Play size={18} weight="fill" /> Start Practice
               {uploadedFiles.length > 0 && <span className="text-[10px] font-bold opacity-75 bg-white/20 px-2 py-0.5 rounded-full">+ {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}</span>}
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Checklist & Info */}
        <div className="space-y-6">
           <div className="fn-card p-6 bg-gradient-to-br from-[var(--pink)]/10 to-[var(--secondary-bg)]/20">
              <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
                 <ListChecks className="text-[var(--pink)]" size={20} />
                 Materials Checklist
              </h3>
              <div className="space-y-3">
                 {procedure.materials.map(m => (
                   <label 
                     key={m} 
                     className={cn(
                       "flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer group",
                       checkedMaterials.includes(m) 
                         ? "bg-white border-[var(--pink)]/30 text-[var(--text-secondary)]" 
                         : "bg-white/50 border-[var(--border)] hover:border-[var(--pink)]/50"
                     )}
                   >
                     <div 
                        onClick={() => toggleMaterial(m)}
                        className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                          checkedMaterials.includes(m) ? "bg-[var(--pink)] border-[var(--pink)] text-white" : "border-[var(--border)] group-hover:border-[var(--pink)]"
                        )}
                     >
                        {checkedMaterials.includes(m) && <CheckSquare size={14} />}
                     </div>
                     <span className={cn("text-xs font-bold leading-tight", checkedMaterials.includes(m) && "line-through opacity-50")}>
                        {m}
                     </span>
                   </label>
                 ))}
              </div>
           </div>

           <div className="fn-card p-6">
              <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
                 <Info className="text-[var(--pink)]" size={20} />
                 Key Rationale
              </h3>
              <div className="text-xs text-[var(--text-secondary)] leading-relaxed italic font-medium">
                 <MarkdownText content={procedure.rationale} />
              </div>
           </div>
           
           <div className="fn-card p-6 bg-[var(--pink)] text-white">
              <h3 className="font-heading font-bold text-lg mb-2 flex items-center gap-2">
                 <Sparkles size={20} />
                 Recitation Mode
              </h3>
              <p className="text-xs opacity-90 mb-4 font-medium">{isFrance 
                   ? 'Doc Uno will guide you through verbalizing steps and rationales, babe! 🌸'
                   : `${aiAssistantName} will guide you through verbalizing steps and rationales. 🩺`
                 }</p>
              <div className="space-y-2">
                 {[
                   { id: 'gentle', label: 'Gentle Mode 🌸' },
                   { id: 'clinical_instructor', label: 'CI Mode 🩺' },
                   ...(isFrance ? [{ id: 'doc_uno', label: 'Doc Uno Mode 💖' }] : []),
                 ].map(m => (
                   <button
                     key={m.id}
                     onClick={() => onModeChange(m.id)}
                     className={cn(
                       "w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all border text-left",
                       mode === m.id 
                         ? "bg-white text-[var(--pink)] border-white shadow-sm" 
                         : "bg-white/10 border-white/20 hover:bg-white/20"
                     )}
                   >
                     {m.label}
                   </button>
                 ))}
              </div>
           </div>
        </div>

        {/* Right Column: Steps */}
        <div className="lg:col-span-2 space-y-4">
           <div className="flex items-center justify-between mb-2">
              <h3 className="font-heading font-bold text-xl flex items-center gap-2">
                 <BookOpen className="text-[var(--pink)]" size={24} />
                 Step-by-Step Procedure
              </h3>
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                 {procedure.steps.length} Steps Total
              </span>
           </div>

           {procedure.steps.map((step, i) => {
              const isRevealed = revealedSteps.includes(step.step) || !isCIMode

              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "fn-card p-6 group hover:shadow-fn transition-all border-l-4",
                    isRevealed ? "border-l-[var(--pink)]" : "border-l-[var(--text-secondary)]/30"
                  )}
                >
                   <div className="flex gap-6">
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold text-lg shadow-sm transition-colors",
                        isRevealed ? "bg-[var(--secondary-bg)] text-[var(--pink)]" : "bg-[var(--border)] text-[var(--text-secondary)]"
                      )}>
                         {step.step}
                      </div>
                      <div className="space-y-4 flex-1">
                         <div>
                           <p className="text-[10px] font-bold text-[var(--pink)] uppercase tracking-widest mb-1">Action</p>
                           <p className="font-bold text-base leading-snug">{step.action}</p>
                         </div>
                         
                         {isRevealed ? (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="p-4 bg-[var(--bg)] rounded-2xl border border-[var(--border)] group-hover:border-[var(--pink)]/30 transition-all"
                            >
                              <p className="text-[10px] font-bold text-[var(--pink)] uppercase tracking-widest mb-1">Rationale</p>
                              <div className="text-sm text-[var(--text-secondary)] font-medium italic leading-relaxed">
                                 <MarkdownText content={step.rationale} />
                              </div>
                            </motion.div>
                         ) : (
                            <button 
                              onClick={() => setRevealedSteps(prev => [...prev, step.step])}
                              className="w-full p-4 rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-[var(--pink)]/50 text-[var(--text-secondary)] text-xs font-bold transition-all flex items-center justify-center gap-2"
                            >
                              <Sparkles size={14} /> Reveal Rationale (CI Mode)
                            </button>
                         )}
                      </div>
                   </div>
                </motion.div>
              )
            })}
        </div>
      </div>
    </div>
  )
}

function HistoryFileCard({ file, onDelete }: {
  file: any
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
    } catch (_) {
      return dateStr
    }
  }

  return (
    <div className="fn-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[var(--pink)] transition-all">
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-2xl bg-[var(--pink)]/10 text-[var(--pink)] flex items-center justify-center shrink-0">
          <FileText size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-base truncate mb-1">{file.name}</h4>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)] font-medium">
            <span className="flex items-center gap-1">
              <Clock size={12} /> {formatDate(file.uploaded_at)}
            </span>
            <span>•</span>
            <span>{file.text.length.toLocaleString()} characters</span>
          </div>
          
          <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mt-2 bg-[var(--secondary-bg)]/40 px-3 py-1.5 rounded-xl border border-[var(--border)] italic font-semibold">
            "{file.text.slice(0, 120)}..."
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 md:self-center self-end">
        <button
          onClick={() => setShowPreview(true)}
          className="btn-secondary px-4 py-2 text-xs font-bold"
        >
          View Text
        </button>

        {showConfirm ? (
          <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--error)]/30 rounded-xl px-2 py-1 shadow-sm">
            <span className="text-[10px] font-bold text-[var(--error)]">Delete?</span>
            <button
              onClick={onDelete}
              className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[var(--error)] text-white hover:opacity-90"
            >Yes</button>
            <button
              onClick={() => setShowConfirm(false)}
              className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[var(--secondary-bg)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
            >No</button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--error)] hover:border-[var(--error)]/40 transition-all"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="bg-[var(--card)] w-full max-w-2xl rounded-[2rem] shadow-2xl border border-[var(--border)] p-8 max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold truncate pr-4">{file.name}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 font-semibold">
                    Extracted Reference Material Text
                  </p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:bg-[var(--secondary-bg)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-[var(--secondary-bg)]/50 border border-[var(--border)] rounded-2xl p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {file.text}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowPreview(false)}
                  className="btn-primary px-6"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
