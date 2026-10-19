import { useState, useEffect } from 'react'
import { Microphone as Mic, FileText, BookOpen, Globe, CheckCircle as CheckCircle2, CaretDown as ChevronDown, Play, Leaf, Chalkboard, Heart } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { useSimulationStore } from '@/stores/simulationStore'
import type { DifficultyMode } from '@/stores/simulationStore'
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
  const { isFrance, aiAssistantName } = usePersonalization()
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

  const examinerName = isFrance ? 'Doc Uno' : aiAssistantName
  const examinerAvatar = isFrance ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'

  const sources = [
    { id: 'none' as SourceType, label: 'General knowledge', desc: `${examinerName} picks the questions`, icon: Globe },
    { id: 'file' as SourceType, label: 'Uploaded file', desc: 'Your Study Box notes', icon: FileText },
    { id: 'knowledge' as SourceType, label: 'Saved reference', desc: 'From Knowledge Garden', icon: BookOpen },
  ]

  const difficulties = [
    { id: 'gentle', label: 'Gentle', desc: isFrance ? 'Guided, warm and supportive, babe.' : 'Guided, step-by-step mentoring.', icon: Leaf },
    { id: 'clinical_instructor', label: 'Clinical Instructor', desc: 'Strict, high-pressure oral exam questioning.', icon: Chalkboard },
    ...(isFrance ? [{ id: 'doc_uno', label: 'Doc Uno Mode', desc: 'Teasing, challenging, sweet boyfriend-style questioning.', icon: Heart }] : [])
  ]

  const sourceLabel = sourceType === 'file'
    ? items.find(i => i.id === selectedFileId)?.file_name
    : sourceType === 'knowledge'
      ? savedKnowledge.find(k => k.id === selectedKnowledgeId)?.title
      : 'General knowledge'

  const canStart = !((sourceType === 'file' && !selectedFileId) || (sourceType === 'knowledge' && !selectedKnowledgeId))

  return (
    <div className="page-container max-w-5xl">
      <PageHeader
        icon={Mic}
        title={isFrance ? "France's Recitation Practice" : 'Recitation Mode'}
        subtitle={isFrance ? 'Prepare for clinicals by defending your knowledge out loud, babe.' : 'Prepare for clinicals by defending your knowledge out loud.'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div className="space-y-4 min-w-0">
          {/* Topic */}
          <Section step={1} title="Topic">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTopicDropdownOpen(!isTopicDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 bg-[var(--card)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-left hover:border-[var(--accent)] transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: topics.find(t => t.title === selectedTopic)?.color || 'var(--pink)' }}
                  />
                  <span className="truncate">{selectedTopic}</span>
                </span>
                <ChevronDown size={15} className={cn('text-[var(--text-secondary)] transition-transform shrink-0', isTopicDropdownOpen && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {isTopicDropdownOpen && (
                  <>
                    {/* Backdrop overlay to close when clicking outside */}
                    <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsTopicDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-fn-lg max-h-60 overflow-y-auto custom-scrollbar p-1.5"
                    >
                      {(topics.length > 0 ? topics : [{ id: 'general', title: 'General Nursing', color: 'var(--pink)' }]).map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTopic(t.title)
                            setIsTopicDropdownOpen(false)
                          }}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-left transition-colors hover:bg-[var(--rose-soft)]',
                            selectedTopic === t.title ? 'bg-[var(--rose-soft)] text-[var(--pink)] font-medium' : 'text-[var(--text)]'
                          )}
                        >
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                          <span className="truncate">{t.title}</span>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </Section>

          {/* Study Source Selector */}
          <Section step={2} title="Study source" hint="Optional">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {sources.map(src => (
                <button
                  key={src.id}
                  onClick={() => {
                    setSourceType(src.id)
                    setSelectedFileId(null)
                    setSelectedKnowledgeId(null)
                  }}
                  className={cn(
                    'p-3.5 rounded-xl border text-left relative flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 transition-colors',
                    sourceType === src.id ? 'border-[var(--pink)] bg-[var(--rose-soft)]' : 'border-[var(--border)] hover:bg-[var(--rose-soft)]'
                  )}
                >
                  <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', sourceType === src.id ? 'bg-[var(--pink)] text-white' : 'bg-th-pink/10 text-[var(--pink)]')}>
                    <src.icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium">{src.label}</span>
                    <span className="block text-[11.5px] text-[var(--text-secondary)]">{src.desc}</span>
                  </span>
                  {sourceType === src.id && <CheckCircle2 size={16} weight="fill" className="absolute top-3 right-3 text-[var(--pink)]" />}
                </button>
              ))}
            </div>

            {/* File picker */}
            {sourceType === 'file' && (
              <div className="mt-3">
                {filesWithContent.length === 0 ? (
                  <EmptyPicker text="No uploaded files with readable text yet. Upload notes to your Study Box first." />
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {filesWithContent.map(file => (
                      <PickerRow
                        key={file.id}
                        icon={FileText}
                        title={file.file_name}
                        sub={`${file.extracted_text.substring(0, 80)}...`}
                        active={selectedFileId === file.id}
                        onClick={() => setSelectedFileId(file.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Knowledge Garden picker */}
            {sourceType === 'knowledge' && (
              <div className="mt-3">
                {savedKnowledge.length === 0 ? (
                  <EmptyPicker text="No saved references yet. Save something from the Knowledge Garden first." />
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {savedKnowledge.map(ref => (
                      <PickerRow
                        key={ref.id}
                        icon={BookOpen}
                        title={ref.title}
                        sub={ref.source}
                        active={selectedKnowledgeId === ref.id}
                        onClick={() => setSelectedKnowledgeId(ref.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Difficulty */}
          <Section step={3} title="Examiner style">
            <div className={cn('grid grid-cols-1 gap-2', difficulties.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
              {difficulties.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id as DifficultyMode)}
                  className={cn(
                    'p-3.5 rounded-xl border text-left transition-colors',
                    difficulty === d.id ? 'border-[var(--pink)] bg-[var(--rose-soft)]' : 'border-[var(--border)] hover:bg-[var(--rose-soft)]'
                  )}
                >
                  <d.icon size={18} className={difficulty === d.id ? 'text-[var(--pink)]' : 'text-[var(--text-secondary)]'} weight={difficulty === d.id ? 'fill' : 'regular'} />
                  <p className="text-[13.5px] font-medium mt-1.5">{d.label}</p>
                  <p className="text-[11.5px] text-[var(--text-secondary)] leading-snug">{d.desc}</p>
                </button>
              ))}
            </div>
          </Section>
        </div>

        {/* Summary */}
        <aside className="fn-card p-5 lg:sticky lg:top-4">
          <div className="flex items-center gap-3">
            <img src={examinerAvatar} alt={examinerName} className="w-12 h-12 rounded-full object-cover border border-th-pink/20" />
            <div>
              <p className="font-heading font-semibold text-[15px] leading-tight">{examinerName}</p>
              <p className="text-[12px] text-[var(--text-secondary)]">Your examiner</p>
            </div>
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mt-3">
            {examinerName} will ask questions out loud. Answer by speaking or typing, then end the session to get scored on accuracy, safety, reasoning and confidence.
          </p>

          <dl className="mt-4 space-y-2 text-[13px] border-t border-[var(--border)] pt-4">
            <SummaryRow label="Topic" value={selectedTopic} />
            <SummaryRow label="Source" value={sourceLabel || 'Choose one'} muted={!canStart} />
            <SummaryRow label="Style" value={difficulties.find(d => d.id === difficulty)?.label || ''} />
          </dl>

          <button
            onClick={handleStart}
            disabled={!canStart}
            className="btn-primary w-full mt-5 py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={16} weight="fill" /> Start recitation
          </button>
        </aside>
      </div>
    </div>
  )
}

function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) {
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

function PickerRow({ icon: RowIcon, title, sub, active, onClick }: { icon: typeof FileText; title: string; sub: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn('w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors', active ? 'border-[var(--pink)] bg-[var(--rose-soft)]' : 'border-[var(--border)] hover:bg-[var(--rose-soft)]')}
    >
      <RowIcon size={16} className="text-[var(--pink)] shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium truncate">{title}</span>
        <span className="block text-[11.5px] text-[var(--text-secondary)] truncate">{sub}</span>
      </span>
      {active && <CheckCircle2 size={16} weight="fill" className="text-[var(--pink)] shrink-0" />}
    </button>
  )
}

function EmptyPicker({ text }: { text: string }) {
  return <p className="px-3.5 py-3 rounded-xl border border-dashed border-[var(--accent)] text-[12.5px] text-[var(--text-secondary)]">{text}</p>
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--text-secondary)]">{label}</dt>
      <dd className={cn('font-medium text-right truncate', muted && 'text-[var(--text-secondary)]')}>{value}</dd>
    </div>
  )
}
