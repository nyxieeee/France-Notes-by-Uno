import { create } from 'zustand'
import type { ReviewerItem } from '@/types'
import { generateJSON } from '@/lib/ai'
import { getPersonalizationConfig } from '@/lib/personalization'
import { useStudyBoxStore, materialDisplayName } from './studyBoxStore'
import { useAuthStore } from './authStore'
import { supabase } from '@/lib/supabase'
import { deepStripMarkdown } from '@/lib/markdown'

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
  generateReviewerFromNote: (note: { title: string; contentText: string; topicId?: string | null }) => Promise<ReviewerItem>
  generatePresentationFromNote: (note: { title: string; contentText: string; topicId?: string | null }) => Promise<ReviewerItem>
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
      set({ isLoading: false })
      return
    }
    const { data, error } = await supabase
      .from('reviewers')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      set({ reviewers: (data as ReviewerItem[]).map(r => ({ ...r, title: deepStripMarkdown(r.title), content: deepStripMarkdown(r.content) })), isLoading: false })
    } else {
      if (error) console.error('Error fetching reviewers:', error)
      set({ isLoading: false })
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
        - Do not use emojis anywhere in the output.
        - Maintain an encouraging, warm, professional clinical instructor tone. Share smart NCLEX/board tips.
        - Address the student as "${greetingName}". NEVER use romantic terms of endearment or mentions of boyfriend-girlfriend relationships.
      `
      if (isFrance) {
        personalityRule = `
          CUTE AESTHETIC & PERSONALITY RULE:
          - Do not use emojis anywhere in the output.
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
      if (typeof result.summary !== 'string' || !result.summary.trim()) throw new Error('The study guide came back empty. Please try again.')

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
          summary: result.summary,
          key_points: result.key_points || [],
          flashcards: result.flashcards || [],
          mnemonics: result.mnemonics || [],
          simplified_explanation: result.simplified_explanation || '',
        }
      }

      const { data, error } = await supabase.from('reviewers').insert([newReviewerData]).select().single()
      if (error || !data) throw new Error('The study guide was made but could not be saved. Check your connection and try again.')

      const newReviewer = data as ReviewerItem
      set((state) => ({ 
        reviewers: [newReviewer, ...state.reviewers], 
        isGeneratingReviewer: false, 
        isGenerating: state.isGeneratingPresentation 
      }))
      return newReviewer
    } catch (error) {
      console.error("Reviewer Generation Error:", error)
      set((state) => ({
        isGeneratingReviewer: false,
        isGenerating: state.isGeneratingPresentation
      }))
      throw error
    }
  },

  generatePresentation: async (sourceItemIds: string[], topicId?: string | null) => {
    set({ isGeneratingPresentation: true, isGenerating: true })
    const config = getPersonalizationConfig(useAuthStore.getState().user)
    const { isFrance, aiAssistantName } = config

    try {
      let sourceText = ''
      let sourceFilesLabel = ''
      let titleSuffix = ''

      if (sourceItemIds && sourceItemIds.length > 0) {
        const allItems = useStudyBoxStore.getState().items
        const selectedItems = allItems.filter(item => sourceItemIds.includes(item.id))
        if (selectedItems.length === 0) throw new Error("No source items found")
        sourceText = selectedItems.map(item => `--- DOCUMENT: ${item.file_name} ---\n${item.extracted_text}`).join('\n\n')
        sourceFilesLabel = selectedItems.map(item => materialDisplayName(item)).join(', ')
        titleSuffix = selectedItems.length > 1 ? `${materialDisplayName(selectedItems[0])} and ${selectedItems.length - 1} more` : materialDisplayName(selectedItems[0])
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
        ? `PERSONALITY RULE: Do not use emojis anywhere in the output. Presenter notes: sweet English boyfriend tone, call France "babe" — pure English only, no Tagalog.`
        : `STYLE RULE: Do not use emojis anywhere in the output. Presenter notes: professional, warm clinical instructor tone in clear English.`

      const systemPrompt = `
        You are ${aiAssistantName}, an expert nursing instructor creating a PowerPoint presentation.
        Analyze the following text and generate a structured, highly educational, board-ready slide deck.
        ${aestheticRule}
        Output strictly as a JSON object: { "slides": [ { "title": "Slide Title", "paragraph": "2-3 sentence detailed explanation that introduces and explains the concept in prose form so the student can read and understand it without relying on bullet points alone", "bullet_points": ["point 1", "point 2"], "presenter_notes": "..." } ] }
        CRITICAL: Every slide MUST include both a "paragraph" field (a detailed prose explanation) AND "bullet_points" (key takeaways). The paragraph comes first to explain the concept thoroughly, then bullet points summarize the high-yield points.
        FIT ON THE SLIDE: keep each "paragraph" under 70 words and give 3 to 6 bullet points of at most 20 words each. When a concept needs more, split it across two slides instead of crowding one.
        TITLES: short and descriptive, without numbering. Never start a title with "Slide 1:" or similar.
        Generate as many highly detailed and comprehensive slides as necessary to exhaustively cover all of the information, data, definitions, clinical logic, and steps in the source material without omitting any details or summarizing heavily. There is no slide limit.
      `

      const randomSeed = Math.random().toString(36).substring(7)
      const prompt = `Analyze this text for a presentation. Random seed: ${randomSeed}-${new Date().getTime()}. Text:\n\n${sourceText.substring(0, 8000)}`

      const result = await generateJSON(prompt, systemPrompt, 'reviewer', 0.85, 12000)
      if (!Array.isArray(result.slides) || result.slides.length === 0) throw new Error('The slides came back empty. Please try again.')
      if (result.slides) result.slides = result.slides.map((s: any) => ({ ...s, id: `sl-${Math.random().toString(36).substring(7)}` }))

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error("No active session found")

      const newPresentationData = {
        topic_id: topicId || null,
        title: titleSuffix,
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
      if (error || !data) throw new Error('The slides were made but could not be saved. Check your connection and try again.')

      const newPresentation = data as ReviewerItem
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

  generateReviewerFromNote: async (note: { title: string; contentText: string; topicId?: string | null }) => {
    set({ isGeneratingReviewer: true, isGenerating: true })
    const config = getPersonalizationConfig(useAuthStore.getState().user)
    const { isFrance, greetingName, aiAssistantName } = config

    const sourceText = note.contentText.trim()
    const titleSuffix = (note.title || 'Study Note').trim()
    const sourceFilesLabel = `Note: ${titleSuffix}`

    try {
      let personalityRule = `
        PERSONALITY & MENTOR RULE:
        - Do not use emojis anywhere in the output.
        - Maintain an encouraging, warm, professional clinical instructor tone. Share smart NCLEX/board tips.
        - Address the student as "${greetingName}". NEVER use romantic terms of endearment or mentions of boyfriend-girlfriend relationships.
      `
      if (isFrance) {
        personalityRule = `
          CUTE AESTHETIC & PERSONALITY RULE:
          - Do not use emojis anywhere in the output.
          - Infuse warm, sweet boyfriend encouragement and Taglish clinical pearls naturally inside the explanations. (e.g., call her "${greetingName}", cheer her on!)
        `
      }

      const systemPrompt = `
        You are ${aiAssistantName}, an expert nursing instructor.
        Analyze the student's study note and return a JSON object containing a comprehensive, board-ready clinical study guide/reviewer.
        ${personalityRule}
        Your output must be a valid JSON object with the following fields:
        1. "summary": A plain text string of about 1000-1600 words containing a detailed clinical study guide based on the note. Use EXACTLY these 5 sections with simple uppercase headings (NO markdown #, ##, or ### symbols):
           - CLINICAL PATHOPHYSIOLOGY & CONCEPTS OVERVIEW
           - HIGH-YIELD CLINICAL ASSESSMENT & LABORATORY FINDINGS
           - PHARMACOLOGICAL & MEDICAL MANAGEMENT
           - EXHAUSTIVE NURSING CARE PRIORITIES & SCIENTIFIC RATIONALES
           - BOARD APPRAISAL & TEST-TAKING STRATEGIES
        2. "key_points": A JSON array of 10-15 detailed clinical takeaway strings.
        3. "flashcards": A JSON array of 12-20 objects each with "front" and "back" keys.
        4. "mnemonics": A JSON array of 3-5 objects each with "title" and "content" keys. Include any mnemonics from the note and add high-yield ones.
        5. "simplified_explanation": A simple analogy or memorable explanation string.
        CRITICAL FORMATTING RULES: Do NOT use any markdown formatting symbols anywhere (such as "**" for bold, "#" for headings, or backticks). Use plain text capitalization for headings, simple line breaks, and standard bullet points (-) or numbered lists. Do NOT include key_points, flashcards, or mnemonics inside the "summary" field.
        Output strictly as a JSON object.
      `

      const randomSeed = Math.random().toString(36).substring(7)
      const prompt = `Analyze this student note and generate a complete clinical study guide and board reviewer.
      Random seed: ${randomSeed}-${new Date().getTime()}.
      Note Title: ${titleSuffix}
      Note Content:\n\n${sourceText.substring(0, 12000)}`

      const result = await generateJSON(prompt, systemPrompt, 'reviewer', 0.85, 12000)
      if (typeof result.summary !== 'string' || !result.summary.trim()) throw new Error('Empty summary from AI')

      if (result.flashcards) result.flashcards = result.flashcards.map((f: any) => ({ ...f, id: `fc-${Math.random().toString(36).substring(7)}` }))
      if (result.mnemonics) result.mnemonics = result.mnemonics.map((m: any) => ({ ...m, id: `mn-${Math.random().toString(36).substring(7)}` }))

      const { data: { session } } = await supabase.auth.getSession()

      const newReviewerData = {
        topic_id: note.topicId || null,
        title: `Reviewer — ${titleSuffix}`,
        source_file: sourceFilesLabel,
        is_favorite: false,
        user_id: session?.user?.id || 'guest',
        content: {
          summary: result.summary,
          key_points: result.key_points || [],
          flashcards: result.flashcards || [],
          mnemonics: result.mnemonics || [],
          simplified_explanation: result.simplified_explanation || '',
        }
      }

      let newReviewer: ReviewerItem
      if (session?.user) {
        const { data, error } = await supabase.from('reviewers').insert([newReviewerData]).select().single()
        if (!error && data) {
          newReviewer = data as ReviewerItem
        } else {
          newReviewer = { ...newReviewerData, id: `rev-${Date.now()}`, created_at: new Date().toISOString() } as ReviewerItem
        }
      } else {
        newReviewer = { ...newReviewerData, id: `rev-${Date.now()}`, created_at: new Date().toISOString() } as ReviewerItem
      }

      set((state) => ({ 
        reviewers: [newReviewer, ...state.reviewers], 
        isGeneratingReviewer: false, 
        isGenerating: state.isGeneratingPresentation 
      }))
      return newReviewer
    } catch (err) {
      console.warn("Reviewer AI generation failed or offline, building structured fallback:", err)
      // Robust fallback so the user's PDF export is guaranteed to succeed
      const lines = sourceText.split('\n').map(l => l.trim()).filter(Boolean)
      const bullets = lines.filter(l => l.startsWith('-') || l.startsWith('•') || /^\d+\./.test(l)).map(l => l.replace(/^[-•\d.]+\s*/, ''))

      const { data: { session } } = await supabase.auth.getSession()
      const fallbackData = {
        id: `rev-${Date.now()}`,
        topic_id: note.topicId || null,
        title: `Reviewer — ${titleSuffix}`,
        source_file: sourceFilesLabel,
        is_favorite: false,
        user_id: session?.user?.id || 'guest',
        created_at: new Date().toISOString(),
        content: {
          summary: `CLINICAL CONCEPTS OVERVIEW\n\n${sourceText}\n\nEXHAUSTIVE NURSING CARE PRIORITIES\n\n- Baseline clinical assessment and regular vital signs monitoring.\n- Patient safety interventions and therapeutic precautions.\n- Evaluation of client response to priority care interventions.\n\nBOARD APPRAISAL & TEST-TAKING STRATEGIES\n\n- Read clinical scenarios focusing on acute changes and client safety.\n- Apply Maslow's Hierarchy and ABCs (Airway, Breathing, Circulation) to prioritize interventions.`,
          key_points: bullets.length > 0 ? bullets.slice(0, 15) : [
            `Core concept from note: ${titleSuffix}`,
            'Prioritize client assessment before executing non-emergency interventions.',
            'Document baseline findings and notify the healthcare team of acute deviations.'
          ],
          flashcards: [
            { id: `fc-${Date.now()}-1`, front: `What are the primary clinical concepts in "${titleSuffix}"?`, back: sourceText.slice(0, 320) }
          ],
          mnemonics: [
            { id: `mn-${Date.now()}-1`, title: titleSuffix, content: bullets.slice(0, 8).join('\n') || sourceText.slice(0, 200) }
          ],
          simplified_explanation: `Clinical study reviewer derived directly from your study note "${titleSuffix}".`,
        }
      } as ReviewerItem

      try {
        if (session?.user) {
          const { data } = await supabase.from('reviewers').insert([{
            topic_id: fallbackData.topic_id,
            title: fallbackData.title,
            source_file: fallbackData.source_file,
            is_favorite: false,
            user_id: session.user.id,
            content: fallbackData.content,
          }]).select().single()
          if (data) fallbackData.id = data.id
        }
      } catch (saveErr) {
        console.warn('Could not persist fallback reviewer to DB:', saveErr)
      }

      set((state) => ({ 
        reviewers: [fallbackData, ...state.reviewers], 
        isGeneratingReviewer: false, 
        isGenerating: state.isGeneratingPresentation 
      }))
      return fallbackData
    }
  },

  generatePresentationFromNote: async (note: { title: string; contentText: string; topicId?: string | null }) => {
    set({ isGeneratingPresentation: true, isGenerating: true })
    const config = getPersonalizationConfig(useAuthStore.getState().user)
    const { isFrance, aiAssistantName } = config

    const sourceText = note.contentText.trim()
    const titleSuffix = (note.title || 'Lecture Presentation').trim()
    const sourceFilesLabel = `Note: ${titleSuffix}`

    try {
      let aestheticRule = isFrance
        ? `PERSONALITY RULE: Do not use emojis anywhere in the output. Presenter notes: sweet English boyfriend tone, call France "babe" — pure English only, no Tagalog.`
        : `STYLE RULE: Do not use emojis anywhere in the output. Presenter notes: professional, warm clinical instructor tone in clear English.`

      const systemPrompt = `
        You are ${aiAssistantName}, an expert nursing instructor creating a PowerPoint presentation from student notes.
        Analyze the following note content and generate a structured, highly educational, board-ready slide deck.
        ${aestheticRule}
        Output strictly as a JSON object: { "slides": [ { "title": "Slide Title", "paragraph": "2-3 sentence detailed explanation that introduces and explains the concept in prose form so the student can read and understand it without relying on bullet points alone", "bullet_points": ["point 1", "point 2"], "presenter_notes": "..." } ] }
        CRITICAL: Every slide MUST include both a "paragraph" field (a detailed prose explanation) AND "bullet_points" (key takeaways). The paragraph comes first to explain the concept thoroughly, then bullet points summarize the high-yield points.
        FIT ON THE SLIDE: keep each "paragraph" under 70 words and give 3 to 6 bullet points of at most 20 words each. When a concept needs more, split it across two slides instead of crowding one.
        TITLES: short and descriptive, without numbering. Never start a title with "Slide 1:" or similar.
        Generate as many highly detailed slides as necessary to exhaustively cover all of the information, definitions, clinical logic, and mnemonics in the note.
      `

      const randomSeed = Math.random().toString(36).substring(7)
      const prompt = `Analyze this note and generate a complete presentation slide deck.
      Random seed: ${randomSeed}-${new Date().getTime()}.
      Note Title: ${titleSuffix}
      Note Content:\n\n${sourceText.substring(0, 8000)}`

      const result = await generateJSON(prompt, systemPrompt, 'reviewer', 0.85, 12000)
      if (!Array.isArray(result.slides) || result.slides.length === 0) throw new Error('Empty slides from AI')
      const slides = result.slides.map((s: any) => ({ ...s, id: `sl-${Math.random().toString(36).substring(7)}` }))

      const { data: { session } } = await supabase.auth.getSession()

      const newPresentationData = {
        topic_id: note.topicId || null,
        title: titleSuffix,
        source_file: sourceFilesLabel,
        is_favorite: false,
        user_id: session?.user?.id || 'guest',
        content: {
          summary: `A PowerPoint presentation generated from "${titleSuffix}".`,
          key_points: [], flashcards: [], mnemonics: [],
          simplified_explanation: "This is a slide deck. Use it to practice your presentation skills or review visually!",
          slides
        }
      }

      let newPresentation: ReviewerItem
      if (session?.user) {
        const { data, error } = await supabase.from('reviewers').insert([newPresentationData]).select().single()
        if (!error && data) {
          newPresentation = data as ReviewerItem
        } else {
          newPresentation = { ...newPresentationData, id: `pres-${Date.now()}`, created_at: new Date().toISOString() } as ReviewerItem
        }
      } else {
        newPresentation = { ...newPresentationData, id: `pres-${Date.now()}`, created_at: new Date().toISOString() } as ReviewerItem
      }

      set((state) => ({ 
        reviewers: [newPresentation, ...state.reviewers], 
        isGeneratingPresentation: false, 
        isGenerating: state.isGeneratingReviewer 
      }))
      return newPresentation
    } catch (err) {
      console.warn("Presentation AI generation failed or offline, building structured slides fallback:", err)
      // Robust fallback creating slides directly from note structure
      const lines = sourceText.split('\n').map(l => l.trim()).filter(Boolean)
      const slides: any[] = []
      let currentSlide = {
        id: `sl-1`,
        title: titleSuffix,
        paragraph: '',
        bullet_points: [] as string[],
        presenter_notes: isFrance ? 'Remember these key points for your board review, babe!' : 'Key clinical takeaways to master for your examination.'
      }

      for (const line of lines) {
        if (line.startsWith('#') || (line.length < 60 && line.endsWith(':'))) {
          if (currentSlide.bullet_points.length > 0 || currentSlide.paragraph) {
            slides.push(currentSlide)
          }
          currentSlide = {
            id: `sl-${slides.length + 1}`,
            title: line.replace(/^[#:\s]+|[:\s]+$/g, '') || titleSuffix,
            paragraph: '',
            bullet_points: [],
            presenter_notes: 'Priority nursing concepts and assessment points.'
          }
        } else if (line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line)) {
          currentSlide.bullet_points.push(line.replace(/^[-•\d.]+\s*/, ''))
        } else {
          currentSlide.paragraph = (currentSlide.paragraph ? currentSlide.paragraph + ' ' : '') + line
        }
      }
      if (currentSlide.bullet_points.length > 0 || currentSlide.paragraph) {
        slides.push(currentSlide)
      }
      if (slides.length === 0) {
        slides.push({
          id: `sl-1`,
          title: titleSuffix,
          paragraph: sourceText.slice(0, 180),
          bullet_points: ['Key clinical takeaways from study notes', 'Essential priority assessment', 'High-yield board examination rationale'],
          presenter_notes: 'Comprehensive review slide.'
        })
      }

      const { data: { session } } = await supabase.auth.getSession()
      const fallbackPresentation = {
        id: `pres-${Date.now()}`,
        topic_id: note.topicId || null,
        title: titleSuffix,
        source_file: sourceFilesLabel,
        is_favorite: false,
        user_id: session?.user?.id || 'guest',
        created_at: new Date().toISOString(),
        content: {
          summary: `A PowerPoint presentation generated from "${titleSuffix}".`,
          key_points: [], flashcards: [], mnemonics: [],
          simplified_explanation: "This is a slide deck.",
          slides
        }
      } as ReviewerItem

      try {
        if (session?.user) {
          const { data } = await supabase.from('reviewers').insert([{
            topic_id: fallbackPresentation.topic_id,
            title: fallbackPresentation.title,
            source_file: fallbackPresentation.source_file,
            is_favorite: false,
            user_id: session.user.id,
            content: fallbackPresentation.content,
          }]).select().single()
          if (data) fallbackPresentation.id = data.id
        }
      } catch (saveErr) {
        console.warn('Could not persist fallback presentation to DB:', saveErr)
      }

      set((state) => ({ 
        reviewers: [fallbackPresentation, ...state.reviewers], 
        isGeneratingPresentation: false, 
        isGenerating: state.isGeneratingReviewer 
      }))
      return fallbackPresentation
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

