import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Mail, Lock, User, ArrowRight, GraduationCap, BookOpen } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { motion } from 'framer-motion'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [school, setSchool] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [error, setError] = useState('')
  const [isPendingConfirmation, setIsPendingConfirmation] = useState(false)
  const { signup, isLoading, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
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

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[var(--secondary-bg)]/30 rounded-full blur-[100px] animate-pulse-soft"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[var(--pink)]/10 rounded-full blur-[100px] animate-pulse-soft animation-delay-400"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] overflow-hidden shadow-fn border-2 border-[var(--pink)]/20 mb-4 animate-float">
            <img src="/france-notes-square-logo.png" alt="France Notes Logo" className="w-full h-full object-cover scale-[1.16]" />
          </div>
          <h1 className="font-logo text-4xl font-bold gradient-text mb-2">France Notes</h1>
          <p className="text-[var(--text-secondary)] font-body">Start your nursing journey today! 🩺✨</p>
        </div>

        <div className="fn-card p-8 bg-[var(--card)]/80 backdrop-blur-md">
          {isPendingConfirmation ? (
            <div className="text-center space-y-6 py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--pink)]/10 text-[var(--pink)] animate-bounce mb-2">
                <Mail size={32} />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text)]">Verify Your Email</h2>
              <div className="space-y-3">
                <p className="text-[var(--text-secondary)] text-sm">
                  We've sent a verification link to <strong className="text-[var(--text)]">{email}</strong>.
                </p>
                <p className="text-[var(--text-secondary)] text-xs">
                  Please click the link inside the email to confirm your address.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-[var(--pink)]/30 border-t-[var(--pink)] rounded-full animate-spin" />
                  <span className="text-xs text-[var(--text-secondary)]">Waiting for confirmation...</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPendingConfirmation(false)}
                  className="text-xs text-[var(--pink)] hover:underline mt-2"
                >
                  Back to Sign Up
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl text-center">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50" size={18} />
                <input 
                  type="text" 
                  className="fn-input pl-11" 
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50" size={18} />
                <input 
                  type="email" 
                  className="fn-input pl-11" 
                  placeholder="name@nursing.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50" size={18} />
                <input 
                  type="password" 
                  className="fn-input pl-11" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* School */}
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Nursing School</label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50" size={18} />
                <input 
                  type="text" 
                  className="fn-input pl-11" 
                  placeholder="University or College name"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                />
              </div>
            </div>

            {/* Year Level */}
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Year Level</label>
              <div className="relative">
                <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50 z-10" size={18} />
                <select
                  className="fn-input pl-11 appearance-none bg-[var(--card)]"
                  value={yearLevel}
                  onChange={(e) => setYearLevel(e.target.value)}
                >
                  <option value="">Select year level</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="RN">Registered Nurse</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Create Account <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>

        <p className="text-center mt-8 text-sm text-[var(--text-secondary)]">
          Already have an account? <Link to="/login" className="text-[var(--pink)] font-semibold hover:underline">Log in</Link>
        </p>
      </motion.div>
    </div>
  )
}
