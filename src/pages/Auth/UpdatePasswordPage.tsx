import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowRight, CheckCircle } from '@phosphor-icons/react'
import { useAuthStore } from '@/stores/authStore'
import AuthLayout from '@/components/auth/AuthLayout'
import { PasswordField, PasswordRules, passwordMeetsRules, AuthError, AuthStatus, Spinner } from '@/components/auth/AuthFields'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { updatePassword, isLoading, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

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
      setError(err.message || 'Failed to update password. Link might be expired.')
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
