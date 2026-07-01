import GreetingHeader from '@/components/dashboard/GreetingHeader'
import TodayReminders from '@/components/dashboard/TodayReminders'
import ContinueStudying from '@/components/dashboard/ContinueStudying'
import FunFactCard from '@/components/dashboard/FunFactCard'
import { motion } from 'framer-motion'
import { 
  FileText, 
  Brain, 
  Target, 
  Activity,
  ArrowRight,
  Plus
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { getFileIcon, formatRelativeDate } from '@/lib/utils'
import MarkdownText from '@/components/shared/MarkdownText'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { useQuizStore } from '@/stores/quizStore'
import { useAuthStore } from '@/stores/authStore'
import { useReviewerStore } from '@/stores/reviewerStore'

export default function HomePage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  const { items, getRecentItems } = useStudyBoxStore()
  const { quizzes } = useQuizStore()
  const { user } = useAuthStore()

  const { reviewers } = useReviewerStore()

  const recentUploads = getRecentItems(3)
  const navigate = useNavigate()

  // Calculate actual quiz accuracy
  const completedQuizzes = quizzes.filter(q => q.completed && q.score !== null)
  const avgAccuracy = completedQuizzes.length > 0
    ? Math.round(completedQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / completedQuizzes.length)
    : 0
  const accuracyText = completedQuizzes.length > 0 ? `${avgAccuracy}%` : '--'

  // Calculate actual streak
  const calculateStreak = () => {
    const dates = new Set<string>()
    items.forEach(item => {
      if (item.created_at) dates.add(item.created_at.split('T')[0])
    })
    quizzes.forEach(quiz => {
      if (quiz.created_at) dates.add(quiz.created_at.split('T')[0])
    })

    if (dates.size === 0) return 0

    const sortedDates = Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    const todayStr = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const latestDate = sortedDates[0]
    if (latestDate !== todayStr && latestDate !== yesterdayStr) {
      return 0
    }

    let streak = 0
    const currentCheck = new Date(latestDate)

    while (true) {
      const checkStr = currentCheck.toISOString().split('T')[0]
      if (dates.has(checkStr)) {
        streak++
        currentCheck.setDate(currentCheck.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  }

  const streakValue = calculateStreak()

  // Compute weak topics from real quiz data (quizzes below 75%)
  const weakTopics = completedQuizzes
    .filter(q => (q.score || 0) < 75 && q.title)
    .sort((a, b) => (a.score || 0) - (b.score || 0))
    .slice(0, 3)
    .map(q => ({ topic: q.title, progress: q.score || 0 }))

  const stats = [
    { icon: FileText, label: 'Notes', value: items.length.toString(), color: 'bg-blue-100 text-blue-600' },
    { icon: Brain, label: 'Quizzes', value: quizzes.length.toString(), color: 'bg-purple-100 text-purple-600' },
    { icon: Target, label: 'Accuracy', value: accuracyText, color: 'bg-[var(--success)]/20 text-[var(--success)]' },
    { icon: Activity, label: 'Study Streak', value: `${streakValue}d`, color: 'bg-orange-100 text-orange-600' },
  ]

  return (
    <div className="page-container">
      <GreetingHeader />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Left Column: Stats & Main Widgets */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div key={i} variants={itemVariants} className="fn-card p-4 flex flex-col items-center justify-center text-center">
                <div className={`p-2 rounded-xl mb-2 ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <TodayReminders />
            </motion.div>
            <motion.div variants={itemVariants}>
              <ContinueStudying />
            </motion.div>
          </div>

          {/* Recent Uploads Section */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="section-title mb-0">Recent Uploads</h3>
              <Link to="/study-box" className="text-xs font-semibold text-[var(--pink)] hover:underline flex items-center gap-1">
                Open Study Box <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recentUploads.map((file) => (
                <div
                  key={file.id}
                  className="fn-card p-4 hover:border-[var(--pink)] transition-colors cursor-pointer group"
                  onClick={() => navigate('/study-box', { state: { openItemId: file.id } })}
                >
                  <div className="text-2xl mb-3 group-hover:scale-105 transition-transform">{getFileIcon(file.file_type)}</div>
                  <h4 className="font-bold text-sm mb-1 truncate">{file.file_name}</h4>
                  <p className="text-[10px] text-[var(--text-secondary)] font-medium">{formatRelativeDate(file.created_at)}</p>
                </div>
              ))}
              <Link to="/study-box" className="fn-card p-4 border-dashed border-2 flex flex-col items-center justify-center text-[var(--text-secondary)] hover:text-[var(--pink)] hover:border-[var(--pink)] transition-all">
                <Plus size={24} className="mb-2" />
                <span className="text-xs font-bold uppercase tracking-widest">Add New</span>
              </Link>
            </div>
          </motion.section>
        </div>

        {/* Right Column: AI Fun Fact & Suggestions */}
        <div className="space-y-6">
          <motion.div variants={itemVariants}>
            <FunFactCard />
          </motion.div>

          {items.length > 0 && (
            <motion.div variants={itemVariants} className="fn-card p-6">
              <h3 className="font-heading font-bold text-lg mb-4">Quiz Suggestion</h3>
              <div className="p-4 rounded-2xl bg-[var(--secondary-bg)]/30 border border-[var(--border)]">
                <div className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                  <MarkdownText content={`"Based on your recent notes, you might want to review **${items[0]?.file_name.split('.')[0]}** today! ✨"`} />
                </div>
                <Link to="/quiz" className="btn-primary w-full py-2.5 text-sm flex items-center justify-center">
                  Start suggested quiz
                </Link>
              </div>
            </motion.div>
          )}

          {weakTopics.length > 0 && (
            <motion.div variants={itemVariants} className="fn-card p-6">
               <h3 className="font-heading font-bold text-lg mb-4">Weak Topics</h3>
               <div className="space-y-4">
                 {weakTopics.map((topic, i) => (
                   <div key={i} className="space-y-1">
                     <div className="flex justify-between text-xs font-bold">
                       <span className="truncate pr-2">{topic.topic}</span>
                       <span className="text-[var(--pink)] shrink-0">{topic.progress}%</span>
                     </div>
                     <div className="h-1.5 w-full bg-[var(--secondary-bg)] rounded-full overflow-hidden">
                       <div className="h-full bg-[var(--pink)] rounded-full" style={{ width: `${topic.progress}%` }}></div>
                     </div>
                   </div>
                 ))}
               </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
