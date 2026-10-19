import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Envelope, ArrowRight, ArrowLeft, EnvelopeSimpleOpen } from '@phosphor-icons/react'
import { useAuthStore } from '@/stores/authStore'
import AuthLayout from '@/components/auth/AuthLayout'
import { AuthField, AuthError, AuthStatus, Spinner } from '@/components/auth/AuthFields'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { resetPassword, isLoading } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await resetPassword(email)
      setIsSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email. Please try again.')
    }
  }

  if (isSent) {
    return (
      <AuthLayout footerNote="You got this! ♡">
        <AuthStatus icon={EnvelopeSimpleOpen} title="Check Your Email">
          <p>We've sent a password reset link to<br /><strong className="text-[var(--text)]">{email}</strong></p>
          <p className="text-xs">Click the link in your inbox to reset your password. If you don't see it, check your spam folder.</p>
        </AuthStatus>
        <div className="mt-7 flex flex-col items-center gap-3">
          <Link to="/login" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            Back to Sign In <ArrowRight size={17} />
          </Link>
          <button type="button" onClick={() => setIsSent(false)} className="text-xs font-medium text-[var(--pink)] hover:underline">
            Didn't get it? Send again
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout footerNote="It happens. Reset and keep going ♡">
      <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--pink)] mb-5">
        <ArrowLeft size={14} /> Back to Sign In
      </Link>
      <h1 className="text-[28px] font-semibold tracking-tight">Forgot Your Password?</h1>
      <p className="mt-1.5 mb-7 text-sm text-[var(--text-secondary)]">
        No worries! Enter your email and we'll send you a link to get back into your account.
      </p>

      <AuthError message={error} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField label="Email Address" icon={Envelope} type="email" autoComplete="email" placeholder="Enter your email address" value={email} onChange={e => setEmail(e.target.value)} required />
        <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          {isLoading ? <Spinner /> : <>Send Reset Link <ArrowRight size={17} /></>}
        </button>
      </form>
    </AuthLayout>
  )
}
