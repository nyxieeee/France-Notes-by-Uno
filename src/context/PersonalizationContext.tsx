import { createContext, useContext, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { getPersonalizationConfig } from '@/lib/personalization'
import type { PersonalizationConfig } from '@/lib/personalization'

export type { PersonalizationConfig }

const PersonalizationContext = createContext<PersonalizationConfig | undefined>(undefined)

export function PersonalizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore()
  const config = getPersonalizationConfig(user)

  return (
    <PersonalizationContext.Provider value={config}>
      {children}
    </PersonalizationContext.Provider>
  )
}

export function usePersonalization() {
  const context = useContext(PersonalizationContext)
  if (context === undefined) {
    throw new Error('usePersonalization must be used within a PersonalizationProvider')
  }
  return context
}
