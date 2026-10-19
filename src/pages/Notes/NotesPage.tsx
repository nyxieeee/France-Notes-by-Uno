import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  NotePencil, Plus, MagnifyingGlass, PushPin, Trash, ArrowLeft, Eye, PencilSimple, CheckCircle, CircleNotch, Folder, Scribble,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import HandwritingCanvas from '@/components/notes/HandwritingCanvas'
import PageHeader from '@/components/shared/PageHeader'
import MarkdownText from '@/components/shared/MarkdownText'
import { useNotesStore } from '@/stores/notesStore'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { cn, formatRelativeDate } from '@/lib/utils'
import type { Note, HandwritingDrawing } from '@/types'

const SAVE_DELAY_MS = 600

export default function NotesPage() {
  const { notes, isLoading, error, fetchNotes, createNote, updateNote, deleteNote } = useNotesStore()
  const { topics } = useStudyBoxStore()
  const location = useLocation()

  const [query, setQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState<string>('all')
  const [activeId, setActiveId] = useState<string | null>((location.state as { openNoteId?: string } | null)?.openNoteId ?? null)

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const topicName = (id: string | null) => topics.find(t => t.id === id)?.title

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes.filter(n =>
      (topicFilter === 'all' || n.topic_id === topicFilter) &&
      (!q || n.title.toLowerCase().includes(q) || (n.kind !== 'handwriting' && n.content.toLowerCase().includes(q)))
    )
  }, [notes, query, topicFilter])

  // Only show topic chips that actually have notes
  const usedTopics = topics.filter(t => notes.some(n => n.topic_id === t.id))
  const active = notes.find(n => n.id === activeId) || null

  const handleNew = async (kind: Note['kind']) => {
    const note = await createNote(kind, topicFilter === 'all' ? null : topicFilter)
    if (note) setActiveId(note.id)
  }

  return (
    <div className="page-container max-w-7xl">
      <PageHeader
        icon={NotePencil}
        title="Notes"
        subtitle="Type or handwrite your own notes, filed under your study topics."
        actions={<>
          <button onClick={() => handleNew('handwriting')} className="btn-secondary px-4 py-2.5 text-sm flex items-center gap-2">
            <Scribble size={17} /> Handwritten
          </button>
          <button onClick={() => handleNew('text')} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
            <Plus size={16} weight="bold" /> New Note
          </button>
        </>}
      />

      {error && (
        <p className="mb-4 px-4 py-3 rounded-xl bg-th-error/10 border border-th-error/25 text-[var(--error)] text-sm">
          Notes couldn't be loaded or saved ({error}). If this is the first time using Notes, the database table may still need to be set up.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-5">
        {/* List */}
        <section className={cn('fn-card p-4 flex flex-col min-h-[60vh]', active && 'hidden lg:flex')}>
          <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-full px-3.5 py-2 mb-3">
            <MagnifyingGlass size={16} className="text-[var(--text-secondary)]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search notes..."
              className="bg-transparent outline-none text-sm w-full placeholder:text-th-text-secondary/70"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap mb-3">
            {[{ id: 'all', title: 'All' }, ...usedTopics].map(t => (
              <button
                key={t.id}
                onClick={() => setTopicFilter(t.id)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  topicFilter === t.id
                    ? 'bg-[var(--pink)] border-[var(--pink)] text-white'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]'
                )}
              >
                {t.title}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar -mx-1 px-1 space-y-1">
            {isLoading && notes.length === 0 ? (
              <div className="flex justify-center py-10 text-[var(--pink)]"><CircleNotch size={22} className="animate-spin" /></div>
            ) : visible.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center mb-3">
                  <NotePencil size={26} weight="duotone" />
                </div>
                <p className="text-sm font-medium">{notes.length === 0 ? 'No notes yet' : 'No matching notes'}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {notes.length === 0 ? 'Start a typed note, or a handwritten page for your Apple Pencil.' : 'Try another search or topic.'}
                </p>
              </div>
            ) : (
              visible.map(note => (
                <button
                  key={note.id}
                  onClick={() => setActiveId(note.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-xl flex gap-3 items-start transition-colors',
                    note.id === activeId ? 'bg-[var(--secondary-bg)]' : 'hover:bg-[var(--rose-soft)]'
                  )}
                >
                  <div className="w-9 h-9 rounded-xl bg-[var(--rose-soft)] border border-[var(--border)] text-[var(--pink)] flex items-center justify-center shrink-0">
                    {note.kind === 'handwriting' ? <Scribble size={17} /> : <NotePencil size={17} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium truncate flex items-center gap-1.5">
                      {note.is_pinned && <PushPin size={12} weight="fill" className="text-[var(--pink)] shrink-0" />}
                      {note.title || 'Untitled note'}
                    </p>
                    <p className="text-[11.5px] text-[var(--text-secondary)] truncate">
                      {note.kind === 'handwriting'
                        ? `Handwritten · ${note.drawing?.pages ?? 1} page${(note.drawing?.pages ?? 1) > 1 ? 's' : ''}`
                        : note.content.replace(/[#*_>`-]/g, '').trim().slice(0, 80) || 'Empty note'}
                    </p>
                    <p className="text-[10.5px] text-th-text-secondary/80 mt-0.5">
                      {topicName(note.topic_id) ? `${topicName(note.topic_id)} · ` : ''}Updated {formatRelativeDate(note.updated_at).toLowerCase()}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Editor */}
        {active?.kind === 'handwriting' ? (
          <HandwritingEditor
            key={active.id}
            note={active}
            topics={topics}
            onBack={() => setActiveId(null)}
            onSave={updates => updateNote(active.id, updates)}
            onDelete={() => { deleteNote(active.id); setActiveId(null) }}
          />
        ) : active ? (
          <NoteEditor
            key={active.id}
            note={active}
            topics={topics}
            onBack={() => setActiveId(null)}
            onSave={updates => updateNote(active.id, updates)}
            onDelete={() => { deleteNote(active.id); setActiveId(null) }}
          />
        ) : (
          <section className="fn-card hidden lg:flex flex-col items-center justify-center text-center p-10 min-h-[60vh]">
            <div className="w-16 h-16 rounded-2xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center mb-4">
              <NotePencil size={30} weight="duotone" />
            </div>
            <p className="font-heading font-semibold">Pick a note or start a new one</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xs">Notes support Markdown — use # for headings, - for bullets and **bold** for key terms.</p>
          </section>
        )}
      </div>
    </div>
  )
}

type NoteUpdates = Partial<Pick<Note, 'title' | 'content' | 'drawing' | 'topic_id' | 'is_pinned'>>
type EditorProps = {
  note: Note
  topics: { id: string; title: string }[]
  onBack: () => void
  onSave: (updates: NoteUpdates) => void
  onDelete: () => void
}

// Debounced autosave shared by both editors; flushes on unmount so nothing is lost when switching notes
function useAutosave(onSave: (updates: NoteUpdates) => void) {
  const [saveState, setSaveState] = useState<'saved' | 'pending'>('saved')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<NoteUpdates | null>(null)

  const flush = () => {
    if (timer.current) clearTimeout(timer.current)
    if (pending.current) {
      onSave(pending.current)
      pending.current = null
      setSaveState('saved')
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => flush(), [])

  const queue = (updates: NoteUpdates) => {
    pending.current = { ...pending.current, ...updates }
    setSaveState('pending')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY_MS)
  }

  return { saveState, queue, flush }
}

function EditorBar({ note, topics, saveState, onBack, onSave, onDelete, children }: Omit<EditorProps, 'onBack'> & {
  saveState: 'saved' | 'pending'
  onBack: () => void
  children?: ReactNode
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
      <button onClick={onBack} className="btn-icon lg:hidden" aria-label="Back to notes">
        <ArrowLeft size={18} />
      </button>

      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg)] border border-[var(--border)] rounded-full pl-2.5 pr-1 py-0.5">
        <Folder size={14} className="text-[var(--pink)]" />
        <select
          value={note.topic_id ?? ''}
          onChange={e => onSave({ topic_id: e.target.value || null })}
          className="bg-transparent outline-none py-1 pr-1 max-w-[130px] sm:max-w-[220px]"
          aria-label="Topic"
        >
          <option value="">No topic</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      <span className="ml-auto text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
        {saveState === 'pending'
          ? <><CircleNotch size={12} className="animate-spin" /> Saving</>
          : <><CheckCircle size={12} weight="fill" className="text-[var(--success)]" /> Saved</>}
      </span>
      {children}
      <button
        onClick={() => onSave({ is_pinned: !note.is_pinned })}
        className={cn('btn-icon', note.is_pinned && 'text-[var(--pink)]')}
        aria-label={note.is_pinned ? 'Unpin note' : 'Pin note'}
        title={note.is_pinned ? 'Unpin' : 'Pin'}
      >
        <PushPin size={18} weight={note.is_pinned ? 'fill' : 'regular'} />
      </button>
      <button
        onClick={() => { if (confirm('Delete this note? This can’t be undone.')) onDelete() }}
        className="btn-icon hover:text-[var(--error)]"
        aria-label="Delete note"
        title="Delete"
      >
        <Trash size={18} />
      </button>
    </div>
  )
}

function HandwritingEditor({ note, topics, onBack, onSave, onDelete }: EditorProps) {
  const [title, setTitle] = useState(note.title)
  const { saveState, queue, flush } = useAutosave(onSave)
  const drawing: HandwritingDrawing = note.drawing ?? { paper: 'lined', pages: 1, strokes: [] }

  return (
    <section className="fn-card flex flex-col min-h-[60vh] overflow-hidden">
      <EditorBar note={note} topics={topics} saveState={saveState} onBack={() => { flush(); onBack() }} onSave={onSave} onDelete={onDelete} />
      <div className="p-4 sm:p-6 bg-th-bg/60 flex-1">
        <input
          value={title}
          onChange={e => { setTitle(e.target.value); queue({ title: e.target.value }) }}
          placeholder="Untitled handwritten note"
          className="w-full bg-transparent outline-none text-2xl font-heading font-semibold placeholder:text-th-text-secondary/50 mb-3"
        />
        <HandwritingCanvas drawing={drawing} onChange={next => queue({ drawing: next })} />
      </div>
    </section>
  )
}

function NoteEditor({ note, topics, onBack, onSave, onDelete }: EditorProps) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [preview, setPreview] = useState(false)
  const { saveState, queue, flush } = useAutosave(onSave)

  return (
    <section className="fn-card flex flex-col min-h-[60vh] overflow-hidden">
      <EditorBar note={note} topics={topics} saveState={saveState} onBack={() => { flush(); onBack() }} onSave={onSave} onDelete={onDelete}>
        <button
          onClick={() => setPreview(p => !p)}
          className="btn-icon"
          aria-label={preview ? 'Edit note' : 'Preview note'}
          title={preview ? 'Edit' : 'Preview'}
        >
          {preview ? <PencilSimple size={18} /> : <Eye size={18} />}
        </button>
      </EditorBar>

      <div className="flex-1 flex flex-col p-5 sm:p-7">
        <input
          value={title}
          onChange={e => { setTitle(e.target.value); queue({ title: e.target.value }) }}
          placeholder="Untitled note"
          className="bg-transparent outline-none text-2xl font-heading font-semibold placeholder:text-th-text-secondary/50 mb-1"
        />
        <p className="text-[11px] text-[var(--text-secondary)] mb-4">Created {formatRelativeDate(note.created_at).toLowerCase()}</p>

        {preview ? (
          <div className="flex-1 text-sm leading-relaxed">
            {content.trim() ? <MarkdownText content={content} /> : <p className="text-[var(--text-secondary)]">Nothing to preview yet.</p>}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); queue({ content: e.target.value }) }}
            placeholder={'Start writing...\n\n# Key points\n- Normal K+ is 3.5–5.0 mEq/L\n- **Priority:** airway, breathing, circulation'}
            className="flex-1 min-h-[45vh] bg-transparent outline-none resize-none text-[14.5px] leading-relaxed placeholder:text-th-text-secondary/50"
          />
        )}
      </div>
    </section>
  )
}
