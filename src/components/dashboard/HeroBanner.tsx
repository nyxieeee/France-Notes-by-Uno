import { useNavigate } from 'react-router-dom'
import { CaretRight as ChevronRight, CalendarDots as CalendarDays } from '@phosphor-icons/react'
import { getGreeting } from '@/lib/utils'
import { usePersonalization } from '@/hooks/usePersonalization'
import { useReviewerStore } from '@/stores/reviewerStore'
import ParisIllustration from './ParisIllustration'

export default function HeroBanner() {
  const navigate = useNavigate()
  const { isFrance, greetingName } = usePersonalization()
  const { reviewers, setSelectedReviewer } = useReviewerStore()

  // Pick up the most recent reviewer, or head to the Study Box if there isn't one yet
  const continueStudying = () => {
    const latest = reviewers[0]
    if (latest) {
      setSelectedReviewer(latest)
      navigate('/reviewer-library')
    } else {
      navigate('/study-box')
    }
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--rose-soft)] shadow-fn min-h-[190px]">
      <ParisIllustration className="absolute right-0 bottom-0 h-full w-[62%] sm:w-[55%] opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--rose-soft)] via-th-rose-soft/85 to-transparent" />

      <p className="hidden lg:block absolute right-[30%] top-6 font-script text-xl text-th-pink/80 leading-tight rotate-[-4deg]">
        Same dreams,<br />bigger plans ♡
      </p>

      <div className="relative p-6 sm:p-8 max-w-md">
        <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-[var(--text)] leading-tight">
          {getGreeting()}, {isFrance ? 'Future RN' : greetingName}! <span className="text-[var(--pink)]">♡</span>
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          {isFrance ? `Small steps today, big dreams tomorrow, ${greetingName}.` : 'Small steps today, big dreams tomorrow.'}
        </p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <button onClick={continueStudying} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-1.5">
            Continue Studying <ChevronRight size={16} />
          </button>
          <button onClick={() => navigate('/planner')} className="btn-secondary px-5 py-2.5 text-sm flex items-center gap-2">
            <CalendarDays size={15} /> View Planner
          </button>
        </div>
      </div>
    </section>
  )
}
