import { useReminderStore } from '@/stores/reminderStore'
import { getReminderTypeColor, getReminderTypeLabel, formatRelativeDate } from '@/lib/utils'
import { Calendar, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function TodayReminders() {
  const { getUpcomingReminders } = useReminderStore()
  const reminders = getUpcomingReminders(3)

  return (
    <div className="fn-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[var(--secondary-bg)] rounded-xl text-[var(--pink)]">
            <Calendar size={20} />
          </div>
          <h3 className="font-heading font-bold text-lg">Upcoming</h3>
        </div>
        <Link to="/planner" className="text-xs font-semibold text-[var(--pink)] hover:underline flex items-center gap-1">
          View all <ChevronRight size={14} />
        </Link>
      </div>

      <div className="space-y-3 flex-1">
        {reminders.length > 0 ? (
          reminders.map((reminder) => (
            <div key={reminder.id} className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] group hover:border-[var(--pink)] transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${getReminderTypeColor(reminder.reminder_type)}`}>
                {getReminderTypeLabel(reminder.reminder_type).split(' ')[0]}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold truncate">{reminder.title}</p>
                <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wider">
                  {formatRelativeDate(reminder.due_date)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <p className="text-sm text-[var(--text-secondary)]">All caught up! 🌸</p>
          </div>
        )}
      </div>
    </div>
  )
}
