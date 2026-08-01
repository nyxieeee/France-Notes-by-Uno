import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { 
  Home, 
  Archive, 
  BrainCircuit, 
  MessageCircle, 
  User,
  Sparkles,
  Stethoscope,
  Calendar,
  Library,
  MoreHorizontal,
  X,
  Calculator,
  Mic2,
  FlaskConical
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const primaryNavItems = [
  { icon: Home,          label: 'Home',    path: '/home' },
  { icon: Archive,       label: 'Box',     path: '/study-box' },
  { icon: BrainCircuit,  label: 'Quiz',    path: '/quiz' },
  { icon: MessageCircle, label: 'AI',      path: '/ai' },
  { icon: User,          label: 'Profile', path: '/profile' },
]

const moreNavItems = [
  { icon: Stethoscope, label: 'Simulations', path: '/simulations', isBeta: true },
  { icon: Library,     label: 'Reviewer Library', path: '/reviewer-library' },
  { icon: Sparkles,    label: 'Knowledge Garden', path: '/knowledge-garden' },
  { icon: Calendar,    label: 'Planner',  path: '/planner' },
  { icon: Calculator,  label: 'Dosage Calc', path: '/dosage-calculator' },
  { icon: Mic2,        label: 'Nursepod', path: '/podcast-review' },
  { icon: FlaskConical, label: 'Normal Labs', path: '/labs-reference' },
]

export default function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  const isMoreActive = moreNavItems.some(item => location.pathname.startsWith(item.path))

  // Close drawer when navigating
  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    if (moreOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [moreOpen])

  return (
    <>
      {/* More Drawer Backdrop */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="md:hidden fixed inset-x-0 top-0 bottom-[calc(64px+env(safe-area-inset-bottom,0px))] bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* More Flyout Menu */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            ref={moreRef}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="md:hidden fixed bottom-[72px] right-3 z-50 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-fn-md p-2 min-w-[180px] origin-bottom-right"
          >
            <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-[var(--border)]">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1 rounded-lg hover:bg-[var(--secondary-bg)] text-[var(--text-secondary)] transition-colors"
              >
                <X size={13} />
              </button>
            </div>
            {moreNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative',
                  isActive
                    ? 'bg-[var(--pink)]/10 text-[var(--pink)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)] hover:text-[var(--text)]'
                )}
              >
                <item.icon size={18} />
                <span className="text-sm font-semibold">{item.label}</span>
                {item.isBeta && (
                  <span className="ml-auto bg-[var(--pink)] text-white text-[7px] font-bold px-1.5 py-0.5 rounded-sm tracking-wider">
                    BETA
                  </span>
                )}
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--card)]/90 backdrop-blur-xl border-t border-[var(--border)] flex items-center justify-around px-2 z-50"
        style={{ 
          height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'flex flex-col items-center gap-0.5 px-3 py-1 rounded-2xl transition-all duration-200 min-w-[52px]',
              isActive
                ? 'text-[var(--pink)]'
                : 'text-[var(--text-secondary)]'
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'p-1.5 rounded-xl transition-all duration-300',
                  isActive && 'bg-[var(--pink)]/10 scale-110'
                )}>
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-bold tracking-tight leading-none">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* More Button */}
        <button
          onClick={() => setMoreOpen(prev => !prev)}
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1 rounded-2xl transition-all duration-200 min-w-[52px]',
            (moreOpen || isMoreActive) ? 'text-[var(--pink)]' : 'text-[var(--text-secondary)]'
          )}
        >
          <div className={cn(
            'p-1.5 rounded-xl transition-all duration-300',
            (moreOpen || isMoreActive) && 'bg-[var(--pink)]/10 scale-110'
          )}>
            <MoreHorizontal size={20} strokeWidth={(moreOpen || isMoreActive) ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold tracking-tight leading-none">More</span>
        </button>
      </nav>
    </>
  )
}
