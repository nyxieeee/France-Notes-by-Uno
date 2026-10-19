import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '@/stores/chatStore'
import type { ChatSession } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { PaperPlaneRight as Send, User, Trash as Trash2, Question as HelpCircle, Lightbulb, Lightning as Zap, Heartbeat, List as Menu, X, Plus, ChatText as MessageSquare } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatTime } from '@/lib/utils'
import MarkdownText from '@/components/shared/MarkdownText'
import { usePersonalization } from '@/hooks/usePersonalization'

export default function AIPage() {
  const { 
    sessions, 
    activeSessionId, 
    isSidebarOpen, 
    isTyping, 
    fetchSessions, 
    setActiveSession, 
    createNewSession, 
    deleteSession, 
    setSidebarOpen, 
    sendMessage, 
    clearHistory 
  } = useChatStore()

  const { user } = useAuthStore()
  const { isFrance, aiAssistantName, greetingName } = usePersonalization()
  const [input, setInput] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions()
  }, [])

  // Ensure sidebar starts closed on mount
  useEffect(() => {
    setSidebarOpen(false)
  }, [])

  const activeSession = sessions.find(s => s.id === activeSessionId)
  const messages = activeSession ? activeSession.messages : []

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isTyping) return
    const content = input
    setInput('')
    await sendMessage(content)
  }

  const handleNewChat = () => {
    createNewSession()
    if (window.innerWidth < 1024) {
      setSidebarOpen(false) // auto close on mobile
    }
  }

  const handleSelectSession = (id: string) => {
    setActiveSession(id)
    if (window.innerWidth < 1024) {
      setSidebarOpen(false) // auto close on mobile
    }
  }

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteSession(id)
    if (confirmDeleteId === id) {
      setConfirmDeleteId(null)
    }
  }

  const suggestions = [
    { icon: HelpCircle, label: "Explain myocardial infarction simply" },
    { icon: Zap, label: "Mnemonics for cranial nerves" },
    { icon: Lightbulb, label: "Tips for SATA questions" },
    { icon: Heartbeat, label: "Priority nursing actions for sepsis" },
  ]

  // Grouping function for dates
  const getGroupedSessions = () => {
    const today: ChatSession[] = []
    const yesterday: ChatSession[] = []
    const last7Days: ChatSession[] = []
    const older: ChatSession[] = []

    const now = new Date()
    const oneDay = 24 * 60 * 60 * 1000

    sessions.forEach(session => {
      const date = new Date(session.created_at)
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / oneDay)

      const isToday = date.toDateString() === now.toDateString()
      
      const yesterdayDate = new Date(now)
      yesterdayDate.setDate(now.getDate() - 1)
      const isYesterday = date.toDateString() === yesterdayDate.toDateString()

      if (isToday) {
        today.push(session)
      } else if (isYesterday) {
        yesterday.push(session)
      } else if (diffDays <= 7) {
        last7Days.push(session)
      } else {
        older.push(session)
      }
    })

    return { today, yesterday, last7Days, older }
  }

  const grouped = getGroupedSessions()

  const renderSessionItem = (session: ChatSession) => {
    const isActive = session.id === activeSessionId
    const isConfirming = confirmDeleteId === session.id

    return (
      <div
        key={session.id}
        onClick={() => handleSelectSession(session.id)}
        className={cn(
          "w-full group flex items-center justify-between gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors text-left mb-0.5 text-[13px] select-none",
          isActive 
            ? "bg-[var(--rose-soft)] text-[var(--pink)] font-medium" 
            : "text-[var(--text-secondary)] hover:bg-[var(--rose-soft)] hover:text-[var(--text)]"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <MessageSquare size={15} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
          <span className="truncate block flex-1 leading-snug">{session.title}</span>
        </div>
        
        <div className="flex items-center" onClick={e => e.stopPropagation()}>
          {isConfirming ? (
            <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--border)] rounded-lg p-0.5 shadow-sm">
              <button 
                onClick={(e) => handleDeleteSession(e, session.id)} 
                className="text-xs font-medium text-[var(--error)] hover:bg-th-error/10 px-1.5 py-0.5 rounded"
              >
                Delete
              </button>
              <button 
                onClick={() => setConfirmDeleteId(null)} 
                className="text-xs text-[var(--text-secondary)] hover:bg-[var(--rose-soft)] px-1.5 py-0.5 rounded"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteId(session.id)}
              aria-label="Delete chat"
              className="lg:opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--card)] rounded-md text-[var(--text-secondary)] hover:text-[var(--error)] transition-all shrink-0"
              title="Delete chat thread"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderHistoryList = () => {
    if (sessions.length === 0) {
      return (
        <div className="text-center py-8 px-4 text-[12.5px] text-[var(--text-secondary)]">
          No chats yet. Your conversations will show up here.
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {grouped.today.length > 0 && (
          <div>
            <h4 className="text-[11px] font-medium text-[var(--text-secondary)] px-3 mb-1">Today</h4>
            {grouped.today.map(renderSessionItem)}
          </div>
        )}
        {grouped.yesterday.length > 0 && (
          <div>
            <h4 className="text-[11px] font-medium text-[var(--text-secondary)] px-3 mb-1">Yesterday</h4>
            {grouped.yesterday.map(renderSessionItem)}
          </div>
        )}
        {grouped.last7Days.length > 0 && (
          <div>
            <h4 className="text-[11px] font-medium text-[var(--text-secondary)] px-3 mb-1">Previous 7 Days</h4>
            {grouped.last7Days.map(renderSessionItem)}
          </div>
        )}
        {grouped.older.length > 0 && (
          <div>
            <h4 className="text-[11px] font-medium text-[var(--text-secondary)] px-3 mb-1">Older</h4>
            {grouped.older.map(renderSessionItem)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full w-full bg-[var(--bg)] overflow-hidden relative">
      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black z-[100]"
          />
        )}
      </AnimatePresence>

      {/* Responsive Sidebar Drawer */}
      <motion.div 
        initial={false}
        animate={{ 
          x: isSidebarOpen ? 0 : -288,
          width: isSidebarOpen ? 288 : 0
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-[101] lg:z-10 flex flex-col h-full bg-[var(--card)] border-r border-[var(--border)] shrink-0 overflow-hidden shadow-2xl lg:shadow-none"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <h3 className="font-heading font-semibold text-[15px]">Chats</h3>
          <button 
            onClick={() => setSidebarOpen(false)}
            aria-label="Close history"
            className="lg:hidden w-8 h-8 rounded-lg hover:bg-[var(--rose-soft)] flex items-center justify-center text-[var(--text-secondary)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 shrink-0">
          <button 
            onClick={handleNewChat}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm"
          >
            <Plus size={16} />
            <span>New chat</span>
          </button>
        </div>

        {/* Sidebar Body */}
        <div className="flex-1 overflow-y-auto px-3 pb-24 lg:pb-6 custom-scrollbar">
          {renderHistoryList()}
        </div>
      </motion.div>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <div className="px-3 sm:px-6 py-3 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="btn-icon p-2"
              aria-label={isSidebarOpen ? 'Hide chat history' : 'Show chat history'}
            >
              <Menu size={18} />
            </button>
            <div className="relative shrink-0">
              <img src={isFrance ? "/doc-uno-avatar.jpg" : "/nurse-florence-avatar.jpg"} alt={aiAssistantName} className="w-10 h-10 rounded-full object-cover border border-th-pink/20" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--success)] border-2 border-[var(--card)]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading font-semibold text-[15px] leading-tight truncate">{aiAssistantName}</h2>
              <p className="text-[12px] text-[var(--text-secondary)] truncate">
                {isFrance ? 'Always here for you, babe' : 'Your clinical study mentor'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {confirmClear ? (
              <div className="flex items-center gap-1 text-[12.5px]">
                <span className="hidden sm:inline text-[var(--text-secondary)] mr-1">Delete all chats?</span>
                <button onClick={() => { clearHistory(); setConfirmClear(false) }} className="px-2.5 py-1 rounded-full font-medium text-white bg-[var(--error)]">Delete</button>
                <button onClick={() => setConfirmClear(false)} className="px-2.5 py-1 rounded-full text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]">Cancel</button>
              </div>
            ) : (
              <>
                <button onClick={handleNewChat} className="btn-icon p-2" aria-label="New chat"><Plus size={18} /></button>
                {sessions.length > 0 && (
                  <button onClick={() => setConfirmClear(true)} className="btn-icon p-2 hover:text-[var(--error)]" aria-label="Clear all chats"><Trash2 size={18} /></button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8 custom-scrollbar space-y-4 sm:space-y-5">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-full text-center py-8">
              <img src={isFrance ? "/doc-uno-avatar.jpg" : "/nurse-florence-avatar.jpg"} alt={aiAssistantName} className="w-20 h-20 rounded-full object-cover border-2 border-th-pink/20 shadow-fn mb-4" />
              <h3 className="font-heading font-semibold text-xl">Hi {greetingName}, what are we studying?</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mt-1 mb-7">
                I'm {aiAssistantName}. Ask about pathophysiology, meds, care plans or exam strategy, or just ask for some motivation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.label)}
                    className="flex items-center gap-3 p-3.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-left hover:bg-[var(--rose-soft)] hover:border-th-pink/30 transition-colors"
                  >
                    <span className="w-8 h-8 rounded-lg bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center shrink-0"><s.icon size={16} /></span>
                    <span className="text-[13px] font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3 max-w-3xl",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full overflow-hidden shrink-0 border border-th-pink/15"
                  )}>
                    {msg.role === 'user' ? (
                      user?.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[var(--rose-soft)] text-[var(--pink)] font-semibold text-sm">
                          {user?.full_name ? user.full_name.charAt(0) : <User size={16} />}
                        </div>
                      )
                    ) : (
                      <img src={isFrance ? "/doc-uno-avatar.jpg" : "/nurse-florence-avatar.jpg"} alt={aiAssistantName} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className={cn("space-y-1 flex flex-col min-w-0", msg.role === 'user' ? "items-end" : "")}>
                    <div className={cn(
                      "px-4 py-3 rounded-2xl text-[14px] leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-[var(--pink)] text-white rounded-tr-md" 
                        : "bg-[var(--card)] text-[var(--text)] rounded-tl-md border border-[var(--border)]"
                    )}>
                      <MarkdownText 
                        content={msg.content} 
                        className={msg.role === 'user' ? 'text-white' : 'text-[var(--text)]'} 
                      />
                    </div>
                    <span className={cn(
                      "text-[11px] text-[var(--text-secondary)] px-1",
                      msg.role === 'user' ? "text-right" : ""
                    )}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 max-w-3xl"
                >
                   <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-th-pink/15">
                     <img src={isFrance ? "/doc-uno-avatar.jpg" : "/nurse-florence-avatar.jpg"} alt={aiAssistantName} className="w-full h-full object-cover animate-pulse-soft" />
                   </div>
                  <div className="bg-[var(--card)] border border-[var(--border)] px-4 py-3.5 rounded-2xl rounded-tl-md flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 bg-[var(--pink)] rounded-full animate-bounce"></div>
                     <div className="w-1.5 h-1.5 bg-[var(--pink)] rounded-full animate-bounce " style={{ animationDelay: '0.2s' }}></div>
                     <div className="w-1.5 h-1.5 bg-[var(--pink)] rounded-full animate-bounce " style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="px-3 sm:px-5 md:px-8 pt-2 bg-[var(--bg)] shrink-0" style={{ paddingBottom: 'max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 4.5rem))' }}>
          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={handleSend}
              className="relative flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-1.5 pl-4 shadow-fn focus-within:border-[var(--pink)] transition-colors"
            >
               <input 
                 type="text" 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 placeholder={`Message ${aiAssistantName}...`}
                 className="w-full bg-transparent border-none outline-none py-2.5 text-[15px] placeholder:text-th-text-secondary/60"
                 disabled={isTyping}
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
          </div>
        </div>
      </div>
    </div>
  )
}
