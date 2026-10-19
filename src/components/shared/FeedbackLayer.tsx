import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, WarningCircle, Info, X } from '@phosphor-icons/react'
import { useFeedbackStore } from '@/stores/feedbackStore'
import { cn } from '@/lib/utils'

const TONE_ICON = { success: CheckCircle, error: WarningCircle, info: Info }

export default function FeedbackLayer() {
  const { toasts, dismissToast, confirmRequest, settleConfirm } = useFeedbackStore()

  useEffect(() => {
    if (!confirmRequest) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settleConfirm(false)
      if (e.key === 'Enter') settleConfirm(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmRequest, settleConfirm])

  return (
    <>
      <div className="fixed z-[300] left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 w-[calc(100%-2rem)] max-w-sm flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => {
            const Icon = TONE_ICON[t.tone]
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                role={t.tone === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-fn-lg text-[13.5px]"
              >
                <Icon size={18} weight="fill" className={cn('shrink-0 mt-px', t.tone === 'error' ? 'text-[var(--error)]' : t.tone === 'success' ? 'text-[var(--success)]' : 'text-[var(--pink)]')} />
                <p className="flex-1 leading-snug">{t.message}</p>
                <button onClick={() => dismissToast(t.id)} className="text-[var(--text-secondary)] hover:text-[var(--pink)] shrink-0" aria-label="Dismiss"><X size={14} /></button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirmRequest && (
          <div className="fixed inset-0 z-[310] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => settleConfirm(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="relative z-10 w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-t-3xl sm:rounded-2xl shadow-fn-lg p-6"
            >
              <h2 className="font-heading font-semibold text-[17px]">{confirmRequest.title}</h2>
              {confirmRequest.message && <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">{confirmRequest.message}</p>}
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => settleConfirm(false)} className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
                <button
                  autoFocus
                  onClick={() => settleConfirm(true)}
                  className={cn('px-5 py-2.5 text-sm rounded-full font-medium text-white transition-colors', confirmRequest.danger ? 'bg-[var(--error)] hover:brightness-95' : 'btn-primary')}
                >
                  {confirmRequest.confirmLabel || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
