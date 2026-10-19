import { Fire as Flame, Check } from '@phosphor-icons/react'
import { useStudyActivity } from '@/hooks/useStudyActivity'
import { cn } from '@/lib/utils'

export default function StreakCard() {
  const { streak, week } = useStudyActivity()

  return (
    <section className="fn-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-[15px] flex items-center gap-2">
          <Flame size={16} className="text-[var(--pink)]" /> Study Streak
        </h2>
        <span className="text-sm font-semibold text-[var(--pink)]">{streak} {streak === 1 ? 'day' : 'days'}</span>
      </div>

      <div className="flex justify-between">
        {week.map(({ date, active }) => (
          <div key={date.toDateString()} className="flex flex-col items-center gap-1.5">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors',
              active ? 'bg-[var(--pink)] border-[var(--pink)] text-white' : 'border-[var(--accent)] text-transparent'
            )}>
              <Check size={13} weight="bold" />
            </div>
            <span className="text-[10px] text-[var(--text-secondary)] leading-none">
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
            <span className="text-[10px] font-semibold text-[var(--text)] leading-none">{date.getDate()}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11.5px] text-[var(--text-secondary)]">
        {streak > 0 ? 'Keep your streak alive — study a little today!' : 'Upload notes or take a quiz to start a streak!'}
      </p>
    </section>
  )
}
