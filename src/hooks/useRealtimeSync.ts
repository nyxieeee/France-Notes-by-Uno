import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { applyRemoteVoiceChoice } from '@/lib/voices'
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
 * Keeps her devices in step: a change made on the iPad shows up on the phone and laptop within a moment.
 * Syncs database collections and user voice/settings across all her active devices.
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

    // 1. Database table sync
    let channel = supabase.channel(`sync-${userId}`)
    for (const table of Object.keys(REFRESH)) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
        () => schedule(table),
      )
    }
    channel.subscribe()

    // 2. Settings & Voice Broadcast sync across devices
    const settingsChannel = supabase.channel(`settings-sync-${userId}`)
    settingsChannel
      .on('broadcast', { event: 'voice_change' }, ({ payload }) => {
        if (payload?.speaker && payload?.id) {
          applyRemoteVoiceChoice(payload.speaker, payload.id)
        }
      })
      .subscribe()

    // 3. Catch up on any settings / data changes when device wakes up or tab becomes visible
    const syncCloudSettings = () => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user?.user_metadata) return
        if (user.user_metadata.voice_doc_uno) {
          applyRemoteVoiceChoice('DOC_UNO', user.user_metadata.voice_doc_uno)
        }
        if (user.user_metadata.voice_nurse_florence) {
          applyRemoteVoiceChoice('NURSE_FLORENCE', user.user_metadata.voice_nurse_florence)
        }
      }).catch(() => {})
    }

    syncCloudSettings()

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        Object.keys(REFRESH).forEach(schedule)
        syncCloudSettings()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      timers.forEach(clearTimeout)
      supabase.removeChannel(channel)
      supabase.removeChannel(settingsChannel)
    }
  }, [userId])
}
