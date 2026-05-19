import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string, school?: string, yearLevel?: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => void
  initAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initAuth: async () => {
    set({ isLoading: true })
    const hasHash = window.location.hash.includes('access_token=') || 
                    window.location.hash.includes('id_token=') || 
                    window.location.search.includes('code=')

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const u = session.user
      set({
        user: {
          id: u.id,
          full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Nurse',
          email: u.email || '',
          avatar_url: u.user_metadata?.avatar_url || null,
          theme_preference: 'light',
          year_level: '',
          school: '',
          created_at: u.created_at,
        },
        isAuthenticated: true,
        isLoading: false,
      })
    } else {
      if (!hasHash) {
        set({ isLoading: false })
      }
    }

    // Listen for auth changes (e.g. after Google redirect)
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user
        set({
          user: {
            id: u.id,
            full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Nurse',
            email: u.email || '',
            avatar_url: u.user_metadata?.avatar_url || null,
            theme_preference: 'light',
            year_level: '',
            school: '',
            created_at: u.created_at,
          },
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false })
      }
    })
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ isLoading: false })
      throw new Error(error.message)
    }
    if (data.user) {
      const u = data.user
      set({
        user: {
          id: u.id,
          full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Nurse',
          email: u.email || '',
          avatar_url: u.user_metadata?.avatar_url || null,
          theme_preference: 'light',
          year_level: u.user_metadata?.year_level || '',
          school: u.user_metadata?.school || '',
          created_at: u.created_at,
        },
        isAuthenticated: true,
        isLoading: false,
      })
    }
  },

  signup: async (name: string, email: string, password: string, school = '', yearLevel = '') => {
    set({ isLoading: true })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, school, year_level: yearLevel }
      }
    })
    if (error) {
      set({ isLoading: false })
      throw new Error(error.message)
    }
    if (data.user) {
      const u = data.user
      set({
        user: {
          id: u.id,
          full_name: name,
          email: u.email || '',
          avatar_url: null,
          theme_preference: 'light',
          year_level: yearLevel,
          school,
          created_at: u.created_at,
        },
        isAuthenticated: true,
        isLoading: false,
      })
    }
  },

  loginWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, isAuthenticated: false })
  },

  updateProfile: (updates) => {
    set(state => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }))
  },
}))
