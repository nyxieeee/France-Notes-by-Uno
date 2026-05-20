import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { 
  Send, 
  Sparkles, 
  User, 
  Trash2, 
  MessageCircle, 
  HelpCircle,
  Lightbulb,
  Zap,
  MoreVertical
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatTime } from '@/lib/utils'
import MarkdownText from '@/components/shared/MarkdownText'
import { usePersonalization } from '@/hooks/usePersonalization'

export default function AIPage() {
  const { messages, isTyping, sendMessage, clearHistory } = useChatStore()
  const { user } = useAuthStore()
  const { isFrance, aiAssistantName, greetingName } = usePersonalization()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  const suggestions = [
    { icon: HelpCircle, label: "Explain myocardial infarction simply" },
    { icon: Zap, label: "Mnemonics for cranial nerves" },
    { icon: Lightbulb, label: "Tips for SATA questions" },
  ]

  return (
    <div className="flex flex-col h-full relative bg-[var(--bg)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
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
           <button onClick={clearHistory} className="btn-icon" title="Clear conversation">
              <Trash2 size={18} />
           </button>
           <button className="btn-icon">
              <MoreVertical size={18} />
           </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar space-y-6">
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
            {messages.map((msg, i) => (
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
      <div className="p-4 md:p-6 bg-gradient-to-t from-[var(--bg)] to-transparent shrink-0">
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
               placeholder={`Ask ${aiAssistantName} something... ✨`}
               className="flex-1 bg-transparent border-none outline-none text-sm py-3 font-medium placeholder:text-[var(--text-secondary)]/50"
               disabled={isTyping}
             />
             <button 
               type="submit"
               disabled={!input.trim() || isTyping}
               className="w-12 h-12 bg-[var(--pink)] text-white rounded-full flex items-center justify-center hover:bg-[var(--pink-hover)] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
             >
                <Send size={20} className={cn(input.trim() ? "translate-x-0.5" : "")} />
             </button>
          </form>
          <p className="text-center mt-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
            Always consult a licensed clinical instructor for medical advice. {isFrance ? '🌸' : '🩺'}
          </p>
        </div>
      </div>
    </div>
  )
}
