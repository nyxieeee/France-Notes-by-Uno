import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string, school?: string, yearLevel?: string) => Promise<{ confirmationRequired: boolean }>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => void
  initAuth: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialLoading: true,

  initAuth: async () => {
    set({ isInitialLoading: true })
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
        isInitialLoading: false,
      })
    } else {
      if (!hasHash) {
        set({ isInitialLoading: false, isLoading: false })
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
          isInitialLoading: false,
          isLoading: false,
        })
      } else {
        set({ user: null, isAuthenticated: false, isInitialLoading: false, isLoading: false })
      }
    })
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        throw new Error(error.message)
      }
      if (data?.user) {
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
        })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  signup: async (name: string, email: string, password: string, school = '', yearLevel = '') => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, school, year_level: yearLevel },
          emailRedirectTo: window.location.origin
        }
      })
      if (error) {
        throw new Error(error.message)
      }

      const session = data?.session || null
      const u = data?.user || null

      if (session && u) {
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
        })
        return { confirmationRequired: false }
      } else {
        set({
          user: null,
          isAuthenticated: false,
        })
        return { confirmationRequired: true }
      }
    } finally {
      set({ isLoading: false })
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
    set({ user: null, isAuthenticated: false, isLoading: false, isInitialLoading: false })
    window.location.href = '/login'
  },

  updateProfile: (updates) => {
    set(state => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }))
  },

  resetPassword: async (email: string) => {
    set({ isLoading: true })
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`
      })
      if (error) throw error
    } finally {
      set({ isLoading: false })
    }
  },

  updatePassword: async (password: string) => {
    set({ isLoading: true })
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    } finally {
      set({ isLoading: false })
    }
  },
}))
