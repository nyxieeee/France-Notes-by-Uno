import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import DesktopSidebar from './DesktopSidebar'
import MobileNav from './MobileNav'
import TopBar from './TopBar'
import XboxAchievementNotifier from './XboxAchievementNotifier'
import GlobalViewer from '@/components/shared/GlobalViewer'

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

export default function AppShell() {
  const userId = useAuthStore(s => s.user?.id)
  useRealtimeSync(userId)

  useEffect(() => {
    useStudyBoxStore.getState().fetchItems()
    useStudyBoxStore.getState().fetchSavedKnowledge()
    useReviewerStore.getState().fetchReviewers()
    useRetDemStore.getState().fetchProcedures()
    useRetDemStore.getState().fetchUploadHistory()
    useReminderStore.getState().fetchReminders()
    useQuizStore.getState().fetchQuizzes()
    useChatStore.getState().fetchMessages()
    useNotesStore.getState().fetchNotes()
    useSimulationStore.getState().fetchHistory()
  }, [])

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

        {/* Main Content */}
        <main className="flex-1 relative flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
          <Outlet />
        </main>

        {/* Materials and reviewers opened from anywhere */}
        <GlobalViewer />

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </div>
  )
}
