import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// One consistent "← Back" pill for leaving a sub-page or an in-page view
export default function BackButton({ label, to, onClick, className }: {
  label: string
  to?: string
  onClick?: () => void
  className?: string
}) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => (onClick ? onClick() : to ? navigate(to) : navigate(-1))}
      className={cn(
        'inline-flex items-center gap-1.5 pl-2.5 pr-3.5 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] text-[13px] font-medium text-[var(--text)] hover:text-[var(--pink)] hover:border-[var(--accent)] transition-colors shrink-0',
        className,
      )}
    >
      <ArrowLeft size={15} /> {label}
    </button>
  )
}
