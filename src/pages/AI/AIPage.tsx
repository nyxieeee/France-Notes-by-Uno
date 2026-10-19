import { useState, useRef, useEffect } from 'react'
import { useChatStore, ChatSession } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { PaperPlaneRight as Send, Sparkle as Sparkles, User, Trash as Trash2, ChatCircleDots as MessageCircle, Question as HelpCircle, Lightbulb, Lightning as Zap, List as Menu, X, Plus, ChatText as MessageSquare, CaretLeft as ChevronLeft, CaretRight as ChevronRight, DotsThree as MoreHorizontal } from '@phosphor-icons/react'
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
          "w-full group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border text-left mb-1 text-sm font-semibold select-none",
          isActive 
            ? "bg-[var(--pink)]/10 border-[var(--pink)] text-[var(--pink)] shadow-sm font-extrabold" 
            : "bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]/30 hover:text-[var(--text)]"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <MessageSquare size={16} className={isActive ? "text-[var(--pink)]" : "text-[var(--text-secondary)]/60"} />
          <span className="truncate block flex-1 leading-snug">{session.title}</span>
        </div>
        
        <div className="flex items-center" onClick={e => e.stopPropagation()}>
          {isConfirming ? (
            <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--border)] rounded-lg p-0.5 shadow-sm">
              <button 
                onClick={(e) => handleDeleteSession(e, session.id)} 
                className="text-xs font-bold text-[var(--error)] hover:bg-red-50 px-1.5 py-0.5 rounded"
              >
                Delete
              </button>
              <button 
                onClick={() => setConfirmDeleteId(null)} 
                className="text-xs text-[var(--text-secondary)] hover:bg-gray-100 px-1.5 py-0.5 rounded"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteId(session.id)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--secondary-bg)] rounded-md text-[var(--text-secondary)] hover:text-[var(--error)] transition-all shrink-0"
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
        <div className="text-center py-8 px-4 text-xs text-[var(--text-secondary)]/60 font-medium">
          No chat history yet. Start a conversation below! 🌱
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {grouped.today.length > 0 && (
          <div>
            <h4 className="text-[10px] font-extrabold text-[var(--text-secondary)]/50 uppercase tracking-widest px-3 mb-1.5">Today</h4>
            {grouped.today.map(renderSessionItem)}
          </div>
        )}
        {grouped.yesterday.length > 0 && (
          <div>
            <h4 className="text-[10px] font-extrabold text-[var(--text-secondary)]/50 uppercase tracking-widest px-3 mb-1.5">Yesterday</h4>
            {grouped.yesterday.map(renderSessionItem)}
          </div>
        )}
        {grouped.last7Days.length > 0 && (
          <div>
            <h4 className="text-[10px] font-extrabold text-[var(--text-secondary)]/50 uppercase tracking-widest px-3 mb-1.5">Previous 7 Days</h4>
            {grouped.last7Days.map(renderSessionItem)}
          </div>
        )}
        {grouped.older.length > 0 && (
          <div>
            <h4 className="text-[10px] font-extrabold text-[var(--text-secondary)]/50 uppercase tracking-widest px-3 mb-1.5">Older</h4>
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
          <h3 className="font-heading font-black text-sm text-[var(--text)] tracking-tight">Chat History</h3>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-xl bg-[var(--secondary-bg)]/50 flex items-center justify-center text-[var(--text-secondary)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 shrink-0">
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--pink)] text-white rounded-2xl font-bold hover:bg-[var(--pink-hover)] transition-all shadow-fn-md"
          >
            <Plus size={16} />
            <span>New Chat</span>
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
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             {/* Toggle Sidebar Button */}
             <button 
               onClick={() => setSidebarOpen(!isSidebarOpen)}
               className="p-2 -ml-2 rounded-xl bg-[var(--secondary-bg)]/50 hover:bg-[var(--pink)]/10 text-[var(--text-secondary)] hover:text-[var(--pink)] transition-all"
               title={isSidebarOpen ? "Collapse history" : "Expand history"}
             >
               <Menu size={18} />
             </button>

             <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-fn border border-[var(--pink)]/30 shrink-0">
                <img src={isFrance ? "/doc-uno-avatar.jpg" : "/nurse-florence-avatar.jpg"} alt={aiAssistantName} className="w-full h-full object-cover animate-pulse-soft" />
             </div>
             <div>
                <h2 className="text-lg font-bold tracking-tight leading-none mb-1">Ask {aiAssistantName} {isFrance ? '🩺' : '👩‍⚕️'}</h2>
                <div className="flex items-center gap-1.5">
                   <span className="w-1.5 h-1.5 bg-[var(--success)] rounded-full animate-pulse"></span>
                   <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                     {isFrance ? "Always here for you, babe" : "Clinical Mentor Active"}
                   </span>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-1">
             <button onClick={clearHistory} className="btn-icon text-[var(--error)]" title="Clear all chats">
                <Trash2 size={18} />
             </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 custom-scrollbar space-y-4 sm:space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
               <div className="w-20 h-20 bg-[var(--secondary-bg)] rounded-[2rem] flex items-center justify-center text-[var(--pink)] mb-6 animate-float">
                  <MessageCircle size={40} />
               </div>
               <h3 className="text-xl font-bold mb-2">Hello, {greetingName}! ✨</h3>
               <p className="text-[var(--text-secondary)] max-w-sm mb-10">
                 I'm {aiAssistantName}, your AI nursing companion. Ask me anything about your studies, patient care, or just for some motivation! {isFrance ? '🩺🌸' : '🩺✨'}
               </p>
               
               <div className="grid grid-cols-1 gap-3 w-full max-w-md px-4">
                  {suggestions.map((s, i) => (
                    <button 
                      key={i}
                      onClick={() => sendMessage(s.label)}
                      className="flex items-center gap-3 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-left hover:border-[var(--pink)] transition-all group"
                    >
                      <s.icon size={18} className="text-[var(--pink)] group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-semibold">{s.label}</span>
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
                    "flex gap-4 max-w-3xl",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-[var(--pink)]/20",
                    msg.role === 'user' ? "bg-[var(--secondary-bg)] text-[var(--text-secondary)]" : ""
                  )}>
                    {msg.role === 'user' ? (
                      user?.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[var(--secondary-bg)] text-[var(--text-secondary)] font-bold text-lg">
                          {user?.full_name ? user.full_name.charAt(0) : <User size={20} />}
                        </div>
                      )
                    ) : (
                      <img src={isFrance ? "/doc-uno-avatar.jpg" : "/nurse-florence-avatar.jpg"} alt={aiAssistantName} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="space-y-1.5 flex flex-col">
                    <div className={cn(
                      "p-4 rounded-[2rem] text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-[var(--pink)] text-white rounded-tr-none shadow-fn" 
                        : "bg-[var(--card)] text-[var(--text)] rounded-tl-none border border-[var(--border)] shadow-sm"
                    )}>
                      <MarkdownText 
                        content={msg.content} 
                        className={msg.role === 'user' ? 'text-white' : 'text-[var(--text)]'} 
                      />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest px-2",
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
                  className="flex gap-4 max-w-3xl"
                >
                   <div className="w-10 h-10 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-[var(--pink)]/20">
                     <img src={isFrance ? "/doc-uno-avatar.jpg" : "/nurse-florence-avatar.jpg"} alt={aiAssistantName} className="w-full h-full object-cover animate-pulse-soft" />
                   </div>
                  <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-[2rem] rounded-tl-none shadow-sm flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 bg-[var(--pink)] rounded-full animate-bounce"></div>
                     <div className="w-1.5 h-1.5 bg-[var(--pink)] rounded-full animate-bounce animation-delay-200"></div>
                     <div className="w-1.5 h-1.5 bg-[var(--pink)] rounded-full animate-bounce animation-delay-400"></div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-4 md:p-6 bg-gradient-to-t from-[var(--bg)] to-transparent shrink-0" style={{ paddingBottom: 'max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 4.5rem))' }}>
          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={handleSend}
              className="relative flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-2 pl-6 shadow-fn group focus-within:ring-2 focus-within:ring-[var(--pink)]/50 focus-within:border-[var(--pink)] transition-all"
            >
               <Sparkles className="text-[var(--pink)] shrink-0 animate-pulse-soft" size={20} />
               <input 
                 type="text" 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 placeholder={`Message ${aiAssistantName}...`}
                 className="w-full bg-transparent border-none outline-none py-3 text-sm placeholder:text-[var(--text-secondary)]/50"
                 disabled={isTyping}
               />
               <button 
                 type="submit"
                 disabled={!input.trim() || isTyping}
                 className="p-3 bg-[var(--pink)] hover:bg-[var(--pink-hover)] text-white rounded-full transition-all disabled:opacity-30 disabled:scale-95 shrink-0"
               >
                 <Send size={16} />
               </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
