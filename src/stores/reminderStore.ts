import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Reminder } from '@/types'
import { generateId } from '@/lib/utils'

import { useAuthStore } from './authStore'

interface ReminderState {
  reminders: Reminder[]
  
  allReminders: Reminder[]
  filterByUser: (email: string | null) => void

  addReminder: (reminder: Omit<Reminder, 'id' | 'user_id' | 'completed'>) => void
  toggleReminder: (id: string) => void
  removeReminder: (id: string) => void
  getUpcomingReminders: (count?: number) => Reminder[]
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      reminders: [],
      
      allReminders: [],

      filterByUser: (email: string | null) => {
        const { allReminders } = get()
        const activeEmail = email || ''
        const filteredReminders = allReminders.filter((r: any) => r.user_email === activeEmail)
        set({ reminders: filteredReminders })
      },

      addReminder: (reminder: Omit<Reminder, 'id' | 'user_id' | 'completed'>) => {
        const currentUser = useAuthStore.getState().user
        const newRem: Reminder & { user_email?: string } = {
          ...reminder,
          id: generateId(),
          user_id: currentUser?.id || 'guest',
          user_email: currentUser?.email || 'guest',
          completed: false
        }
        set((state: any) => ({
          allReminders: [newRem, ...state.allReminders],
          reminders: [newRem, ...state.reminders]
        }))
      },

      toggleReminder: (id: string) => {
        set((state: any) => {
          const update = (list: any[]) => list.map((r: any) => r.id === id ? { ...r, completed: !r.completed } : r)
          return {
            allReminders: update(state.allReminders),
            reminders: update(state.reminders)
          }
        })
      },

      removeReminder: (id: string) => {
        set((state: any) => ({
          allReminders: state.allReminders.filter((r: any) => r.id !== id),
          reminders: state.reminders.filter((r: any) => r.id !== id)
        }))
      },

      getUpcomingReminders: (count = 5) => {
        return [...get().reminders]
          .filter(r => !r.completed)
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
          .slice(0, count)
      }
    }),
    {
      name: 'fn-reminders-v3',
      merge: (persistedState: any, currentState: any) => {
        const state = persistedState || {}
        
        // 1. Migrate old single-user reminder list to allReminders
        const allReminders = state.allReminders || state.reminders || []
        
        // 2. Tag old reminders with france's email by default
        const migratedReminders = allReminders.map((r: any) => ({
          ...r,
          user_email: r.user_email || 'france@example.com'
        }))

        // 3. Filter for active user
        const currentUser = useAuthStore.getState().user
        const activeEmail = currentUser?.email || ''
        const filteredReminders = migratedReminders.filter((r: any) => r.user_email === activeEmail)

        return {
          ...currentState,
          ...persistedState,
          allReminders: migratedReminders,
          reminders: filteredReminders
        }
      }
    }
  )
)

// Dynamically trigger filtering on authentication state changes
useAuthStore.subscribe((state) => {
  const currentUser = state.user
  useReminderStore.getState().filterByUser(currentUser?.email || null)
})
