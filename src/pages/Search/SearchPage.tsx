import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MagnifyingGlass, BookOpen, Books, NotePencil, Brain, Globe, ClockCounterClockwise, X, ArrowRight,
  ShieldCheck, ArrowSquareOut, Heart, Check, CircleNotch, Sparkle, CaretDown,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { toast } from '@/stores/feedbackStore'
import { usePersonalization } from '@/hooks/usePersonalization'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { useViewerStore } from '@/stores/viewerStore'
import { useReviewerStore } from '@/stores/reviewerStore'
import { useNotesStore } from '@/stores/notesStore'
import { useQuizStore } from '@/stores/quizStore'
import { useTrustedSourceSearch } from '@/hooks/useTrustedSourceSearch'
import { cn, formatRelativeDate } from '@/lib/utils'
import type { KnowledgeSearchResult } from '@/types'

type Tab = 'all' | 'materials' | 'reviewers' | 'notes' | 'questions' | 'sources'

const TABS: { id: Tab; label: string; icon: Icon }[] = [
  { id: 'all', label: 'All', icon: MagnifyingGlass },
  { id: 'materials', label: 'Materials', icon: BookOpen },
  { id: 'reviewers', label: 'Reviewers', icon: Books },
  { id: 'notes', label: 'Notes', icon: NotePencil },
  { id: 'questions', label: 'Questions', icon: Brain },
  { id: 'sources', label: 'Trusted Sources', icon: Globe },
]

const RECENT_KEY = 'fn-recent-searches'
const MAX_RECENT = 6
const PER_GROUP_IN_ALL = 4

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
function storeRecent(list: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)) } catch { /* storage unavailable */ }
}

type Hit = { id: string; title: string; snippet: string; meta: string; open?: () => void }

// Short excerpt around the first match so results show why they matched
function excerpt(text: string, q: string, length = 140) {
  const clean = text.replace(/\s+/g, ' ').replace(/[#*_`>]/g, '').trim()
  const at = clean.toLowerCase().indexOf(q.toLowerCase())
  if (at < 0) return clean.slice(0, length)
  const start = Math.max(0, at - 40)
  return (start > 0 ? '…' : '') + clean.slice(start, start + length) + (start + length < clean.length ? '…' : '')
}

// One result group on the "All" tab; "See all" jumps to that group's tab
function Section({ title, icon: SectionIcon, count, target, onSeeAll, children }: {
  title: string
  icon: Icon
  count: number
  target: Tab
  onSeeAll: (tab: Tab) => void
  children: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <section className="fn-card p-3">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <h3 className="text-sm font-semibold flex items-center gap-2"><SectionIcon size={16} className="text-[var(--pink)]" /> {title} <span className="text-[var(--text-secondary)] font-normal">({count})</span></h3>
        {count > PER_GROUP_IN_ALL && (
          <button onClick={() => onSeeAll(target)} className="text-xs font-medium text-[var(--pink)] hover:underline">See all</button>
        )}
      </div>
      {children}
    </section>
  )
}

export default function SearchPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const tab = (params.get('tab') as Tab) || 'all'
  const [draft, setDraft] = useState(q)
  // Keep the box in step with ?q= when a search arrives from elsewhere (e.g. the top bar while already here)
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    setDraft(q)
  }
  const [recent, setRecent] = useState<string[]>(loadRecent)
  const [openQuestion, setOpenQuestion] = useState<string | null>(null)

  const { items, topics, savedKnowledge, saveKnowledge, removeKnowledge } = useStudyBoxStore()
  const { reviewers } = useReviewerStore()
  const { openMaterial, openReviewer } = useViewerStore()
  const { notes } = useNotesStore()
  const { quizzes } = useQuizStore()
  const sources = useTrustedSourceSearch()
  const { knowledgeGardenName } = usePersonalization()
  const [savingIds, setSavingIds] = useState<string[]>([])

  // Arriving on the Trusted Sources tab with a query (?tab=sources&q=...) runs the web search
  useEffect(() => {
    if (tab === 'sources' && q.trim() && sources.searchedQuery !== q && !sources.isSearching) sources.search(q)
  }, [tab, q, sources])

  const setTab = (next: Tab) => {
    const p = new URLSearchParams(params)
    p.set('tab', next)
    setParams(p, { replace: true })
  }

  const submit = (value: string, nextTab: Tab = tab) => {
    const term = value.trim()
    setDraft(term)
    const p = new URLSearchParams()
    if (term) p.set('q', term)
    p.set('tab', nextTab)
    setParams(p)
    if (!term) return
    const nextRecent = [term, ...recent.filter(r => r.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT)
    setRecent(nextRecent)
    storeRecent(nextRecent)
    if (nextTab === 'sources') sources.search(term)
  }

  const term = q.trim().toLowerCase()
  const matches = (...fields: (string | undefined | null)[]) => fields.some(f => f?.toLowerCase().includes(term))
  const topicName = (id: string | null) => topics.find(t => t.id === id)?.title

  const groups = useMemo(() => {
    if (!term) return null
    const materials: Hit[] = items
      .filter(i => matches(i.file_name, i.summary, i.extracted_text))
      .map(i => ({
        id: i.id,
        title: i.file_name.replace(/\.[^.]+$/, ''),
        snippet: excerpt(i.summary || i.extracted_text || '', term),
        meta: `${topicName(i.topic_id) || 'Study material'} · ${formatRelativeDate(i.created_at)}`,
        open: () => openMaterial(i),
      }))
    const reviewerHits: Hit[] = reviewers
      .filter(r => matches(r.title, r.source_file, r.content?.summary, ...(r.content?.key_points || [])))
      .map(r => ({
        id: r.id,
        title: r.title,
        snippet: excerpt(r.content?.summary || (r.content?.key_points || []).join(' ') || '', term),
        meta: `Reviewer · ${formatRelativeDate(r.created_at)}`,
        open: () => openReviewer(r),
      }))
    const noteHits: Hit[] = notes
      .filter(n => matches(n.title, n.kind === 'handwriting' ? '' : n.content))
      .map(n => ({
        id: n.id,
        title: n.title || 'Untitled note',
        snippet: n.kind === 'handwriting' ? 'Handwritten note' : excerpt(n.content, term),
        meta: `${topicName(n.topic_id) || 'Note'} · updated ${formatRelativeDate(n.updated_at).toLowerCase()}`,
        open: () => navigate('/notes', { state: { openNoteId: n.id } }),
      }))
    const questionHits = quizzes.flatMap(quiz =>
      (quiz.questions || [])
        .filter(qq => qq.id !== 'error-q' && matches(qq.question, qq.rationale))
        .map(qq => ({ quiz, question: qq }))
    )
    return { materials, reviewers: reviewerHits, notes: noteHits, questions: questionHits }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, items, reviewers, notes, quizzes, topics])

  const counts: Partial<Record<Tab, number>> = groups
    ? { materials: groups.materials.length, reviewers: groups.reviewers.length, notes: groups.notes.length, questions: groups.questions.length }
    : {}
  const totalMine = Object.values(counts).reduce((a, b) => a + (b || 0), 0)

  const isSaved = (r: KnowledgeSearchResult) => savedKnowledge.some(k => k.id === r.id || k.url === r.url)
  const toggleSave = async (r: KnowledgeSearchResult) => {
    const saved = savedKnowledge.find(k => k.id === r.id || k.url === r.url)
    if (saved) { removeKnowledge(saved.id); return }
    setSavingIds(prev => [...prev, r.id])
    try {
      await saveKnowledge(r)
      toast(`Saved to ${knowledgeGardenName}`, 'success')
    } catch (err) {
      console.error('Save reference failed:', err)
      toast(err instanceof Error && err.message ? err.message : "Couldn't save the reference. Please try again.", 'error')
    }
    finally { setSavingIds(prev => prev.filter(id => id !== r.id)) }
  }

  const renderHits = (hits: Hit[], icon: Icon, limit?: number) => {
    const HitIcon = icon
    return (limit ? hits.slice(0, limit) : hits).map(hit => (
      <button key={hit.id} onClick={hit.open} className="w-full text-left flex gap-3 p-3 rounded-xl hover:bg-[var(--rose-soft)] transition-colors">
        <div className="w-9 h-9 rounded-xl bg-[var(--rose-soft)] border border-[var(--border)] text-[var(--pink)] flex items-center justify-center shrink-0">
          <HitIcon size={17} />
        </div>
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium truncate">{hit.title}</p>
          {hit.snippet && <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{hit.snippet}</p>}
          <p className="text-[10.5px] text-th-text-secondary/80 mt-0.5">{hit.meta}</p>
        </div>
      </button>
    ))
  }

  const renderQuestions = (limit?: number) => (groups?.questions || []).slice(0, limit ?? Infinity).map(({ quiz, question }) => {
    const key = `${quiz.id}-${question.id}`
    const open = openQuestion === key
    const answer = Array.isArray(question.correct_answer) ? question.correct_answer.join(', ') : question.correct_answer
    return (
      <div key={key} className="rounded-xl hover:bg-[var(--rose-soft)] transition-colors">
        <button onClick={() => setOpenQuestion(open ? null : key)} className="w-full text-left flex gap-3 p-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--rose-soft)] border border-[var(--border)] text-[var(--pink)] flex items-center justify-center shrink-0">
            <Brain size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium line-clamp-2">{question.question}</p>
            <p className="text-[10.5px] text-th-text-secondary/80 mt-0.5">From {quiz.title} · {formatRelativeDate(quiz.created_at)}</p>
          </div>
          <CaretDown size={15} className={cn('text-[var(--text-secondary)] mt-1 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="px-3 pb-3 pl-[60px] text-[13px] space-y-1.5">
            <p><span className="font-semibold text-[var(--success)]">Answer:</span> {answer}</p>
            {question.rationale && <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{question.rationale.replace(/[#*]/g, '')}</p>}
          </div>
        )}
      </div>
    )
  })

  return (
    <div className="page-container max-w-5xl">
      <PageHeader icon={MagnifyingGlass} title="Search" subtitle="Find anything in your notes, materials, reviewers and quizzes — or search trusted medical sources." />

      <form onSubmit={e => { e.preventDefault(); submit(draft) }} className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-full pl-5 pr-2 py-2 shadow-fn focus-within:ring-2 focus-within:ring-th-pink/25">
        <MagnifyingGlass size={18} className="text-[var(--text-secondary)] shrink-0" />
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={tab === 'sources' ? 'Search WHO, CDC, NIH, PubMed and more...' : 'Search anything...'}
          className="flex-1 bg-transparent outline-none text-[15px] py-1.5 min-w-0"
          autoFocus
        />
        {draft && (
          <button type="button" onClick={() => { setDraft(''); submit('') }} className="btn-icon p-1.5" aria-label="Clear search"><X size={16} /></button>
        )}
        <button type="submit" className="btn-primary px-5 py-2 text-sm flex items-center gap-1.5">
          Search <ArrowRight size={15} />
        </button>
      </form>

      <div className="flex gap-1.5 overflow-x-auto py-4 -mx-1 px-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); if (t.id === 'sources' && q && sources.searchedQuery !== q) sources.search(q) }}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium border whitespace-nowrap transition-colors',
              tab === t.id ? 'bg-[var(--pink)] border-[var(--pink)] text-white' : 'border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]'
            )}
          >
            <t.icon size={15} />
            {t.label}
            {counts[t.id] !== undefined && <span className="opacity-75">{counts[t.id]}</span>}
          </button>
        ))}
      </div>

      {/* Empty query: recent searches + topic shortcuts */}
      {!term && tab !== 'sources' && (
        <div className="grid md:grid-cols-2 gap-5">
          <section className="fn-card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><ClockCounterClockwise size={16} className="text-[var(--pink)]" /> Recent Searches</h3>
              {recent.length > 0 && (
                <button onClick={() => { setRecent([]); storeRecent([]) }} className="text-xs text-[var(--text-secondary)] hover:text-[var(--pink)]">Clear</button>
              )}
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] py-2">Your searches will show up here.</p>
            ) : recent.map(r => (
              <button key={r} onClick={() => submit(r)} className="w-full text-left flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--rose-soft)] text-sm">
                <ClockCounterClockwise size={15} className="text-[var(--text-secondary)]" /> {r}
              </button>
            ))}
          </section>
          <section className="fn-card p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Sparkle size={16} className="text-[var(--pink)]" /> Your Topics</h3>
            <div className="flex flex-wrap gap-2">
              {topics.map(t => (
                <button key={t.id} onClick={() => submit(t.title)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--rose-soft)] border border-[var(--border)] hover:border-[var(--accent)]">
                  {t.title}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Own content */}
      {term && groups && tab !== 'sources' && (
        <div className="space-y-4">
          {tab === 'all' && (
            <>
              <Section onSeeAll={setTab} title="Study Materials" icon={BookOpen} count={groups.materials.length} target="materials">{renderHits(groups.materials, BookOpen, PER_GROUP_IN_ALL)}</Section>
              <Section onSeeAll={setTab} title="Reviewers" icon={Books} count={groups.reviewers.length} target="reviewers">{renderHits(groups.reviewers, Books, PER_GROUP_IN_ALL)}</Section>
              <Section onSeeAll={setTab} title="Notes" icon={NotePencil} count={groups.notes.length} target="notes">{renderHits(groups.notes, NotePencil, PER_GROUP_IN_ALL)}</Section>
              <Section onSeeAll={setTab} title="Quiz Questions" icon={Brain} count={groups.questions.length} target="questions">{renderQuestions(PER_GROUP_IN_ALL)}</Section>
            </>
          )}
          {tab === 'materials' && <div className="fn-card p-3">{renderHits(groups.materials, BookOpen)}</div>}
          {tab === 'reviewers' && <div className="fn-card p-3">{renderHits(groups.reviewers, Books)}</div>}
          {tab === 'notes' && <div className="fn-card p-3">{renderHits(groups.notes, NotePencil)}</div>}
          {tab === 'questions' && <div className="fn-card p-3">{renderQuestions()}</div>}

          {(tab === 'all' ? totalMine === 0 : counts[tab] === 0) && (
            <p className="text-center text-sm text-[var(--text-secondary)] py-6">Nothing in your library matches “{q}”.</p>
          )}

          <button
            onClick={() => { setTab('sources'); if (sources.searchedQuery !== q) sources.search(q) }}
            className="w-full fn-card p-4 flex items-center gap-3 text-left hover:border-[var(--accent)]"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center"><Globe size={20} /></div>
            <div className="flex-1">
              <p className="text-sm font-medium">Search trusted sources for “{q}”</p>
              <p className="text-xs text-[var(--text-secondary)]">WHO, CDC, NIH, PubMed, Mayo Clinic, DOH Philippines and more</p>
            </div>
            <ArrowRight size={16} className="text-[var(--pink)]" />
          </button>
        </div>
      )}

      {/* Trusted sources (web) */}
      {tab === 'sources' && (
        <div className="space-y-3">
          {sources.isSearching ? (
            <div className="flex flex-col items-center py-16 text-center">
              <CircleNotch size={30} className="animate-spin text-[var(--pink)] mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">Searching trusted nursing references…</p>
            </div>
          ) : sources.results.length > 0 ? (
            <>
              {sources.results.map((r, i) => (
                <motion.article key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} className="fn-card p-5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[var(--rose-soft)] text-[var(--pink)] capitalize">{r.category}</span>
                    {r.is_trusted && <span className="text-[10.5px] font-semibold text-[var(--success)] flex items-center gap-1"><ShieldCheck size={12} weight="fill" /> Trusted</span>}
                    <span className="text-[11px] text-[var(--text-secondary)] truncate">{r.source}</span>
                  </div>
                  <h3 className="font-heading font-semibold text-[15px]">{r.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{r.description}</p>
                  <div className="flex gap-2 mt-3">
                    <a href={r.url} target="_blank" rel="noreferrer" className="btn-primary px-4 py-1.5 text-xs flex items-center gap-1.5">
                      <ArrowSquareOut size={13} /> Read
                    </a>
                    <button onClick={() => toggleSave(r)} disabled={savingIds.includes(r.id)} className={cn('btn-secondary px-4 py-1.5 text-xs flex items-center gap-1.5', isSaved(r) && 'text-[var(--success)]')}>
                      {savingIds.includes(r.id) ? <><CircleNotch size={13} className="animate-spin" /> Saving</>
                        : isSaved(r) ? <><Check size={13} weight="bold" /> Saved to Garden</>
                        : <><Heart size={13} /> Save to Garden</>}
                    </button>
                  </div>
                </motion.article>
              ))}
              <div className="flex justify-center pt-2">
                <button onClick={() => sources.search(sources.searchedQuery, true)} className="btn-secondary px-6 py-2.5 text-sm flex items-center gap-2">
                  <Sparkle size={15} /> Load more references
                </button>
              </div>
            </>
          ) : sources.searchedQuery ? (
            <p className="text-center text-sm text-[var(--text-secondary)] py-10">No references found for “{sources.searchedQuery}”. Try a broader nursing concept.</p>
          ) : (
            <div className="fn-card p-6 text-center">
              <Globe size={30} weight="duotone" className="mx-auto text-[var(--pink)] mb-2" />
              <p className="text-sm font-medium">Search evidence-based nursing and medical sources</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Save what you find to your Knowledge Garden to study it later.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
