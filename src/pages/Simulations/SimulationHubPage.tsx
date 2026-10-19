import { Microphone as Mic, Stethoscope, CaretRight as ChevronRight } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { usePersonalization } from '@/hooks/usePersonalization'

export default function SimulationHubPage() {
  const navigate = useNavigate()
  const { isFrance, aiAssistantName } = usePersonalization()

  return (
    <div className="page-container max-w-4xl mx-auto">
      <PageHeader icon={Stethoscope} title="Clinical Simulations" subtitle="Defend your reasoning, master procedures, and build confidence under pressure." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recitation Mode Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fn-card p-8 group hover:border-[var(--pink)] transition-all cursor-pointer relative overflow-hidden"
          onClick={() => navigate('/recitation')}
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">
            <Mic size={120} />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-[var(--pink)]/10 text-[var(--pink)] flex items-center justify-center mb-6">
              <Mic size={28} />
            </div>
            <h2 className="text-2xl font-bold mb-3">Recitation Mode</h2>
            <p className="text-[var(--text-secondary)] font-medium leading-relaxed mb-8">
              A live oral performance simulator. {isFrance ? 'Doc Uno' : aiAssistantName} acts as your clinical instructor, asking you to verbally defend your knowledge under pressure.
            </p>
            <div className="flex items-center text-sm font-bold text-[var(--pink)] group-hover:translate-x-2 transition-transform">
              Start Recitation <ChevronRight size={18} className="ml-1" />
            </div>
          </div>
        </motion.div>

        {/* RetDem Practice Mode Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="fn-card p-8 group hover:border-[var(--pink)] transition-all cursor-pointer relative overflow-hidden"
          onClick={() => navigate('/retdem')}
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">
            <Stethoscope size={120} />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-[var(--pink)]/10 text-[var(--pink)] flex items-center justify-center mb-6">
              <Stethoscope size={28} />
            </div>
            <h2 className="text-2xl font-bold mb-3">RetDem Practice Mode</h2>
            <p className="text-[var(--text-secondary)] font-medium leading-relaxed mb-8">
              Step-by-step procedural simulation. Perform, explain, and justify every action. Ideal for mastering IVs, wound care, and assessments.
            </p>
            <div className="flex items-center text-sm font-bold text-[var(--pink)] group-hover:translate-x-2 transition-transform">
              Start RetDem <ChevronRight size={18} className="ml-1" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
