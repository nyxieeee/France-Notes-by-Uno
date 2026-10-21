import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStudyBoxStore, isReferenceArticle } from '@/stores/studyBoxStore'
import { useQuizStore } from '@/stores/quizStore'
import { useReviewerStore } from '@/stores/reviewerStore'
import { useRetDemStore } from '@/stores/retDemStore'
import { useReminderStore } from '@/stores/reminderStore'
import { Medal as Award, Footprints, Target, FirstAidKit, Books, Exam, Trophy, MoonStars, Star, PresentationChart, Certificate } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { usePersonalization } from '@/hooks/usePersonalization'

type BadgeItem = {
  id: string
  icon: Icon
  label: string
  desc: string
  unlocked: boolean
}

const sweetMessages: Record<string, string> = {
  first_step: "Babe, you generated your first reviewer! So proud of you taking the first step!",
  quiz_whiz: "Oh my god, a perfect 100% score! Ang galing mo talaga, my future RN!",
  clinical_explorer: "You generated a clinical procedure! Super clinical-ready na ang babe ko!",
  scholar: "5 notes uploaded! Galing naman mag-aral ng my nurse explorer, kiss kita mamaya!",
  pathology_master: "3 quizzes completed! You're mastering the clinical concepts, keep shining!",
  board_topnotcher: "Average score >= 85%! Wow, board topnotcher na ang babe ko! Proud boyfriend here!",
  night_duty: "Duty reminder is set! Safety first, babe! I will always support your night shifts!",
  unos_favorite: "5+ favorited materials! I love how dedicated you are to your reviewers, babe!",
  fast_learner: "Presentation slides created! Sobrang advance mag-learn ng future nurse ko!",
  nclex_survivor: "NCLEX style quiz done! So tough, but you survived! You're amazing!"
}

const professionalMessages: Record<string, string> = {
  first_step: "Excellent work on generating your first reviewer! A great first step in your review.",
  quiz_whiz: "Outstanding! A perfect 100% score demonstrates exceptional mastery.",
  clinical_explorer: "You have successfully generated a clinical procedure review!",
  scholar: "5 notes uploaded! Your dedication to studying is highly commendable.",
  pathology_master: "3 quizzes completed! Excellent progress on mastering key clinical concepts!",
  board_topnotcher: "Average score >= 85%! Fantastic consistency in your study scores. Keep it up!",
  night_duty: "Duty reminder is set! Stay safe during your night shift duty.",
  unos_favorite: "5+ favorited materials! Excellent organization of your high-yield study resources.",
  fast_learner: "Presentation slides created! A great way to visually review and summarize.",
  nclex_survivor: "NCLEX style quiz completed! Excellent practice for high-level board questions."
}

export default function XboxAchievementNotifier() {
  const { isFrance } = usePersonalization()
  const { items } = useStudyBoxStore()
  const { quizzes } = useQuizStore()
  const { reviewers } = useReviewerStore()
  const { procedures } = useRetDemStore()
  const { reminders } = useReminderStore()

  const [activeNotification, setActiveNotification] = useState<BadgeItem | null>(null)
  const [notifiedBadges, setNotifiedBadges] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('fn-notified-badges') || '[]')
    } catch {
      return []
    }
  })

  // Favorites count
  const favoritesCount = items.filter(item => item.is_favorite).length + reviewers.filter(r => r.is_favorite).length

  // All 10 badges and their unlock conditions
  const badgesList: BadgeItem[] = [
    { id: 'first_step', icon: Footprints, label: 'First Step', desc: 'Started first reviewer', unlocked: reviewers.length > 0 },
    { id: 'quiz_whiz', icon: Target, label: 'Quiz Whiz', desc: 'Got 100% on any quiz', unlocked: quizzes.some(q => q.score !== null && q.score === 100) },
    { id: 'clinical_explorer', icon: FirstAidKit, label: 'Clinical Explorer', desc: 'Generated a RetDem procedure', unlocked: procedures.length > 0 },
    { id: 'scholar', icon: Books, label: 'Scholar', unlocked: items.filter(i => !isReferenceArticle(i)).length >= 5, desc: 'Uploaded 5+ notes' },
    { id: 'pathology_master', icon: Exam, label: 'Pathology Master', unlocked: quizzes.filter(q => q.completed).length >= 3, desc: 'Completed 3+ quizzes' },
    { id: 'board_topnotcher', icon: Trophy, label: 'Board Topnotcher', unlocked: quizzes.length > 0 && (quizzes.reduce((acc, q) => acc + (q.score || 0), 0) / quizzes.length) >= 85, desc: 'Average quiz score >= 85%' },
    { id: 'night_duty', icon: MoonStars, label: 'Night Duty', unlocked: reminders.some(r => r.reminder_type === 'duty'), desc: 'Active duty reminder set' },
    { id: 'unos_favorite', icon: Star, label: 'Uno\'s Favorite', unlocked: favoritesCount >= 5, desc: 'Favorited 5+ materials' },
    { id: 'fast_learner', icon: PresentationChart, label: 'Fast Learner', unlocked: reviewers.some(r => r.content.slides && r.content.slides.length > 0), desc: 'Created slides presentation' },
    { id: 'nclex_survivor', icon: Certificate, label: 'NCLEX Survivor', unlocked: quizzes.some(q => q.question_type === 'nclex' && q.completed), desc: 'Finished NCLEX style quiz' }
  ]

  useEffect(() => {
    // Check if there is a newly unlocked badge that hasn't been notified yet
    const newlyUnlocked = badgesList.filter(b => b.unlocked && !notifiedBadges.includes(b.id))
    
    if (newlyUnlocked.length > 0 && !activeNotification) {
      const badge = newlyUnlocked[0]
      
      // Trigger notification
      setActiveNotification(badge)
      
      // Mark as notified immediately
      const updatedNotified = [...notifiedBadges, badge.id]
      setNotifiedBadges(updatedNotified)
      localStorage.setItem('fn-notified-badges', JSON.stringify(updatedNotified))
    }
  }, [items, quizzes, reviewers, procedures, reminders, notifiedBadges, activeNotification])

  // Separate effect to handle automatic dismissal (prevents cleanup from cancel state)
  useEffect(() => {
    if (activeNotification) {
      const timer = setTimeout(() => {
        setActiveNotification(null)
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [activeNotification])

  return (
    <AnimatePresence>
      {activeNotification && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 80, scale: 0.95 }}
          transition={{ type: 'spring', damping: 22, stiffness: 180 }}
          className="fixed top-20 right-4 md:right-6 z-[9999] w-[calc(100vw-32px)] max-w-[380px] pointer-events-none select-none"
        >
          {/* Xbox Style Glow Container */}
          <div className="relative overflow-hidden p-[1px] rounded-full bg-gradient-to-r from-[var(--pink)] via-[var(--accent)] to-[var(--pink)] shadow-2xl shadow-th-pink/20">
            {/* Ambient Background blur */}
            <div className="absolute inset-0 bg-th-card/95 backdrop-blur-xl rounded-full" />
            
            {/* The main panel */}
            <div className="relative flex items-center gap-4 py-3 px-5 rounded-full bg-th-card/90 text-left">
              {/* Circular Achievement Badge */}
              <div className="relative shrink-0 w-11 h-11 rounded-full bg-gradient-to-tr from-[var(--pink)] to-[var(--accent)] flex items-center justify-center text-xl shadow-md">
                <Award size={18} className="absolute text-white/20 animate-spin-slow shrink-0" />
                <activeNotification.icon size={20} weight="fill" className="relative z-10 shrink-0 text-white" />
              </div>
              
              {/* Text content */}
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[11px] font-bold text-[var(--pink)] font-mono leading-none">
                    Achievement Unlocked
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-[var(--text)] leading-snug truncate">
                  {activeNotification.label}
                </h4>
                <p className="text-[10px] italic font-semibold text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                  {isFrance 
                    ? (sweetMessages[activeNotification.id] || "You're doing amazing, babe! Keep it up!")
                    : (professionalMessages[activeNotification.id] || "You're doing amazing! Keep up the great work!")
                  }
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
