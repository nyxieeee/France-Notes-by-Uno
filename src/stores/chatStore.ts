import { create } from 'zustand'
import type { ChatMessage } from '@/types'
import { generateCompletion, getPersonalizationConfig, DOC_UNO_SYSTEM_PROMPT } from '@/lib/groq'
import { useStudyBoxStore } from './studyBoxStore'
import { useReviewerStore } from './reviewerStore'
import { supabase } from '@/lib/supabase'

interface ChatState {
  messages: ChatMessage[]
  isTyping: boolean
  isLoading: boolean
  error: string | null

  fetchMessages: () => Promise<void>
  sendMessage: (content: string) => Promise<void>
  clearHistory: () => Promise<void>
  getDocUnoResponse: (userMessage: string) => Promise<string>
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  isTyping: false,
  isLoading: false,
  error: null,

  fetchMessages: async () => {
    set({ isLoading: true, error: null })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      set({ messages: [], isLoading: false })
      return
    }
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching chat messages:', error)
      set({ error: error.message, messages: [], isLoading: false })
    } else {
      set({ messages: data as ChatMessage[], isLoading: false })
    }
  },

  sendMessage: async (content: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const userMsg = {
      role: 'user',
      content,
      user_id: session.user.id
    }

    set((state) => ({
      isTyping: true,
      // Optimistically add user message (will be replaced by DB record, but good for UX)
      messages: [...state.messages, { ...userMsg, id: 'temp-user', created_at: new Date().toISOString() } as ChatMessage]
    }))

    // Save user message to DB
    await supabase.from('chat_messages').insert([userMsg])

    // Fetch fresh to get real ID
    await get().fetchMessages()

    // Simulate AI thinking
    const responseContent = await get().getDocUnoResponse(content)
    
    const assistantMsg = {
      role: 'assistant',
      content: responseContent,
      user_id: session.user.id
    }

    // Save assistant message to DB
    await supabase.from('chat_messages').insert([assistantMsg])

    // Fetch fresh to get real ID
    await get().fetchMessages()
    set({ isTyping: false })
  },

  clearHistory: async () => {
    set({ messages: [] })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Error clearing chat history:', error)
    }
  },

  getDocUnoResponse: async (userMessage: string) => {
    const config = getPersonalizationConfig()
    const { greetingName, aiAssistantName } = config

    try {
      const studyBox = useStudyBoxStore.getState()
      const reviewerLibrary = useReviewerStore.getState()
      
      const recentNotes = studyBox.items.slice(0, 5).map(i => i.file_name).join(', ')
      const recentReviewers = reviewerLibrary.reviewers.slice(0, 5).map(r => r.title).join(', ')
      
      const history = get().messages.slice(-5).map((m) => `${m.role === 'user' ? greetingName : aiAssistantName}: ${m.content}`).join('\n')
      
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
}))

// Initial fetch
useChatStore.getState().fetchMessages()
