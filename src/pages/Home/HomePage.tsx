import { motion } from 'framer-motion'
import HeroBanner from '@/components/dashboard/HeroBanner'
import StatCards from '@/components/dashboard/StatCards'
import ContinueLearning from '@/components/dashboard/ContinueLearning'
import ProgressCard from '@/components/dashboard/ProgressCard'
import TodayTasks from '@/components/dashboard/TodayTasks'
import QuickTools from '@/components/dashboard/QuickTools'
import StreakCard from '@/components/dashboard/StreakCard'
import FunFactCard from '@/components/dashboard/FunFactCard'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

export default function HomePage() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="page-container max-w-7xl grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5"
    >
      <div className="space-y-5 min-w-0">
        <motion.div variants={item}><HeroBanner /></motion.div>
        <motion.div variants={item}><StatCards /></motion.div>
        <motion.div variants={item}><ContinueLearning /></motion.div>
        <motion.div variants={item}><ProgressCard /></motion.div>
      </div>

      <div className="space-y-5 min-w-0">
        <motion.div variants={item}><TodayTasks /></motion.div>
        <motion.div variants={item}><StreakCard /></motion.div>
        <motion.div variants={item}><QuickTools /></motion.div>
        <motion.div variants={item}><FunFactCard /></motion.div>
      </div>
    </motion.div>
  )
}
