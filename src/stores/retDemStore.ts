import { create } from 'zustand'
import type { RetDemProcedure, RecitationMode } from '@/types'
import { generateJSON } from '@/lib/ai'
import { getPersonalizationConfig } from '@/lib/personalization'
import { useAuthStore } from './authStore'
import { supabase } from '@/lib/supabase'

export type UploadedFile = {
  id: string
  name: string
  text: string
}

export type HistoryFile = {
  id: string
  name: string
  text: string
  uploaded_at: string
}

interface RetDemState {
  procedures: RetDemProcedure[]
  activeProcedure: RetDemProcedure | null
  recitationMode: RecitationMode
  isGenerating: boolean
  uploadedFiles: UploadedFile[]
  uploadHistory: HistoryFile[]

  fetchProcedures: () => Promise<void>
  fetchUploadHistory: () => Promise<void>
  setActiveProcedure: (procedure: RetDemProcedure | null) => void
  setRecitationMode: (mode: RecitationMode) => void
  addUploadedFile: (name: string, text: string) => void
  removeUploadedFile: (id: string) => void
  clearUploadedFiles: () => void
  toggleProcedureFavorite: (id: string) => Promise<void>
  deleteProcedure: (id: string) => Promise<void>
  deleteHistoryFile: (id: string) => Promise<void>
  generateProcedure: (topic: string) => Promise<RetDemProcedure>
  generateProcedureFromUpload: () => Promise<RetDemProcedure>
}

/** A failure with a message written for the student, safe to show as-is. */
export class RetDemError extends Error {}

export const useRetDemStore = create<RetDemState>()((set, get) => ({
  procedures: [],
  activeProcedure: null,
  recitationMode: 'doc_uno',
  isGenerating: false,
  uploadedFiles: [],
  uploadHistory: [],

  fetchProcedures: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data, error } = await supabase
      .from('retdem_procedures')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      set({ procedures: data as RetDemProcedure[] })
    }
  },

  fetchUploadHistory: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data, error } = await supabase
      .from('retdem_upload_history')
      .select('*')
      .eq('user_id', session.user.id)
      .order('uploaded_at', { ascending: false })

    if (!error && data) {
      set({ uploadHistory: data as HistoryFile[] })
    }
  },

  setActiveProcedure: (procedure: RetDemProcedure | null) => set({ activeProcedure: procedure }),
  setRecitationMode: (mode: RecitationMode) => set({ recitationMode: mode }),
  
  addUploadedFile: (name: string, text: string) => set((state) => {
    if (state.uploadedFiles.some((f) => f.name === name)) return {}
    return {
      uploadedFiles: [...state.uploadedFiles, { id: Math.random().toString(36).substring(7), name, text }]
    }
  }),

  removeUploadedFile: (id: string) => set((state) => ({
    uploadedFiles: state.uploadedFiles.filter((f) => f.id !== id)
  })),

  clearUploadedFiles: () => set({ uploadedFiles: [] }),

  toggleProcedureFavorite: async (id: string) => {
    const current = get().procedures.find(p => p.id === id)
    if (!current) return
    const nextFavorite = !current.is_favorite

    set((state) => ({
      procedures: state.procedures.map((p) => 
        p.id === id ? { ...p, is_favorite: nextFavorite } : p
      ),
      activeProcedure: state.activeProcedure?.id === id 
        ? { ...state.activeProcedure, is_favorite: nextFavorite }
        : state.activeProcedure
    }))

    await supabase.from('retdem_procedures').update({ is_favorite: nextFavorite }).eq('id', id)
  },

  deleteProcedure: async (id: string) => {
    set((state) => ({
      procedures: state.procedures.filter((p) => p.id !== id),
      activeProcedure: state.activeProcedure?.id === id ? null : state.activeProcedure
    }))
    await supabase.from('retdem_procedures').delete().eq('id', id)
  },
  
  deleteHistoryFile: async (id: string) => {
    set((state) => ({
      uploadHistory: state.uploadHistory.filter((f) => f.id !== id)
    }))
    await supabase.from('retdem_upload_history').delete().eq('id', id)
  },

  generateProcedure: async (topic: string) => {
    set({ isGenerating: true })
    try {
      const config = getPersonalizationConfig(useAuthStore.getState().user)
      const { aiAssistantName } = config

      const systemPrompt = `
        You are ${aiAssistantName}, a meticulous clinical nursing instructor.
        Generate a COMPLETE, DETAILED, step-by-step nursing procedure guide.
        Include EVERY step with actions and clinical rationales.
        Output strictly as JSON:
        {
          "title": "Full official name of the procedure",
          "category": "e.g. Fundamentals, MedSurg, IV Therapy, Maternal",
          "description": "Brief 2-sentence clinical description",
          "duration": "Estimated time (e.g. 20-30 mins)",
          "rationale": "Main clinical rationale for performing this procedure",
          "materials": ["every item needed"],
          "steps": [
            { "step": 1, "action": "Exact action to perform", "rationale": "Why this step is clinically important" }
          ]
        }
      `
      const randomSeed = Math.random().toString(36).substring(7)
      const prompt = `Generate a fresh, unique, and complete nursing procedure guide for: "${topic}". Seed: ${randomSeed}`

      const result = await generateJSON(prompt, systemPrompt, 'retdem', 0.8, 4000)
      if (!Array.isArray(result?.steps) || result.steps.length === 0) {
        throw new RetDemError('The procedure came back incomplete. Please try generating it again.')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error("No active session found")
      
      const newProcedureData = {
        title: result.title || topic,
        category: result.category || "General",
        description: result.description || "",
        duration: result.duration || "10 mins",
        rationale: result.rationale || "",
        materials: result.materials || [],
        steps: result.steps || [],
        is_favorite: false,
        user_id: session.user.id
      }

      const { data, error } = await supabase.from('retdem_procedures').insert([newProcedureData]).select().single()
      if (error || !data) {
        console.error('Error saving retdem procedure to Supabase:', error)
        throw new RetDemError('The procedure was generated but couldn\'t be saved. Check your connection and try again.')
      }
      const savedProcedure = data as RetDemProcedure
      set((state) => ({
        procedures: [savedProcedure, ...state.procedures],
        activeProcedure: savedProcedure,
        isGenerating: false
      }))
      return savedProcedure
    } catch (error) {
      console.error("Procedure generation failed", error)
      set({ isGenerating: false })
      throw error
    }
  },

  generateProcedureFromUpload: async () => {
    const { uploadedFiles } = get()
    if (!uploadedFiles.length) throw new Error('No uploaded files')
    set({ isGenerating: true })
    try {
      const config = getPersonalizationConfig(useAuthStore.getState().user)
      const { aiAssistantName } = config

      const combinedText = uploadedFiles
        .map((f, i) => `--- Reference ${i + 1}: ${f.name} ---\n${f.text}`)
        .join('\n\n')

      const systemPrompt = `
        You are ${aiAssistantName}, a strict clinical nursing instructor.
        Generate a COMPLETE, DETAILED, step-by-step nursing procedure guide based on the student's uploaded reference.
        Output strictly as JSON:
        {
          "title": "Full official name of the procedure",
          "category": "e.g. Fundamentals, MedSurg, IV Therapy, Maternal",
          "description": "Brief 2-sentence clinical description",
          "duration": "Estimated time (e.g. 20-30 mins)",
          "rationale": "Main clinical rationale for performing this procedure",
          "materials": ["every item or clinical tool needed from the reference"],
          "steps": [
            { "step": 1, "action": "Exact action", "rationale": "Clinical rationale" }
          ]
        }
      `
      const randomSeed = Math.random().toString(36).substring(7)
      const prompt = `Convert this reference into a detailed checklist. Seed: ${randomSeed}\n\nReference:\n${combinedText}`

      const result = await generateJSON(prompt, systemPrompt, 'retdem', 0.8, 4000)
      if (!Array.isArray(result?.steps) || result.steps.length === 0) {
        throw new RetDemError('Couldn\'t build a checklist from that file. Try a clearer copy or a different file.')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error("No active session found")

      const newProcedureData = {
        title: result.title || uploadedFiles[0].name || 'Uploaded Procedure',
        category: result.category || 'General',
        description: result.description || '',
        duration: result.duration || '10 mins',
        rationale: result.rationale || '',
        materials: result.materials || [],
        steps: result.steps || [],
        is_favorite: false,
        user_id: session.user.id
      }

      // Save individual upload history entries (handle partial failures)
      const savedHistories: HistoryFile[] = []
      for (const file of uploadedFiles) {
        try {
          const { data } = await supabase
            .from('retdem_upload_history')
            .insert([{ name: file.name, text: file.text, user_id: session.user.id }])
            .select()
            .single()
          if (data) savedHistories.push(data as HistoryFile)
        } catch (e) {
          console.error(`Error saving upload history for ${file.name}:`, e)
        }
      }

      const { data: savedProcedure, error: procedureError } = await supabase
        .from('retdem_procedures')
        .insert([newProcedureData])
        .select()
        .single()
      if (procedureError || !savedProcedure) {
        console.error('Error saving uploaded procedure:', procedureError)
        throw new RetDemError('The checklist was generated but couldn\'t be saved. Check your connection and try again.')
      }
      const procedure = savedProcedure as RetDemProcedure

      set((state) => ({
        procedures: [procedure, ...state.procedures],
        activeProcedure: procedure,
        uploadHistory: [...savedHistories, ...state.uploadHistory],
        uploadedFiles: [],
        isGenerating: false
      }))
      return procedure
    } catch (error) {
      console.error('Upload-based generation failed', error)
      set({ isGenerating: false })
      throw error
    }
  }
}))

