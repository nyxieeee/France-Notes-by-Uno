import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Leaf, MagnifyingGlass, ArrowSquareOut, BookOpen, Trash, Plus, ShieldCheck, CircleNotch } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { useStudyBoxStore, findReferenceArticle } from '@/stores/studyBoxStore'
import { useViewerStore } from '@/stores/viewerStore'
import { usePersonalization } from '@/hooks/usePersonalization'
import { cn, formatRelativeDate } from '@/lib/utils'
import { tintFor } from '@/lib/tints'
import { confirmDialog, toast } from '@/stores/feedbackStore'


type SavedRef = { id: string; title: string; description: string; source: string; url: string; category: string; date_saved?: string }

// Saved references from Search → Trusted Sources. Each one also lives in the Study Box References folder as a full article.
export default function KnowledgeGardenPage() {
  const navigate = useNavigate()
  const { savedKnowledge, items, removeKnowledge, writingArticlesFor } = useStudyBoxStore()
  const openMaterial = useViewerStore(s => s.openMaterial)
  const { knowledgeGardenName, aiAssistantName } = usePersonalization()
  const [category, setCategory] = useState('all')

  const refs = savedKnowledge as unknown as SavedRef[]
  const categories = Array.from(new Set(refs.map(r => r.category).filter(Boolean)))
  const visible = refs.filter(r => category === 'all' || r.category === category)

  const openArticle = (ref: SavedRef) => {
    const article = findReferenceArticle(items, ref)
    if (article) openMaterial(article)
    else if (writingArticlesFor.includes(ref.id)) toast(`${aiAssistantName} is still writing this article. It'll be ready in a moment.`, 'info')
    else window.open(ref.url, '_blank', 'noreferrer')
  }

  return (
    <div className="page-container max-w-6xl">
      <PageHeader
        icon={Leaf}
        title={knowledgeGardenName}
        subtitle={`Your saved references from trusted sources, expanded into study articles by ${aiAssistantName}.`}
        actions={
          <button onClick={() => navigate('/search?tab=sources')} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
            <Plus size={16} weight="bold" /> Find References
          </button>
        }
      />

      {refs.length === 0 ? (
        <div className="fn-card p-10 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center mb-4">
            <Leaf size={30} weight="duotone" />
          </div>
          <p className="font-heading font-semibold">Your garden is empty</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Search trusted sources like WHO, CDC and PubMed, then tap “Save to Garden” to keep a reference here.
          </p>
          <button onClick={() => navigate('/search?tab=sources')} className="btn-primary px-5 py-2.5 text-sm mt-5 inline-flex items-center gap-2">
            <MagnifyingGlass size={16} /> Search trusted sources
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-1.5 flex-wrap mb-5">
            {['all', ...categories].map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-[13px] font-medium border capitalize transition-colors',
                  category === c ? 'bg-[var(--pink)] border-[var(--pink)] text-white' : 'border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]'
                )}
              >
                {c === 'all' ? `All (${refs.length})` : c}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((ref, i) => (
              <motion.article
                key={ref.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 9) * 0.03 }}
                className="fn-card overflow-hidden flex flex-col"
              >
                <button onClick={() => openArticle(ref)} className={`h-24 bg-gradient-to-br ${tintFor(ref.id)} flex items-center justify-center relative`}>
                  <BookOpen size={32} weight="light" className="text-th-pink/70" />
                  <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold text-[var(--pink)] bg-th-card/85 px-2 py-0.5 rounded-full capitalize">{ref.category}</span>
                </button>
                <div className="p-4 flex-1 flex flex-col">
                  <button onClick={() => openArticle(ref)} className="text-left">
                    <h3 className="font-heading font-semibold text-[14.5px] line-clamp-2 hover:text-[var(--pink)]">{ref.title}</h3>
                  </button>
                  <p className="text-[11.5px] text-[var(--text-secondary)] mt-1 flex items-center gap-1">
                    <ShieldCheck size={12} className="text-[var(--success)]" /> {ref.source}
                    {ref.date_saved && <> · {formatRelativeDate(ref.date_saved)}</>}
                  </p>
                  <p className="text-[12.5px] text-[var(--text-secondary)] mt-2 line-clamp-3 flex-1">{ref.description}</p>
                  <div className="flex items-center gap-1 mt-3 -mb-1">
                    {writingArticlesFor.includes(ref.id) ? (
                      <span className="text-xs text-[var(--text-secondary)] mr-auto flex items-center gap-1.5"><CircleNotch size={12} className="animate-spin text-[var(--pink)]" /> Writing article</span>
                    ) : (
                      <button onClick={() => openArticle(ref)} className="text-xs font-medium text-[var(--pink)] hover:underline mr-auto">Study article</button>
                    )}
                    <a href={ref.url} target="_blank" rel="noreferrer" className="btn-icon p-1.5" title="Open source" aria-label="Open source website"><ArrowSquareOut size={16} /></a>
                    <button onClick={async () => { if (await confirmDialog({ title: 'Remove this reference?', message: 'It will be removed from your garden, along with its study article in the References folder.', confirmLabel: 'Remove', danger: true })) { removeKnowledge(ref.id); toast('Reference removed', 'success') } }} className="btn-icon p-1.5 hover:text-[var(--error)]" title="Remove" aria-label="Remove reference"><Trash size={16} /></button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
