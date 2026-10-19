import { Link } from 'react-router-dom'
import { Lightning as Zap, ChatCircleDots as MessageCircle, Flask as FlaskConical, Calculator, NotePencil, CaretRight as ChevronRight } from '@phosphor-icons/react'
import { usePersonalization } from '@/hooks/usePersonalization'

export default function QuickTools() {
  const { aiAssistantName } = usePersonalization()

  const tools = [
    { icon: MessageCircle, label: aiAssistantName, caption: 'Ask, learn, get instant help', to: '/ai' },
    { icon: FlaskConical, label: 'Reference Lab Charts', caption: 'Lab values & clinical pearls', to: '/labs-reference' },
    { icon: Calculator, label: 'Dosage Calculator', caption: 'Doses, drips & conversions', to: '/dosage-calculator' },
    { icon: NotePencil, label: 'Notes', caption: 'Type or handwrite your notes', to: '/notes' },
  ]

  return (
    <section className="fn-card p-5">
      <h2 className="font-heading font-semibold text-[15px] flex items-center gap-2 mb-3">
        <Zap size={16} className="text-[var(--pink)]" /> Quick Tools
      </h2>
      <div className="space-y-1">
        {tools.map(tool => (
          <Link key={tool.to} to={tool.to} className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-[var(--rose-soft)] transition-colors group">
            <div className="w-9 h-9 rounded-xl bg-[var(--rose-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--pink)] shrink-0">
              <tool.icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--text)]">{tool.label}</p>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">{tool.caption}</p>
            </div>
            <ChevronRight size={15} className="text-th-text-secondary/60 group-hover:text-[var(--pink)] transition-colors" />
          </Link>
        ))}
      </div>
    </section>
  )
}
