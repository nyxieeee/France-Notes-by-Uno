import { create } from 'zustand'

export type SimulationMode = 'recitation' | 'retdem' | null
export type DifficultyMode = 'gentle' | 'clinical_instructor' | 'doc_uno'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export type SimulationState = {
  activeMode: SimulationMode
  difficulty: DifficultyMode
  topic: string | null
  isActive: boolean
  isEvaluating: boolean
  isRecording: boolean
  messages: Message[]
  scores: {
    accuracy: number
    safety: number
    reasoning: number
    confidence: number
  } | null
  feedback: {
    correct: string[]
    missed: string[]
    safetyViolations: string[]
  } | null
  sessionId: string | null
  sourceText?: string | null
  sourceName?: string | null
}

type SimulationActions = {
  startSession: (mode: SimulationMode, topic: string, difficulty: DifficultyMode, sourceText?: string | null, sourceName?: string | null) => void
  endSession: () => void
  addMessage: (role: 'user' | 'assistant', content: string) => void
  setRecording: (status: boolean) => void
  setScores: (scores: SimulationState['scores'], feedback: SimulationState['feedback']) => void
  reset: () => void
}

export const useSimulationStore = create<SimulationState & SimulationActions>((set) => ({
  activeMode: null,
  difficulty: 'gentle',
  topic: null,
  isActive: false,
  isEvaluating: false,
  isRecording: false,
  messages: [],
  scores: null,
  feedback: null,
  sessionId: null,
  sourceText: null,
  sourceName: null,

  startSession: (mode, topic, difficulty, sourceText = null, sourceName = null) => set({
    activeMode: mode,
    topic,
    difficulty,
    isActive: true,
    isEvaluating: false,
    messages: [],
    scores: null,
    feedback: null,
    sessionId: Math.random().toString(36).substring(7),
    sourceText,
    sourceName
  }),

  endSession: () => set({ isActive: false, isEvaluating: true }),

  addMessage: (role, content) => set((state) => ({
    messages: [...state.messages, {
      id: Math.random().toString(36).substring(7),
      role,
      content,
      timestamp: new Date().toISOString()
    }]
  })),

  setRecording: (status) => set({ isRecording: status }),

  setScores: (scores, feedback) => set({ scores, feedback }),

  reset: () => set({
    activeMode: null,
    topic: null,
    isActive: false,
    isEvaluating: false,
    messages: [],
    scores: null,
    feedback: null,
    sessionId: null,
    sourceText: null,
    sourceName: null
  })
}))
