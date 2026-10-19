import { useState, useEffect, useRef } from 'react'
import { Bell, Moon, Sun, MagnifyingGlass as Search } from '@phosphor-icons/react'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { usePersonalization } from '@/hooks/usePersonalization'
import { useReminderStore } from '@/stores/reminderStore'

const getNursingFacts = (isFrance: boolean, greetingName: string) => {
  if (isFrance) {
    return [
      {
        id: 1,
        title: "Cardiology Trivia",
        content: `Did you know, ${greetingName}? The heart beats about 100,000 times a day! Mine beats a little faster whenever I think of you! Keep going, future nurse!`
      },
      {
        id: 2,
        title: "Anatomy Fact",
        content: `The smallest bone in the human body is the stapes in the middle ear, only 3mm long! But my love for you is as big as the universe!`
      },
      {
        id: 3,
        title: "Skeletal Fact",
        content: `Humans are born with 300 bones, but they fuse into 206 by adulthood. No matter how many bones, you will always be the backbone of my life!`
      },
      {
        id: 4,
        title: "Pharmacology Tip",
        content: `The word 'drug' comes from the Dutch word 'drooge' meaning dry. Speaking of dry, drink your water now, future nurse! Stay hydrated for your brain!`
      },
      {
        id: 5,
        title: "Nursing History",
        content: `Florence Nightingale was called the 'Lady with the Lamp'. You, on the other hand, are the light of my life! You're going to top that board exam!`
      },
      {
        id: 6,
        title: "Physiology Fact",
        content: `Your brain uses about 20% of your body's oxygen and energy. Take a deep breath now, stretch a bit, and remember: Doc Uno is super proud of you!`
      },
      {
        id: 7,
        title: "Dermatology Trivia",
        content: `The skin is the body's largest organ, renewing itself every 28 days! Just like your skin, every day is a fresh start to reach your nursing dreams!`
      }
    ]
  } else {
    return [
      {
        id: 1,
        title: "Cardiology Trivia",
        content: `Did you know, ${greetingName}? The human heart beats about 100,000 times a day to pump blood throughout the systemic circulation! Focus on the details!`
      },
      {
        id: 2,
        title: "Anatomy Fact",
        content: `The smallest bone in the human body is the stapes (stirrup) in the middle ear, which is only about 3mm long! It plays a vital role in sound conduction.`
      },
      {
        id: 3,
        title: "Skeletal Fact",
        content: `Humans are born with approximately 300 bones, which fuse into 206 by adulthood. Remember this for pediatric bone assessments!`
      },
      {
        id: 4,
        title: "Pharmacology Tip",
        content: `Always perform hand hygiene and check the 'Five Rights' of medication administration before giving any drug. Client safety is always the highest priority!`
      },
      {
        id: 5,
        title: "Nursing History",
        content: `Florence Nightingale, the mother of modern nursing, laid the foundation of professional nursing with her principles of sanitation and patient environment.`
      },
      {
        id: 6,
        title: "Physiology Fact",
        content: `The human brain consumes about 20% of the body's total oxygen and energy! Take a deep breath, stay hydrated, and give your brain a quick stretch!`
      },
      {
        id: 7,
        title: "Dermatology Trivia",
        content: `The epidermis renews itself completely every 28 days. Keep studying, stay consistent, and every day will renew your clinical knowledge!`
      }
    ]
  }
}

const getEmptyMessages = (isFrance: boolean, greetingName: string) => {
  if (isFrance) {
    return [
      `No new trivia today, ${greetingName}! Just focus on studying! Doc Uno is cheering for you! I love you!`,
      `No new notifications! Stay hydrated, future nurse! I'm always proud of you! I love you, ${greetingName}!`,
      `The ward is quiet today, ${greetingName}! Time to focus on your nursing board review! I love you!`
    ]
  } else {
    return [
      `No new notifications today, ${greetingName}. Keep focusing on your study review!`,
      `Your notification dashboard is clear. Remember to stay hydrated and take regular breaks!`,
      `Everything is quiet in the clinical logs. Ready for another review session? Let's excel!`
    ]
  }
}

export default function TopBar() {
  const { theme, toggleTheme } = useThemeStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { isFrance, appName, aiAssistantName, greetingName } = usePersonalization()
  const { reminders } = useReminderStore()

  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hasNotification, setHasNotification] = useState(false)
  const [activeFact, setActiveFact] = useState<{ title: string; content: string } | null>(null)
  const [emptyMessage, setEmptyMessage] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  const factsList = getNursingFacts(isFrance, greetingName)
  const emptyList = getEmptyMessages(isFrance, greetingName)

  useEffect(() => {
    // Check if there are any uncompleted reminders due today!
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const dueToday = reminders.filter(r => !r.completed && r.due_date.startsWith(todayStr))

    if (dueToday.length > 0) {
      setHasNotification(true)
      const firstDue = dueToday[0]
      setActiveFact({
        title: `Reminder: ${firstDue.title}`,
        content: isFrance 
          ? `Babe, deadline na ng ${firstDue.title} ngayon! Gusto mo bang mag-review tayo? You got this!`
          : `You have an upcoming deadline for ${firstDue.title} today. Please ensure you are prepared. Let's study!`
      })
    } else {
      // Determine randomly if they have a notification today (65% chance)
      const shouldHaveNotify = Math.random() < 0.65
      setHasNotification(shouldHaveNotify)
      
      if (shouldHaveNotify) {
        const randomFact = factsList[Math.floor(Math.random() * factsList.length)]
        setActiveFact(randomFact)
      } else {
        const randomEmpty = emptyList[Math.floor(Math.random() * emptyList.length)]
        setEmptyMessage(randomEmpty)
      }
    }
  }, [isFrance, greetingName, reminders])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAsRead = () => {
    setHasNotification(false)
    setIsOpen(false)
    // Select a new random empty message for next time
    const randomEmpty = emptyList[Math.floor(Math.random() * emptyList.length)]
    setEmptyMessage(randomEmpty)
  }

  return (
    <header className="h-16 border-b border-[var(--border)] bg-th-card/80 backdrop-blur-md flex items-center justify-between gap-4 px-4 md:px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1">
        <div 
          className="md:hidden flex items-center cursor-pointer"
          onClick={() => navigate('/home')}
        >
          <img 
            src="/france-notes-horizontal-logo-trim.png" 
            alt={`${appName} Logo`} 
            className="h-9 w-auto object-contain" 
          />
        </div>
        
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!searchQuery.trim()) return
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
            setSearchQuery('')
          }}
          className="hidden sm:flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-full px-4 py-2 w-full max-w-md transition-all focus-within:ring-2 focus-within:ring-th-pink/30 focus-within:border-th-pink/40"
        >
          <Search size={16} className="text-[var(--text-secondary)] shrink-0" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, materials, quizzes..." 
            className="bg-transparent border-none outline-none text-[13px] w-full placeholder:text-th-text-secondary/60"
          />
        </form>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={toggleTheme}
          className="btn-icon"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="btn-icon relative transition-transform hover:scale-105 active:scale-95"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {hasNotification && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[var(--pink)] rounded-full border-2 border-[var(--card)] animate-pulse-soft"></span>
            )}
          </button>

          {/* Mobile backdrop */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden fixed inset-0 bg-black/50 z-40"
                style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                onClick={() => setIsOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* Floating Dropdown Speech Bubble with Scale Animation */}
          <AnimatePresence>
            {isOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5, y: 0 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.8 }}
                className="md:absolute md:right-0 md:mt-3.5 md:w-80 md:origin-top-right max-md:fixed max-md:left-4 max-md:right-4 max-md:top-1/2 max-md:-translate-y-1/2 max-md:w-auto max-md:origin-center bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-fn p-4 z-50 text-left"
              >
                {/* Speech Bubble Arrow - desktop only */}
                <div className="hidden md:block absolute -top-1.5 right-[13px] w-3 h-3 bg-[var(--card)] border-t border-l border-[var(--border)] rotate-45 z-40"></div>

                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border)] relative z-50">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-th-pink/20 bg-[var(--secondary-bg)] shrink-0">
                    <img src={isFrance ? "/doc-uno-avatar.jpg" : "/nurse-florence-avatar.jpg"} alt={`${aiAssistantName} Avatar`} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-[var(--text)] font-sans">{aiAssistantName} says...</h4>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      {isFrance ? `Just for you, ${greetingName}` : `Clinical updates for ${greetingName}`}
                    </p>
                  </div>
                </div>

                {hasNotification && activeFact ? (
                  <div className="space-y-3 relative z-50">
                    <div className="bg-th-pink/5 border border-th-pink/10 rounded-xl p-3 text-left">
                      <h5 
                        className="text-xs font-semibold text-[var(--pink)] mb-1"
                        style={{ fontFamily: "'Baloo 2', sans-serif" }}
                      >
                        {activeFact.title}
                      </h5>
                      <p className="text-xs text-[var(--text)] leading-relaxed font-body">
                        {activeFact.content}
                      </p>
                    </div>
                    <button 
                      onClick={handleMarkAsRead}
                      className="w-full btn-primary py-1.5 text-xs rounded-xl flex items-center justify-center gap-1.5 font-semibold shadow-sm transition-all hover:shadow-md hover:scale-[1.01]"
                    >
                      {isFrance ? "Oki Doc!" : "Understood!"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 py-1 text-center relative z-50">
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic px-2 font-body">
                      "{emptyMessage}"
                    </p>
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="mt-2 w-full btn-secondary py-1 text-xs rounded-xl font-semibold hover:bg-[var(--secondary-bg)]"
                    >
                      Close
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-8 w-[1px] bg-[var(--border)] mx-1"></div>

        <div 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl cursor-pointer group transition-all duration-300 hover:bg-th-pink/5 active:scale-95 select-none"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold leading-none group-hover:text-[var(--pink)] transition-colors duration-300">{user?.full_name}</p>
            <p className="text-[10px] text-[var(--text-secondary)] leading-tight mt-0.5">{user?.year_level}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-[var(--secondary-bg)] border-2 border-[var(--pink)] overflow-hidden transition-transform duration-300 group-hover:scale-105 group-hover:rotate-6 shadow-sm">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--pink)] font-bold text-sm">
                {user?.full_name?.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
