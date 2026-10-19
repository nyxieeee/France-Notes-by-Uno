import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FirstAidKit, Flask, Calculator, ChatCircleDots, Pill, CaretRight } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { usePersonalization } from '@/hooks/usePersonalization'

export default function NursingToolsPage() {
  const navigate = useNavigate()
  const { aiAssistantName, isFrance } = usePersonalization()

  const tools = [
    { icon: Flask, title: 'Reference Lab Charts', text: 'Normal ranges with low/high clinical implications and pearls.', to: '/labs-reference' },
    { icon: Calculator, title: 'Dosage Calculator', text: 'IV drip rates, medication doses and conversions, with history.', to: '/dosage-calculator' },
    { icon: Pill, title: 'Drug Lookup', text: 'Search trusted drug references like Drugs.com, FDA and Medscape.', to: '/search?tab=sources' },
    { icon: ChatCircleDots, title: `Ask ${aiAssistantName}`, text: isFrance ? 'Ask anything, anytime — Doc Uno is always here for you.' : 'Ask, learn, and get instant clinical explanations.', to: '/ai' },
  ]

  return (
    <div className="page-container max-w-5xl">
      <PageHeader icon={FirstAidKit} title="Nursing Tools" subtitle="Quick clinical references and calculators for class, duty and the boards." />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map((tool, i) => (
          <motion.button
            key={tool.to}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(tool.to)}
            className="fn-card p-5 text-left flex items-center gap-4 group hover:border-[var(--accent)]"
          >
            <div className="w-12 h-12 rounded-2xl bg-[var(--rose-soft)] border border-[var(--border)] text-[var(--pink)] flex items-center justify-center shrink-0">
              <tool.icon size={24} weight="duotone" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-heading font-semibold text-[15.5px]">{tool.title}</h2>
              <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{tool.text}</p>
            </div>
            <CaretRight size={18} className="text-th-text-secondary/60 group-hover:text-[var(--pink)] group-hover:translate-x-0.5 transition-all" />
          </motion.button>
        ))}
      </div>
    </div>
  )
}
