import { useState } from 'react'
import { confirmDialog } from '@/stores/feedbackStore'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Microphone, Stethoscope, CaretRight, Heart, CheckCircle, Trash, ListChecks, Play } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { usePersonalization } from '@/hooks/usePersonalization'
import { useRetDemStore } from '@/stores/retDemStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { cn, formatRelativeDate } from '@/lib/utils'
import type { RetDemProcedure, SimulationSession } from '@/types'

type Tab = 'procedures' | 'saved' | 'completed'

const average = (s: SimulationSession['scores']) => Math.round((s.accuracy + s.safety + s.reasoning + s.confidence) / 4)

export default function SimulationHubPage() {
  const navigate = useNavigate()
  const { isFrance, aiAssistantName } = usePersonalization()
  const { procedures, setActiveProcedure } = useRetDemStore()
  const { history, deleteSession } = useSimulationStore()
  const [tab, setTab] = useState<Tab>('procedures')

  const openProcedure = (p: RetDemProcedure) => { setActiveProcedure(p); navigate('/retdem') }
  const saved = procedures.filter(p => p.is_favorite)

  const modes = [
    {
      icon: Microphone, title: 'Recitation Mode', to: '/recitation',
      text: `${isFrance ? 'Doc Uno' : aiAssistantName} plays your clinical instructor and has you defend your knowledge out loud.`,
    },
    {
      icon: Stethoscope, title: 'RetDem Practice', to: '/retdem',
      text: 'Walk through a procedure step by step — perform, explain, and justify every action.',
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {modes.map((m, i) => (
          <motion.button
            key={m.to}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(m.to)}
            className="fn-card p-5 text-left flex gap-4 items-start group hover:border-[var(--accent)]"
          >
            <div className="w-12 h-12 rounded-2xl bg-[var(--rose-soft)] border border-[var(--border)] text-[var(--pink)] flex items-center justify-center shrink-0">
              <m.icon size={24} weight="duotone" />
            </div>
            <div className="flex-1">
              <h2 className="font-heading font-semibold text-[16px]">{m.title}</h2>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed">{m.text}</p>
              <span className="mt-3 text-[13px] font-medium text-[var(--pink)] inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                Start <CaretRight size={14} />
              </span>
            </div>
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
            <div className="w-11 h-11 rounded-full border-[3px] border-[var(--pink)] flex items-center justify-center shrink-0 text-[12px] font-semibold text-[var(--pink)]">
              {average(s.scores)}%
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium truncate">{s.topic}</p>
              <p className="text-[11.5px] text-[var(--text-secondary)]">
                {s.mode === 'retdem' ? 'RetDem' : 'Recitation'} · Accuracy {s.scores.accuracy}% · Safety {s.scores.safety}% · {formatRelativeDate(s.created_at)}
              </p>
            </div>
            <button
              onClick={async () => { if (await confirmDialog({ title: 'Delete this result?', message: 'The score and feedback for this session will be removed from your history.', confirmLabel: 'Delete', danger: true })) deleteSession(s.id) }}
              className="btn-icon p-1.5 hover:text-[var(--error)]"
              aria-label="Delete result"
            >
              <Trash size={16} />
            </button>
          </div>
        )) : (
          <Empty icon={CheckCircle} title="No completed sessions" text="Finish a Recitation or RetDem session and your graded results will appear here." />
        ))}
      </section>
    </div>
  )
}

function Empty({ icon: Icon, title, text, action }: {
  icon: typeof Heart
  title: string
  text: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center mb-3">
        <Icon size={26} weight="duotone" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">{text}</p>
      {action && <button onClick={action.onClick} className="btn-secondary px-5 py-2 text-xs mt-4">{action.label}</button>}
    </div>
  )
}
