import { useEffect, useState } from 'react'
import AnimatedOutlet from './AnimatedOutlet'
import DesktopSidebar from './DesktopSidebar'
import MobileNav from './MobileNav'
import TopBar from './TopBar'
import XboxAchievementNotifier from './XboxAchievementNotifier'
import GlobalViewer from '@/components/shared/GlobalViewer'
import FloatingPodcastPlayer from '@/components/podcast/FloatingPodcastPlayer'

import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { useReviewerStore } from '@/stores/reviewerStore'
import { useRetDemStore } from '@/stores/retDemStore'
import { useReminderStore } from '@/stores/reminderStore'
import { useQuizStore } from '@/stores/quizStore'
import { useChatStore } from '@/stores/chatStore'
import { useNotesStore } from '@/stores/notesStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { useAuthStore } from '@/stores/authStore'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { supabase } from '@/lib/supabase'
import { sessionRequest } from '@/lib/sessionRequest'

export default function AppShell() {
  const userId = useAuthStore(s => s.user?.id)
  const email = useAuthStore(s => s.user?.email)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  useRealtimeSync(userId)

  useEffect(() => {
    if (!userId) return
    let disposed = false
    let loading = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async () => {
      if (disposed || loading) return
      loading = true
      try {
        const { data, error } = await sessionRequest(() => supabase.auth.getUser())
        if (error) throw error
        if (disposed || data.user?.id !== userId) return
        setLoadError(null)
        await Promise.allSettled([
          useStudyBoxStore.getState().fetchItems(),
          useStudyBoxStore.getState().fetchSavedKnowledge(),
          useReviewerStore.getState().fetchReviewers(),
          useRetDemStore.getState().fetchProcedures(),
          useRetDemStore.getState().fetchUploadHistory(),
          useReminderStore.getState().fetchReminders(),
          useQuizStore.getState().fetchQuizzes(),
          useChatStore.getState().fetchMessages(),
          useNotesStore.getState().fetchNotes(),
          useSimulationStore.getState().fetchHistory(),
        ])
      } catch (error) {
        if (!disposed) setLoadError(error instanceof Error ? error.message : 'Could not verify your session. Please sign in again with your original account.')
      } finally { loading = false }
    }
    // Supabase auth callbacks must return immediately; load outside the auth lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session?.user.id === userId) {
        clearTimeout(timer)
        timer = setTimeout(() => { void load() }, 0)
      }
    })
    void load()
    return () => { disposed = true; clearTimeout(timer); subscription.unsubscribe() }
  }, [userId, retry])

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      {/* Xbox Style Achievement Notifications */}
      <XboxAchievementNotifier />

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col shrink-0">
        <DesktopSidebar />
      </div>

      <div className="flex flex-col flex-1 relative overflow-hidden">
        {/* Top Bar */}
        <TopBar />

        {loadError && <div role="alert" className="mx-4 mt-3 rounded-xl border border-th-error/30 bg-th-error/10 p-4 text-sm">
          <p>Your saved data could not be loaded: {loadError}</p>
          <p className="mt-1 text-[var(--text-secondary)]">Account: {email}. Check that this is the account you used before.</p>
          <button onClick={() => setRetry(value => value + 1)} className="btn-secondary mt-2 px-3 py-1.5">Retry loading</button>
          <a href="/login" className="ml-3 underline">Sign in again</a>
        </div>}

        {/* Main Content */}
        <main className="flex-1 relative flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
          <AnimatedOutlet />
        </main>

        {/* Floating Picture-in-Picture Podcast Mini Player */}
        <FloatingPodcastPlayer />

        {/* Materials and reviewers opened from anywhere */}
        <GlobalViewer />

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </div>
  )
}
