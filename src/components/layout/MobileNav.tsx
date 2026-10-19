import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { House as Home, Archive, MagnifyingGlass as Search, DotsThree as MoreHorizontal, X, Headphones } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigation, isNavItemActive } from './navigation'

const primaryNavItems = [
  { icon: Home,       label: 'Home',   path: '/home' },
  { icon: Archive,    label: 'Study',  path: '/study-box' },
  { icon: Headphones, label: 'Listen', path: '/podcast-review' },
  { icon: Search,     label: 'Search', path: '/search' },
]

export default function MobileNav() {
  // Everything not in the bottom bar goes in the More sheet, Quizzes and Notes first
  const moreNavItems = useNavigation()
    .flatMap(g => g.items)
    .filter(item => !primaryNavItems.some(p => p.path === item.path))
    .sort((a, b) => Number(['/quiz', '/notes'].includes(b.path)) - Number(['/quiz', '/notes'].includes(a.path)))

  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  const isMoreActive = moreNavItems.some(item => isNavItemActive(item, location.pathname))

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

      {/* More Sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            ref={moreRef}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="md:hidden fixed left-3 right-3 bottom-[calc(72px+env(safe-area-inset-bottom,0px))] z-50 bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-fn-lg p-4"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm font-heading font-semibold">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-full hover:bg-[var(--secondary-bg)] text-[var(--text-secondary)] transition-colors"
                aria-label="Close menu"
              >
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {moreNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={() => cn(
                    'flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-colors relative text-center',
                    isNavItemActive(item, location.pathname)
                      ? 'bg-[var(--secondary-bg)] text-[var(--pink)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]'
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--rose-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--pink)]">
                    <item.icon size={18} />
                  </div>
                  <span className="text-[10.5px] font-semibold leading-tight">{item.shortLabel ?? item.label}</span>
                  {item.isBeta && (
                    <span className="absolute top-1.5 right-1.5 bg-[var(--pink)] text-white text-[7px] font-bold px-1 py-0.5 rounded tracking-wider">
                      BETA
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-th-card/90 backdrop-blur-xl border-t border-[var(--border)] flex items-center justify-around px-2 z-50"
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
                  'px-3 py-1 rounded-full transition-all duration-300',
                  isActive && 'bg-[var(--secondary-bg)]'
                )}>
                  <item.icon size={21} weight={isActive ? 'fill' : 'regular'} />
                </div>
                <span className="text-[10.5px] font-semibold leading-none">{item.label}</span>
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
            'px-3 py-1 rounded-full transition-all duration-300',
            (moreOpen || isMoreActive) && 'bg-[var(--secondary-bg)]'
          )}>
            <MoreHorizontal size={21} weight={(moreOpen || isMoreActive) ? 'bold' : 'regular'} />
          </div>
          <span className="text-[10.5px] font-semibold leading-none">More</span>
        </button>
      </nav>
    </>
  )
}
