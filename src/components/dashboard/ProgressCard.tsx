import { Link } from 'react-router-dom'
import { TrendUp as TrendingUp, CaretRight as ChevronRight, Heart } from '@phosphor-icons/react'
import { useQuizStore } from '@/stores/quizStore'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { useNotesStore } from '@/stores/notesStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { usePersonalization } from '@/hooks/usePersonalization'

const RING_RADIUS = 34
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

export default function ProgressCard() {
  const { quizzes } = useQuizStore()
  const { items } = useStudyBoxStore()
  const { notes } = useNotesStore()
  const { history } = useSimulationStore()
  const { isFrance, aiAssistantName, greetingName } = usePersonalization()

  const scored = quizzes.filter(q => q.completed && q.score !== null)
  const average = scored.length > 0
    ? Math.round(scored.reduce((sum, q) => sum + (q.score || 0), 0) / scored.length)
    : 0

  const breakdown = [
    { label: 'Study Materials', value: items.length },
    { label: 'Quizzes', value: scored.length },
    { label: 'Simulations', value: history.length },
    { label: 'Notes', value: notes.length },
  ]

  const cheer = scored.length === 0
    ? 'Take your first quiz to see your score here!'
    : average >= 75
      ? (isFrance ? "You're doing amazing, babe!" : "You're doing great — keep it up!")
      : (isFrance ? 'Every quiz makes you stronger, babe!' : 'Every quiz makes you stronger!')

  return (
    <section className="fn-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-[15px] flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--pink)]" /> Your Progress
        </h2>
        <Link to="/quiz" className="text-xs font-medium text-[var(--pink)] hover:underline flex items-center gap-0.5">
          Quiz history <ChevronRight size={14} />
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex items-center gap-5 flex-1">
          <div className="relative w-[88px] h-[88px] shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r={RING_RADIUS} fill="none" stroke="var(--secondary-bg)" strokeWidth="7" />
              <circle
                cx="40" cy="40" r={RING_RADIUS} fill="none" stroke="var(--pink)" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - average / 100)}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-heading font-semibold leading-none">{scored.length ? `${average}%` : '--'}</span>
              <span className="text-[9px] text-[var(--text-secondary)] mt-0.5">Avg. score</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-2 flex-1">
            {breakdown.map(b => (
              <div key={b.label}>
                <p className="text-[11px] text-[var(--text-secondary)]">{b.label}</p>
                <p className="text-sm font-semibold">{b.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="sm:w-48 rounded-2xl bg-[var(--rose-soft)] border border-[var(--border)] p-3.5 flex items-center gap-3">
          <img
            src={isFrance ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'}
            alt={aiAssistantName}
            className="w-10 h-10 rounded-full object-cover border-2 border-[var(--card)] shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text)] flex items-center gap-1">
              Keep going, {isFrance ? 'RN' : greetingName}! <Heart size={11} weight="fill" className="text-[var(--pink)]" />
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] leading-snug">{cheer}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
