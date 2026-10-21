import { useState } from 'react'
import { confirmDialog } from '@/stores/feedbackStore'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Microphone, Stethoscope, CaretRight, Heart, CheckCircle, Trash, ListChecks, Play, X, Clock, ArrowClockwise, Target,
  Check, ArrowUpRight, Warning, TrendUp, Medal, Crosshair,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { ScoreRing, ScoreBar, FeedbackList } from '@/components/shared/SimulationEngine'
import { usePersonalization } from '@/hooks/usePersonalization'
import { useBackToClose } from '@/hooks/useBackToClose'
import { useRetDemStore } from '@/stores/retDemStore'
import { useSimulationStore } from '@/stores/simulationStore'
import type { DifficultyMode } from '@/stores/simulationStore'
import { weakPointsBrief } from '@/lib/simulationPrompts'
import { unlockAudio } from '@/lib/elevenLabsTts'
import { cn, formatRelativeDate } from '@/lib/utils'
import type { RetDemProcedure, SimulationSession } from '@/types'

type Tab = 'procedures' | 'saved' | 'completed'

const average = (s: SimulationSession['scores']) => Math.round((s.accuracy + s.safety + s.reasoning + s.confidence) / 4)

const AREAS: { key: keyof SimulationSession['scores']; label: string }[] = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'safety', label: 'Safety' },
  { key: 'reasoning', label: 'Reasoning' },
  { key: 'confidence', label: 'Confidence' },
]

export default function SimulationHubPage() {
  const navigate = useNavigate()
  const { isFrance, aiAssistantName } = usePersonalization()
  const { procedures, setActiveProcedure } = useRetDemStore()
  const { history, deleteSession, startSession } = useSimulationStore()
  const [tab, setTab] = useState<Tab>('procedures')
  const [openResult, setOpenResult] = useState<SimulationSession | null>(null)
  useBackToClose(!!openResult, () => setOpenResult(null))

  const examiner = isFrance ? 'Doc Uno' : aiAssistantName
  const openProcedure = (p: RetDemProcedure) => { setActiveProcedure(p); navigate('/retdem') }
  const saved = procedures.filter(p => p.is_favorite)

  // Progress across every graded session
  const progress = history.length > 0 ? (() => {
    const areaAvg = AREAS.map(a => ({ ...a, value: Math.round(history.reduce((sum, s) => sum + s.scores[a.key], 0) / history.length) }))
    const sorted = [...areaAvg].sort((a, b) => b.value - a.value)
    return {
      overall: Math.round(history.reduce((sum, s) => sum + average(s.scores), 0) / history.length),
      strongest: sorted[0],
      focus: sorted[sorted.length - 1],
      recent: [...history].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(-10),
    }
  })() : null

  const practiceAgain = (s: SimulationSession) => {
    unlockAudio()
    setOpenResult(null)
    if (s.mode === 'retdem') {
      const procedure = procedures.find(p => p.title === s.topic)
      if (procedure) { openProcedure(procedure); return }
    }
    startSession('recitation', s.topic, s.difficulty as DifficultyMode, null, s.source_name)
    navigate('/recitation')
  }

  const drillWeakPoints = (s: SimulationSession) => {
    if (!s.feedback) return
    unlockAudio()
    setOpenResult(null)
    startSession('recitation', s.topic, s.difficulty as DifficultyMode, weakPointsBrief(s.topic, s.feedback), `Weak points: ${s.source_name || s.topic}`)
    navigate('/recitation')
  }

  const modes: { icon: Icon; title: string; to: string; time: string; steps: string[] }[] = [
    {
      icon: Microphone, title: 'Recitation Mode', to: '/recitation', time: 'About 10 minutes',
      steps: [
        'Pick a topic, one of your files or a saved reference',
        `${examiner} questions you like a clinical instructor`,
        'Answer by voice or typing, then get scored',
      ],
    },
    {
      icon: Stethoscope, title: 'RetDem Practice', to: '/retdem', time: 'About 15 minutes',
      steps: [
        'Choose or generate a procedure',
        'Explain each step and its rationale as you go',
        'See what you missed and practice again',
      ],
    },
  ]

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'procedures', label: 'Procedures', count: procedures.length },
    { id: 'saved', label: 'Saved', count: saved.length },
    { id: 'completed', label: 'Completed', count: history.length },
  ]

  const procedureRow = (p: RetDemProcedure) => (
    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--rose-soft)] transition-colors">
      <div className="w-10 h-10 rounded-xl bg-[var(--rose-soft)] border border-[var(--border)] text-[var(--pink)] flex items-center justify-center shrink-0">
        <Stethoscope size={18} />
      </div>
      <button onClick={() => openProcedure(p)} className="min-w-0 flex-1 text-left">
        <p className="text-[13.5px] font-medium truncate flex items-center gap-1.5">
          {p.title} {p.is_favorite && <Heart size={12} weight="fill" className="text-[var(--pink)] shrink-0" />}
        </p>
        <p className="text-[11.5px] text-[var(--text-secondary)]">{p.category} · {p.steps.length} steps · {p.duration}</p>
      </button>
      <button onClick={() => openProcedure(p)} className="btn-secondary px-4 py-1.5 text-xs flex items-center gap-1.5 shrink-0">
        <Play size={12} weight="fill" /> Start
      </button>
    </div>
  )

  return (
    <div className="page-container max-w-5xl">
      <PageHeader icon={Stethoscope} title="Clinical Simulations" subtitle="Defend your reasoning, master procedures, and build confidence under pressure." />

      {/* Progress */}
      {progress && (
        <section className="fn-card p-5 mb-5 grid grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.4fr)] gap-4 items-center">
          <Stat icon={CheckCircle} label="Sessions" value={String(history.length)} />
          <Stat icon={TrendUp} label="Average score" value={`${progress.overall}%`} />
          <Stat icon={Medal} label="Strongest" value={progress.strongest.label} sub={`${progress.strongest.value}%`} />
          <Stat icon={Crosshair} label="Focus next" value={progress.focus.label} sub={`${progress.focus.value}%`} />
          <div className="col-span-2 lg:col-span-1">
            <p className="text-[11.5px] text-[var(--text-secondary)] mb-1.5">Recent scores</p>
            <div className="flex items-end gap-1 h-12">
              {progress.recent.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setOpenResult(s)}
                  title={`${s.topic}: ${average(s.scores)}%`}
                  aria-label={`${s.topic}: ${average(s.scores)}%`}
                  className={cn(
                    'flex-1 max-w-[22px] rounded-t-md hover:bg-[var(--pink)] transition-colors',
                    i === progress.recent.length - 1 ? 'bg-[var(--pink)]' : average(s.scores) >= 80 ? 'bg-th-pink/55' : 'bg-th-pink/25'
                  )}
                  style={{ height: `${Math.max(8, average(s.scores))}%` }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {modes.map((m, i) => (
          <motion.button
            key={m.to}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(m.to)}
            className="fn-card p-5 text-left flex flex-col group hover:border-[var(--accent)]"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--rose-soft)] border border-[var(--border)] text-[var(--pink)] flex items-center justify-center shrink-0">
                <m.icon size={24} weight="duotone" />
              </div>
              <div className="min-w-0">
                <h2 className="font-heading font-semibold text-[16px]">{m.title}</h2>
                <p className="text-[12px] text-[var(--text-secondary)] flex items-center gap-1 mt-0.5"><Clock size={12} /> {m.time}</p>
              </div>
            </div>
            <ol className="mt-4 space-y-2">
              {m.steps.map((step, n) => (
                <li key={step} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--rose-soft)] text-[var(--pink)] text-[11px] font-semibold flex items-center justify-center shrink-0">{n + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
            <span className="mt-4 self-start btn-primary px-4 py-2 text-[13px] inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
              Start {m.title.split(' ')[0]} <CaretRight size={14} />
            </span>
          </motion.button>
        ))}
      </div>

      <div className="flex gap-1.5 mb-3">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-1.5 rounded-full text-[13px] font-medium border transition-colors',
              tab === t.id ? 'bg-[var(--pink)] border-[var(--pink)] text-white' : 'border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]'
            )}
          >
            {t.label} <span className="opacity-75">{t.count}</span>
          </button>
        ))}
      </div>

      <section className="fn-card p-3">
        {tab === 'procedures' && (procedures.length > 0 ? procedures.map(procedureRow) : (
          <Empty icon={ListChecks} title="No procedures yet" text="Generate or upload a procedure in RetDem Practice to start building your library." action={{ label: 'Open RetDem Practice', onClick: () => navigate('/retdem') }} />
        ))}

        {tab === 'saved' && (saved.length > 0 ? saved.map(procedureRow) : (
          <Empty icon={Heart} title="Nothing saved yet" text="Tap Save on a procedure to keep it here for quick practice." />
        ))}

        {tab === 'completed' && (history.length > 0 ? history.map(s => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--rose-soft)] transition-colors">
            <button onClick={() => setOpenResult(s)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
              <div className="w-11 h-11 rounded-full border-[3px] border-[var(--pink)] flex items-center justify-center shrink-0 text-[12px] font-semibold text-[var(--pink)]">
                {average(s.scores)}%
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium truncate">{s.source_name || s.topic}</p>
                <p className="text-[11.5px] text-[var(--text-secondary)] truncate">
                  {s.mode === 'retdem' ? 'RetDem' : 'Recitation'} · <span className="capitalize">{s.difficulty.replace('_', ' ')}</span> · {formatRelativeDate(s.created_at)}
                </p>
              </div>
            </button>
            <button onClick={() => practiceAgain(s)} className="btn-secondary px-3 py-1.5 text-xs hidden sm:flex items-center gap-1.5 shrink-0">
              <ArrowClockwise size={13} /> Again
            </button>
            <button
              onClick={async () => { if (await confirmDialog({ title: 'Delete this result?', message: 'The score and feedback for this session will be removed from your history.', confirmLabel: 'Delete', danger: true })) deleteSession(s.id) }}
              className="btn-icon p-1.5 hover:text-[var(--error)] shrink-0"
              aria-label="Delete result"
            >
              <Trash size={16} />
            </button>
          </div>
        )) : (
          <Empty icon={CheckCircle} title="No completed sessions" text="Finish a Recitation or RetDem session and your graded results will appear here." />
        ))}
      </section>

      {/* A past result */}
      <AnimatePresence>
        {openResult && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpenResult(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="relative z-10 w-full max-w-2xl max-h-[88vh] overflow-y-auto custom-scrollbar bg-[var(--card)] border border-[var(--border)] rounded-t-3xl sm:rounded-2xl shadow-fn-lg"
            >
              <div className="sticky top-0 bg-[var(--card)] px-5 sm:px-6 pt-5 pb-4 border-b border-[var(--border)] flex items-start gap-3 z-10">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-[var(--pink)]">{openResult.mode === 'retdem' ? 'RetDem practice' : 'Recitation'} · {formatRelativeDate(openResult.created_at)}</p>
                  <h2 className="font-heading font-semibold text-lg leading-snug">{openResult.source_name || openResult.topic}</h2>
                </div>
                <button onClick={() => setOpenResult(null)} className="btn-icon p-2 -mr-1" aria-label="Close"><X size={18} /></button>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <ScoreRing value={average(openResult.scores)} />
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 flex-1">
                    {AREAS.map(a => <ScoreBar key={a.key} label={a.label} score={openResult.scores[a.key]} />)}
                  </div>
                </div>

                {openResult.feedback ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FeedbackList title="What you did right" icon={Check} tone="success" items={openResult.feedback.correct} />
                    <FeedbackList title="Areas to improve" icon={ArrowUpRight} tone="warning" items={openResult.feedback.missed} />
                    {openResult.feedback.safetyViolations.length > 0 && (
                      <div className="md:col-span-2">
                        <FeedbackList title="Critical safety violations" icon={Warning} tone="error" items={openResult.feedback.safetyViolations} />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] text-[var(--text-secondary)]">No written feedback was saved for this session.</p>
                )}
              </div>

              <div className="sticky bottom-0 bg-[var(--card)] px-5 sm:px-6 py-4 border-t border-[var(--border)] flex flex-col sm:flex-row gap-2 sm:justify-end">
                {openResult.feedback && (openResult.feedback.missed.length > 0 || openResult.feedback.safetyViolations.length > 0) && (
                  <button onClick={() => drillWeakPoints(openResult)} className="btn-secondary px-5 py-2.5 text-sm flex items-center justify-center gap-2">
                    <Target size={15} /> Drill my weak points
                  </button>
                )}
                <button onClick={() => practiceAgain(openResult)} className="btn-primary px-5 py-2.5 text-sm flex items-center justify-center gap-2">
                  <ArrowClockwise size={15} /> Practice again
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Stat({ icon: StatIcon, label, value, sub }: { icon: Icon; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center shrink-0"><StatIcon size={19} /></div>
      <div className="min-w-0">
        <p className="text-[11.5px] text-[var(--text-secondary)]">{label}</p>
        <p className="text-[15px] font-semibold leading-tight">{value} {sub && <span className="text-[12px] font-normal text-[var(--text-secondary)]">{sub}</span>}</p>
      </div>
    </div>
  )
}

function Empty({ icon: EmptyIcon, title, text, action }: {
  icon: Icon
  title: string
  text: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center mb-3">
        <EmptyIcon size={26} weight="duotone" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">{text}</p>
      {action && <button onClick={action.onClick} className="btn-secondary px-5 py-2 text-xs mt-4">{action.label}</button>}
    </div>
  )
}
