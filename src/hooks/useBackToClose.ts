import { useEffect, useRef } from 'react'

/**
 * While `open`, the browser Back button / iPad back swipe closes this view (a detail panel,
 * editor or viewer) instead of leaving the whole page. Works by adding one history entry
 * for the open view and removing it again when the view is closed another way.
 */
export function useBackToClose(open: boolean, close: () => void) {
  const closeRef = useRef(close)
  useEffect(() => { closeRef.current = close })

  useEffect(() => {
    if (!open) return
    const marker = { ...window.history.state, subview: Math.random().toString(36).slice(2) }
    window.history.pushState(marker, '')
    let poppedByBack = false
    const onPop = () => {
      poppedByBack = true
      closeRef.current()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      // Closed with a button: drop the extra entry so Back isn't needed twice
      if (!poppedByBack && window.history.state?.subview === marker.subview) window.history.back()
    }
  }, [open])
}
