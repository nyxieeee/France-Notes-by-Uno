import { create } from 'zustand'

// App-wide toasts and confirm dialogs, replacing the browser's alert()/confirm()

export type ToastTone = 'success' | 'error' | 'info'

interface Toast {
  id: number
  tone: ToastTone
  message: string
}

interface ConfirmRequest {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
  resolve: (ok: boolean) => void
}

interface FeedbackState {
  toasts: Toast[]
  confirmRequest: ConfirmRequest | null
  dismissToast: (id: number) => void
  settleConfirm: (ok: boolean) => void
}

let nextId = 1

export const useFeedbackStore = create<FeedbackState>()((set, get) => ({
  toasts: [],
  confirmRequest: null,
  dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  settleConfirm: (ok) => {
    get().confirmRequest?.resolve(ok)
    set({ confirmRequest: null })
  },
}))

export function toast(message: string, tone: ToastTone = 'info') {
  const id = nextId++
  useFeedbackStore.setState(s => ({ toasts: [...s.toasts.slice(-2), { id, tone, message }] }))
  setTimeout(() => useFeedbackStore.getState().dismissToast(id), tone === 'error' ? 6000 : 3500)
}

/** In-app replacement for window.confirm(). Resolves true when the user confirms. */
export function confirmDialog(options: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise(resolve => {
    // A newer request replaces an unanswered one
    useFeedbackStore.getState().confirmRequest?.resolve(false)
    useFeedbackStore.setState({ confirmRequest: { ...options, resolve } })
  })
}
