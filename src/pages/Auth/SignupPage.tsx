import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Envelope, Lock, User, ArrowRight, ArrowLeft, GraduationCap, BookOpen, CaretDown, EnvelopeSimpleOpen } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import AuthLayout from '@/components/auth/AuthLayout'
import { passwordMeetsRules } from '@/lib/passwordRules'
import {
  AuthField, PasswordField, PasswordRules,
  GoogleButton, OrDivider, AuthError, AuthStatus, Spinner,
} from '@/components/auth/AuthFields'

const YEAR_LEVELS = [
  { value: '1st Year', label: '1st Year' },
  { value: '2nd Year', label: '2nd Year' },
  { value: '3rd Year', label: '3rd Year' },
  { value: '4th Year', label: '4th Year' },
  { value: 'RN', label: 'Registered Nurse' },
]

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [school, setSchool] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPendingConfirmation, setIsPendingConfirmation] = useState(false)
  const { signup, loginWithGoogle, isLoading, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!passwordMeetsRules(password)) {
      setError('Please choose a password that meets all the requirements below.')
      return
    }
    try {
      const res = await signup(name, email, password, school, yearLevel)
      if (res?.confirmationRequired) {
        setIsPendingConfirmation(true)
      } else {
        navigate('/home')
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.')
    }
  }

  if (isPendingConfirmation) {
    return (
      <AuthLayout footerNote="Almost there! ♡">
        <AuthStatus icon={EnvelopeSimpleOpen} title="Check Your Email">
          <p>We've sent a verification link to<br /><strong className="text-[var(--text)]">{email}</strong></p>
          <p className="text-xs">Click the link in your inbox to verify your account. If you don't see it, check your spam folder.</p>
        </AuthStatus>
        <div className="mt-7 flex flex-col items-center gap-3">
          <Link to="/login" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            Go to Sign In <ArrowRight size={17} />
          </Link>
          <button type="button" onClick={() => setIsPendingConfirmation(false)} className="text-xs font-medium text-[var(--pink)] hover:underline flex items-center gap-1">
            <ArrowLeft size={13} /> Wrong email? Go back
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout footerNote="You're one step closer to your dreams ♡">
      <h1 className="text-[28px] font-semibold tracking-tight">Create Your Account</h1>
      <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
        Join future RNs and get access to all the tools you need.
      </p>

      <div className="mt-6">
        <GoogleButton onClick={() => loginWithGoogle()} disabled={isLoading} />
      </div>

      <OrDivider />

      <AuthError message={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Full Name" icon={User} autoComplete="name" placeholder="Enter your full name" value={name} onChange={e => setName(e.target.value)} required />
        <AuthField label="Email Address" icon={Envelope} type="email" autoComplete="email" placeholder="Enter your email address" value={email} onChange={e => setEmail(e.target.value)} required />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AuthField label="Nursing School" icon={GraduationCap} placeholder="School name" value={school} onChange={e => setSchool(e.target.value)} />

          <div className="relative z-20">
            <span className="block text-[13px] font-medium text-[var(--text)] mb-1.5">Year Level</span>
            <button
              type="button"
              onClick={() => setIsYearDropdownOpen(o => !o)}
              className="fn-input rounded-xl bg-[var(--card)] pl-11 pr-9 py-2.5 text-sm text-left relative"
            >
              <BookOpen size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-th-text-secondary/70" />
              <span className={yearLevel ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}>
                {YEAR_LEVELS.find(o => o.value === yearLevel)?.label || 'Select'}
              </span>
              <CaretDown size={15} className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isYearDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsYearDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute z-50 w-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-fn-md overflow-hidden"
                >
                  {YEAR_LEVELS.map(option => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => { setYearLevel(option.value); setIsYearDropdownOpen(false) }}
                      className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--rose-soft)] ${yearLevel === option.value ? 'text-[var(--pink)] font-medium' : ''}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </div>
        </div>

        <PasswordField label="Password" icon={Lock} autoComplete="new-password" placeholder="Create a password" value={password} onChange={e => setPassword(e.target.value)} required />
        <PasswordRules password={password} />

        <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          {isLoading ? <Spinner /> : <>Create Account <ArrowRight size={17} /></>}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-[var(--text-secondary)]">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-[var(--pink)] hover:underline">Sign in →</Link>
      </p>
    </AuthLayout>
  )
}
