import { useState, useEffect } from 'react'
import { Mic, FileText, BookOpen, Globe, CheckCircle2, X, ChevronUp } from 'lucide-react'
import { useSimulationStore, DifficultyMode } from '@/stores/simulationStore'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { cn } from '@/lib/utils'
import { SimulationEngine } from '@/components/shared/SimulationEngine'
import { usePersonalization } from '@/hooks/usePersonalization'
import { motion, AnimatePresence } from 'framer-motion'

export default function RecitationPage() {
  const { isActive, isEvaluating, activeMode, reset } = useSimulationStore()

  useEffect(() => {
    // Clear old completed evaluation reports on mount if not in an active session
    if (!isActive) {
      reset()
    }
  }, [])

  if ((isActive || isEvaluating) && activeMode === 'recitation') return <SimulationEngine />
  return <RecitationSetup />
}

type SourceType = 'file' | 'knowledge' | 'none'

function RecitationSetup() {
  const { isFrance, greetingName, aiAssistantName } = usePersonalization()
  const { topics, items, savedKnowledge } = useStudyBoxStore()
  const { startSession } = useSimulationStore()

  const [selectedTopic, setSelectedTopic] = useState(topics[0]?.title || 'General Nursing')
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false)
  const [difficulty, setDifficulty] = useState<DifficultyMode>('gentle')
  const [sourceType, setSourceType] = useState<SourceType>('none')
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string | null>(null)

  // Files that have extracted text
  const filesWithContent = items.filter(i => i.extracted_text && i.extracted_text.trim().length > 50)

  const getSourcePayload = (): { sourceText: string | null; sourceName: string | null } => {
    if (sourceType === 'file' && selectedFileId) {
      const file = items.find(i => i.id === selectedFileId)
      if (file) {
        return {
          sourceText: file.extracted_text.substring(0, 8000),
          sourceName: file.file_name
        }
      }
    }
    if (sourceType === 'knowledge' && selectedKnowledgeId) {
      const ref = savedKnowledge.find(k => k.id === selectedKnowledgeId)
      if (ref) {
        return {
          sourceText: `${ref.title}\n\n${ref.description}\n\nSource: ${ref.source}`,
          sourceName: ref.title
        }
      }
    }
    return { sourceText: null, sourceName: null }
  }

  const handleStart = () => {
    const { sourceText, sourceName } = getSourcePayload()
    startSession('recitation', selectedTopic, difficulty, sourceText, sourceName)
  }

  return (
    <div className="page-container max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
          <Mic className="text-[var(--pink)]" /> {isFrance ? "France's Recitation Practice" : "Recitation Mode"}
        </h1>
        <p className="text-[var(--text-secondary)] font-medium">
          {isFrance 
            ? "Prepare for clinicals by defending your knowledge out loud, babe! 🌸" 
            : "Prepare for clinicals by defending your knowledge out loud. 🩺"
          }
        </p>
      </div>

      <div className="fn-card p-8 space-y-8">

        {/* Topic */}
        <div className="space-y-4">
          <label className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)]">Select Topic</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTopicDropdownOpen(!isTopicDropdownOpen)}
              className="w-full flex items-center justify-between bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-4 py-3 text-sm font-bold text-left focus:border-[var(--pink)] transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-2">
                {topics.length > 0 && (
                  <span 
                    className="w-3 h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: topics.find(t => t.title === selectedTopic)?.color || 'var(--pink)' }}
                  />
                )}
                <span className="truncate">{selectedTopic}</span>
              </div>
              <ChevronUp 
                size={18} 
                className={cn(
                  "text-[var(--text-secondary)] transition-transform duration-300 shrink-0",
                  isTopicDropdownOpen ? "" : "rotate-180"
                )} 
              />
            </button>

            <AnimatePresence>
              {isTopicDropdownOpen && (
                <>
                  {/* Backdrop overlay to close when clicking outside */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsTopicDropdownOpen(false)}
                  />
                  
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-[var(--border)] rounded-2xl shadow-fn-lg max-h-60 overflow-y-auto custom-scrollbar p-2"
                  >
                    <div className="space-y-1">
                      {topics.length > 0 ? (
                        topics.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedTopic(t.title)
                              setIsTopicDropdownOpen(false)
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all hover:bg-[var(--pink)]/5",
                              selectedTopic === t.title 
                                ? "bg-[var(--pink)]/10 text-[var(--pink)]" 
                                : "text-[var(--text)]"
                            )}
                          >
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: t.color }}
                            />
                            <span className="truncate">{t.title}</span>
                          </button>
                        ))
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTopic("General Nursing")
                            setIsTopicDropdownOpen(false)
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all hover:bg-[var(--pink)]/5 bg-[var(--pink)]/10 text-[var(--pink)]"
                        >
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[var(--pink)]" />
                          <span className="truncate">General Nursing</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Study Source Selector */}
        <div className="space-y-4">
          <label className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            Study Source <span className="normal-case font-normal text-[var(--text-secondary)]/60 ml-1">(optional — let {isFrance ? "Doc Uno" : aiAssistantName} test you on your own materials)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'none' as SourceType, label: 'General Knowledge', desc: `${isFrance ? "Doc Uno" : aiAssistantName} picks the questions`, icon: Globe },
              { id: 'file' as SourceType, label: 'Uploaded File', desc: 'Test me on my Study Box notes', icon: FileText },
              { id: 'knowledge' as SourceType, label: 'Knowledge Garden', desc: 'Use a saved reference', icon: BookOpen },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setSourceType(s.id)
                  setSelectedFileId(null)
                  setSelectedKnowledgeId(null)
                }}
                className={cn(
                  "p-4 rounded-2xl border-2 cursor-pointer transition-all text-left relative",
                  sourceType === s.id
                    ? "border-[var(--pink)] bg-[var(--pink)]/5"
                    : "border-[var(--border)] hover:border-[var(--pink)]/50"
                )}
              >
                <s.icon size={18} className={cn("mb-2", sourceType === s.id ? "text-[var(--pink)]" : "text-[var(--text-secondary)]")} />
                <p className="font-bold text-sm mb-0.5">{s.label}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">{s.desc}</p>
                {sourceType === s.id && (
                  <CheckCircle2 size={14} className="absolute top-3 right-3 text-[var(--pink)]" />
                )}
              </button>
            ))}
          </div>

          {/* File picker */}
          {sourceType === 'file' && (
            <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {filesWithContent.length === 0 ? (
                <div className="p-4 rounded-2xl border border-dashed border-[var(--border)] text-center text-sm text-[var(--text-secondary)]">
                  No uploaded files with content found. Upload notes to your Study Box first! 📂
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filesWithContent.map(file => (
                    <button
                      key={file.id}
                      onClick={() => setSelectedFileId(file.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                        selectedFileId === file.id
                          ? "border-[var(--pink)] bg-[var(--pink)]/5"
                          : "border-[var(--border)] hover:border-[var(--pink)]/50"
                      )}
                    >
                      <FileText size={16} className="text-[var(--pink)] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{file.file_name}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate">
                          {file.extracted_text.substring(0, 80)}...
                        </p>
                      </div>
                      {selectedFileId === file.id && (
                        <CheckCircle2 size={14} className="text-[var(--pink)] shrink-0 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Knowledge Garden picker */}
          {sourceType === 'knowledge' && (
            <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {savedKnowledge.length === 0 ? (
                <div className="p-4 rounded-2xl border border-dashed border-[var(--border)] text-center text-sm text-[var(--text-secondary)]">
                  No saved references yet. Save something from the Knowledge Garden first! 🌿
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {savedKnowledge.map(ref => (
                    <button
                      key={ref.id}
                      onClick={() => setSelectedKnowledgeId(ref.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                        selectedKnowledgeId === ref.id
                          ? "border-[var(--pink)] bg-[var(--pink)]/5"
                          : "border-[var(--border)] hover:border-[var(--pink)]/50"
                      )}
                    >
                      <BookOpen size={16} className="text-[var(--pink)] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{ref.title}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate">{ref.source}</p>
                      </div>
                      {selectedKnowledgeId === ref.id && (
                        <CheckCircle2 size={14} className="text-[var(--pink)] shrink-0 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active source badge */}
          {((sourceType === 'file' && selectedFileId) || (sourceType === 'knowledge' && selectedKnowledgeId)) && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--pink)]/10 border border-[var(--pink)]/20 text-sm">
              <CheckCircle2 size={14} className="text-[var(--pink)]" />
              <span className="font-medium text-[var(--pink)] text-xs">
                {isFrance ? 'Doc Uno' : aiAssistantName} will base questions on:{' '}
                <strong>
                  {sourceType === 'file'
                    ? items.find(i => i.id === selectedFileId)?.file_name
                    : savedKnowledge.find(k => k.id === selectedKnowledgeId)?.title}
                </strong>
              </span>
              <button
                onClick={() => { setSourceType('none'); setSelectedFileId(null); setSelectedKnowledgeId(null) }}
                className="ml-auto text-[var(--text-secondary)] hover:text-[var(--pink)] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Difficulty */}
        <div className="space-y-4">
          <label className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)]">Select Difficulty</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'gentle', label: 'Gentle Mode 🌸', desc: isFrance ? 'Guided, warm, and supportive review, babe.' : 'Guided, step-by-step supportive mentoring.' },
              { id: 'clinical_instructor', label: 'Clinical Instructor 🩺', desc: 'Strict, professional high-pressure oral exam questioning.' },
              ...(isFrance ? [{ id: 'doc_uno', label: 'Doc Uno Mode 💖', desc: 'Teasing, challenging, sweet boyfriend-style questioning.' }] : [])
            ].map(d => (
              <div
                key={d.id}
                onClick={() => setDifficulty(d.id as DifficultyMode)}
                className={cn(
                  "p-5 rounded-2xl border-2 cursor-pointer transition-all",
                  difficulty === d.id ? "border-[var(--pink)] bg-[var(--pink)]/5" : "border-[var(--border)] hover:border-[var(--pink)]/50"
                )}
              >
                <h3 className="font-bold mb-1">{d.label}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={
            (sourceType === 'file' && !selectedFileId) ||
            (sourceType === 'knowledge' && !selectedKnowledgeId)
          }
          className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Recitation Simulation
        </button>
      </div>
    </div>
  )
}
