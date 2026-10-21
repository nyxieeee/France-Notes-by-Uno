import { Link } from 'react-router-dom'
import { BookOpen, Books as Library, CaretRight as ChevronRight, Plus, Sparkle as Sparkles } from '@phosphor-icons/react'
import { formatRelativeDate } from '@/lib/utils'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { useReviewerStore } from '@/stores/reviewerStore'
import { useViewerStore } from '@/stores/viewerStore'
import { tintFor } from '@/lib/tints'


export default function ContinueLearning() {
  const { getRecentItems, topics } = useStudyBoxStore()
  const { reviewers } = useReviewerStore()
  const { openMaterial, openReviewer } = useViewerStore()

  const cards = [
    ...reviewers.slice(0, 4).map(r => ({
      id: `r-${r.id}`,
      kind: 'Reviewer' as const,
      title: r.title,
      subtitle: r.source_file,
      date: r.created_at,
      open: () => openReviewer(r),
    })),
    ...getRecentItems(4).map(item => ({
      id: `m-${item.id}`,
      kind: 'Material' as const,
      title: item.file_name.replace(/\.[^.]+$/, ''),
      subtitle: topics.find(t => t.id === item.topic_id)?.title || 'Study material',
      date: item.created_at,
      open: () => openMaterial(item),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4)

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-semibold text-[15px] flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--pink)]" /> Continue Where You Left Off
        </h2>
        <Link to="/study-box" className="text-xs font-medium text-[var(--pink)] hover:underline flex items-center gap-0.5">
          See all <ChevronRight size={14} />
        </Link>
      </div>

      {cards.length === 0 ? (
        <Link to="/study-box" className="fn-card p-6 border-dashed flex items-center gap-4 text-[var(--text-secondary)] hover:text-[var(--pink)]">
          <div className="w-11 h-11 rounded-xl bg-[var(--rose-soft)] flex items-center justify-center text-[var(--pink)]">
            <Plus size={20} />
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--text)]">Upload your first notes</p>
            <p className="text-xs">They'll show up here so you can jump right back in.</p>
          </div>
        </Link>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map(card => {
            const Icon = card.kind === 'Reviewer' ? Library : BookOpen
            return (
              <button key={card.id} onClick={card.open} className="fn-card overflow-hidden text-left group hover:border-[var(--accent)]">
                <div className={`h-20 bg-gradient-to-br ${tintFor(card.id)} flex items-center justify-center relative`}>
                  <Icon size={30} weight="light" className="text-th-pink/70 group-hover:scale-110 transition-transform" />
                  <span className="absolute top-2 left-2 text-[9.5px] font-semibold text-[var(--pink)] bg-th-card/85 px-2 py-0.5 rounded-full">
                    {card.kind}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-[13px] font-semibold text-[var(--text)] line-clamp-1">{card.title}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1">{card.subtitle}</p>
                  <p className="text-[10.5px] text-th-text-secondary/80 mt-1.5">{formatRelativeDate(card.date)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
