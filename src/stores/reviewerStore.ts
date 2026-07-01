import { create } from 'zustand'
import type { ReviewerItem } from '@/types'
import { generateJSON } from '@/lib/groq'
import { getPersonalizationConfig } from '@/lib/personalization'
import { useStudyBoxStore } from './studyBoxStore'
import { useAuthStore } from './authStore'
import { supabase } from '@/lib/supabase'

interface ReviewerState {
  reviewers: ReviewerItem[]
  isGenerating: boolean
  isGeneratingReviewer: boolean
  isGeneratingPresentation: boolean
  isLoading: boolean
  searchQuery: string
  selectedReviewer: ReviewerItem | null

  fetchReviewers: () => Promise<void>
  generateReviewer: (sourceItemIds: string[], topicId?: string | null) => Promise<ReviewerItem>
  generatePresentation: (sourceItemIds: string[], topicId?: string | null) => Promise<ReviewerItem>
  toggleFavorite: (id: string) => Promise<void>
  deleteReviewer: (id: string) => Promise<void>
  setSearchQuery: (q: string) => void
  setSelectedReviewer: (r: ReviewerItem | null) => void
  getFilteredReviewers: () => ReviewerItem[]
  getFavorites: () => ReviewerItem[]
}

export const useReviewerStore = create<ReviewerState>()((set, get) => ({
  reviewers: [],
  isGenerating: false,
  isGeneratingReviewer: false,
  isGeneratingPresentation: false,
  isLoading: false,
  searchQuery: '',
  selectedReviewer: null,

  fetchReviewers: async () => {
    set({ isLoading: true })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      set({ reviewers: [], isLoading: false })
      return
    }
    const { data, error } = await supabase
      .from('reviewers')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      set({ reviewers: data as ReviewerItem[], isLoading: false })
    } else {
      if (error) console.error('Error fetching reviewers:', error)
      set({ reviewers: [], isLoading: false })
    }
  },

  generateReviewer: async (sourceItemIds: string[], topicId?: string | null) => {
    set({ isGeneratingReviewer: true, isGenerating: true })
    const config = getPersonalizationConfig(useAuthStore.getState().user)
    const { isFrance, greetingName, aiAssistantName } = config

    try {
      let sourceText = ''
      let sourceFilesLabel = ''
      let titleSuffix = ''

      if (sourceItemIds && sourceItemIds.length > 0) {
        const allItems = useStudyBoxStore.getState().items
        const selectedItems = allItems.filter(item => sourceItemIds.includes(item.id))
        if (selectedItems.length === 0) throw new Error("No source items found")
        sourceText = selectedItems.map(item => `--- DOCUMENT: ${item.file_name} ---\n${item.extracted_text}`).join('\n\n')
        sourceFilesLabel = selectedItems.map(item => item.file_name).join(', ')
        titleSuffix = selectedItems.length > 1 ? 'Combined Review' : selectedItems[0].file_name.split('.')[0]
      } else if (topicId) {
        const allTopics = useStudyBoxStore.getState().topics
        const selectedTopic = allTopics.find(t => t.id === topicId)
        if (!selectedTopic) throw new Error("Selected topic not found")
        sourceText = `NURSING SUBJECT TOPIC: ${selectedTopic.title}\nDESCRIPTION: ${selectedTopic.description}`
        sourceFilesLabel = `${aiAssistantName} Clinical Library`
        titleSuffix = selectedTopic.title
      } else {
        throw new Error("Either sourceItemIds or topicId must be specified")
      }

      let personalityRule = `
        PERSONALITY & MENTOR RULE:
        - Incorporate clear, professional, and visually pleasing clinical emojis (e.g., 🩺, 👩‍⚕️, 🧠, 📝, ✨, 💊, 📋) inside your markdown headings and bullet points.
        - Maintain an encouraging, warm, professional clinical instructor tone. Share smart NCLEX/board tips.
        - Address the student as "${greetingName}". NEVER use romantic terms of endearment or mentions of boyfriend-girlfriend relationships.
      `
      if (isFrance) {
        personalityRule = `
          CUTE AESTHETIC & PERSONALITY RULE:
          - Use highly decorative, cute, and friendly emojis (e.g., 🌸, 🩺, 🧸, 🩹, ✨, 🎀, 🌷, 🦦, 🍰, 🍼) inside your markdown headings and scattered naturally throughout the content to make it visually adorable for France!
          - Infuse warm, sweet boyfriend encouragement and Taglish clinical pearls naturally inside the explanations. (e.g., call her "${greetingName}", cheer her on!)
        `
      }

      const systemPrompt = `
        You are ${aiAssistantName}, an expert nursing instructor.
        You must analyze the provided clinical text and return a JSON object containing a detailed clinical study guide/reviewer.
        ${personalityRule}
        CRITICAL RULE: If the text provided is a [SYSTEM MESSAGE] stating that text extraction failed or the document is empty, DO NOT generate a study guide. Instead, output a summary explaining that the document could not be read, and leave the flashcards, mnemonics, and key points arrays EMPTY.
        Your output must be a valid JSON object with the following fields:
        1. "summary": A plain text string of about 1200-1800 words containing a detailed clinical study guide. Use EXACTLY these 5 sections with simple uppercase headings (NO markdown #, ##, or ### symbols):
           - CLINICAL PATHOPHYSIOLOGY & CONCEPTS OVERVIEW
           - HIGH-YIELD CLINICAL ASSESSMENT & LABORATORY FINDINGS
           - PHARMACOLOGICAL & MEDICAL MANAGEMENT
           - EXHAUSTIVE NURSING CARE PRIORITIES & SCIENTIFIC RATIONALES
           - BOARD APPRAISAL & TEST-TAKING STRATEGIES
        2. "key_points": A JSON array of 12-18 detailed clinical takeaway strings.
        3. "flashcards": A JSON array of 15-25 objects each with "front" and "back" keys.
        4. "mnemonics": A JSON array of 3-6 objects each with "title" and "content" keys.
        5. "simplified_explanation": A simple analogy or explanation string.
        CRITICAL FORMATTING RULES: Do NOT use any markdown formatting symbols anywhere (such as "**" for bold, "#" for headings, or backticks). Use plain text capitalization for headings, simple line breaks, and standard bullet points (-) or numbered lists. Do NOT include key_points, flashcards, or mnemonics inside the "summary" field.
        Output strictly as a JSON object.
      `

      const randomSeed = Math.random().toString(36).substring(7)
      const prompt = `Analyze this text and generate a completely fresh, unique clinical study guide.
      Random seed: ${randomSeed}-${new Date().getTime()}.
      Text content:\n\n${sourceText.substring(0, 12000)}`

      const result = await generateJSON(prompt, systemPrompt, 'reviewer', 0.85, 12000)

      if (result.flashcards) result.flashcards = result.flashcards.map((f: any) => ({ ...f, id: `fc-${Math.random().toString(36).substring(7)}` }))
      if (result.mnemonics) result.mnemonics = result.mnemonics.map((m: any) => ({ ...m, id: `mn-${Math.random().toString(36).substring(7)}` }))

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error("No active session found")

      const newReviewerData = {
        topic_id: topicId || null,
        title: `AI Review — ${titleSuffix}`,
        source_file: sourceFilesLabel,
        is_favorite: false,
        user_id: session.user.id,
        content: {
          summary: result.summary || "Summary generated.",
          key_points: result.key_points || [],
          flashcards: result.flashcards || [],
          mnemonics: result.mnemonics || [],
          simplified_explanation: result.simplified_explanation || "Simplified explanation here.",
        }
      }

      const { data, error } = await supabase.from('reviewers').insert([newReviewerData]).select().single()
      if (error) console.error('Error saving reviewer:', error)

      const newReviewer = data as ReviewerItem || { ...newReviewerData, id: 'temp-id', created_at: new Date().toISOString() } as any
      set((state) => ({ 
        reviewers: [newReviewer, ...state.reviewers], 
        isGeneratingReviewer: false, 
        isGenerating: state.isGeneratingPresentation 
      }))
      return newReviewer
    } catch (error) {
      console.error("Reviewer Generation Error:", error)
      const allTopics = useStudyBoxStore.getState().topics
      const allItems = useStudyBoxStore.getState().items
      let fallbackTitle = 'Error'
      let fallbackLabel = 'Unknown'
      if (sourceItemIds && sourceItemIds.length > 0) {
        const selectedItems = allItems.filter(item => sourceItemIds.includes(item.id))
        fallbackLabel = selectedItems.length > 0 ? selectedItems.map(i => i.file_name).join(', ') : 'Unknown'
        fallbackTitle = selectedItems.length > 0 ? selectedItems[0].file_name.split('.')[0] : 'Error'
      } else if (topicId) {
        const selectedTopic = allTopics.find(t => t.id === topicId)
        fallbackLabel = `${aiAssistantName} Clinical Library`
        fallbackTitle = selectedTopic ? selectedTopic.title : 'Error'
      }
      const fallbackReviewer = {
        id: `err-${Math.random().toString(36).substring(7)}`,
        topic_id: topicId || null,
        title: `Review — ${fallbackTitle}`,
        source_file: fallbackLabel,
        is_favorite: false,
        created_at: new Date().toISOString(),
        content: {
          summary: `Oops! ${aiAssistantName} is currently busy or rate-limited. Please wait a few seconds and try again, ${greetingName}! 🌸`,
          key_points: ['AI is temporarily busy — please retry in a few seconds!'],
          flashcards: [], mnemonics: [],
          simplified_explanation: `Don't worry, ${greetingName}! Just a temporary hiccup. Try again! 🧸🩺`
        }
      } as any
      set((state) => ({ 
        reviewers: [fallbackReviewer, ...state.reviewers], 
        isGeneratingReviewer: false, 
        isGenerating: state.isGeneratingPresentation 
      }))
      return fallbackReviewer
    }
  },

  generatePresentation: async (sourceItemIds: string[], topicId?: string | null) => {
    set({ isGeneratingPresentation: true, isGenerating: true })
    const config = getPersonalizationConfig(useAuthStore.getState().user)
    const { isFrance, greetingName, aiAssistantName } = config

    try {
      let sourceText = ''
      let sourceFilesLabel = ''
      let titleSuffix = ''

      if (sourceItemIds && sourceItemIds.length > 0) {
        const allItems = useStudyBoxStore.getState().items
        const selectedItems = allItems.filter(item => sourceItemIds.includes(item.id))
        if (selectedItems.length === 0) throw new Error("No source items found")
        sourceText = selectedItems.map(item => `--- DOCUMENT: ${item.file_name} ---\n${item.extracted_text}`).join('\n\n')
        sourceFilesLabel = selectedItems.map(item => item.file_name).join(', ')
        titleSuffix = selectedItems.length > 1 ? 'Combined PPTX' : selectedItems[0].file_name.split('.')[0]
      } else if (topicId) {
        const allTopics = useStudyBoxStore.getState().topics
        const selectedTopic = allTopics.find(t => t.id === topicId)
        if (!selectedTopic) throw new Error("Selected topic not found")
        sourceText = `NURSING SUBJECT TOPIC: ${selectedTopic.title}\nDESCRIPTION: ${selectedTopic.description}`
        sourceFilesLabel = `${aiAssistantName} Clinical Library`
        titleSuffix = selectedTopic.title
      } else {
        throw new Error("Either sourceItemIds or topicId must be specified")
      }

      let aestheticRule = isFrance
        ? `CUTE AESTHETIC & PERSONALITY RULE: Use cute emojis (🌸, 🩺, 🧸, 🩹, ✨, 🎀, 🌷, 🦦). Presenter notes: sweet English boyfriend tone, call France "babe" — pure English only, no Tagalog.`
        : `AESTHETIC RULE: Use clinical emojis (🌸, 🩺, 🧠, 🩹, ✨). Presenter notes: professional, warm clinical instructor tone in clear English.`

      const systemPrompt = `
        You are ${aiAssistantName}, an expert nursing instructor creating a PowerPoint presentation.
        Analyze the following text and generate a structured, highly educational, board-ready slide deck.
        ${aestheticRule}
        Output strictly as a JSON object: { "slides": [ { "title": "Slide Title", "paragraph": "2-3 sentence detailed explanation that introduces and explains the concept in prose form so the student can read and understand it without relying on bullet points alone", "bullet_points": ["point 1", "point 2"], "presenter_notes": "..." } ] }
        CRITICAL: Every slide MUST include both a "paragraph" field (a detailed prose explanation) AND "bullet_points" (key takeaways). The paragraph comes first to explain the concept thoroughly, then bullet points summarize the high-yield points.
        Generate as many highly detailed and comprehensive slides as necessary to exhaustively cover all of the information, data, definitions, clinical logic, and steps in the source material without omitting any details or summarizing heavily. There is no slide limit.
      `

      const randomSeed = Math.random().toString(36).substring(7)
      const prompt = `Analyze this text for a presentation. Random seed: ${randomSeed}-${new Date().getTime()}. Text:\n\n${sourceText.substring(0, 8000)}`

      const result = await generateJSON(prompt, systemPrompt, 'reviewer', 0.85, 12000)
      if (result.slides) result.slides = result.slides.map((s: any) => ({ ...s, id: `sl-${Math.random().toString(36).substring(7)}` }))

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error("No active session found")

      const newPresentationData = {
        topic_id: topicId || null,
        title: `AI PPTX — ${titleSuffix}`,
        source_file: sourceFilesLabel,
        is_favorite: false,
        user_id: session.user.id,
        content: {
          summary: `A PowerPoint presentation generated by ${aiAssistantName}.`,
          key_points: [], flashcards: [], mnemonics: [],
          simplified_explanation: "This is a slide deck. Use it to practice your presentation skills or review visually!",
          slides: result.slides || []
        }
      }

      const { data, error } = await supabase.from('reviewers').insert([newPresentationData]).select().single()
      if (error) console.error('Error saving presentation:', error)

      const newPresentation = data as ReviewerItem || { ...newPresentationData, id: 'temp-id', created_at: new Date().toISOString() } as any
      set((state) => ({ 
        reviewers: [newPresentation, ...state.reviewers], 
        isGeneratingPresentation: false, 
        isGenerating: state.isGeneratingReviewer 
      }))
      return newPresentation
    } catch (error) {
      console.error("Presentation Generation Error:", error)
      set((state) => ({ 
        isGeneratingPresentation: false, 
        isGenerating: state.isGeneratingReviewer 
      }))
      throw error
    }
  },

  toggleFavorite: async (id: string) => {
    const current = get().reviewers.find(r => r.id === id)
    if (!current) return
    set((state) => ({
      reviewers: state.reviewers.map(r => r.id === id ? { ...r, is_favorite: !r.is_favorite } : r)
    }))
    await supabase.from('reviewers').update({ is_favorite: !current.is_favorite }).eq('id', id)
  },

  deleteReviewer: async (id: string) => {
    set((state) => ({
      reviewers: state.reviewers.filter(r => r.id !== id),
      selectedReviewer: state.selectedReviewer?.id === id ? null : state.selectedReviewer,
    }))
    await supabase.from('reviewers').delete().eq('id', id)
  },

  setSearchQuery: (q: string) => set({ searchQuery: q }),
  setSelectedReviewer: (r: any) => set({ selectedReviewer: r }),

  getFilteredReviewers: () => {
    const { reviewers, searchQuery } = get()
    if (!searchQuery) return reviewers
    return reviewers.filter(r =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.source_file.toLowerCase().includes(searchQuery.toLowerCase())
    )
  },

  getFavorites: () => get().reviewers.filter(r => r.is_favorite),
}))

