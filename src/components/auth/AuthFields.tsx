import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeSlash, CheckCircle, Circle } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { PASSWORD_RULES } from '@/lib/passwordRules'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; icon: Icon; trailing?: ReactNode }

export function AuthField({ label, icon: FieldIcon, trailing, className, ...input }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-[var(--text)] mb-1.5">{label}</span>
      <span className="relative block">
        <FieldIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-th-text-secondary/70 pointer-events-none" />
        <input
          {...input}
          className={cn('fn-input rounded-xl bg-[var(--card)] pl-11 py-2.5 text-sm', trailing ? 'pr-11' : '', className)}
        />
        {trailing}
      </span>
    </label>
  )
}

export function PasswordField(props: Omit<FieldProps, 'type' | 'trailing'>) {
  const [visible, setVisible] = useState(false)
  return (
    <AuthField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-th-text-secondary/70 hover:text-[var(--pink)]"
        >
          {visible ? <EyeSlash size={18} /> : <Eye size={18} />}
        </button>
      }
    />
  )
}

export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="space-y-1">
      {PASSWORD_RULES.map(rule => {
        const ok = rule.test(password)
        return (
          <li key={rule.label} className={cn('flex items-center gap-2 text-xs', ok ? 'text-[var(--success)]' : 'text-[var(--text-secondary)]')}>
            {ok ? <CheckCircle size={15} weight="fill" /> : <Circle size={15} />}
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}

export function GoogleButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--rose-soft)] transition-colors text-sm font-medium disabled:opacity-50"
    >
      <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      <span className="flex-1 text-left">Continue with Google</span>
    </button>
  )
}

export function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px flex-1 bg-[var(--border)]" />
      <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">{label}</span>
      <div className="h-px flex-1 bg-[var(--border)]" />
    </div>
  )
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="mb-4 px-3 py-2.5 rounded-xl bg-th-error/10 border border-th-error/25 text-[var(--error)] text-[13px]">
      {message}
    </p>
  )
}

export function Spinner() {
  return <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
}

// Centered confirmation state (email sent, password changed, account created)
export function AuthStatus({ icon: StatusIcon, title, children }: { icon: Icon; title: string; children: ReactNode }) {
  return (
    <div className="text-center">
      <div className="relative mx-auto mb-6 w-24 h-24 rounded-full bg-[var(--rose-soft)] border border-[var(--border)] flex items-center justify-center">
        <StatusIcon size={44} weight="duotone" className="text-[var(--pink)]" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed space-y-3">{children}</div>
    </div>
  )
}
