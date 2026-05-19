import { useReviewerStore } from '@/stores/reviewerStore'
import { Play, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ContinueStudying() {
  const { reviewers } = useReviewerStore()
  const recent = reviewers.slice(0, 2)

  return (
    <div className="fn-card p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-[var(--secondary-bg)] rounded-xl text-[var(--pink)]">
          <Play size={20} fill="currentColor" />
        </div>
        <h3 className="font-heading font-bold text-lg">Continue Studying</h3>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {recent.map((reviewer) => (
          <div key={reviewer.id} className="p-4 rounded-2xl bg-gradient-to-br from-[var(--bg)] to-[var(--secondary-bg)]/30 border border-[var(--border)] group hover:shadow-fn transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--pink)] px-2 py-0.5 bg-white/80 rounded-full">Reviewer</span>
              <Clock size={14} className="text-[var(--text-secondary)]" />
            </div>
            <h4 className="font-bold text-sm mb-1 group-hover:text-[var(--pink)] transition-colors">{reviewer.title}</h4>
            <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{reviewer.source_file}</p>
          </div>
        ))}
        
        <Link to="/reviewer-library" className="btn-secondary w-full py-2.5 text-sm flex items-center justify-center gap-2 mt-2">
          Open Library
        </Link>
      </div>
    </div>
  )
}
