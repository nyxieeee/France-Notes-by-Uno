import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RetDemProcedure, RecitationMode } from '@/types'
import { generateJSON, getPersonalizationConfig } from '@/lib/groq'
import { generateId } from '@/lib/utils'

import { useAuthStore } from './authStore'

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

  allProcedures: RetDemProcedure[]
  allUploadHistory: HistoryFile[]
  filterByUser: (email: string | null) => void

  setActiveProcedure: (procedure: RetDemProcedure | null) => void
  setRecitationMode: (mode: RecitationMode) => void
  addUploadedFile: (name: string, text: string) => void
  removeUploadedFile: (id: string) => void
  clearUploadedFiles: () => void
  toggleProcedureFavorite: (id: string) => void
  deleteProcedure: (id: string) => void
  deleteHistoryFile: (id: string) => void
  generateProcedure: (topic: string) => Promise<RetDemProcedure>
  generateProcedureFromUpload: () => Promise<RetDemProcedure>
}

export const useRetDemStore = create<RetDemState>()(
  persist(
    (set, get) => ({
      procedures: [],
      activeProcedure: null,
      recitationMode: 'doc_uno',
      isGenerating: false,
      uploadedFiles: [],
      uploadHistory: [],

      allProcedures: [],
      allUploadHistory: [],

      filterByUser: (email: string | null) => {
        const { allProcedures, allUploadHistory } = get()
        const activeEmail = email || ''
        set({
          procedures: allProcedures.filter((p: any) => p.user_email === activeEmail),
          uploadHistory: allUploadHistory.filter((f: any) => f.user_email === activeEmail)
        })
      },

      setActiveProcedure: (procedure: RetDemProcedure | null) => set({ activeProcedure: procedure }),
      setRecitationMode: (mode: RecitationMode) => set({ recitationMode: mode }),
      
      addUploadedFile: (name: string, text: string) => set((state: any) => {
        if (state.uploadedFiles.some((f: any) => f.name === name)) return {}
        return {
          uploadedFiles: [...state.uploadedFiles, { id: generateId(), name, text }]
        }
      }),

      removeUploadedFile: (id: string) => set((state: any) => ({
        uploadedFiles: state.uploadedFiles.filter((f: any) => f.id !== id)
      })),

      clearUploadedFiles: () => set({ uploadedFiles: [] }),

      toggleProcedureFavorite: (id: string) => set((state: any) => ({
        allProcedures: state.allProcedures.map((p: any) => 
          p.id === id ? { ...p, is_favorite: !p.is_favorite } : p
        ),
        procedures: state.procedures.map((p: any) => 
          p.id === id ? { ...p, is_favorite: !p.is_favorite } : p
        ),
        activeProcedure: state.activeProcedure?.id === id 
          ? { ...state.activeProcedure, is_favorite: !state.activeProcedure.is_favorite }
          : state.activeProcedure
      })),

      deleteProcedure: (id: string) => set((state: any) => ({
        allProcedures: state.allProcedures.filter((p: any) => p.id !== id),
        procedures: state.procedures.filter((p: any) => p.id !== id),
        activeProcedure: state.activeProcedure?.id === id ? null : state.activeProcedure
      })),
      
      deleteHistoryFile: (id: string) => set((state: any) => ({
        allUploadHistory: state.allUploadHistory.filter((f: any) => f.id !== id),
        uploadHistory: state.uploadHistory.filter((f: any) => f.id !== id)
      })),

      generateProcedure: async (topic: string) => {
        set({ isGenerating: true })
        try {
          const config = getPersonalizationConfig()
          const { aiAssistantName } = config

          const systemPrompt = `
            You are ${aiAssistantName}, a meticulous clinical nursing instructor.
            Generate a COMPLETE, DETAILED, step-by-step nursing procedure guide.

            CRITICAL RULES:
            - Include EVERY step — do NOT skip, summarize, or abbreviate.
            - If the procedure has 20+ steps, include ALL 20+ steps.
            - Each step must have a clear action AND a clinical rationale.
            - Materials list must be exhaustive and accurate.
            - This is for a nursing student's RetDem practice — clinical accuracy is mandatory.
            - Do NOT add a note like "steps abbreviated" — give the full procedure.

            CRITICAL DIVERSITY & DYNAMIC VARIETY RULE:
            - Ensure that the descriptions, step guides, and nursing tips are completely fresh, unique, and highly tailored!
            - Introduce varied, real-world clinical nuances, high-yield rationale details, and student check-off tips that keep it extremely engaging and practical.

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
          const prompt = `Generate a fresh, unique, and completely complete nursing procedure guide for: "${topic}".
          Random seed: ${randomSeed}-${new Date().getTime()}.
          CRITICAL DIVERSITY INSTRUCTION: Provide exhaustive detail, fresh scientific rationales, and high-yield checkoff strategies for this procedure.`

          const result = await generateJSON(
            prompt,
            systemPrompt,
            'retdem',
            0.8,
            4000
          )
          
          const currentUser = useAuthStore.getState().user
          const newProcedure: RetDemProcedure & { is_generated?: boolean, user_id?: string, user_email?: string } = {
            id: generateId(),
            user_id: currentUser?.id || 'guest',
            user_email: currentUser?.email || 'guest',
            title: result.title || topic,
            category: result.category || "General",
            description: result.description || "",
            duration: result.duration || "10 mins",
            rationale: result.rationale || "",
            materials: result.materials || [],
            steps: result.steps || [],
            is_generated: true
          }

          set((state: any) => ({
            allProcedures: [newProcedure, ...state.allProcedures],
            procedures: [newProcedure, ...state.procedures],
            activeProcedure: newProcedure,
            isGenerating: false
          }))
          return newProcedure
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
          const config = getPersonalizationConfig()
          const { aiAssistantName } = config

          const combinedText = uploadedFiles
            .map((f: any, i: number) => `--- Reference ${i + 1}: ${f.name} ---\n${f.text}`)
            .join('\n\n')
          const systemPrompt = `
            You are ${aiAssistantName}, a strict clinical nursing instructor.
            Generate a COMPLETE, DETAILED, step-by-step nursing procedure guide based on the student's uploaded reference.
            Never truncate or skip steps. Ensure maximum clinical detail and rich rationales.

            CRITICAL CHECKLIST CONVERSION INSTRUCTION:
            If the uploaded reference material is a general clinical reviewer, lecture notes, textbook excerpt, study guide, or patient record (and NOT a pre-written step-by-step clinical checklist), you MUST act as a senior nursing professor and dynamically SYNTHESIZE a comprehensive step-by-step nursing checkoff procedure (checklist) out of the material.
            - For example, if the material is about GERD, construct a complete procedure for "Clinical Assessment, Medication Administration, and Lifestyle Rehabilitation for Gastroesophageal Reflux Disease (GERD)".
            - Design logical, step-by-step nursing actions (including preparation, assessment, nursing interventions, patient education, and clinical documentation) with highly educational clinical rationales based on the pathophysiology and care guidelines described in the uploaded notes.
            - Do not output a refusal, apology, or empty steps array under any circumstances. Even if the content is highly theoretical, extract and craft a gorgeous, high-yield step-by-step clinical checklist from it.

            CRITICAL DIVERSITY & DYNAMIC VARIETY RULE:
            - Make the guide highly unique, customized, and tailored!
            - Introduce varied clinical context hooks, test taking strategies, and rationales even if same files are uploaded, to keep each checklist presentation unique.
          `

          const randomSeed = Math.random().toString(36).substring(7)
          const prompt = `Based on the reference material provided below, generate a completely fresh, unique, and exhaustive step-by-step procedure guide.
          Random seed: ${randomSeed}-${new Date().getTime()}.
          CRITICAL DIVERSITY & CONVERSION INSTRUCTION: If this is a general reviewer (like GERD notes), convert it into an excellent clinical nursing checklist. Use fresh rationales, high-yield checkoff strategies, and distinct phrasing to make this output completely unique!

          REFERENCE CONTENT:
          """
          ${combinedText}
          """

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

          const result = await generateJSON(
            prompt,
            systemPrompt,
            'retdem',
            0.8,
            4000
          )

          const currentUser = useAuthStore.getState().user
          const newProcedure: RetDemProcedure & { is_generated?: boolean, user_id?: string, user_email?: string } = {
            id: generateId(),
            user_id: currentUser?.id || 'guest',
            user_email: currentUser?.email || 'guest',
            title: result.title || uploadedFiles[0].name || 'Uploaded Procedure',
            category: result.category || 'General',
            description: result.description || '',
            duration: result.duration || '10 mins',
            rationale: result.rationale || '',
            materials: result.materials || [],
            steps: result.steps || [],
            is_generated: true
          }

          const historyItems = uploadedFiles.map((f: any) => ({
            id: generateId(),
            user_email: currentUser?.email || 'guest',
            name: f.name,
            text: f.text,
            uploaded_at: new Date().toISOString()
          }))

          set((state: any) => ({
            allProcedures: [newProcedure, ...state.allProcedures],
            procedures: [newProcedure, ...state.procedures],
            activeProcedure: newProcedure,
            allUploadHistory: [...historyItems, ...state.allUploadHistory],
            uploadHistory: [...historyItems, ...state.uploadHistory],
            uploadedFiles: [],
            isGenerating: false
          }))
          return newProcedure
        } catch (error) {
          console.error('Upload-based generation failed', error)
          set({ isGenerating: false })
          throw error
        }
      }
    }),
    {
      name: 'fn-retdem-v4',
      merge: (persistedState: any, currentState: any) => {
        const state = persistedState || {}
        
        // Migrate single-user lists
        const allProcedures = state.allProcedures || state.procedures || []
        const allUploadHistory = state.allUploadHistory || state.uploadHistory || []
        
        // Tag old data with france's email
        const migratedProcedures = allProcedures.map((p: any) => ({
          ...p,
          user_email: p.user_email || 'france@example.com'
        }))

        const migratedUploadHistory = allUploadHistory.map((f: any) => ({
          ...f,
          user_email: f.user_email || 'france@example.com'
        }))

        // Filter for active user
        const currentUser = useAuthStore.getState().user
        const activeEmail = currentUser?.email || ''
        
        return {
          ...currentState,
          ...persistedState,
          allProcedures: migratedProcedures,
          allUploadHistory: migratedUploadHistory,
          procedures: migratedProcedures.filter((p: any) => p.user_email === activeEmail),
          uploadHistory: migratedUploadHistory.filter((f: any) => f.user_email === activeEmail)
        }
      }
    }
  )
)

// Dynamically trigger filtering on authentication state changes
useAuthStore.subscribe((state) => {
  const currentUser = state.user
  useRetDemStore.getState().filterByUser(currentUser?.email || null)
})
