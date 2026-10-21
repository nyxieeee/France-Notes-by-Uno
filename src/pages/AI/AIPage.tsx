import { useState, useRef, useEffect, useMemo } from 'react'
import { useChatStore } from '@/stores/chatStore'
import type { ChatSession } from '@/stores/chatStore'
import { useNotesStore } from '@/stores/notesStore'
import {
  PaperPlaneRight as Send, Trash as Trash2, Question as HelpCircle, Lightbulb, Lightning as Zap, Heartbeat,
  List as Menu, X, Plus, ChatText as MessageSquare, MagnifyingGlass, Copy, NotePencil, Check, Brain, ListChecks, Sparkle,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatTime } from '@/lib/utils'
import MarkdownText from '@/components/shared/MarkdownText'
import { usePersonalization } from '@/hooks/usePersonalization'
import { toast, confirmDialog } from '@/stores/feedbackStore'

const SUGGESTIONS: { icon: Icon; title: string; prompt: string }[] = [
  { icon: HelpCircle, title: 'Explain a condition', prompt: 'Explain myocardial infarction simply' },
  { icon: Zap, title: 'Make a mnemonic', prompt: 'Mnemonics for cranial nerves' },
  { icon: Lightbulb, title: 'Exam strategy', prompt: 'Tips for SATA questions' },
  { icon: Heartbeat, title: 'Nursing priorities', prompt: 'Priority nursing actions for sepsis' },
]

// One-tap follow-ups on the latest answer
const FOLLOW_UPS: { icon: Icon; label: string; prompt: string }[] = [
  { icon: Sparkle, label: 'Explain simpler', prompt: 'Can you explain that more simply, like I am a first-year student?' },
  { icon: Zap, label: 'Give me a mnemonic', prompt: 'Give me a mnemonic to remember that.' },
  { icon: Brain, label: 'Quiz me on this', prompt: 'Quiz me on this with 3 board-style questions, one at a time. Wait for my answer before giving the rationale.' },
  { icon: ListChecks, label: 'Nursing priorities', prompt: 'What are the priority nursing assessments and interventions for this?' },
]

const dayLabel = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function AIPage() {
  const {
    sessions, activeSessionId, isSidebarOpen, isTyping,
    fetchSessions, setActiveSession, createNewSession, deleteSession, setSidebarOpen, sendMessage, clearHistory,
  } = useChatStore()
  const { createNote, updateNote } = useNotesStore()
  const { isFrance, aiAssistantName, greetingName } = usePersonalization()
  const avatar = isFrance ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'

  const [input, setInput] = useState('')
  const [chatSearch, setChatSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [openedAt] = useState(() => Date.now())
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { fetchSessions() }, [fetchSessions])
  useEffect(() => { setSidebarOpen(false) }, [setSidebarOpen])

  const activeSession = sessions.find(s => s.id === activeSessionId)
  const messages = useMemo(() => activeSession?.messages ?? [], [activeSession])
  const lastAssistantId = [...messages].reverse().find(m => m.role === 'assistant')?.id

  // Follow the conversation as it grows; the welcome screen stays scrolled to the top
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (messages.length === 0) el.scrollTo({ top: 0 })
    else el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, isTyping])

  // Grow the message box with its text, up to about six lines
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`
  }, [input])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || isTyping) return
    setInput('')
    await sendMessage(content)
  }

  const closeDrawerOnMobile = () => { if (window.innerWidth < 1024) setSidebarOpen(false) }

  const handleNewChat = () => {
    createNewSession()
    closeDrawerOnMobile()
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleDelete = async (session: ChatSession) => {
    if (await confirmDialog({ title: 'Delete this chat?', message: `“${session.title}” will be removed from all your devices.`, confirmLabel: 'Delete', danger: true })) {
      deleteSession(session.id)
    }
  }

  const handleClearAll = async () => {
    if (await confirmDialog({ title: 'Delete all chats?', message: 'Every conversation will be removed from all your devices. This cannot be undone.', confirmLabel: 'Delete all', danger: true })) {
      clearHistory()
    }
  }

  const copyMessage = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(id)
      setTimeout(() => setCopiedId(c => (c === id ? null : c)), 1500)
    } catch {
      toast("Couldn't copy. Select the text and copy it instead.", 'error')
    }
  }

  const saveToNotes = async (content: string) => {
    const note = await createNote('text')
    if (!note) {
      toast("Couldn't save to Notes. Check your connection and try again.", 'error')
      return
    }
    const firstLine = content.replace(/[#*_`>]/g, '').split('\n').find(l => l.trim())?.trim() || 'From chat'
    await updateNote(note.id, { title: `${aiAssistantName}: ${firstLine.slice(0, 60)}`, content })
    toast('Saved to Notes', 'success')
  }

  // Conversation list, filtered and grouped by day
  const groups = useMemo(() => {
    const q = chatSearch.trim().toLowerCase()
    const list = sessions.filter(s => !q || s.title.toLowerCase().includes(q) || s.messages.some(m => m.content.toLowerCase().includes(q)))
    const out: { label: string; items: ChatSession[] }[] = []
    for (const s of list) {
      const t = new Date(s.created_at).getTime()
      const label = dayLabel(s.created_at) === 'Today' ? 'Today'
        : dayLabel(s.created_at) === 'Yesterday' ? 'Yesterday'
        : openedAt - t < 7 * 86400000 ? 'Previous 7 days' : 'Older'
      const g = out.find(x => x.label === label)
      if (g) g.items.push(s)
      else out.push({ label, items: [s] })
    }
    return out
  }, [sessions, chatSearch, openedAt])

  const conversationList = (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-3 flex items-center justify-between">
        <h2 className="font-heading font-semibold text-[15px]">Chats</h2>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden btn-icon p-1.5" aria-label="Close chats"><X size={17} /></button>
      </div>
      <div className="px-3 space-y-2">
        <button onClick={handleNewChat} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm">
          <Plus size={16} weight="bold" /> New chat
        </button>
        {sessions.length > 3 && (
          <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2">
            <MagnifyingGlass size={14} className="text-[var(--text-secondary)]" />
            <input value={chatSearch} onChange={e => setChatSearch(e.target.value)} placeholder="Search chats" className="bg-transparent outline-none text-[13px] w-full" />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-3 space-y-4">
        {groups.length === 0 ? (
          <p className="text-center text-[12.5px] text-[var(--text-secondary)] px-4 py-8">
            {sessions.length === 0 ? 'Your conversations will show up here.' : 'No chats match your search.'}
          </p>
        ) : groups.map(g => (
          <div key={g.label}>
            <p className="text-[11px] font-medium text-[var(--text-secondary)] px-3 mb-1">{g.label}</p>
            {g.items.map(s => {
              const active = s.id === activeSessionId
              return (
                <div
                  key={s.id}
                  onClick={() => { setActiveSession(s.id); closeDrawerOnMobile() }}
                  className={cn('group flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-[13px] transition-colors', active ? 'bg-[var(--rose-soft)] text-[var(--pink)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--rose-soft)] hover:text-[var(--text)]')}
                >
                  <MessageSquare size={15} weight={active ? 'fill' : 'regular'} className="shrink-0" />
                  <span className="truncate flex-1">{s.title}</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(s) }}
                    className="p-1 rounded-md hover:bg-[var(--card)] hover:text-[var(--error)] lg:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    aria-label={`Delete ${s.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {sessions.length > 0 && (
        <div className="p-3 border-t border-[var(--border)]">
          <button onClick={handleClearAll} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-th-error/5">
            <Trash2 size={14} /> Delete all chats
          </button>
        </div>
      )}
    </div>
  )

  // A divider before the first message of each day
  const days = messages.map(m => dayLabel(m.created_at))

  return (
    <div className="h-full flex gap-5 p-3 sm:p-5 lg:p-6 pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] md:pb-6 min-h-0">
      {/* Conversations: a panel on wide screens, a drawer on phones */}
      <aside className="hidden lg:block w-72 shrink-0 fn-card overflow-hidden">{conversationList}</aside>
      <AnimatePresence>
        {isSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-[100]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="absolute inset-0 bg-black/40" />
            <motion.aside
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 left-0 w-[290px] bg-[var(--card)] border-r border-[var(--border)] shadow-fn-lg"
            >
              {conversationList}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Chat */}
      <section className="flex-1 min-w-0 fn-card overflow-hidden flex flex-col">
        <header className="px-4 sm:px-5 py-3 border-b border-[var(--border)] flex items-center gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-icon p-2 -ml-1" aria-label="Show chats"><Menu size={18} /></button>
          <div className="relative shrink-0">
            <img src={avatar} alt={aiAssistantName} className="w-10 h-10 rounded-full object-cover border border-th-pink/20" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--success)] border-2 border-[var(--card)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading font-semibold text-[15px] leading-tight truncate">{activeSession && messages.length > 0 ? activeSession.title : aiAssistantName}</h1>
            <p className="text-[12px] text-[var(--text-secondary)] truncate">
              {isTyping ? `${aiAssistantName} is typing…` : activeSession && messages.length > 0 ? `with ${aiAssistantName}` : isFrance ? 'Always here for you, babe' : 'Your clinical study mentor'}
            </p>
          </div>
          <button onClick={handleNewChat} className="lg:hidden btn-icon p-2" aria-label="New chat"><Plus size={18} /></button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
          {messages.length === 0 ? (
            <div className="min-h-full flex flex-col items-center text-center px-5 py-8">
              <div className="my-auto flex flex-col items-center w-full">
              <img src={avatar} alt={aiAssistantName} className="w-20 h-20 rounded-full object-cover border-2 border-th-pink/20 shadow-fn mb-4" />
              <h2 className="font-heading font-semibold text-xl">Hi {greetingName}, what are we studying?</h2>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mt-1 mb-7">
                Ask {aiAssistantName} about pathophysiology, meds, care plans or exam strategy. Answers can be saved straight to your Notes.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s.prompt}
                    onClick={() => send(s.prompt)}
                    className="flex items-start gap-3 p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-left hover:bg-[var(--rose-soft)] hover:border-th-pink/30 transition-colors"
                  >
                    <span className="w-8 h-8 rounded-lg bg-[var(--card)] text-[var(--pink)] flex items-center justify-center shrink-0 border border-[var(--border)]"><s.icon size={16} /></span>
                    <span className="min-w-0">
                      <span className="block text-[12px] text-[var(--text-secondary)]">{s.title}</span>
                      <span className="block text-[13.5px] font-medium">{s.prompt}</span>
                    </span>
                  </button>
                ))}
              </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
              {messages.map((msg, i) => {
                const day = days[i]
                const showDay = i === 0 || day !== days[i - 1]
                const mine = msg.role === 'user'
                return (
                  <div key={msg.id}>
                    {showDay && (
                      <div className="flex items-center gap-3 my-2">
                        <span className="flex-1 h-px bg-[var(--border)]" />
                        <span className="text-[11px] font-medium text-[var(--text-secondary)]">{day}</span>
                        <span className="flex-1 h-px bg-[var(--border)]" />
                      </div>
                    )}
                    {mine ? (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-end">
                        <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-[var(--pink)] text-white text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</div>
                        <span className="text-[11px] text-[var(--text-secondary)] mt-1 px-1">{formatTime(msg.created_at)}</span>
                      </motion.div>
                    ) : (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 group">
                        <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-th-pink/15 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-1">{aiAssistantName} <span className="font-normal">· {formatTime(msg.created_at)}</span></p>
                          <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-[var(--bg)] border border-[var(--border)] text-[14.5px] leading-relaxed">
                            <MarkdownText content={msg.content} className="text-[var(--text)]" />
                          </div>
                          <div className={cn('flex items-center gap-1 mt-1.5 transition-opacity', msg.id === lastAssistantId ? 'opacity-100' : 'sm:opacity-0 group-hover:opacity-100')}>
                            <button onClick={() => copyMessage(msg.id, msg.content)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)] hover:text-[var(--text)]">
                              {copiedId === msg.id ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                            </button>
                            <button onClick={() => saveToNotes(msg.content)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)] hover:text-[var(--text)]">
                              <NotePencil size={13} /> Save to Notes
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )
              })}

              {isTyping && (
                <div className="flex gap-3">
                  <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-th-pink/15 shrink-0" />
                  <div className="px-4 py-3.5 rounded-2xl rounded-tl-md bg-[var(--bg)] border border-[var(--border)] flex items-center gap-1.5">
                    {[0, 0.2, 0.4].map(d => <span key={d} className="w-1.5 h-1.5 bg-[var(--pink)] rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="px-3 sm:px-5 pb-3 sm:pb-4 pt-2 shrink-0">
          <div className="max-w-3xl mx-auto">
            {messages.length > 0 && !isTyping && lastAssistantId && (
              <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 [scrollbar-width:none]">
                {FOLLOW_UPS.map(f => (
                  <button
                    key={f.label}
                    onClick={() => send(f.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--pink)] hover:border-th-pink/30 whitespace-nowrap shrink-0"
                  >
                    <f.icon size={13} /> {f.label}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={e => { e.preventDefault(); send(input) }}
              className="flex items-end gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-1.5 pl-4 focus-within:border-[var(--pink)] focus-within:ring-2 focus-within:ring-th-pink/15 transition-all"
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input) }
                }}
                placeholder={`Message ${aiAssistantName}…`}
                className="flex-1 bg-transparent outline-none resize-none py-2.5 text-[15px] leading-snug max-h-[168px] placeholder:text-th-text-secondary/60"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
                className="w-10 h-10 flex items-center justify-center bg-[var(--pink)] hover:bg-[var(--pink-hover)] text-white rounded-xl transition-opacity disabled:opacity-35 shrink-0"
              >
                <Send size={17} weight="fill" />
              </button>
            </form>
            <p className="text-[11px] text-[var(--text-secondary)] text-center mt-2 hidden sm:block">
              {aiAssistantName} can make mistakes. Double-check clinical details with your textbook or clinical instructor.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
