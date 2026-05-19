import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile } from '@/types'

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, _password: string) => Promise<void>
  signup: (name: string, email: string, _password: string, school?: string, yearLevel?: string) => Promise<void>
  logout: () => void
  updateProfile: (updates: Partial<UserProfile>) => void
}

const generateDefaultUser = (name = '', email = '', school = '', yearLevel = ''): UserProfile => ({
  id: 'user-' + Date.now().toString(),
  full_name: name || email.split('@')[0] || 'Nurse',
  email,
  avatar_url: null,
  theme_preference: 'light',
  year_level: yearLevel || '',
  school: school || '',
  created_at: new Date().toISOString(),
})

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, _password: string) => {
        set({ isLoading: true })
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1200))
        set({
          user: { ...generateDefaultUser('', email), full_name: email.split('@')[0] || 'Nurse' },
          isAuthenticated: true,
          isLoading: false,
        })
      },

      signup: async (name: string, email: string, _password: string, school = '', yearLevel = '') => {
        set({ isLoading: true })
        await new Promise(resolve => setTimeout(resolve, 1200))
        set({
          user: generateDefaultUser(name, email, school, yearLevel),
          isAuthenticated: true,
          isLoading: false,
        })
      },

      logout: () => {
        set({ user: null, isAuthenticated: false })
      },

      updateProfile: (updates) => {
        set(state => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }))
      },
    }),
    { name: 'fn-auth-v3' }
  )
)
