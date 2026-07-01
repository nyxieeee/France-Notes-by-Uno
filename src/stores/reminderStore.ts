import { create } from 'zustand'
import type { Reminder } from '@/types'
import { supabase } from '@/lib/supabase'

interface ReminderState {
  reminders: Reminder[]
  isLoading: boolean
  error: string | null

  fetchReminders: () => Promise<void>
  addReminder: (reminder: Omit<Reminder, 'id' | 'user_id' | 'completed'>) => Promise<void>
  toggleReminder: (id: string) => Promise<void>
  removeReminder: (id: string) => Promise<void>
  getUpcomingReminders: (count?: number) => Reminder[]
}

export const useReminderStore = create<ReminderState>()((set, get) => ({
  reminders: [],
  isLoading: false,
  error: null,

  fetchReminders: async () => {
    set({ isLoading: true, error: null })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      set({ reminders: [], isLoading: false })
      return
    }
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', session.user.id)
      .order('due_date', { ascending: true })
    
    if (error) {
      console.error('Error fetching reminders:', error)
      set({ error: error.message, reminders: [], isLoading: false })
    } else {
      set({ reminders: data as Reminder[], isLoading: false })
    }
  },

  addReminder: async (reminder) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error("No active session found")

    const newRem = {
      title: reminder.title,
      due_date: reminder.due_date,
      reminder_type: reminder.reminder_type,
      completed: false,
      user_id: session.user.id
    }
    
    const { data, error } = await supabase
      .from('reminders')
      .insert([newRem])
      .select()
      .single()

    if (error) {
      console.error('Error adding reminder:', error)
    } else if (data) {
      set((state) => ({
        reminders: [data as Reminder, ...state.reminders]
      }))
    }
  },

  toggleReminder: async (id: string) => {
    const current = get().reminders.find(r => r.id === id)
    if (!current) return
    
    // Optimistic update
    set((state) => ({
      reminders: state.reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r)
    }))

    const { error } = await supabase
      .from('reminders')
      .update({ completed: !current.completed })
      .eq('id', id)

    if (error) {
      console.error('Error toggling reminder:', error)
      // Revert on error
      set((state) => ({
        reminders: state.reminders.map(r => r.id === id ? { ...r, completed: current.completed } : r)
      }))
    }
  },

  removeReminder: async (id: string) => {
    // Optimistic update
    const previousReminders = get().reminders
    set((state) => ({
      reminders: state.reminders.filter(r => r.id !== id)
    }))

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error removing reminder:', error)
      // Revert
      set({ reminders: previousReminders })
    }
  },

  getUpcomingReminders: (count = 5) => {
    return [...get().reminders]
      .filter(r => !r.completed)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, count)
  }
}))

