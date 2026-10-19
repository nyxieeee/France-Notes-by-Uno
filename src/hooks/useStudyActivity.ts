import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { useQuizStore } from '@/stores/quizStore'
import { useReviewerStore } from '@/stores/reviewerStore'
import { useNotesStore } from '@/stores/notesStore'
import { useSimulationStore } from '@/stores/simulationStore'

// Local calendar day (YYYY-MM-DD) — toISOString() would use UTC and shift
// evening/morning activity onto the wrong day outside UTC
export function localDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Days with any study activity (uploads, quizzes, reviewers, notes, simulations) and the current streak
export function useStudyActivity() {
  const { items } = useStudyBoxStore()
  const { quizzes } = useQuizStore()
  const { reviewers } = useReviewerStore()
  const { notes } = useNotesStore()
  const { history } = useSimulationStore()

  const activeDays = new Set<string>()
  for (const entry of [...items, ...quizzes, ...reviewers, ...history]) {
    if (entry.created_at) activeDays.add(localDayKey(new Date(entry.created_at)))
  }
  // Editing a note counts as studying that day too
  for (const note of notes) activeDays.add(localDayKey(new Date(note.updated_at)))

  // Streak counts back from today, or from yesterday if nothing has been done yet today
  const cursor = new Date()
  if (!activeDays.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (activeDays.has(localDayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  // Last 7 days, oldest first, for the weekly streak strip
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date()
    day.setDate(day.getDate() - (6 - i))
    return { date: day, active: activeDays.has(localDayKey(day)) }
  })

  return { streak, week, activeDays }
}
