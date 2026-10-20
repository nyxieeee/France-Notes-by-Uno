import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, ArrowRight, CheckCircle, LinkBreak } from '@phosphor-icons/react'
import { useAuthStore } from '@/stores/authStore'
import AuthLayout from '@/components/auth/AuthLayout'
import { passwordMeetsRules } from '@/lib/passwordRules'
import { PasswordField, PasswordRules, AuthError, AuthStatus, Spinner } from '@/components/auth/AuthFields'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { updatePassword, isLoading, isAuthenticated, isInitialLoading } = useAuthStore()
  const navigate = useNavigate()
  // Supabase reports a used or expired reset link in the URL (e.g. #error_code=otp_expired).
  // Read it once on arrival, before the auth client tidies the URL.
  const [linkFailed, setLinkFailed] = useState(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, '') + '&' + window.location.search.replace(/^\?/, ''))
    return params.has('error') || params.has('error_code')
  })
  const [arrivedWithToken] = useState(() => /access_token=|type=recovery/.test(window.location.hash) || new URLSearchParams(window.location.search).has('code'))
  // No recovery session and not signed in: the link was already used or opened in another browser
  const linkExpired = linkFailed || (!isInitialLoading && !isAuthenticated && !arrivedWithToken)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!passwordMeetsRules(password)) {
      setError('Please choose a password that meets all the requirements below.')
      return
    }

    try {
      await updatePassword(password)
      setIsSuccess(true)
    } catch (err: any) {
      if (/session missing|expired|invalid/i.test(err?.message || '')) setLinkFailed(true)
      else setError(err.message || 'Failed to update password. Please try again.')
    }
  }

  if (isSuccess) {
    return (
      <AuthLayout footerNote="New password, new progress ♡">
        <AuthStatus icon={CheckCircle} title="Password Updated!">
          <p>Your password has been changed successfully.</p>
        </AuthStatus>
        <button
          onClick={() => navigate(isAuthenticated ? '/home' : '/login')}
          className="btn-primary w-full py-3 mt-7 flex items-center justify-center gap-2"
        >
          {isAuthenticated ? 'Back to Dashboard' : 'Go to Sign In'} <ArrowRight size={17} />
        </button>
      </AuthLayout>
    )
  }

  if (linkExpired) {
    return (
      <AuthLayout footerNote="It happens. Request a new link and keep going ♡">
        <AuthStatus icon={LinkBreak} title="This Link Has Expired">
          <p>Password reset links only work once and expire after a while. Request a new one and use the latest email.</p>
        </AuthStatus>
        <Link to="/forgot-password" className="btn-primary w-full py-3 mt-7 flex items-center justify-center gap-2">
          Send a New Link <ArrowRight size={17} />
        </Link>
        <Link to="/login" className="block text-center text-xs font-medium text-[var(--pink)] hover:underline mt-4">
          Back to Sign In
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout footerNote="Secure today, for a safer tomorrow ♡">
      <h1 className="text-[28px] font-semibold tracking-tight">Set a New Password</h1>
      <p className="mt-1.5 mb-7 text-sm text-[var(--text-secondary)]">
        Choose a strong password you haven't used before.
      </p>

      <AuthError message={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField label="New Password" icon={Lock} autoComplete="new-password" placeholder="Enter new password" value={password} onChange={e => setPassword(e.target.value)} required />
        <PasswordField label="Confirm Password" icon={Lock} autoComplete="new-password" placeholder="Confirm your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
        <PasswordRules password={password} />
        <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          {isLoading ? <Spinner /> : <>Update Password <ArrowRight size={17} /></>}
        </button>
      </form>
    </AuthLayout>
  )
}
