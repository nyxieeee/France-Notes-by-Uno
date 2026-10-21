import type { ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import BackButton from './BackButton'

// Standard page title row: icon tile, title + subtitle, optional actions on the right,
// and a back link for pages that live under another one (e.g. tools under Nursing Tools)
export default function PageHeader({ icon: HeaderIcon, title, subtitle, actions, children, back }: {
  icon: Icon
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  back?: { label: string; to?: string; onClick?: () => void }
}) {
  return (
    <header className="mb-7">
      {back && <BackButton {...back} className="mb-4" />}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[var(--rose-soft)] border border-[var(--border)] text-[var(--pink)] flex items-center justify-center shrink-0 shadow-fn">
            <HeaderIcon size={22} weight="duotone" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-[26px] font-semibold tracking-tight text-[var(--text)] leading-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
      </div>
      {children}
    </header>
  )
}
