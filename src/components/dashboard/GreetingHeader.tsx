import { useAuthStore } from '@/stores/authStore'
import { getGreeting } from '@/lib/utils'
import { usePersonalization } from '@/hooks/usePersonalization'
import { motion } from 'framer-motion'

export default function GreetingHeader() {
  const { user } = useAuthStore()
  const { isFrance, greetingName } = usePersonalization()
  const greeting = getGreeting()

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="mb-8"
    >
      <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-2 tracking-tight">
        {greeting}, <span className="gradient-text">{greetingName}!</span> {isFrance ? '🩷' : '✨'}
      </h1>
      <p className="text-[var(--text-secondary)] font-medium">
        {isFrance
          ? "Ready to make progress on your nursing goals today? 🩺🌸"
          : "Ready to make progress on your nursing goals today? 🩺"
        }
      </p>
    </motion.div>
  )
}
