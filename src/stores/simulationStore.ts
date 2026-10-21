import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { generateJSON } from '@/lib/ai'
import { getSimulationEvaluationPrompt } from '@/lib/simulationPrompts'
import type { SimulationSession } from '@/types'
import { deepStripMarkdown } from '@/lib/markdown'

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
  gradingFailed: boolean
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
  history: SimulationSession[]
}

type SimulationActions = {
  startSession: (mode: SimulationMode, topic: string, difficulty: DifficultyMode, sourceText?: string | null, sourceName?: string | null) => void
  endSession: () => void
  addMessage: (role: 'user' | 'assistant', content: string) => void
  setRecording: (status: boolean) => void
  setScores: (scores: SimulationState['scores'], feedback: SimulationState['feedback']) => void
  gradeSession: () => Promise<void>
  fetchHistory: () => Promise<void>
  deleteSession: (id: string) => Promise<void>
  reset: () => void
}

export const useSimulationStore = create<SimulationState & SimulationActions>((set, get) => ({
  activeMode: null,
  difficulty: 'gentle',
  topic: null,
  isActive: false,
  isEvaluating: false,
  gradingFailed: false,
  history: [],
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

  endSession: () => set({ isActive: false, isEvaluating: true, gradingFailed: false }),

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

  // Grade the finished transcript, then save the result so it shows up in the hub and on Home
  gradeSession: async () => {
    const { messages, activeMode, topic, difficulty, sourceName } = get()
    set({ gradingFailed: false, scores: null, feedback: null })
    try {
      const transcript = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
      const report = await generateJSON(
        `The simulation has ended. Please evaluate the user's performance across the entire chat transcript below and output the JSON report.\n\nCHAT TRANSCRIPT:\n${transcript}`,
        getSimulationEvaluationPrompt(),
        'recitation',
      )
      if (typeof report?.accuracy !== 'number') throw new Error('Evaluation came back without scores')

      const scores = { accuracy: report.accuracy, safety: report.safety || 0, reasoning: report.reasoning || 0, confidence: report.confidence || 0 }
      const feedback = { correct: report.feedback?.correct || [], missed: report.feedback?.missed || [], safetyViolations: report.feedback?.safetyViolations || [] }
      set({ scores, feedback })

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user || !activeMode || !topic) return
      const { data, error } = await supabase
        .from('simulation_sessions')
        .insert([{ user_id: session.user.id, mode: activeMode, topic, difficulty, source_name: sourceName || null, scores, feedback }])
        .select()
        .single()
      if (error) console.error('Error saving simulation result:', error)
      else set(state => ({ history: [data as SimulationSession, ...state.history] }))
    } catch (error) {
      // No made-up scores — tell the student grading failed and let them retry
      console.error('Grading error:', error)
      set({ gradingFailed: true })
    }
  },

  fetchHistory: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data, error } = await supabase
      .from('simulation_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    if (error) console.error('Error fetching simulation history:', error)
    else set({ history: (data as SimulationSession[]).map(s => ({ ...s, feedback: deepStripMarkdown(s.feedback) })) })
  },

  deleteSession: async (id) => {
    const previous = get().history
    set({ history: previous.filter(s => s.id !== id) })
    const { error } = await supabase.from('simulation_sessions').delete().eq('id', id)
    if (error) {
      console.error('Error deleting simulation result:', error)
      set({ history: previous })
    }
  },

  reset: () => set({
    activeMode: null,
    topic: null,
    isActive: false,
    isEvaluating: false,
    gradingFailed: false,
    messages: [],
    scores: null,
    feedback: null,
    sessionId: null,
    sourceText: null,
    sourceName: null
  })
}))
