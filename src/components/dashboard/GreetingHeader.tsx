import { useAuthStore } from '@/stores/authStore'
import { getGreeting } from '@/lib/utils'
import { motion } from 'framer-motion'

export default function GreetingHeader() {
  const { user } = useAuthStore()
  const greeting = getGreeting()

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="mb-8"
    >
      <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-2 tracking-tight">
        {greeting}, <span className="gradient-text">{user?.full_name?.split(' ')[0]}!</span> ✨
      </h1>
      <p className="text-[var(--text-secondary)] font-medium">
        Ready to make progress on your nursing goals today? 🩺🌸
      </p>
    </motion.div>
  )
}
