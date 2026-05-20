import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Mail, Lock, User, ArrowRight, GraduationCap, BookOpen, Eye, EyeOff, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { motion } from 'framer-motion'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [school, setSchool] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false)
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
      console.log('Submitting signup form for email:', email)
      const res = await signup(name, email, password, school, yearLevel)
      console.log('Signup result returned:', res)
      if (res?.confirmationRequired) {
        console.log('Confirmation is required, setting isPendingConfirmation to true')
        setIsPendingConfirmation(true)
      } else {
        console.log('Confirmation NOT required, navigating to /home')
        navigate('/home')
      }
    } catch (err: any) {
      console.error('Signup error caught:', err)
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
                  type={showPassword ? "text" : "password"} 
                  className="fn-input pl-11 pr-11" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50 hover:text-[var(--pink)] transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
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
            <div className="space-y-2 relative z-20">
              <label className="text-sm font-semibold ml-1">Year Level</label>
              <div 
                className="relative cursor-pointer"
                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              >
                <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50 z-10" size={18} />
                <div className={`fn-input pl-11 flex items-center bg-[var(--card)] ${!yearLevel ? 'text-[var(--text-secondary)]/70' : 'text-[var(--text)]'}`}>
                  {yearLevel ? [
                    { value: '1st Year', label: '1st Year' },
                    { value: '2nd Year', label: '2nd Year' },
                    { value: '3rd Year', label: '3rd Year' },
                    { value: '4th Year', label: '4th Year' },
                    { value: 'RN', label: 'Registered Nurse' }
                  ].find(o => o.value === yearLevel)?.label : "Select year level"}
                </div>
                <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50 transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} size={18} />
              </div>
              
              {isYearDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsYearDropdownOpen(false)}></div>
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-50 w-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden"
                  >
                    {[
                      { value: '1st Year', label: '1st Year' },
                      { value: '2nd Year', label: '2nd Year' },
                      { value: '3rd Year', label: '3rd Year' },
                      { value: '4th Year', label: '4th Year' },
                      { value: 'RN', label: 'Registered Nurse' }
                    ].map(option => (
                      <div
                        key={option.value}
                        className={`px-4 py-3 hover:bg-[var(--secondary-bg)] cursor-pointer text-sm transition-colors ${yearLevel === option.value ? 'bg-[var(--pink)]/10 text-[var(--pink)] font-medium' : 'text-[var(--text)]'}`}
                        onClick={() => {
                          setYearLevel(option.value)
                          setIsYearDropdownOpen(false)
                        }}
                      >
                        {option.label}
                      </div>
                    ))}
                  </motion.div>
                </>
              )}
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
