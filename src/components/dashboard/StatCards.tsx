import { Link } from 'react-router-dom'
import { BookOpen, Brain as BrainCircuit, Books as Library, Fire as Flame } from '@phosphor-icons/react'
import { useStudyBoxStore, isReferenceArticle } from '@/stores/studyBoxStore'
import { useQuizStore } from '@/stores/quizStore'
import { useReviewerStore } from '@/stores/reviewerStore'
import { useStudyActivity } from '@/hooks/useStudyActivity'

export default function StatCards() {
  const { items } = useStudyBoxStore()
  const { quizzes } = useQuizStore()
  const { reviewers } = useReviewerStore()
  const { streak } = useStudyActivity()

  const stats = [
    { icon: BookOpen, label: 'Study Materials', value: items.filter(i => !isReferenceArticle(i)).length, caption: 'uploaded', to: '/study-box' },
    { icon: BrainCircuit, label: 'Quizzes', value: quizzes.filter(q => q.completed).length, caption: 'completed', to: '/quiz' },
    { icon: Library, label: 'Reviewers', value: reviewers.length, caption: 'generated', to: '/reviewer-library' },
    { icon: Flame, label: 'Study Streak', value: streak, caption: streak === 1 ? 'day' : 'days', to: '/planner', hot: streak > 0 },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(stat => (
        <Link key={stat.label} to={stat.to} className="fn-card p-4 flex items-center gap-3 hover:border-[var(--accent)]">
          <div className="w-10 h-10 rounded-xl bg-[var(--rose-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--pink)] shrink-0">
            <stat.icon size={19} weight={stat.hot ? 'fill' : 'regular'} />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] text-[var(--text-secondary)] truncate">{stat.label}</p>
            <p className="text-xl font-heading font-semibold leading-tight text-[var(--text)]">{stat.value}</p>
            <p className="text-[10.5px] text-[var(--text-secondary)]">{stat.caption}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
