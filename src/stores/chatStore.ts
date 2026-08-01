import { create } from 'zustand'
import type { ChatMessage } from '@/types'
import { generateCompletion, DOC_UNO_SYSTEM_PROMPT } from '@/lib/groq'
import { getPersonalizationConfig } from '@/lib/personalization'
import { useStudyBoxStore } from './studyBoxStore'
import { useReviewerStore } from './reviewerStore'
import { useAuthStore } from './authStore'
import { supabase } from '@/lib/supabase'
import { generateId } from '@/lib/utils'

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  created_at: string
}

interface ChatState {
  sessions: ChatSession[]
  activeSessionId: string | null
  isSidebarOpen: boolean
  isTyping: boolean
  isLoading: boolean
  error: string | null

  fetchSessions: () => Promise<void>
  fetchMessages: () => Promise<void>
  setActiveSession: (sessionId: string | null) => void
  createNewSession: (initialMessage?: string) => string
  deleteSession: (sessionId: string) => Promise<void>
  setSidebarOpen: (isOpen: boolean) => void
  sendMessage: (content: string) => Promise<void>
  clearHistory: () => Promise<void>
  getDocUnoResponse: (userMessage: string) => Promise<string>
}

export const useChatStore = create<ChatState>()((set, get) => ({
  sessions: [],
  activeSessionId: null,
  isSidebarOpen: false,
  isTyping: false,
  isLoading: false,
  error: null,

  fetchMessages: async () => {
    await get().fetchSessions()
  },

  fetchSessions: async () => {
    set({ isLoading: true, error: null })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      set({ sessions: [], activeSessionId: null, isLoading: false })
      return
    }

    const userId = session.user.id
    const storageKey = `france_notes_chat_sessions_${userId}`
    const localData = localStorage.getItem(storageKey)

    if (localData) {
      try {
        const parsed = JSON.parse(localData) as ChatSession[]
        set({ 
          sessions: parsed, 
          activeSessionId: parsed.length > 0 ? parsed[0].id : null,
          isLoading: false 
        })
        return
      } catch (e) {
        console.error('Failed to parse local chat sessions:', e)
      }
    }

    // Migration / Fallback: If no local sessions, fetch existing single thread from Supabase
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (!error && data && data.length > 0) {
        // Create a default session containing these messages
        const defaultSession: ChatSession = {
          id: generateId(),
          title: data[0].content ? data[0].content.substring(0, 30) + (data[0].content.length > 30 ? '...' : '') : 'Study Companion Chat',
          messages: data as ChatMessage[],
          created_at: data[0].created_at || new Date().toISOString()
        }
        
        const initialSessions = [defaultSession]
        localStorage.setItem(storageKey, JSON.stringify(initialSessions))
        
        set({ 
          sessions: initialSessions, 
          activeSessionId: defaultSession.id,
          isLoading: false 
        })
      } else {
        // No past messages, start with a fresh template
        set({ sessions: [], activeSessionId: null, isLoading: false })
      }
    } catch (err) {
      console.error('Error during Supabase messages migration:', err)
      set({ sessions: [], activeSessionId: null, isLoading: false })
    }
  },

  setActiveSession: (sessionId: string | null) => {
    set({ activeSessionId: sessionId })
  },

  createNewSession: (initialMessage?: string) => {
    const { sessions } = get()
    const newSession: ChatSession = {
      id: generateId(),
      title: initialMessage 
        ? initialMessage.substring(0, 30) + (initialMessage.length > 30 ? '...' : '') 
        : 'New Chat',
      messages: [],
      created_at: new Date().toISOString()
    }

    const updatedSessions = [newSession, ...sessions]
    set({ sessions: updatedSessions, activeSessionId: newSession.id })

    const user = useAuthStore.getState().user
    if (user?.id) {
      localStorage.setItem(`france_notes_chat_sessions_${user.id}`, JSON.stringify(updatedSessions))
    }

    return newSession.id
  },

  deleteSession: async (sessionId: string) => {
    const { sessions, activeSessionId } = get()
    const updatedSessions = sessions.filter(s => s.id !== sessionId)
    
    let nextActiveId = activeSessionId
    if (activeSessionId === sessionId) {
      nextActiveId = updatedSessions.length > 0 ? updatedSessions[0].id : null
    }

    set({ sessions: updatedSessions, activeSessionId: nextActiveId })

    const user = useAuthStore.getState().user
    if (user?.id) {
      localStorage.setItem(`france_notes_chat_sessions_${user.id}`, JSON.stringify(updatedSessions))
    }
  },

  setSidebarOpen: (isOpen: boolean) => {
    set({ isSidebarOpen: isOpen })
  },

  sendMessage: async (content: string) => {
    const { sessions, activeSessionId } = get()
    const user = useAuthStore.getState().user
    if (!user?.id) return

    let currentSessionId = activeSessionId
    
    // Automatically create a new session if none is active
    if (!currentSessionId) {
      currentSessionId = get().createNewSession(content)
    }

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      created_at: new Date().toISOString()
    }

    // Optimistically update session messages
    set((state) => {
      const updated = state.sessions.map((s) => {
        if (s.id === currentSessionId) {
          // If first message, auto-title the session
          const title = s.messages.length === 0 
            ? content.substring(0, 30) + (content.length > 30 ? '...' : '')
            : s.title
          
          return {
            ...s,
            title,
            messages: [...s.messages, userMsg]
          }
        }
        return s
      })
      
      localStorage.setItem(`france_notes_chat_sessions_${user.id}`, JSON.stringify(updated))
      return { sessions: updated, isTyping: true }
    })

    // Back up to Supabase 'chat_messages' table (optional, for safety)
    try {
      await supabase.from('chat_messages').insert([{
        role: 'user',
        content,
        user_id: user.id
      }])
    } catch (e) {
      console.warn('Backup of message to Supabase failed:', e)
    }

    // Get Doc Uno / AI response
    const responseContent = await get().getDocUnoResponse(content)

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: responseContent,
      created_at: new Date().toISOString()
    }

    // Update session with AI message
    set((state) => {
      const updated = state.sessions.map((s) => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            messages: [...s.messages, assistantMsg]
          }
        }
        return s
      })
      
      localStorage.setItem(`france_notes_chat_sessions_${user.id}`, JSON.stringify(updated))
      return { sessions: updated, isTyping: false }
    })

    // Back up AI response to Supabase
    try {
      await supabase.from('chat_messages').insert([{
        role: 'assistant',
        content: responseContent,
        user_id: user.id
      }])
    } catch (e) {
      console.warn('Backup of AI response to Supabase failed:', e)
    }
  },

  clearHistory: async () => {
    set({ sessions: [], activeSessionId: null })
    const user = useAuthStore.getState().user
    if (!user?.id) return

    localStorage.removeItem(`france_notes_chat_sessions_${user.id}`)

    // Clear backups in Supabase
    try {
      await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id)
    } catch (e) {
      console.warn('Supabase chat logs clear failed:', e)
    }
  },

  getDocUnoResponse: async (userMessage: string) => {
    const config = getPersonalizationConfig(useAuthStore.getState().user)
    const { greetingName, aiAssistantName } = config

    try {
      const studyBox = useStudyBoxStore.getState()
      const reviewerLibrary = useReviewerStore.getState()
      
      const recentNotes = studyBox.items.slice(0, 5).map(i => i.file_name).join(', ')
      const recentReviewers = reviewerLibrary.reviewers.slice(0, 5).map(r => r.title).join(', ')
      
      // Get conversation history of current active session
      const activeSession = get().sessions.find(s => s.id === get().activeSessionId)
      const currentMessages = activeSession ? activeSession.messages : []
      const history = currentMessages.slice(-5).map((m) => `${m.role === 'user' ? greetingName : aiAssistantName}: ${m.content}`).join('\n')
      
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
      
      // Clean up third-person narration/action tags like (smiles) or *smiles*, while preserving newlines & markdown
      const cleanedResponse = response
        .replace(/\/\*[\s\S]*?\*\//g, '') // remove JS-style comments if any
        .replace(/\((?:waiting|smiles|giggles|nods|sighs|chuckles|pauses)[^)]*\)/gi, '') // remove stage direction parens only
        .replace(/\*(?:smiles|giggles|nods|sighs|chuckles|pauses)\*/gi, '') // remove stage direction asterisks only
        .replace(/[ \t]+/g, ' ') // replace multiple spaces/tabs WITH SINGLE SPACE, preserving \n newlines!
        .replace(/\n\s*\n\s*\n+/g, '\n\n') // normalize excessive newlines to max 2
        .trim();

      return cleanedResponse
    } catch (error) {
      console.error('Chat Error:', error)
      return `Oh no! 🌸 I'm having a little trouble connecting right now. Can we try again in a moment, ${greetingName}? 🩺✨`
    }
  }
}))

