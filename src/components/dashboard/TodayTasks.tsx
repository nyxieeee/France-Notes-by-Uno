import { Link } from 'react-router-dom'
import { ClipboardText as ClipboardList, CaretRight as ChevronRight, Check } from '@phosphor-icons/react'
import { useReminderStore } from '@/stores/reminderStore'
import { cn, formatRelativeDate, getReminderTypeLabel } from '@/lib/utils'

export default function TodayTasks() {
  const { getUpcomingReminders, toggleReminder } = useReminderStore()
  const tasks = getUpcomingReminders(4)
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <section className="fn-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[var(--rose-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--pink)]">
          <ClipboardList size={17} />
        </div>
        <div>
          <h2 className="font-heading font-semibold text-[15px] leading-tight">Upcoming Tasks</h2>
          <p className="text-[11px] text-[var(--text-secondary)]">{today}</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] py-3">All caught up! 🌸 Add tasks in your planner.</p>
      ) : (
        <ul className="space-y-1">
          {tasks.map(task => (
            <li key={task.id} className="flex items-start gap-3 py-2 border-b border-th-border/70 last:border-0">
              <button
                onClick={() => toggleReminder(task.id)}
                aria-label={`Mark ${task.title} as done`}
                className={cn(
                  'mt-0.5 w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                  task.completed ? 'bg-[var(--pink)] border-[var(--pink)] text-white' : 'border-[var(--accent)] hover:border-[var(--pink)]'
                )}
              >
                {task.completed && <Check size={11} weight="bold" />}
              </button>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[var(--text)] truncate">{task.title}</p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {getReminderTypeLabel(task.reminder_type)} · {formatRelativeDate(task.due_date)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link to="/planner" className="mt-3 text-xs font-medium text-[var(--pink)] hover:underline inline-flex items-center gap-0.5">
        View full planner <ChevronRight size={14} />
      </Link>
    </section>
  )
}
