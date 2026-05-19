import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage } from '@/types'
import { generateId } from '@/lib/utils'
import { generateCompletion, getPersonalizationConfig, DOC_UNO_SYSTEM_PROMPT } from '@/lib/groq'
import { useStudyBoxStore } from './studyBoxStore'
import { useReviewerStore } from './reviewerStore'
import { useAuthStore } from './authStore'

interface ChatState {
  messages: ChatMessage[]
  isTyping: boolean
  
  allMessages: ChatMessage[]
  filterByUser: (email: string | null) => void

  sendMessage: (content: string) => Promise<void>
  clearHistory: () => void
  getDocUnoResponse: (userMessage: string) => Promise<string>
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isTyping: false,
      
      allMessages: [],
      
      filterByUser: (email: string | null) => {
        const { allMessages } = get()
        const activeEmail = email || ''
        const filteredMessages = allMessages.filter((m: any) => m.user_email === activeEmail)
        set({ messages: filteredMessages })
      },

      sendMessage: async (content: string) => {
        const currentUser = useAuthStore.getState().user
        const activeEmail = currentUser?.email || 'guest'
        
        const userMsg: ChatMessage & { user_email?: string } = {
          id: generateId(),
          role: 'user',
          content,
          created_at: new Date().toISOString(),
          user_email: activeEmail
        }

        set((state: any) => ({
          allMessages: [...state.allMessages, userMsg],
          messages: [...state.messages, userMsg],
          isTyping: true
        }))

        // Simulate AI thinking
        const responseContent = await get().getDocUnoResponse(content)
        
        const assistantMsg: ChatMessage & { user_email?: string } = {
          id: generateId(),
          role: 'assistant',
          content: responseContent,
          created_at: new Date().toISOString(),
          user_email: activeEmail
        }

        set((state: any) => ({
          allMessages: [...state.allMessages, assistantMsg],
          messages: [...state.messages, assistantMsg],
          isTyping: false
        }))
      },

      clearHistory: () => {
        const currentUser = useAuthStore.getState().user
        const activeEmail = currentUser?.email || 'guest'
        set((state: any) => ({
          allMessages: state.allMessages.filter((m: any) => m.user_email !== activeEmail),
          messages: []
        }))
      },

      getDocUnoResponse: async (userMessage: string) => {
        const config = getPersonalizationConfig()
        const { greetingName, aiAssistantName } = config

        try {
          const studyBox = useStudyBoxStore.getState()
          const reviewerLibrary = useReviewerStore.getState()
          
          const recentNotes = studyBox.items.slice(0, 5).map(i => i.file_name).join(', ')
          const recentReviewers = reviewerLibrary.reviewers.slice(0, 5).map(r => r.title).join(', ')
          
          // Format recent message history for context dynamically
          const history = get().messages.slice(-5).map((m: any) => `${m.role === 'user' ? greetingName : aiAssistantName}: ${m.content}`).join('\n')
          
          const prompt = `
            CONTEXT (${greetingName}'s current study materials):
            - Recent Notes in Study Box: ${recentNotes || 'No notes yet.'}
            - Recent Study Guides in Reviewer Library: ${recentReviewers || 'No reviewers yet.'}
            
            Recent Chat History:
            ${history}
            
            ${greetingName}'s new message:
            ${userMessage}
          `
          
          const response = await generateCompletion(prompt, DOC_UNO_SYSTEM_PROMPT, 'chat')
          return response
        } catch (error) {
          console.error('Chat Error:', error)
          return `Oh no! 🌸 I'm having a little trouble connecting right now. Can we try again in a moment, ${greetingName}? 🩺✨`
        }
      }
    }),
    {
      name: 'fn-chat-v3',
      merge: (persistedState: any, currentState: any) => {
        const state = persistedState || {}
        
        // 1. Migrate old single-user chat list to allMessages
        const allMessages = state.allMessages || state.messages || []
        
        // 2. Tag old messages with france's email by default
        const migratedMessages = allMessages.map((m: any) => ({
          ...m,
          user_email: m.user_email || 'france@example.com'
        }))

        // 3. Filter for active user
        const currentUser = useAuthStore.getState().user
        const activeEmail = currentUser?.email || ''
        const filteredMessages = migratedMessages.filter((m: any) => m.user_email === activeEmail)

        return {
          ...currentState,
          ...persistedState,
          allMessages: migratedMessages,
          messages: filteredMessages
        }
      }
    }
  )
)

// Dynamically trigger filtering on authentication state changes
useAuthStore.subscribe((state) => {
  const currentUser = state.user
  useChatStore.getState().filterByUser(currentUser?.email || null)
})
