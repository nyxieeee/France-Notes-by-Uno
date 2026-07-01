import type { UserProfile } from '@/types'

export const FRANCE_EMAILS = [
  'franceregraceceles@gmail.com',
  'fraceles@gbox.ncf.edu.ph',
  'regraceceles97@gmail.com',
]

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

export function isFranceUser(user: UserProfile | null): boolean {
  return FRANCE_EMAILS.includes(user?.email?.toLowerCase() ?? '')
}

export function getPersonalizationConfig(user: UserProfile | null): PersonalizationConfig {
  const isFrance = isFranceUser(user)
  const firstName = user?.full_name?.split(' ')[0] || 'Student'

  return {
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
}


