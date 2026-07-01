import React, { createContext, useContext, ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'

export interface PersonalizationConfig {
  isFrance: boolean
  appName: string
  aiAssistantName: string
  greetingName: string
  studyBoxName: string
  knowledgeGardenName: string
  retdemName: string
  mascotName: string
  aiTone: 'affectionate_supportive' | 'professional_supportive'
}

const PersonalizationContext = createContext<PersonalizationConfig | undefined>(undefined)

export function PersonalizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore()

  // Exact email allowlist — France's dashboard only activates for her accounts
  const FRANCE_EMAILS = [
    'franceregraceceles@gmail.com',
    'fraceles@gbox.ncf.edu.ph',
    'regraceceles97@gmail.com',
  ]
  const isFrance = FRANCE_EMAILS.includes(user?.email?.toLowerCase() ?? '')
  const firstName = user?.full_name?.split(' ')[0] || 'Student'

  const config: PersonalizationConfig = {
    isFrance,
    appName: isFrance ? 'France Notes' : 'Nurse Notes',
    aiAssistantName: isFrance ? 'Doc Uno' : 'Nurse Florence',
    greetingName: isFrance ? 'babe' : firstName,
    studyBoxName: isFrance ? "France's Study Box" : 'Study Box',
    knowledgeGardenName: isFrance ? "France's Knowledge Garden" : 'Knowledge Garden',
    retdemName: isFrance ? "France's RetDem Practice" : 'Clinical Practice',
    mascotName: isFrance ? 'Doc Uno' : 'Nurse Florence',
    aiTone: isFrance ? 'affectionate_supportive' : 'professional_supportive',
  }

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
