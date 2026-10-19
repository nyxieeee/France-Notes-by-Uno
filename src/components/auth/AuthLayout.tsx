import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Headphones, MagnifyingGlass, Sparkle } from '@phosphor-icons/react'
import ParisIllustration from '@/components/dashboard/ParisIllustration'

const FEATURES = [
  { icon: BookOpen, label: 'Study\nMaterials' },
  { icon: Headphones, label: 'Podcast\n& Audio' },
  { icon: MagnifyingGlass, label: 'Search\nEngine' },
  { icon: Sparkle, label: 'AI Tools\n& More' },
]

// Split layout for every sign-in screen: brand panel on the left (desktop only), form card on the right
export default function AuthLayout({ children, footerNote }: { children: ReactNode; footerNote?: string }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Brand panel */}
      <aside className="hidden lg:flex relative w-[55%] overflow-hidden bg-gradient-to-br from-[var(--rose-soft)] via-[var(--bg)] to-[var(--secondary-bg)] flex-col">
        <ParisIllustration className="absolute inset-x-0 bottom-0 w-full h-[52%]" />
        <div className="absolute inset-0 bg-gradient-to-b from-th-bg/70 via-transparent to-transparent" />

        <p className="absolute right-12 top-12 font-script text-2xl text-th-pink/80 leading-tight rotate-[-8deg] text-center">
          Future RNs are built by<br />small, consistent efforts ♡
        </p>
        <p className="absolute left-10 bottom-12 font-script text-xl text-[var(--pink)] leading-tight rotate-[-10deg]">
          Same dreams.<br />Bigger plans. ♡
        </p>

        <div className="relative px-14 pt-12 max-w-xl">
          <img src="/france-notes-horizontal-logo-trim.png" alt="France Notes" className="h-14 w-auto" />

          <h1 className="mt-14 text-[42px] leading-[1.1] font-semibold tracking-tight text-[var(--text)]">
            Your Nursing Journey,
            <span className="block font-script font-semibold text-[52px] text-[var(--pink)] mt-1">Simpler &amp; Brighter</span>
          </h1>
          <p className="mt-5 text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-md">
            Study smarter with nursing resources, AI-powered tools, and a companion who cheers you on — all in one place.
          </p>

          <div className="mt-8 flex gap-8">
            {FEATURES.map(f => (
              <div key={f.label} className="flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-2xl bg-th-card/80 border border-[var(--border)] flex items-center justify-center text-[var(--pink)] shadow-fn">
                  <f.icon size={22} />
                </div>
                <span className="text-xs text-[var(--text-secondary)] whitespace-pre-line leading-tight">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Form side */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:px-8 relative">
        <img src="/france-notes-horizontal-logo-trim.png" alt="France Notes" className="lg:hidden h-11 w-auto mb-6" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[440px] bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-fn-md px-6 py-8 sm:px-10 sm:py-10"
        >
          {children}
        </motion.div>
        {footerNote && (
          <p className="mt-6 font-script text-xl text-th-pink/75 rotate-[-4deg]">{footerNote}</p>
        )}
      </main>
    </div>
  )
}
