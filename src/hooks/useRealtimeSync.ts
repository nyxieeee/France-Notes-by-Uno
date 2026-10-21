import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { useReviewerStore } from '@/stores/reviewerStore'
import { useRetDemStore } from '@/stores/retDemStore'
import { useReminderStore } from '@/stores/reminderStore'
import { useQuizStore } from '@/stores/quizStore'
import { useNotesStore } from '@/stores/notesStore'

// Which list to reload when a table changes
const REFRESH: Record<string, () => unknown> = {
  study_materials: () => useStudyBoxStore.getState().fetchItems(),
  study_folders: () => useStudyBoxStore.getState().fetchFolders(),
  saved_knowledge: () => useStudyBoxStore.getState().fetchSavedKnowledge(),
  reviewers: () => useReviewerStore.getState().fetchReviewers(),
  quizzes: () => useQuizStore.getState().fetchQuizzes(),
  reminders: () => useReminderStore.getState().fetchReminders(),
  notes: () => useNotesStore.getState().fetchNotes(),
  retdem_procedures: () => useRetDemStore.getState().fetchProcedures(),
}

/**
 * Keeps her devices in step: a change made on the iPad shows up on the phone within a moment.
 * Supabase only sends events for rows Row Level Security lets this user read.
 */
export function useRealtimeSync(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return
    const timers = new Map<string, ReturnType<typeof setTimeout>>()
    // Bursts of changes (e.g. moving ten files) become one reload per list
    const schedule = (table: string) => {
      clearTimeout(timers.get(table))
      timers.set(table, setTimeout(() => { REFRESH[table]?.() }, 700))
    }

    let channel = supabase.channel(`sync-${userId}`)
    for (const table of Object.keys(REFRESH)) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
        () => schedule(table),
      )
    }
    channel.subscribe()

    // Catch up on anything missed while the tab was in the background
    const onVisible = () => {
      if (document.visibilityState === 'visible') Object.keys(REFRESH).forEach(schedule)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      timers.forEach(clearTimeout)
      supabase.removeChannel(channel)
    }
  }, [userId])
}
