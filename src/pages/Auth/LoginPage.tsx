import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { login, loginWithGoogle, isLoading, isAuthenticated } = useAuthStore()
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
      await login(email, password)
      navigate('/home')
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.')
    }
  }

  const handleGoogle = async () => {
    setError('')
    await loginWithGoogle()
    // Redirect is handled automatically by Supabase OAuth flow
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[var(--secondary-bg)]/30 rounded-full blur-[100px] animate-pulse-soft"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-[var(--pink)]/10 rounded-full blur-[100px] animate-pulse-soft animation-delay-400"></div>

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
          <p className="text-[var(--text-secondary)] font-body">Welcome back, future nurse! 🩺✨</p>
        </div>

        <div className="fn-card p-8 bg-[var(--card)]/80 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-5">
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

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold">Password</label>
                <Link to="/forgot-password" className="text-xs text-[var(--pink)] hover:underline">Forgot?</Link>
              </div>
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

            <button 
              type="submit" 
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--card)] px-2 text-[var(--text-secondary)]">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {error && (
              <p className="text-xs text-red-400 text-center -mt-2">{error}</p>
            )}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={isLoading}
              className="btn-secondary flex items-center justify-center gap-2 py-2.5"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              <span className="text-sm">Continue with Google</span>
            </button>
          </div>
        </div>

        <p className="text-center mt-8 text-sm text-[var(--text-secondary)]">
          New here? <Link to="/signup" className="text-[var(--pink)] font-semibold hover:underline">Create an account</Link>
        </p>
      </motion.div>
    </div>
  )
}
