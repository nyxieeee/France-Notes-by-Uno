import { useEffect, useRef, useState } from 'react'
import { useReviewerStore } from '@/stores/reviewerStore'
import { useStudyBoxStore, isReferenceArticle, materialDisplayName } from '@/stores/studyBoxStore'
import { useNavigate } from 'react-router-dom'
import { usePersonalization } from '@/hooks/usePersonalization'
import {
  Books as Library, MagnifyingGlass as Search, Heart, Sparkle as Sparkles, BookOpen, Lightning as Zap,
  ArrowCounterClockwise as RotateCcw, X, FileText, DownloadSimple as Download, Printer, Trash as Trash2,
  Presentation, Brain, CaretLeft, CaretRight, CaretDown, Check, ListChecks, CircleNotch, Folder, Cards,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { quizStateFor } from '@/lib/reviewers'
import PageHeader from '@/components/shared/PageHeader'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatRelativeDate } from '@/lib/utils'
import MarkdownText from '@/components/shared/MarkdownText'
import { exportToPDF, exportToDOCX, exportToPPTX, printFlashcards, cleanDeckTitle } from '@/lib/export'
import type { Flashcard, PresentationSlide, ReviewerItem } from '@/types'
import { tintFor } from '@/lib/tints'
import { confirmDialog, toast } from '@/stores/feedbackStore'
import { useBackToClose } from '@/hooks/useBackToClose'

type Filter = 'all' | 'guides' | 'slides' | 'favorites'

const isDeck = (r: ReviewerItem) => (r.content.slides?.length ?? 0) > 0

// Shared quiz hand-off: quiz on the reviewer's summary and key points
export default function ReviewerLibraryPage() {
  const { isFrance } = usePersonalization()
  const {
    reviewers,
    getFilteredReviewers,
    searchQuery,
    setSearchQuery,
    toggleFavorite,
    deleteReviewer,
    selectedReviewer,
    setSelectedReviewer,
  } = useReviewerStore()
  useBackToClose(!!selectedReviewer, () => setSelectedReviewer(null))
  const { topics } = useStudyBoxStore()
  const navigate = useNavigate()
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  const getTopicTitle = (topicId: string | null) => topics.find(t => t.id === topicId)?.title || 'General'

  const filteredReviewers = getFilteredReviewers().filter(r =>
    filter === 'all' ? true
    : filter === 'guides' ? !isDeck(r)
    : filter === 'slides' ? isDeck(r)
    : r.is_favorite
  )

  const counts: Record<Filter, number> = {
    all: reviewers.length,
    guides: reviewers.filter(r => !isDeck(r)).length,
    slides: reviewers.filter(isDeck).length,
    favorites: reviewers.filter(r => r.is_favorite).length,
  }

  return (
    <div className="page-container max-w-7xl">
      <PageHeader
        icon={Library}
        title={isFrance ? "France's Reviewer Library" : 'Reviewer Library'}
        subtitle={isFrance ? 'Your study guides, flashcards and slide decks, babe.' : 'Your AI study guides, flashcards, mnemonics and slide decks.'}
        actions={
          <button onClick={() => setIsGenerateModalOpen(true)} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
            <Sparkles size={16} /> New Reviewer
          </button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="flex-1 flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-full px-4 py-2.5 focus-within:ring-2 focus-within:ring-th-pink/25">
          <Search size={17} className="text-[var(--text-secondary)] shrink-0" />
          <input
            type="text"
            placeholder="Search reviewers by title or source…"
            className="bg-transparent outline-none text-sm w-full placeholder:text-th-text-secondary/70"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} aria-label="Clear search" className="text-[var(--text-secondary)] hover:text-[var(--pink)]"><X size={15} /></button>}
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {([['all', 'All'], ['guides', 'Study guides'], ['slides', 'Slide decks'], ['favorites', 'Favorites']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn(
                'px-3.5 py-2 rounded-full text-[13px] font-medium border whitespace-nowrap transition-colors',
                filter === id ? 'bg-[var(--pink)] border-[var(--pink)] text-white' : 'border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]'
              )}
            >
              {label} <span className="opacity-75">{counts[id]}</span>
            </button>
          ))}
        </div>
      </div>

      {filteredReviewers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredReviewers.map((reviewer) => {
            const deck = isDeck(reviewer)
            const stats = deck
              ? [`${reviewer.content.slides?.length} slides`]
              : [`${reviewer.content.key_points?.length || 0} key points`, `${reviewer.content.flashcards?.length || 0} flashcards`]
            return (
              <motion.article
                layout
                key={reviewer.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="fn-card overflow-hidden flex flex-col group hover:border-[var(--accent)] cursor-pointer"
                onClick={() => setSelectedReviewer(reviewer)}
              >
                <div className={`h-24 bg-gradient-to-br ${tintFor(reviewer.id)} relative flex items-center justify-center`}>
                  {deck ? <Presentation size={34} weight="light" className="text-th-pink/70" /> : <BookOpen size={34} weight="light" className="text-th-pink/70" />}
                  <span className="absolute top-2.5 left-2.5 text-[10.5px] font-semibold text-[var(--pink)] bg-th-card/85 px-2 py-0.5 rounded-full">
                    {deck ? 'Slide deck' : 'Study guide'}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(reviewer.id) }}
                    aria-label={reviewer.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    className={cn('absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-th-card/85 flex items-center justify-center', reviewer.is_favorite ? 'text-[var(--pink)]' : 'text-[var(--text-secondary)]')}
                  >
                    <Heart size={14} weight={reviewer.is_favorite ? 'fill' : 'regular'} />
                  </button>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-heading font-semibold text-[15px] leading-snug line-clamp-2 group-hover:text-[var(--pink)] transition-colors">{cleanDeckTitle(reviewer.title)}</h3>
                  <p className="text-[11.5px] text-[var(--text-secondary)] mt-1 flex items-center gap-1 truncate">
                    <Folder size={12} className="shrink-0" /> {getTopicTitle(reviewer.topic_id)} · {formatRelativeDate(reviewer.created_at)}
                  </p>
                  <p className="text-[11.5px] text-[var(--text-secondary)] truncate flex items-center gap-1">
                    <FileText size={12} className="shrink-0" /> {reviewer.source_file}
                  </p>
                  <div className="flex items-center gap-2 mt-auto pt-3">
                    {stats.map(s => <span key={s} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--rose-soft)] border border-[var(--border)]">{s}</span>)}
                    <div className="flex-1" />
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (await confirmDialog({ title: 'Delete this reviewer?', message: `"${reviewer.title}" will be removed from your library.`, confirmLabel: 'Delete', danger: true })) {
                          deleteReviewer(reviewer.id)
                          toast('Reviewer deleted', 'success')
                        }
                      }}
                      className="btn-icon p-1.5 hover:text-[var(--error)]"
                      aria-label="Delete reviewer"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/quiz', { state: quizStateFor(reviewer) }) }}
                      className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
                    >
                      <Brain size={13} /> Quiz
                    </button>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      ) : (
        <div className="fn-card flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center mb-4">
            <Library size={30} weight="duotone" />
          </div>
          {reviewers.length === 0 ? (
            <>
              <h3 className="font-heading font-semibold">No reviewers yet</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm mt-1 mb-5">Turn a topic or your uploaded notes into a study guide with flashcards and mnemonics, or a slide deck.</p>
              <button onClick={() => setIsGenerateModalOpen(true)} className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2"><Sparkles size={16} /> Make your first reviewer</button>
            </>
          ) : (
            <>
              <h3 className="font-heading font-semibold">Nothing matches</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Try another search or filter.</p>
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedReviewer && (
          <ReviewerDetail
            reviewer={selectedReviewer}
            onClose={() => setSelectedReviewer(null)}
            topicTitle={getTopicTitle(selectedReviewer.topic_id)}
            onQuiz={() => { navigate('/quiz', { state: quizStateFor(selectedReviewer) }); setSelectedReviewer(null) }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGenerateModalOpen && <GenerateReviewerModal onClose={() => setIsGenerateModalOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}

function GenerateReviewerModal({ onClose }: { onClose: () => void }) {
  const { isFrance, aiAssistantName } = usePersonalization()
  const { generateReviewer, generatePresentation, isGenerating } = useReviewerStore()
  const { topics, items } = useStudyBoxStore()

  const [generationSourceType, setGenerationSourceType] = useState<'topic' | 'uploaded'>(items.length > 0 ? 'uploaded' : 'topic')
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id || '')
  const [selectedUploadIds, setSelectedUploadIds] = useState<string[]>([])
  const [reviewerType, setReviewerType] = useState<'study_guide' | 'slides'>('study_guide')
  const [error, setError] = useState<string | null>(null)

  const handleGenerateReviewer = async () => {
    setError(null)
    if (generationSourceType === 'uploaded' && selectedUploadIds.length === 0) {
      setError('Select at least one file to make a reviewer from.')
      return
    }

    try {
      const sourceIds = generationSourceType === 'uploaded' ? selectedUploadIds : []
      const topicId = generationSourceType === 'topic' ? selectedTopicId : undefined
      if (reviewerType === 'study_guide') {
        await generateReviewer(sourceIds, topicId)
      } else {
        await generatePresentation(sourceIds, topicId)
      }
      onClose()
    } catch (err) {
      console.error(err)
      setError(isFrance ? "Couldn't make the reviewer, babe. Please try again." : "Couldn't generate the reviewer. Please try again.")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-[100]" onClick={() => !isGenerating && onClose()}>
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-[var(--card)] w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-fn-lg max-h-[92vh] overflow-y-auto custom-scrollbar"
      >
        <div className="px-6 pt-6 pb-4 flex items-start gap-3 border-b border-[var(--border)]">
          <div className="w-11 h-11 rounded-xl bg-[var(--rose-soft)] border border-[var(--border)] text-[var(--pink)] flex items-center justify-center shrink-0">
            <Sparkles size={22} weight="duotone" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading font-semibold text-[17px]">New Reviewer</h2>
            <p className="text-xs text-[var(--text-secondary)]">{aiAssistantName} turns your material into a study guide or slide deck.</p>
          </div>
          <button onClick={onClose} disabled={isGenerating} className="btn-icon p-2 -mr-1" aria-label="Close"><X size={18} /></button>
        </div>

        {isGenerating ? (
          <div className="py-14 px-6 flex flex-col items-center text-center gap-3">
            <CircleNotch size={30} className="animate-spin text-[var(--pink)]" />
            <p className="font-semibold">{aiAssistantName} is writing your {reviewerType === 'slides' ? 'slide deck' : 'study guide'}…</p>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs">This usually takes under a minute.</p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {error && <p className="px-3 py-2.5 rounded-xl bg-th-error/10 border border-th-error/25 text-[var(--error)] text-[13px]">{error}</p>}

            <div>
              <p className="text-[13px] font-medium mb-2">Format</p>
              <div className="grid grid-cols-2 gap-2.5">
                {([
                  ['study_guide', 'Study guide', 'Summary, key points, flashcards, mnemonics', BookOpen],
                  ['slides', 'Slide deck', 'Presentation with speaker notes', Presentation],
                ] as const).map(([id, title, sub, OptIcon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setReviewerType(id)}
                    className={cn('p-3.5 rounded-xl border text-left transition-colors', reviewerType === id ? 'border-[var(--pink)] bg-[var(--rose-soft)]' : 'border-[var(--border)] hover:bg-[var(--rose-soft)]')}
                  >
                    <OptIcon size={20} className="text-[var(--pink)] mb-1.5" weight={reviewerType === id ? 'fill' : 'regular'} />
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-snug">{sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[13px] font-medium mb-2">Source</p>
              <div className="flex p-1 rounded-full bg-[var(--bg)] border border-[var(--border)] mb-3">
                {([['uploaded', 'My Study Box'], ['topic', 'A subject topic']] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setGenerationSourceType(id)}
                    className={cn('flex-1 py-1.5 rounded-full text-[13px] font-medium transition-colors', generationSourceType === id ? 'bg-[var(--card)] text-[var(--pink)] shadow-fn' : 'text-[var(--text-secondary)]')}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {generationSourceType === 'topic' ? (
                <select
                  value={selectedTopicId}
                  onChange={e => setSelectedTopicId(e.target.value)}
                  className="fn-input rounded-xl bg-[var(--card)] py-2.5 text-sm"
                  aria-label="Subject topic"
                >
                  {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              ) : items.length === 0 ? (
                <p className="p-4 rounded-xl bg-[var(--rose-soft)] border border-[var(--border)] text-xs text-[var(--text-secondary)] text-center">
                  Your Study Box is empty. Upload notes there first, or pick a subject topic instead.
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto custom-scrollbar border border-[var(--border)] rounded-xl p-1.5 space-y-0.5">
                  {[...items].sort((a, b) => Number(isReferenceArticle(a)) - Number(isReferenceArticle(b))).map(item => {
                    const checked = selectedUploadIds.includes(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedUploadIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])}
                        className={cn('w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors', checked ? 'bg-[var(--rose-soft)]' : 'hover:bg-[var(--rose-soft)]')}
                      >
                        <span className={cn('w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center shrink-0', checked ? 'bg-[var(--pink)] border-[var(--pink)] text-white' : 'border-[var(--accent)]')}>
                          {checked && <Check size={11} weight="bold" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium truncate">{materialDisplayName(item)}</span>
                          <span className="block text-[11px] text-[var(--text-secondary)] truncate">{isReferenceArticle(item) ? 'Saved reference' : topics.find(t => t.id === item.topic_id)?.title || 'General'}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
              <button
                type="button"
                onClick={handleGenerateReviewer}
                disabled={generationSourceType === 'uploaded' && selectedUploadIds.length === 0}
                className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-40"
              >
                <Sparkles size={15} /> Generate
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export function ReviewerDetail({ reviewer, onClose, topicTitle, onQuiz }: {
  reviewer: ReviewerItem
  onClose: () => void
  topicTitle: string
  onQuiz: () => void
}) {
  const { isFrance, aiAssistantName } = usePersonalization()
  const deck = isDeck(reviewer)
  const [activeTab, setActiveTab] = useState<string>(deck ? 'slides' : 'summary')
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportOpen) return
    const close = (e: MouseEvent) => { if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [exportOpen])

  const tabs: { id: string; label: string; icon: Icon; count?: number }[] = deck
    ? [{ id: 'slides', label: 'Slides', icon: Presentation, count: reviewer.content.slides?.length }, { id: 'summary', label: 'Summary', icon: FileText }]
    : [
        { id: 'summary', label: 'Summary', icon: FileText },
        { id: 'key_points', label: 'Key points', icon: ListChecks, count: reviewer.content.key_points?.length },
        { id: 'flashcards', label: 'Flashcards', icon: Cards, count: reviewer.content.flashcards?.length },
        { id: 'mnemonics', label: 'Mnemonics', icon: RotateCcw, count: reviewer.content.mnemonics?.length },
      ]

  const exports = [
    { label: 'PDF', icon: Download, run: () => exportToPDF(reviewer), show: true },
    { label: 'Word document', icon: FileText, run: () => exportToDOCX(reviewer).catch(() => toast("Couldn't create the Word file. Please try again.", 'error')), show: true },
    { label: 'PowerPoint', icon: Presentation, run: () => exportToPPTX(reviewer), show: deck },
    { label: 'Print flashcards', icon: Printer, run: () => printFlashcards(reviewer), show: (reviewer.content.flashcards?.length ?? 0) > 0 },
  ].filter(e => e.show)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        onClick={e => e.stopPropagation()}
        className="bg-[var(--card)] w-full max-w-4xl h-[92vh] sm:h-[86vh] rounded-t-3xl sm:rounded-2xl shadow-fn-lg border border-[var(--border)] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start gap-3.5 border-b border-[var(--border)]">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tintFor(reviewer.id)} border border-[var(--border)] text-[var(--pink)] flex items-center justify-center shrink-0`}>
            {deck ? <Presentation size={22} weight="duotone" /> : <BookOpen size={22} weight="duotone" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading font-semibold text-[16px] leading-snug line-clamp-2">{cleanDeckTitle(reviewer.title)}</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{topicTitle} · {formatRelativeDate(reviewer.created_at)} · from {reviewer.source_file}</p>
          </div>
          <button onClick={onClose} className="btn-icon p-2 -mr-1" aria-label="Close"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 flex gap-1.5 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium border whitespace-nowrap transition-colors',
                activeTab === tab.id ? 'bg-[var(--pink)] border-[var(--pink)] text-white' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]'
              )}
            >
              <tab.icon size={14} /> {tab.label} {tab.count !== undefined && <span className="opacity-75">{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {activeTab === 'summary' && (
                <div className="space-y-5">
                  <div className="text-[14.5px] leading-relaxed"><MarkdownText content={reviewer.content.summary} /></div>
                  {reviewer.content.simplified_explanation && (
                    <div className="rounded-2xl bg-[var(--rose-soft)] border border-[var(--border)] p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <img src={isFrance ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'} alt={aiAssistantName} className="w-6 h-6 rounded-full object-cover" />
                        <p className="text-xs font-semibold text-[var(--pink)]">{isFrance ? "Doc Uno's simple explanation" : `${aiAssistantName}'s simple explanation`}</p>
                      </div>
                      <div className="text-sm leading-relaxed"><MarkdownText content={reviewer.content.simplified_explanation} /></div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'key_points' && (
                <ol className="space-y-2">
                  {reviewer.content.key_points.map((point, i) => (
                    <li key={i} className="flex gap-3 p-3.5 rounded-xl border border-[var(--border)]">
                      <span className="w-6 h-6 rounded-full bg-[var(--rose-soft)] border border-[var(--border)] text-[var(--pink)] text-xs font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="text-[14px] leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ol>
              )}

              {activeTab === 'flashcards' && (
                reviewer.content.flashcards.length === 0
                  ? <p className="text-sm text-[var(--text-secondary)] text-center py-10">No flashcards in this reviewer.</p>
                  : <FlashcardDeck cards={reviewer.content.flashcards} />
              )}

              {activeTab === 'mnemonics' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reviewer.content.mnemonics.length === 0 && <p className="text-sm text-[var(--text-secondary)] text-center py-10 md:col-span-2">No mnemonics in this reviewer.</p>}
                  {reviewer.content.mnemonics.map((m) => (
                    <div key={m.id} className="p-4 rounded-2xl border border-[var(--border)]">
                      <h4 className="font-heading font-semibold text-[15px] text-[var(--pink)] mb-2 flex items-center gap-2"><Zap size={16} /> {m.title}</h4>
                      <div className="space-y-1.5">
                        {m.content.split('\n').filter(Boolean).map((line, idx) => (
                          <p key={idx} className="text-[13.5px] leading-relaxed flex gap-2"><span className="text-[var(--pink)]">•</span> {line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'slides' && reviewer.content.slides && <SlideViewer slides={reviewer.content.slides} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="px-5 py-3.5 border-t border-[var(--border)] flex items-center gap-2">
          <div className="relative" ref={exportRef}>
            <button onClick={() => setExportOpen(o => !o)} className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5">
              <Download size={14} /> Export <CaretDown size={12} className={cn('transition-transform', exportOpen && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {exportOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute bottom-full left-0 mb-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-fn-lg p-1 z-10"
                >
                  {exports.map(ex => (
                    <button key={ex.label} onClick={() => { ex.run(); setExportOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] hover:bg-[var(--rose-soft)] text-left">
                      <ex.icon size={15} className="text-[var(--pink)]" /> {ex.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1" />
          <button onClick={onQuiz} className="btn-primary px-5 py-2 text-xs flex items-center gap-1.5">
            <Brain size={14} /> Quiz me on this
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// One card at a time with flip, plus a grid overview
function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const card = cards[index]
  const go = (next: number) => { setIndex(next); setFlipped(false) }

  return (
    <div className="max-w-xl mx-auto">
      <button onClick={() => setFlipped(f => !f)} className="w-full h-60 perspective block" aria-label={flipped ? 'Show question' : 'Show answer'}>
        <div className={cn('relative w-full h-full transition-all duration-500 transform-style-3d', flipped && 'rotate-y-180')}>
          <div className="absolute inset-0 backface-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-fn p-6 flex flex-col items-center justify-center text-center overflow-y-auto">
            <p className="text-[11px] font-semibold text-[var(--pink)] mb-2">Question</p>
            <p className="text-[16px] font-medium leading-relaxed">{card.front}</p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-4">Tap to flip</p>
          </div>
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl bg-[var(--pink)] text-white shadow-fn-md p-6 flex flex-col items-center justify-center text-center overflow-y-auto">
            <p className="text-[11px] font-semibold opacity-80 mb-2">Answer</p>
            <p className="text-[16px] font-medium leading-relaxed">{card.back}</p>
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between mt-4">
        <button onClick={() => go(index - 1)} disabled={index === 0} className="btn-secondary px-4 py-2 text-xs flex items-center gap-1 disabled:opacity-30"><CaretLeft size={14} /> Previous</button>
        <span className="text-sm text-[var(--text-secondary)]">{index + 1} / {cards.length}</span>
        <button onClick={() => go(index + 1)} disabled={index === cards.length - 1} className="btn-primary px-4 py-2 text-xs flex items-center gap-1 disabled:opacity-30">Next <CaretRight size={14} /></button>
      </div>
    </div>
  )
}

function SlideViewer({ slides }: { slides: PresentationSlide[] }) {
  const { isFrance, aiAssistantName } = usePersonalization()
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0)

  if (!slides || slides.length === 0) return <p className="text-center text-sm text-[var(--text-secondary)] py-10">No slides found.</p>

  const currentSlide = slides[currentSlideIdx]

  return (
    <div className="space-y-4">
      <div className="aspect-[16/9] w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-fn overflow-hidden flex flex-col">
        <div className="h-1.5 bg-[var(--pink)]" />
        <div className="flex-1 p-6 sm:p-9 overflow-y-auto">
          <h4 className="font-heading font-semibold text-xl sm:text-2xl text-[var(--pink)] mb-4">{currentSlide.title.replace(/^\s*slide\s*\d+\s*[:.\-–—]\s*/i, '')}</h4>
          {currentSlide.paragraph && <p className="text-sm sm:text-[15px] leading-relaxed mb-3">{currentSlide.paragraph}</p>}
          <ul className="space-y-2.5">
            {currentSlide.bullet_points.map((pt, idx) => (
              <li key={idx} className="text-sm sm:text-[15px] flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--pink)] shrink-0 mt-2" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button disabled={currentSlideIdx === 0} onClick={() => setCurrentSlideIdx(i => i - 1)} className="btn-secondary px-4 py-2 text-xs flex items-center gap-1 disabled:opacity-30">
          <CaretLeft size={14} /> Previous
        </button>
        <div className="flex gap-1 flex-wrap justify-center">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlideIdx(idx)}
              aria-label={`Slide ${idx + 1}`}
              className={cn('h-2 rounded-full transition-all', idx === currentSlideIdx ? 'bg-[var(--pink)] w-5' : 'bg-[var(--border)] w-2')}
            />
          ))}
        </div>
        <button disabled={currentSlideIdx === slides.length - 1} onClick={() => setCurrentSlideIdx(i => i + 1)} className="btn-primary px-4 py-2 text-xs flex items-center gap-1 disabled:opacity-30">
          Next <CaretRight size={14} />
        </button>
      </div>

      {currentSlide.presenter_notes && (
        <div className="rounded-2xl bg-[var(--rose-soft)] border border-[var(--border)] p-4">
          <p className="text-xs font-semibold text-[var(--pink)] mb-1.5">{isFrance ? "Doc Uno's speaker notes" : `${aiAssistantName}'s speaker notes`}</p>
          <p className="text-[13.5px] leading-relaxed">{currentSlide.presenter_notes}</p>
        </div>
      )}
    </div>
  )
}
