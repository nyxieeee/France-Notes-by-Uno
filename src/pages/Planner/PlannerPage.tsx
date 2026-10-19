import { useState, useMemo } from 'react'
import { useReminderStore } from '@/stores/reminderStore'
import type { Reminder } from '@/types'
import { Calendar as CalendarIcon, Plus, CaretLeft as ChevronLeft, CaretRight as ChevronRight, Trash as Trash2, Check, X, ListChecks, Clock } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, getReminderTypeHex, getReminderTypeLabel } from '@/lib/utils'
import { localDayKey } from '@/hooks/useStudyActivity'
import { usePersonalization } from '@/hooks/usePersonalization'

const CATEGORIES: { value: Reminder['reminder_type']; label: string }[] = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'exam', label: 'Exam' },
  { value: 'retdem', label: 'RetDem' },
  { value: 'duty', label: 'Clinical duty' },
  { value: 'other', label: 'Other' },
]

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

export default function PlannerPage() {
  const { isFrance, aiAssistantName } = usePersonalization()
  const { reminders, addReminder, toggleReminder, removeReminder } = useReminderStore()

  const [view, setView] = useState<'calendar' | 'tasks'>('calendar')
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [showAddModal, setShowAddModal] = useState(false)

  // Form State
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<Reminder['reminder_type']>('assignment')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')

  // Calendar Logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  const todayKey = localDayKey(new Date())
  const selectedKey = localDayKey(selectedDate)

  const byDay = useMemo(() => {
    const map = new Map<string, Reminder[]>()
    for (const r of reminders) {
      const key = localDayKey(new Date(r.due_date))
      map.set(key, [...(map.get(key) ?? []), r])
    }
    for (const list of map.values()) list.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    return map
  }, [reminders])

  const openAdd = (date: Date) => {
    setNewDate(localDayKey(date))
    setShowAddModal(true)
  }

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !newDate) return

    // Combine date and time; default to noon when no time is given
    const finalDateTime = newTime ? `${newDate}T${newTime}:00` : `${newDate}T12:00:00`

    addReminder({
      title: newTitle,
      due_date: finalDateTime,
      reminder_type: newType,
    })

    setShowAddModal(false)
    setNewTitle('')
    setNewTime('')
  }

  const groups = useMemo(() => {
    const open = reminders.filter(r => !r.completed).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    return [
      { label: 'Overdue', items: open.filter(r => localDayKey(new Date(r.due_date)) < todayKey) },
      { label: 'Today', items: open.filter(r => localDayKey(new Date(r.due_date)) === todayKey) },
      { label: 'Upcoming', items: open.filter(r => localDayKey(new Date(r.due_date)) > todayKey) },
      { label: 'Done', items: reminders.filter(r => r.completed).sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()) },
    ]
  }, [reminders, todayKey])

  const selectedItems = byDay.get(selectedKey) ?? []
  const openCount = reminders.filter(r => !r.completed).length

  return (
    <div className="page-container max-w-6xl">
      <PageHeader
        icon={CalendarIcon}
        title="Planner"
        subtitle={isFrance ? 'Your schedule and deadlines, with Doc Uno keeping you on track.' : `Your schedule and deadlines, with ${aiAssistantName} keeping you on track.`}
        actions={
          <button onClick={() => openAdd(selectedDate)} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
            <Plus size={16} weight="bold" /> New Task
          </button>
        }
      />

      <div className="flex p-1 rounded-full bg-[var(--card)] border border-[var(--border)] w-max mb-5">
        {([['calendar', 'Calendar', CalendarIcon], ['tasks', `Tasks · ${openCount}`, ListChecks]] as const).map(([id, label, TabIcon]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={cn('px-4 py-1.5 rounded-full text-[13px] font-medium flex items-center gap-1.5 transition-colors', view === id ? 'bg-[var(--pink)] text-white' : 'text-[var(--text-secondary)]')}
          >
            <TabIcon size={15} /> {label}
          </button>
        ))}
      </div>

      {view === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
          {/* Month */}
          <section className="fn-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-lg">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { const now = new Date(); setCurrentDate(now); setSelectedDate(now) }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--border)] hover:bg-[var(--rose-soft)] mr-1"
                >
                  Today
                </button>
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="btn-icon p-2" aria-label="Previous month"><ChevronLeft size={16} /></button>
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="btn-icon p-2" aria-label="Next month"><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => <div key={d} className="text-center text-[11px] font-medium text-[var(--text-secondary)] py-1.5">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
                const key = localDayKey(date)
                const dayItems = byDay.get(key) ?? []
                const isToday = key === todayKey
                const isSelected = key === selectedKey
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(date)}
                    onDoubleClick={() => openAdd(date)}
                    className={cn(
                      'min-h-[52px] sm:min-h-[76px] rounded-xl border p-1.5 sm:p-2 flex flex-col items-start text-left transition-colors',
                      isSelected ? 'border-[var(--pink)] bg-[var(--rose-soft)]' : 'border-transparent hover:bg-[var(--rose-soft)]'
                    )}
                  >
                    <span className={cn(
                      'text-[12.5px] font-medium w-6 h-6 rounded-full flex items-center justify-center',
                      isToday ? 'bg-[var(--pink)] text-white' : 'text-[var(--text)]'
                    )}>{i + 1}</span>
                    {/* Dots on phones, short titles on wider screens */}
                    <div className="flex gap-0.5 mt-1 sm:hidden">
                      {dayItems.slice(0, 3).map(r => <span key={r.id} className="w-1.5 h-1.5 rounded-full" style={{ background: getReminderTypeHex(r.reminder_type), opacity: r.completed ? 0.35 : 1 }} />)}
                    </div>
                    <div className="hidden sm:flex flex-col gap-0.5 mt-1 w-full">
                      {dayItems.slice(0, 2).map(r => (
                        <span
                          key={r.id}
                          className={cn('text-[10.5px] font-medium px-1.5 py-0.5 rounded-md truncate w-full', r.completed && 'line-through opacity-50')}
                          style={{ background: `${getReminderTypeHex(r.reminder_type)}1f`, color: getReminderTypeHex(r.reminder_type) }}
                        >
                          {r.title}
                        </span>
                      ))}
                      {dayItems.length > 2 && <span className="text-[10px] text-[var(--text-secondary)] px-1">+{dayItems.length - 2} more</span>}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-[var(--border)]">
              {CATEGORIES.map(c => (
                <span key={c.value} className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-secondary)]">
                  <span className="w-2 h-2 rounded-full" style={{ background: getReminderTypeHex(c.value) }} /> {c.label}
                </span>
              ))}
            </div>
          </section>

          {/* Selected day */}
          <section className="fn-card p-5 lg:sticky lg:top-4">
            <p className="text-xs font-medium text-[var(--text-secondary)]">{selectedKey === todayKey ? 'Today' : 'Schedule'}</p>
            <h2 className="font-heading font-semibold text-[16px]">{dayLabel(selectedDate)}</h2>

            <div className="mt-4 space-y-2">
              {selectedItems.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] py-4">Nothing planned for this day.</p>
              ) : selectedItems.map(r => (
                <TaskRow key={r.id} reminder={r} showTime onToggle={() => toggleReminder(r.id)} onDelete={() => removeReminder(r.id)} />
              ))}
            </div>

            <button onClick={() => openAdd(selectedDate)} className="mt-3 w-full border border-dashed border-[var(--accent)] rounded-xl py-2.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--pink)] hover:bg-[var(--rose-soft)] flex items-center justify-center gap-1.5">
              <Plus size={14} /> Add task for this day
            </button>
          </section>
        </div>
      ) : (
        <div className="max-w-3xl space-y-4">
          {groups.every(g => g.items.length === 0) && (
            <div className="fn-card p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center mx-auto mb-3"><ListChecks size={26} weight="duotone" /></div>
              <p className="font-medium">No tasks yet</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Add exams, assignments and duty schedules to keep track of them.</p>
            </div>
          )}
          {groups.filter(g => g.items.length > 0).map(group => (
            <section key={group.label} className="fn-card p-4">
              <h2 className={cn('text-sm font-semibold px-1 mb-2', group.label === 'Overdue' && 'text-[var(--error)]')}>
                {group.label} <span className="text-[var(--text-secondary)] font-normal">({group.items.length})</span>
              </h2>
              <div className="space-y-1.5">
                {group.items.map(r => (
                  <TaskRow key={r.id} reminder={r} showDate onToggle={() => toggleReminder(r.id)} onDelete={() => removeReminder(r.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Add task */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="relative z-10 w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-t-3xl sm:rounded-2xl shadow-fn-lg"
            >
              <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-[var(--border)]">
                <h2 className="font-heading font-semibold text-[17px]">New task</h2>
                <button onClick={() => setShowAddModal(false)} className="btn-icon p-2 -mr-1" aria-label="Close"><X size={18} /></button>
              </div>

              <form onSubmit={handleAddReminder} className="p-6 space-y-4">
                <label className="block">
                  <span className="block text-[13px] font-medium mb-1.5">Title</span>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Med-Surg exam, read chapter 5"
                    className="fn-input rounded-xl bg-[var(--card)] py-2.5 text-sm"
                  />
                </label>

                <div>
                  <span className="block text-[13px] font-medium mb-1.5">Category</span>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setNewType(c.value)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-[13px] font-medium border flex items-center gap-1.5 transition-colors',
                          newType === c.value ? 'border-[var(--pink)] bg-[var(--rose-soft)] text-[var(--text)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]'
                        )}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: getReminderTypeHex(c.value) }} /> {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-[13px] font-medium mb-1.5">Date</span>
                    <input type="date" required value={newDate} onChange={e => setNewDate(e.target.value)} className="fn-input rounded-xl bg-[var(--card)] py-2.5 text-sm" />
                  </label>
                  <label className="block">
                    <span className="block text-[13px] font-medium mb-1.5">Time <span className="text-[var(--text-secondary)] font-normal">optional</span></span>
                    <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="fn-input rounded-xl bg-[var(--card)] py-2.5 text-sm" />
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
                  <button type="submit" className="btn-primary px-5 py-2.5 text-sm">Save task</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TaskRow({ reminder, showTime, showDate, onToggle, onDelete }: {
  reminder: Reminder
  showTime?: boolean
  showDate?: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const color = getReminderTypeHex(reminder.reminder_type)
  const due = new Date(reminder.due_date)
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--border)] group hover:bg-[var(--rose-soft)] transition-colors">
      <button
        onClick={onToggle}
        aria-label={reminder.completed ? `Mark ${reminder.title} as not done` : `Mark ${reminder.title} as done`}
        className={cn('w-[20px] h-[20px] rounded-md border-2 flex items-center justify-center shrink-0 transition-colors', reminder.completed ? 'bg-[var(--pink)] border-[var(--pink)] text-white' : 'border-[var(--accent)] hover:border-[var(--pink)]')}
      >
        {reminder.completed && <Check size={12} weight="bold" />}
      </button>
      <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <p className={cn('text-[13.5px] font-medium truncate', reminder.completed && 'line-through text-[var(--text-secondary)]')}>{reminder.title}</p>
        <p className="text-[11.5px] text-[var(--text-secondary)] flex items-center gap-1.5">
          <span style={{ color }}>{getReminderTypeLabel(reminder.reminder_type)}</span>
          {showDate && <>· {due.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</>}
          {(showTime || showDate) && <><Clock size={11} /> {timeOf(reminder.due_date)}</>}
        </p>
      </div>
      <button onClick={onDelete} className="btn-icon p-1.5 hover:text-[var(--error)] sm:opacity-0 group-hover:opacity-100" aria-label={`Delete ${reminder.title}`}>
        <Trash2 size={15} />
      </button>
    </div>
  )
}
