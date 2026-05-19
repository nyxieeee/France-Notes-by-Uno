import { useState } from 'react'
import { Sparkles, RefreshCw, AlertCircle, Stethoscope, HelpCircle, Heart, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { generateJSON, DOC_UNO_SYSTEM_PROMPT } from '@/lib/groq'
import { usePersonalization } from '@/hooks/usePersonalization'

export default function FunFactCard() {
  const { isFrance, greetingName, aiAssistantName } = usePersonalization()

  const [fact, setFact] = useState({ 
    id: 'idle', 
    content: isFrance
      ? `Tap the refresh button and I'll drop a fun fact for you, babe ✨`
      : `Tap refresh for a high-yield clinical fact ✨`,
    type: 'nursing facts' 
  })
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshFact = async () => {
    setIsRefreshing(true)
    try {
      let prompt = ""
      if (isFrance) {
        prompt = `
          Generate a random interesting piece of information.
          It must be 100% focused on the nursing, medical, anatomy, clinical, or biology field.
          It should be written in a warm, cute, supportive English tone by Doc Uno for his girlfriend France.
          It must fall into one of these exact categories:
          - "nursing facts" (nursing history or shift/clinical trivia)
          - "weird facts" (bizarre/strange anatomy or physiological facts)
          - "medical trivia" (scientific medical details)
          - "funny facts" (humorous medical observations/facts)
          - "random facts" (curious biology/health facts)
          - "not so fun facts" (slightly grim but interesting medical facts)
          - "cursed facts" (gross/bizarre biology or health facts)
          - "dad jokes" (funny, corny medical/nursing dad jokes)
          
          Current seed: ${Math.random()}. 
          Format as JSON: { "content": "The fact...", "type": "nursing facts" | "weird facts" | "medical trivia" | "funny facts" | "random facts" | "not so fun facts" | "cursed facts" | "dad jokes" }
          Keep it under 3 sentences. Be witty, encouraging, and write strictly 100% in English (NO Tagalog/Filipino words whatsoever).
        `
      } else {
        prompt = `
          Generate a random interesting piece of information.
          It must be 100% focused on the nursing, medical, anatomy, clinical, or biology field.
          It should be written in a highly encouraging, expert clinical English tone by Nurse Florence for a dedicated student named ${greetingName}.
          DO NOT include any romantic references, terms of endearment, or mentions of boyfriend/girlfriend.
          It must fall into one of these exact categories:
          - "nursing facts" (nursing history or clinical trivia)
          - "weird facts" (bizarre/strange anatomy or physiological facts)
          - "medical trivia" (scientific medical details)
          - "random facts" (curious biology/health facts)
          - "not so fun facts" (slightly grim but interesting medical facts)
          - "clinical tips" (board review advice or mnemonics)
          
          Current seed: ${Math.random()}. 
          Format as JSON: { "content": "The fact...", "type": "nursing facts" | "weird facts" | "medical trivia" | "random facts" | "not so fun facts" | "clinical tips" }
          Keep it under 3 sentences. Be professional, highly informative, and write strictly 100% in English.
        `
      }

      const newFact = await generateJSON(prompt, DOC_UNO_SYSTEM_PROMPT, 'funfact', 0.9)
      
      setFact({
        id: Date.now().toString(),
        content: newFact.content || `${aiAssistantName} is taking a quick coffee break! ☕`,
        type: newFact.type || "nursing facts"
      })
    } catch (error) {
      console.error("Failed to fetch fun fact:", error)
      // Fallback
      if (isFrance) {
        setFact({
          id: Date.now().toString(),
          content: "Did you know, babe? Taking short active breaks while studying nursing blocks improves your memory retention by 200%! Stay hydrated! 🌸",
          type: "nursing facts"
        })
      } else {
        setFact({
          id: Date.now().toString(),
          content: `Did you know, ${greetingName}? Taking short active breaks while studying complex nursing material improves your information retention by up to 200%! Stay hydrated! 🧠🩺`,
          type: "nursing facts"
        })
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  const getHeaderInfo = () => {
    switch (fact.type) {
      case 'nursing facts': return { icon: Stethoscope, color: 'from-[var(--pink)] to-[var(--pink-hover)]' }
      case 'weird facts': return { icon: Zap, color: 'from-purple-500 to-indigo-600' }
      case 'medical trivia': return { icon: Sparkles, color: 'from-blue-500 to-cyan-600' }
      case 'funny facts': return { icon: Heart, color: 'from-orange-400 to-pink-500' }
      case 'random facts': return { icon: HelpCircle, color: 'from-teal-500 to-emerald-600' }
      case 'not so fun facts': return { icon: AlertCircle, color: 'from-red-500 to-rose-600' }
      case 'cursed facts': return { icon: AlertCircle, color: 'from-amber-600 to-orange-700' }
      case 'dad jokes': return { icon: Heart, color: 'from-rose-400 to-orange-500' }
      default: return { icon: HelpCircle, color: 'from-[var(--pink)] to-[var(--pink-hover)]' }
    }
  }

  const header = getHeaderInfo()

  return (
    <div className={cn(
      "fn-card p-6 text-white relative overflow-hidden group transition-all duration-700",
      "bg-gradient-to-br shadow-fn-md",
      header.color
    )}>
      {/* Decorative circles */}
      <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
      <div className="absolute bottom-[-10px] left-[-10px] w-16 h-16 bg-white/10 rounded-full blur-lg"></div>
 
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <header.icon size={18} className="animate-pulse-soft" />
          <span className="font-heading font-bold text-sm uppercase tracking-widest">
            {isFrance ? 'Fun Facts with Uno ✨' : `Clinical Facts with Florence ✨`}
          </span>
        </div>
        <button 
          onClick={refreshFact}
          className={`p-1.5 hover:bg-white/20 rounded-lg transition-all ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="relative z-10 min-h-[6rem] flex items-center py-2">
        <AnimatePresence mode="wait">
          <motion.p 
            key={fact.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-lg font-medium leading-relaxed italic"
          >
            "{fact.content}"
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-4 pt-4 border-t border-white/20 relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Type: {fact.type}</p>
      </div>
    </div>
  )
}
