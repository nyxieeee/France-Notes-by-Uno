import { create } from 'zustand'
import type { Note } from '@/types'
import { supabase } from '@/lib/supabase'
import { sessionRequest } from '@/lib/sessionRequest'

interface NotesState {
  notes: Note[]
  isLoading: boolean
  error: string | null

  fetchNotes: () => Promise<void>
  createNote: (kind: Note['kind'], topicId?: string | null, initial?: Partial<Pick<Note, 'title' | 'content'>>) => Promise<Note | null>
  updateNote: (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'drawing' | 'topic_id' | 'is_pinned'>>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
}

const sortNotes = (notes: Note[]) =>
  [...notes].sort((a, b) =>
    Number(b.is_pinned) - Number(a.is_pinned) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )

// Pending save chain per note id (see updateNote)
const saveQueues = new Map<string, Promise<void>>()

export const useNotesStore = create<NotesState>()((set, get) => ({
  notes: [],
  isLoading: false,
  error: null,

  fetchNotes: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await sessionRequest(userId => supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }))

      if (error) {
        console.error('Error fetching notes:', error)
        set({ error: error.message, isLoading: false })
      } else {
        set({ notes: sortNotes(data as Note[]), isLoading: false })
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not load notes. Please try again.', isLoading: false })
    }
  },

  createNote: async (kind, topicId = null, initial = {}) => {
    try {
      const { data, error } = await sessionRequest(userId => supabase
        .from('notes')
        .insert([{
          user_id: userId, title: initial.title ?? '', content: initial.content ?? '', kind, topic_id: topicId,
          drawing: kind === 'handwriting' ? { paper: 'lined', pages: 1, strokes: [] } : null,
        }])
        .select()
        .single())

      if (error) {
        console.error('Error creating note:', error)
        set({ error: error.message })
        return null
      }
      set(state => ({ notes: sortNotes([data as Note, ...state.notes]), error: null }))
      return data as Note
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not create the note. Please try again.' })
      return null
    }
  },

  updateNote: (id, updates) => {
    const updated_at = new Date().toISOString()
    // Optimistic — the editor saves on a debounce, so keep local state instant
    set(state => ({
      notes: sortNotes(state.notes.map(n => n.id === id ? { ...n, ...updates, updated_at } : n))
    }))

    // Saves for one note go out one at a time, in order, so a slow earlier save can never land
    // after (and overwrite) a newer one
    const run = async () => {
      try {
        const { error } = await sessionRequest(userId => supabase.from('notes').update({ ...updates, updated_at }).eq('id', id).eq('user_id', userId))
        if (error) {
          console.error('Error saving note:', error)
          set({ error: error.message })
        } else set({ error: null })
      } catch (error) { set({ error: error instanceof Error ? error.message : 'Could not save this note. Please try again.' }) }
    }
    const queued = (saveQueues.get(id) ?? Promise.resolve()).then(run, run)
    saveQueues.set(id, queued)
    queued.finally(() => { if (saveQueues.get(id) === queued) saveQueues.delete(id) })
    return queued
  },

  deleteNote: async (id) => {
    const previous = get().notes
    set(state => ({ notes: state.notes.filter(n => n.id !== id) }))

    try {
      const { error } = await sessionRequest(userId => supabase.from('notes').delete().eq('id', id).eq('user_id', userId))
      if (error) {
        console.error('Error deleting note:', error)
        set({ notes: previous, error: error.message })
      } else set({ error: null })
    } catch (error) {
      set({ notes: previous, error: error instanceof Error ? error.message : 'Could not delete this note. Please try again.' })
    }
  },
}))
