import { NavLink } from 'react-router-dom'
import { 
  Home, 
  Archive, 
  Library, 
  BrainCircuit, 
  Stethoscope, 
  MessageCircle, 
  User,
  Sparkles,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePersonalization } from '@/hooks/usePersonalization'

const docUnoMessages = [
  "You've got this, future nurse! I'm always here to support you! I love you! 🩺💖",
  "Hey babe, take a break if you need to! Let's drink some water! 💧🌸",
  "Reviewing hard, babe? You're doing so great, I'm so proud of you! ✨",
  "One step at a time! You are so close to your goal, future nurse! I love you! 🩺🌸",
  "Stay hydrated, babe! Drink some water for me, please! I love you! 💧✨",
  "Don't stress too much, babe. I'm always cheering for you! 💕",
  "Hey, take a quick stretch! Let's study again after, babe! I love you! 📖✨",
  "You can do this! Doc Uno is always here for you! I love you, babe! ✨",
  "Every page you read brings you closer to your board exam goal! 🩺",
  "Water break time, babe! Health first, future nurse! I love you! 🌸"
]

const nurseFlorenceMessages = [
  "You've got this, future nurse! Keep up the excellent work! 🩺✨",
  "Take a short break if you need to. Rest is part of effective studying! 💧📝",
  "Reviewing hard today? Your diligence will pay off in clinical practice! ✨",
  "One step at a time. Every page you read brings you closer to your RN goal! 🩺👩‍⚕️",
  "Stay hydrated and take a quick stretch. Health first! 💧✨",
  "Don't stress too much. You are fully capable of mastering this! 🧠✨",
  "Clinical tip: focus on client safety and prioritization. You can do this! 🩹🩺",
  "Every practice question you answer builds your confidence for the board exams! 📝",
  "I am always here to support your nursing journey. Let's study! 🌟"
]

export default function DesktopSidebar() {
  const { 
    isFrance, 
    appName, 
    aiAssistantName, 
    studyBoxName, 
    knowledgeGardenName,
  } = usePersonalization()

  const navItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Archive, label: studyBoxName, path: '/study-box' },
    { icon: Library, label: "Reviewer Library", path: '/reviewer-library' },
    { icon: BrainCircuit, label: 'Quiz', path: '/quiz' },
    { icon: Stethoscope, label: 'Clinical Simulations', path: '/simulations', isBeta: true },
    { icon: MessageCircle, label: `Ask ${aiAssistantName}`, path: '/ai' },
    { icon: Sparkles, label: knowledgeGardenName, path: '/knowledge-garden' },
    { icon: Calendar, label: 'Planner & Calendar', path: '/planner' },
    { icon: User, label: 'Profile', path: '/profile' },
  ]

  const activeMessages = isFrance ? docUnoMessages : nurseFlorenceMessages
  const [message, setMessage] = useState(() => activeMessages[Math.floor(Math.random() * activeMessages.length)])
  const location = useLocation()

  useEffect(() => {
    // Rotate through local messages only — no API calls
    let nextMsg = activeMessages[Math.floor(Math.random() * activeMessages.length)]
    while (nextMsg === message && activeMessages.length > 1) {
      nextMsg = activeMessages[Math.floor(Math.random() * activeMessages.length)]
    }
    setMessage(nextMsg)
  }, [location.pathname, isFrance])

  return (
    <div className="h-full flex flex-col bg-[var(--card)] border-r border-[var(--border)] p-4 shadow-sm">
      <div className="flex items-center justify-center -mx-4 px-4 pb-4 mb-6 border-b border-[var(--border)]/60">
        <img 
          src="/france-notes-horizontal-logo.png" 
          alt={`${appName} Logo`} 
          className="h-24 w-auto object-contain" 
        />
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 group",
              isActive 
                ? "bg-[var(--secondary-bg)] text-[var(--pink)] font-semibold shadow-sm" 
                : "text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
            )}
          >
            <item.icon size={20} className={cn("transition-transform group-hover:scale-110 shrink-0")} />
            <span className="font-heading flex-1 truncate">{item.label}</span>
            {item.isBeta && (
              <span className="text-[7px] font-bold bg-[var(--pink)]/10 text-[var(--pink)] px-1 py-0.5 rounded-md uppercase tracking-tighter ml-2 border border-[var(--pink)]/20">
                Beta
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sweet AI interactive card with instant framer-motion text transition */}
      <div className="p-2">
        <div className="bg-[var(--bg)] rounded-3xl p-4 border border-[var(--border)] transition-all hover:border-[var(--pink)]/30 group cursor-default overflow-hidden relative">
          <p className="text-xs font-semibold text-[var(--pink)] mb-1.5 uppercase tracking-wider flex items-center gap-1">
            {aiAssistantName} {isFrance ? '🩺' : '👩‍⚕️'}
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse"></span>
          </p>
          <div className="min-h-[2.5rem] flex items-center">
            <AnimatePresence mode="wait">
              <motion.p 
                key={message}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="text-xs text-[var(--text-secondary)] leading-relaxed italic"
              >
                "{message}"
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
