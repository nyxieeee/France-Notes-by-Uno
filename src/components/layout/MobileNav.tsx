import { NavLink } from 'react-router-dom'
import { 
  Home, 
  Archive, 
  BrainCircuit, 
  MessageCircle, 
  User,
  Sparkles,
  Stethoscope,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'

const mobileNavItems = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Archive, label: "Box", path: '/study-box' },
  { icon: BrainCircuit, label: 'Quiz', path: '/quiz' },
  { icon: Stethoscope, label: 'Sims', path: '/simulations', isBeta: true },
  { icon: MessageCircle, label: 'AI', path: '/ai' },
  { icon: Sparkles, label: 'Garden', path: '/knowledge-garden' },
  { icon: Calendar, label: 'Planner', path: '/planner' },
  { icon: User, label: 'Profile', path: '/profile' },
]

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--card)]/80 backdrop-blur-lg border-t border-[var(--border)] flex items-center justify-around px-2 z-50">
      {mobileNavItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 transition-all duration-200",
            isActive ? "text-[var(--pink)]" : "text-[var(--text-secondary)]"
          )}
        >
          {({ isActive }) => (
            <>
              <div className={cn(
                "p-1 rounded-xl transition-all duration-300 relative",
                isActive && "bg-[var(--secondary-bg)]/50"
              )}>
                <item.icon size={22} />
                {item.isBeta && <span className="absolute -top-1 -right-2 bg-[var(--pink)] text-white text-[7px] font-bold px-1 py-0.5 rounded-sm tracking-wider">BETA</span>}
              </div>
              <span className="text-[10px] font-heading font-medium tracking-tight">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
