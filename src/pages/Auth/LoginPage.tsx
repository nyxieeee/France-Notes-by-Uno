import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Envelope, Lock, ArrowRight, Heart } from '@phosphor-icons/react'
import { useAuthStore } from '@/stores/authStore'
import AuthLayout from '@/components/auth/AuthLayout'
import { AuthField, PasswordField, GoogleButton, OrDivider, AuthError, Spinner } from '@/components/auth/AuthFields'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // OAuth failures come back as ?error_description=... on the redirect
  const [error, setError] = useState<string | null>(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const urlError = searchParams.get('error_description') || searchParams.get('error')
    return urlError ? urlError.replace(/\+/g, ' ') : null
  })
  const { login, loginWithGoogle, isLoading, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      navigate('/home')
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.')
    }
  }

  const handleGoogle = async () => {
    setError(null)
    await loginWithGoogle()
    // Redirect is handled automatically by Supabase OAuth flow
  }

  return (
    <AuthLayout footerNote="You got this! ♡">
      <h1 className="text-[28px] font-semibold tracking-tight flex items-center gap-2">
        Welcome Back <Heart size={24} className="text-[var(--pink)]" />
      </h1>
      <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
        Sign in to continue your nursing journey with France Notes.
      </p>

      <div className="mt-7">
        <GoogleButton onClick={handleGoogle} disabled={isLoading} />
      </div>

      <OrDivider />

      <AuthError message={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          label="Email Address" icon={Envelope} type="email" autoComplete="email"
          placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required
        />
        <PasswordField
          label="Password" icon={Lock} autoComplete="current-password"
          placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-medium text-[var(--pink)] hover:underline">Forgot password?</Link>
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          {isLoading ? <Spinner /> : <>Sign In <ArrowRight size={17} /></>}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-[var(--text-secondary)]">
        Don't have an account?{' '}
        <Link to="/signup" className="font-medium text-[var(--pink)] hover:underline">Create one →</Link>
      </p>
    </AuthLayout>
  )
}
