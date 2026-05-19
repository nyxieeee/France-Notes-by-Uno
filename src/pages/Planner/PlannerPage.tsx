import { useState, useMemo } from 'react'
import { useReminderStore } from '@/stores/reminderStore'
import { Reminder } from '@/types'
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Trash2,
  CheckCircle2,
  Sparkles,
  BookOpen
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatRelativeDate, getReminderTypeColor, getReminderTypeLabel } from '@/lib/utils'
import { usePersonalization } from '@/hooks/usePersonalization'

export default function PlannerPage() {
  const { isFrance, aiAssistantName } = usePersonalization()
  const { reminders, addReminder, toggleReminder, removeReminder } = useReminderStore()
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Form State
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<Reminder['reminder_type']>('assignment')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')

  // Calendar Logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const getRemindersForDay = (day: number) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return reminders.filter(r => {
      const rDate = new Date(r.due_date)
      return rDate.getDate() === checkDate.getDate() && 
             rDate.getMonth() === checkDate.getMonth() && 
             rDate.getFullYear() === checkDate.getFullYear()
    })
  }

  const handleDayClick = (day: number) => {
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDate(selected)
    
    // Set default form date string (YYYY-MM-DD)
    const offset = selected.getTimezoneOffset()
    selected.setMinutes(selected.getMinutes() - offset)
    setNewDate(selected.toISOString().split('T')[0])
    
    setShowAddModal(true)
  }

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !newDate) return

    // Combine date and time
    let finalDateTime = newDate
    if (newTime) {
      finalDateTime = `${newDate}T${newTime}:00`
    } else {
      finalDateTime = `${newDate}T12:00:00` // Default noon
    }

    addReminder({
      title: newTitle,
      due_date: finalDateTime,
      reminder_type: newType,
    })

    setShowAddModal(false)
    setNewTitle('')
    setNewTime('')
  }

  const upcomingReminders = useMemo(() => {
    return [...reminders]
      .filter(r => !r.completed)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
  }, [reminders])

  const completedReminders = useMemo(() => {
    return [...reminders]
      .filter(r => r.completed)
      .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
  }, [reminders])

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  return (
    <div className="page-container max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            <CalendarIcon className="text-[var(--pink)]" size={32} />
            Study Planner
          </h1>
          <p className="text-[var(--text-secondary)] font-medium">
            {isFrance 
              ? 'Organize your schedule, set deadlines, and let Doc Uno remind you! 🩺🌸' 
              : `Manage your deadlines and let ${aiAssistantName} keep you on track. 🩺✨`
            }
          </p>
        </div>
        <button 
          onClick={() => {
            const today = new Date()
            const offset = today.getTimezoneOffset()
            today.setMinutes(today.getMinutes() - offset)
            setNewDate(today.toISOString().split('T')[0])
            setShowAddModal(true)
          }}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={18} /> Add Reminder
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Main Column: Calendar */}
        <div className="lg:col-span-2 space-y-6">
          <div className="fn-card p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold font-heading">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex gap-2">
                <button onClick={handlePrevMonth} className="p-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--pink)]/50 transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={handleNextMonth} className="p-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--pink)]/50 transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] py-2">
                  {d}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Empty cells for start of month */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square rounded-2xl bg-[var(--bg)]/50 border border-transparent opacity-30"></div>
              ))}
              
              {/* Actual days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayReminders = getRemindersForDay(day)
                const isToday = 
                  new Date().getDate() === day && 
                  new Date().getMonth() === currentDate.getMonth() && 
                  new Date().getFullYear() === currentDate.getFullYear()
                  
                return (
                  <div 
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "aspect-square rounded-2xl border transition-all cursor-pointer p-1 sm:p-2 flex flex-col relative group",
                      isToday 
                        ? "bg-[var(--pink)]/5 border-[var(--pink)]" 
                        : "bg-[var(--bg)] border-[var(--border)] hover:border-[var(--pink)]/50"
                    )}
                  >
                    <span className={cn(
                      "text-xs sm:text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1",
                      isToday ? "bg-[var(--pink)] text-white" : "text-[var(--text)]"
                    )}>
                      {day}
                    </span>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 w-full">
                      {dayReminders.map(r => (
                        <div 
                          key={r.id} 
                          className={cn(
                            "text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md truncate leading-tight",
                            getReminderTypeColor(r.reminder_type),
                            r.completed && "opacity-40 line-through"
                          )}
                          title={r.title}
                        >
                          {r.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* AI Auto-Schedule Promo */}
          <div className="fn-card p-6 bg-gradient-to-br from-[var(--pink)] to-pink-500 text-white relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
              <Sparkles size={160} />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="font-heading font-bold text-xl mb-2 flex items-center gap-2">
                  <Sparkles size={20} /> AI Study Planner
                </h3>
                <p className="text-sm font-medium opacity-90 max-w-md">
                  {isFrance 
                    ? "Babe, let Doc Uno create a custom study schedule based on your uploaded reviewers and weak topics!" 
                    : `Let ${aiAssistantName} create a custom study schedule based on your uploaded materials.`
                  }
                </p>
              </div>
              <button className="bg-white text-[var(--pink)] px-6 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 transition-transform whitespace-nowrap">
                Auto-Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Reminders */}
        <div className="space-y-6">
          <div className="fn-card p-6 flex flex-col h-full max-h-[800px]">
            <h2 className="text-lg font-bold font-heading mb-4 flex items-center gap-2">
              <Clock className="text-[var(--pink)]" size={20} />
              Upcoming Deadlines
            </h2>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
              {upcomingReminders.length > 0 ? (
                upcomingReminders.map(reminder => (
                  <div key={reminder.id} className="p-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--pink)]/40 transition-colors group">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                            getReminderTypeColor(reminder.reminder_type)
                          )}>
                            {getReminderTypeLabel(reminder.reminder_type)}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm leading-snug">{reminder.title}</h4>
                      </div>
                      <div className="flex gap-1 shrink-0">
                         <button 
                           onClick={() => toggleReminder(reminder.id)}
                           className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--success)]/10 hover:text-[var(--success)] transition-colors"
                         >
                           <CheckCircle2 size={14} />
                         </button>
                         <button 
                           onClick={() => removeReminder(reminder.id)}
                           className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--error)]/10 hover:text-[var(--error)] transition-colors"
                         >
                           <Trash2 size={14} />
                         </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] font-bold flex items-center gap-1.5">
                      <CalendarIcon size={11} />
                      {formatRelativeDate(reminder.due_date)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-full bg-[var(--secondary-bg)] text-[var(--pink)] flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="font-bold text-sm">You're all caught up!</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">No upcoming deadlines.</p>
                </div>
              )}

              {completedReminders.length > 0 && (
                <>
                  <div className="h-px bg-[var(--border)] my-6 w-full"></div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3">Completed</h3>
                  {completedReminders.map(reminder => (
                    <div key={reminder.id} className="p-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] opacity-60 hover:opacity-100 transition-opacity">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-sm leading-snug line-through text-[var(--text-secondary)]">{reminder.title}</h4>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button 
                            onClick={() => toggleReminder(reminder.id)}
                            className="text-[10px] font-bold text-[var(--pink)] hover:underline"
                          >
                            Undo
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Reminder Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fn-card w-full max-w-md relative z-10 p-6"
            >
              <h2 className="text-xl font-bold font-heading mb-6 flex items-center gap-2">
                <Plus className="text-[var(--pink)]" />
                Add New Reminder
              </h2>
              
              <form onSubmit={handleAddReminder} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1.5 block ml-1">Title / Subject</label>
                  <input 
                    type="text" 
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Med-Surg Exam, Read Chapter 5..."
                    className="fn-input w-full"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1.5 block ml-1">Category</label>
                  <select 
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                    className="fn-input w-full appearance-none bg-white"
                  >
                    <option value="assignment">Homework / Assignment</option>
                    <option value="quiz">Quiz Preparation</option>
                    <option value="exam">Major Exam</option>
                    <option value="retdem">RetDem Practice</option>
                    <option value="duty">Clinical Duty</option>
                    <option value="other">Other Review</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1.5 block ml-1">Date</label>
                    <input 
                      type="date" 
                      required
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="fn-input w-full text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1.5 block ml-1">Time (Optional)</label>
                    <input 
                      type="time" 
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                      className="fn-input w-full text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 btn-secondary py-3"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 btn-primary py-3"
                  >
                    Save Reminder
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
