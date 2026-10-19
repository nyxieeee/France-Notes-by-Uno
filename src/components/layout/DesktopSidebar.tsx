import { NavLink } from 'react-router-dom'
import { House as Home, Archive, Books as Library, Brain as BrainCircuit, Stethoscope, ChatCircleDots as MessageCircle, Gear as Settings, Sparkle as Sparkles, Calendar, Calculator, Microphone as Mic2, Flask as FlaskConical } from '@phosphor-icons/react'
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

  const navGroups = [
    { label: null, items: [
      { icon: Home, label: 'Home', path: '/home' },
    ]},
    { label: 'Study', items: [
      { icon: Archive, label: studyBoxName, path: '/study-box' },
      { icon: Library, label: 'Reviewer Library', path: '/reviewer-library' },
      { icon: BrainCircuit, label: 'Quizzes', path: '/quiz' },
      { icon: Stethoscope, label: 'Clinical Simulations', path: '/simulations', isBeta: true },
    ]},
    { label: 'Listen & Learn', items: [
      { icon: Mic2, label: 'Nursepod', path: '/podcast-review' },
    ]},
    { label: 'Search', items: [
      { icon: Sparkles, label: knowledgeGardenName, path: '/knowledge-garden' },
    ]},
    { label: 'Nursing Tools', items: [
      { icon: MessageCircle, label: `Ask ${aiAssistantName}`, path: '/ai' },
      { icon: FlaskConical, label: 'Reference Lab Charts', path: '/labs-reference' },
      { icon: Calculator, label: 'Dosage Calculator', path: '/dosage-calculator' },
    ]},
    { label: 'Planning & Progress', items: [
      { icon: Calendar, label: 'Planner', path: '/planner' },
      { icon: Settings, label: 'Profile & Settings', path: '/profile' },
    ]},
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
    <div className="h-full flex flex-col bg-[var(--card)] border-r border-[var(--border)]">
      <div className="flex items-center px-5 pt-5 pb-4 shrink-0">
        <img 
          src="/france-notes-horizontal-logo-trim.png" 
          alt={`${appName} Logo`} 
          className="h-12 w-auto object-contain" 
        />
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar min-h-0 px-3 pb-3 space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 mb-1 text-[11px] font-semibold text-[var(--text-secondary)]/80 tracking-wide">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] transition-colors duration-150 group",
                    isActive 
                      ? "bg-[var(--secondary-bg)] text-[var(--pink)] font-semibold" 
                      : "text-[var(--text-secondary)] hover:bg-[var(--rose-soft)] hover:text-[var(--text)]"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={18} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {'isBeta' in item && item.isBeta && (
                        <span className="text-[8px] font-bold text-[var(--pink)] px-1.5 py-0.5 rounded-md uppercase tracking-wider bg-[var(--rose-soft)] border border-[var(--accent)]">
                          Beta
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Doc Uno / Nurse Florence note, rotates on navigation */}
      <div className="shrink-0 p-3">
        <div className="rounded-2xl p-3 bg-[var(--rose-soft)] border border-[var(--border)] flex gap-3 items-start">
          <img
            src={isFrance ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'}
            alt={aiAssistantName}
            className="w-10 h-10 rounded-full object-cover border-2 border-[var(--card)] shadow-sm shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--pink)] flex items-center gap-1.5">
              {aiAssistantName}
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse"></span>
            </p>
            <div className="min-h-[2.5rem]">
              <AnimatePresence mode="wait">
                <motion.p 
                  key={message}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="text-[11.5px] text-[var(--text-secondary)] leading-snug"
                >
                  {message}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
