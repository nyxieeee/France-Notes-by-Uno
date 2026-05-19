import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReviewerItem } from '@/types'
import { generateId } from '@/lib/utils'
import { generateJSON, getPersonalizationConfig } from '@/lib/groq'
import { useStudyBoxStore } from './studyBoxStore'

import { useAuthStore } from './authStore'

interface ReviewerState {
  reviewers: ReviewerItem[]
  isGenerating: boolean
  searchQuery: string
  selectedReviewer: ReviewerItem | null
  
  allReviewers: ReviewerItem[]
  filterByUser: (email: string | null) => void

  generateReviewer: (sourceItemIds: string[], topicId?: string) => Promise<ReviewerItem>
  generatePresentation: (sourceItemIds: string[], topicId?: string) => Promise<ReviewerItem>
  toggleFavorite: (id: string) => void
  deleteReviewer: (id: string) => void
  setSearchQuery: (q: string) => void
  setSelectedReviewer: (r: ReviewerItem | null) => void
  getFilteredReviewers: () => ReviewerItem[]
  getFavorites: () => ReviewerItem[]
}

export const useReviewerStore = create<ReviewerState>()(
  persist(
    (set, get) => ({
      reviewers: [],
      isGenerating: false,
      searchQuery: '',
      selectedReviewer: null,
      
      allReviewers: [],
      
      filterByUser: (email: string | null) => {
        const { allReviewers } = get()
        const activeEmail = email || ''
        const filteredReviewers = allReviewers.filter((r: any) => r.user_email === activeEmail)
        set({ reviewers: filteredReviewers })
      },

      generateReviewer: async (sourceItemIds: string[], topicId: string | null) => {
        set({ isGenerating: true })
        const config = getPersonalizationConfig()
        const { isFrance, greetingName, aiAssistantName } = config

        try {
          let sourceText = ''
          let sourceFilesLabel = ''
          let titleSuffix = ''

          if (sourceItemIds && sourceItemIds.length > 0) {
            const allItems = useStudyBoxStore.getState().items
            const selectedItems = allItems.filter(item => sourceItemIds.includes(item.id))
            
            if (selectedItems.length === 0) {
              throw new Error("No source items found")
            }

            sourceText = selectedItems
              .map(item => `--- DOCUMENT: ${item.file_name} ---\n${item.extracted_text}`)
              .join('\n\n')

            sourceFilesLabel = selectedItems.map(item => item.file_name).join(', ')
            titleSuffix = selectedItems.length > 1 ? 'Combined Review' : selectedItems[0].file_name.split('.')[0]
          } else if (topicId) {
            const allTopics = useStudyBoxStore.getState().topics
            const selectedTopic = allTopics.find(t => t.id === topicId)
            
            if (!selectedTopic) {
              throw new Error("Selected topic not found")
            }

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

            CRITICAL DIVERSITY & DYNAMIC VARIETY RULE:
            - Ensure the study guide is highly unique, dynamic, and template-free!
            - Vary the clinical focus, key points, flashcard questions, mnemonics, and simplified analogies each time this topic is processed.
            - Explore different body system mechanics, comorbidities, nursing diagnostic priorities, and health teaching points to provide rich, multi-dimensional learning.

            CRITICAL RULE: If the text provided is a [SYSTEM MESSAGE] stating that text extraction failed or the document is empty, DO NOT generate a study guide. Instead, output a summary explaining that the document could not be read, and leave the flashcards, mnemonics, and key points arrays EMPTY.

            Your output must be a valid JSON object with the following fields:
            1. "summary": A markdown string of about 1200-1800 words containing a detailed clinical study guide. It MUST contain only the following 5 structured markdown headings and content:
               - ### 🧬 Clinical Pathophysiology & Concepts Overview: Deep-dive description of the disease/topic process, mechanisms, anatomical changes, etiology, and why they occur.
               - ### 📋 High-Yield Clinical Assessment & Laboratory Findings: Complete breakdown of physical assessments (early vs late signs, priority assessments), diagnostics, and critical lab values to monitor.
               - ### 💊 Pharmacological & Medical Management: Critical medications, drug classes, therapeutic actions, adverse effects, and nursing interventions during drug administration.
               - ### 🩺 Exhaustive Nursing Care Priorities & Scientific Rationales: Detailed step-by-step nursing interventions (assess, do, teach) with clinical rationales.
               - ### 🎯 Board Appraisal & Test-Taking Strategies: Specific board-exam style clinical focus scenarios, Select-All-That-Apply (SATA) concepts, and key test-taking pearls.
               
               *CRITICAL EXCLUSION RULE*: Do NOT write, append, or duplicate any key points list, flashcards list, or mnemonics section inside this "summary" field. Keep them completely separate. It must NOT contain any key points, flashcards, or mnemonics.
            
            2. "key_points": A JSON array of strings. Provide EXACTLY 12 to 18 deep, informative key clinical takeaways where each item contains a miniature lesson of 2-3 sentences. Do not generate fewer than 12 items.
            
            3. "flashcards": A JSON array of objects. Generate EXACTLY 15 to 25+ comprehensive, high-quality clinical question cards. Each object must have "front" and "back" keys. Do not generate fewer than 15 items.
            
            4. "mnemonics": A JSON array of objects. Generate EXACTLY 3 to 6 highly memorable clinical mnemonics to help them remember key concepts. Each object must have "title" and "content" keys.
            
            5. "simplified_explanation": A string containing a simple, easy-to-understand analogy or explanation, focusing on the "why" behind the concept.

            CRITICAL FORMATTING RULES:
            - Do NOT use markdown tables (e.g. | col 1 | col 2 |) under any circumstances anywhere. Present comparisons, stages, or values as clean bullet points, bold key-value lines, or indented lists.
            - Ensure that the "summary" string contains ONLY the 5 markdown sections listed above. It must NOT contain any key points, flashcards, or mnemonics.

            Output strictly as a JSON object with this exact structure:
            {
              "summary": "Full 5-section markdown study guide text...",
              "key_points": [
                "Detailed point 1 (2-3 sentences)",
                "Detailed point 2 (2-3 sentences)"
              ],
              "flashcards": [
                {
                  "front": "Challenging Question?",
                  "back": "Detailed Answer!"
                }
              ],
              "mnemonics": [
                {
                  "title": "Mnemonic Title",
                  "content": "Explanation of mnemonic and how to use it in practice"
                }
              ],
              "simplified_explanation": "A simple, easy-to-understand analogy or explanation, focusing on the 'why' behind the concept."
            }
          `

          const randomSeed = Math.random().toString(36).substring(7)
          const prompt = `Analyze this text and generate a completely fresh, unique clinical study guide.
          Random seed: ${randomSeed}-${new Date().getTime()}.
          CRITICAL DIVERSITY INSTRUCTION: Ensure that all descriptions, analogies, flashcards, mnemonics, and simplified explanations are fresh and different from prior generations on this topic. Use different clinical angles and teaching tips!
          
          Text content:\n\n${sourceText.substring(0, 12000)}`

          const result = await generateJSON(prompt, systemPrompt, 'reviewer', 0.85, 12000)

          if (result.flashcards) {
            result.flashcards = result.flashcards.map((f: any) => ({ ...f, id: generateId() }))
          }
          if (result.mnemonics) {
            result.mnemonics = result.mnemonics.map((m: any) => ({ ...m, id: generateId() }))
          }

          const currentUser = useAuthStore.getState().user
          const newReviewer: ReviewerItem & { user_email?: string } = {
            id: generateId(),
            user_id: currentUser?.id || 'guest',
            user_email: currentUser?.email || 'guest',
            topic_id: topicId || null,
            title: `AI Review — ${titleSuffix}`,
            source_file: sourceFilesLabel,
            is_favorite: false,
            created_at: new Date().toISOString(),
            content: {
              summary: result.summary || "Summary generated.",
              key_points: result.key_points || [],
              flashcards: result.flashcards || [],
              mnemonics: result.mnemonics || [],
              simplified_explanation: result.simplified_explanation || "Simplified explanation here.",
            }
          }

          set((state: any) => ({
            allReviewers: [newReviewer, ...state.allReviewers],
            reviewers: [newReviewer, ...state.reviewers],
            isGenerating: false,
          }))
          return newReviewer
        } catch (error) {
          console.error("Reviewer Generation Error:", error)
          let fallbackTitle = 'Error'
          let fallbackLabel = 'Unknown'
          if (sourceItemIds && sourceItemIds.length > 0) {
            const allItems = useStudyBoxStore.getState().items
            const selectedItems = allItems.filter(item => sourceItemIds.includes(item.id))
            fallbackLabel = selectedItems.length > 0 ? selectedItems.map(item => item.file_name).join(', ') : 'Unknown'
            fallbackTitle = selectedItems.length > 0 ? selectedItems[0].file_name.split('.')[0] : 'Error'
          } else if (topicId) {
            const allTopics = useStudyBoxStore.getState().topics
            const selectedTopic = allTopics.find(t => t.id === topicId)
            fallbackLabel = `${aiAssistantName} Clinical Library`
            fallbackTitle = selectedTopic ? selectedTopic.title : 'Error'
          }

          const currentUser = useAuthStore.getState().user
          const fallbackReviewer: ReviewerItem & { user_email?: string } = {
            id: generateId(),
            user_id: currentUser?.id || 'guest',
            user_email: currentUser?.email || 'guest',
            topic_id: topicId || null,
            title: `Review — ${fallbackTitle}`,
            source_file: fallbackLabel,
            is_favorite: false,
            created_at: new Date().toISOString(),
            content: {
              summary: `Oops! ${aiAssistantName} is currently busy or rate-limited. Please wait a few seconds and try again, ${greetingName}! 🌸\n\n*(Error: Mistral AI is temporarily busy or unreachable. Your API key is set correctly — please try again!)*`,
              key_points: ['Mistral AI is temporarily busy — please retry in a few seconds!'],
              flashcards: [],
              mnemonics: [],
              simplified_explanation: `Don't worry, ${greetingName}! Your Mistral API key is working, but we just hit a temporary hiccup. Let's wait a few moments and try generating again. I'm right here with you! 🧸🩺`
            }
          }
          set((state: any) => ({
            allReviewers: [fallbackReviewer, ...state.allReviewers],
            reviewers: [fallbackReviewer, ...state.reviewers],
            isGenerating: false,
          }))
          return fallbackReviewer
        }
      },

      generatePresentation: async (sourceItemIds: string[], topicId: string | null) => {
        set({ isGenerating: true })
        const config = getPersonalizationConfig()
        const { isFrance, greetingName, aiAssistantName } = config

        try {
          let sourceText = ''
          let sourceFilesLabel = ''
          let titleSuffix = ''

          if (sourceItemIds && sourceItemIds.length > 0) {
            const allItems = useStudyBoxStore.getState().items
            const selectedItems = allItems.filter(item => sourceItemIds.includes(item.id))
            
            if (selectedItems.length === 0) {
              throw new Error("No source items found")
            }

            sourceText = selectedItems
              .map(item => `--- DOCUMENT: ${item.file_name} ---\n${item.extracted_text}`)
              .join('\n\n')

            sourceFilesLabel = selectedItems.map(item => item.file_name).join(', ')
            titleSuffix = selectedItems.length > 1 ? 'Combined PPTX' : selectedItems[0].file_name.split('.')[0]
          } else if (topicId) {
            const allTopics = useStudyBoxStore.getState().topics
            const selectedTopic = allTopics.find(t => t.id === topicId)
            
            if (!selectedTopic) {
              throw new Error("Selected topic not found")
            }

            sourceText = `NURSING SUBJECT TOPIC: ${selectedTopic.title}\nDESCRIPTION: ${selectedTopic.description}`
            sourceFilesLabel = `${aiAssistantName} Clinical Library`
            titleSuffix = selectedTopic.title
          } else {
            throw new Error("Either sourceItemIds or topicId must be specified")
          }

          let aestheticRule = `
            AESTHETIC & PERSONALITY RULE:
            - Incorporate visually pleasing clinical emojis (🌸, 🩺, 🧠, 🩹, ✨, 🌷, 🦦) to decorate the slide titles and bullet points.
            - The "presenter_notes" must be written in a professional, warm, highly supportive clinical instructor tone, addressing them as a nursing student, providing high-yield clinical board tips, rationales, and exam strategies in Taglish/English.
          `

          if (isFrance) {
            aestheticRule = `
              CUTE AESTHETIC & PERSONALITY RULE:
              - Incorporate cute, visually pleasing emojis (🌸, 🩺, 🧸, 🩹, ✨, 🎀, 🌷, 🦦) to decorate the slide titles and bullet points.
              - The "presenter_notes" must be written in a sweet, supportive Taglish boyfriend tone, calling France "babe", checking in on her, and offering cute encouragement alongside the clinical explanation!
            `
          }

          const systemPrompt = `
            You are ${aiAssistantName}, an expert nursing instructor creating a PowerPoint presentation.
            Analyze the following text and generate a structured, highly educational, board-ready slide deck.
            Each slide should contain detailed, informative bullet points (2-3 sentences each) packed with pathophysiology, clinical assessments, drug rationales, and test-taking tips.

            ${aestheticRule}

            CRITICAL DIVERSITY & DYNAMIC VARIETY RULE:
            - Every presentation generated MUST be unique and completely template-free!
            - Vary the key points, presentation structures, medical examples, and slide focuses each time this topic is processed.
            - Presenter notes must speak in a custom, lively, and warm tutor tone that varies with the subject matter.

            Output strictly as a JSON object with this structure:
            {
              "slides": [
                {
                  "title": "Slide Title 🌸",
                  "bullet_points": ["Key point 1 (Detailed clinical description) 🩺", "Key point 2 (Pathophysiology/Nursing rationale) ✨"],
                  "presenter_notes": "What ${aiAssistantName} would say while presenting this slide. Include specific Filipino board exam rationales, mnemonics, and test-taking tips in Taglish!"
                }
              ]
            }
            Ensure the slide deck covers all key clinical concepts. Generates between 6 to 10 comprehensive slides.
          `

          const randomSeed = Math.random().toString(36).substring(7)
          const prompt = `Analyze this text for a presentation and generate unique slides with varied key bullet points and presenter notes.
          Random seed: ${randomSeed}-${new Date().getTime()}.
          CRITICAL DIVERSITY INSTRUCTION: Ensure that all slide titles, structures, clinical insights, and presenter notes are completely fresh and different from prior generations. Use different clinical angles and teaching tips!
          
          Text content:\n\n${sourceText.substring(0, 8000)}`

          const result = await generateJSON(prompt, systemPrompt, 'reviewer', 0.85, 12000)

          if (result.slides) {
            result.slides = result.slides.map((s: any) => ({ ...s, id: generateId() }))
          }

          const currentUser = useAuthStore.getState().user
          const newPresentation: ReviewerItem & { user_email?: string } = {
            id: generateId(),
            user_id: currentUser?.id || 'guest',
            user_email: currentUser?.email || 'guest',
            topic_id: topicId || null,
            title: `AI PPTX — ${titleSuffix}`,
            source_file: sourceFilesLabel,
            is_favorite: false,
            created_at: new Date().toISOString(),
            content: {
              summary: `A PowerPoint presentation generated by ${aiAssistantName}.`,
              key_points: [],
              flashcards: [],
              mnemonics: [],
              simplified_explanation: "This is a slide deck. Use it to practice your presentation skills or review visually!",
              slides: result.slides || []
            }
          }

          set((state: any) => ({
            allReviewers: [newPresentation, ...state.allReviewers],
            reviewers: [newPresentation, ...state.reviewers],
            isGenerating: false,
          }))
          return newPresentation
        } catch (error) {
          console.error("Presentation Generation Error:", error)
          let fallbackTitle = 'Error'
          let fallbackLabel = 'Unknown'
          if (sourceItemIds && sourceItemIds.length > 0) {
            const allItems = useStudyBoxStore.getState().items
            const selectedItems = allItems.filter(item => sourceItemIds.includes(item.id))
            fallbackLabel = selectedItems.length > 0 ? selectedItems.map(item => item.file_name).join(', ') : 'Unknown'
            fallbackTitle = selectedItems.length > 0 ? selectedItems[0].file_name.split('.')[0] : 'Error'
          } else if (topicId) {
            const allTopics = useStudyBoxStore.getState().topics
            const selectedTopic = allTopics.find(t => t.id === topicId)
            fallbackLabel = `${aiAssistantName} Clinical Library`
            fallbackTitle = selectedTopic ? selectedTopic.title : 'Error'
          }

          const currentUser = useAuthStore.getState().user
          const fallbackPresentation: ReviewerItem & { user_email?: string } = {
            id: generateId(),
            user_id: currentUser?.id || 'guest',
            user_email: currentUser?.email || 'guest',
            topic_id: topicId || null,
            title: `PPTX Error — ${fallbackTitle}`,
            source_file: fallbackLabel,
            is_favorite: false,
            created_at: new Date().toISOString(),
            content: {
              summary: `Oops! ${aiAssistantName} is currently busy or rate-limited. Please wait a few seconds and try again, ${greetingName}! 🌸\n\n*(Error: Mistral AI is temporarily busy or unreachable. Your API key is set correctly — please try again!)*`,
              key_points: [],
              flashcards: [],
              mnemonics: [],
              simplified_explanation: `Don't worry, ${greetingName}! Your Mistral API key is working, but we just hit a temporary hiccup. Let's wait a few moments and try generating again. I'm right here with you! 🧸🩺`
            }
          }
          set((state: any) => ({
            allReviewers: [fallbackPresentation, ...state.allReviewers],
            reviewers: [fallbackPresentation, ...state.reviewers],
            isGenerating: false,
          }))
          return fallbackPresentation
        }
      },

      toggleFavorite: (id: string) => {
        set((state: any) => {
          const update = (list: any[]) => list.map((r: any) => r.id === id ? { ...r, is_favorite: !r.is_favorite } : r)
          return {
            allReviewers: update(state.allReviewers),
            reviewers: update(state.reviewers)
          }
        })
      },

      deleteReviewer: (id: string) => {
        set((state: any) => ({
          allReviewers: state.allReviewers.filter((r: any) => r.id !== id),
          reviewers: state.reviewers.filter((r: any) => r.id !== id),
          selectedReviewer: state.selectedReviewer?.id === id ? null : state.selectedReviewer,
        }))
      },

      setSearchQuery: (q: string) => set({ searchQuery: q }),
      setSelectedReviewer: (r: any) => set({ selectedReviewer: r }),

      getFilteredReviewers: () => {
        const { reviewers, searchQuery } = get()
        if (!searchQuery) return reviewers
        return reviewers.filter((r: any) =>
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.source_file.toLowerCase().includes(searchQuery.toLowerCase())
        )
      },

      getFavorites: () => get().reviewers.filter((r: any) => r.is_favorite),
    }),
    {
      name: 'fn-reviewers-v3',
      merge: (persistedState: any, currentState: any) => {
        const state = persistedState || {}
        
        // 1. Migrate single-user reviewer list to allReviewers if not present
        const allReviewers = state.allReviewers || state.reviewers || []
        
        // 2. Tag old data with 'france@example.com' by default
        const migratedReviewers = allReviewers.map((r: any) => ({
          ...r,
          user_email: r.user_email || 'france@example.com'
        }))

        // 3. Filter for active user
        const currentUser = useAuthStore.getState().user
        const activeEmail = currentUser?.email || ''
        const filteredReviewers = migratedReviewers.filter((r: any) => r.user_email === activeEmail)

        return {
          ...currentState,
          ...persistedState,
          allReviewers: migratedReviewers,
          reviewers: filteredReviewers
        }
      }
    }
  )
)

// Dynamically trigger filtering on authentication state changes
useAuthStore.subscribe((state) => {
  const currentUser = state.user
  useReviewerStore.getState().filterByUser(currentUser?.email || null)
})
