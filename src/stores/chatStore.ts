import { create } from 'zustand'
import type { ChatMessage } from '@/types'
import { generateCompletion, DOC_UNO_SYSTEM_PROMPT } from '@/lib/ai'
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

const LEGACY_SESSION_ID = 'earlier-chats'
const cacheKey = (userId: string) => `france_notes_chat_sessions_${userId}`
const migratedKey = (userId: string) => `france_notes_chat_synced_${userId}`
const titleFrom = (text: string) => text.substring(0, 30) + (text.length > 30 ? '...' : '')

type ChatRow = ChatMessage & { session_id?: string | null; session_title?: string | null }

// null = not checked yet; false = chat_messages has no session columns (schema.sql not re-run)
let sessionColumns: boolean | null = null
async function hasSessionColumns() {
  if (sessionColumns === null) {
    const { error } = await supabase.from('chat_messages').select('session_id, session_title').limit(1)
    sessionColumns = !error
  }
  return sessionColumns
}

function readCache(userId: string): ChatSession[] {
  try { return JSON.parse(localStorage.getItem(cacheKey(userId)) || '[]') as ChatSession[] } catch { return [] }
}
function writeCache(userId: string, sessions: ChatSession[]) {
  try { localStorage.setItem(cacheKey(userId), JSON.stringify(sessions)) } catch { /* storage full or blocked */ }
}

async function saveMessage(userId: string, sessionId: string, sessionTitle: string, msg: ChatMessage) {
  const row = { role: msg.role, content: msg.content, user_id: userId, created_at: msg.created_at }
  if (await hasSessionColumns()) {
    const { error } = await supabase.from('chat_messages').insert([{ ...row, session_id: sessionId, session_title: sessionTitle }])
    if (!error) return
    console.warn('Saving chat message with session failed, retrying without:', error.message)
  }
  const { error } = await supabase.from('chat_messages').insert([row])
  if (error) console.warn('Saving chat message failed:', error.message)
}

// Chats from before sessions were synced exist only in this browser plus as untagged rows.
// Upload them with their session ids once, then drop the untagged copies so they don't show twice.
async function migrateLocalSessions(userId: string, local: ChatSession[], legacyRows: ChatRow[]) {
  if (localStorage.getItem(migratedKey(userId))) return false
  const withMessages = local.filter(s => s.messages.length > 0)
  if (withMessages.length === 0) { localStorage.setItem(migratedKey(userId), '1'); return false }
  const rows = withMessages.flatMap(s => s.messages.map(m => ({
    role: m.role, content: m.content, user_id: userId, created_at: m.created_at,
    session_id: s.id, session_title: s.title,
  })))
  const { error } = await supabase.from('chat_messages').insert(rows)
  if (error) { console.warn('Chat migration failed:', error.message); return false }
  const uploaded = new Set(rows.map(r => `${r.role}\u0000${r.content}`))
  const duplicates = legacyRows.filter(r => uploaded.has(`${r.role}\u0000${r.content}`)).map(r => r.id)
  if (duplicates.length > 0) await supabase.from('chat_messages').delete().in('id', duplicates)
  localStorage.setItem(migratedKey(userId), '1')
  return true
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
    const local = readCache(userId)
    // Show this device's copy right away; the synced version replaces it below
    if (local.length > 0) set({ sessions: local, activeSessionId: get().activeSessionId ?? local[0].id })

    const load = () => supabase.from('chat_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    const { data, error } = await load()
    if (error || !data) {
      // Offline or blocked: keep the local copy
      set({ isLoading: false })
      return
    }

    if (!(await hasSessionColumns())) {
      // Older database without session columns: sessions live on this device, server rows are a backup
      if (local.length === 0 && data.length > 0) {
        const backup: ChatSession = { id: LEGACY_SESSION_ID, title: 'Earlier chats', messages: data as ChatMessage[], created_at: data[0].created_at }
        writeCache(userId, [backup])
        set({ sessions: [backup], activeSessionId: backup.id })
      }
      set({ isLoading: false })
      return
    }

    let rows = data as ChatRow[]
    if (await migrateLocalSessions(userId, local, rows.filter(r => !r.session_id))) {
      const reloaded = await load()
      if (!reloaded.error && reloaded.data) rows = reloaded.data as ChatRow[]
    }

    const grouped = new Map<string, ChatSession>()
    for (const row of rows) {
      const id = row.session_id || LEGACY_SESSION_ID
      let chat = grouped.get(id)
      if (!chat) {
        chat = {
          id,
          title: row.session_id ? (row.session_title || titleFrom(row.content)) : 'Earlier chats',
          messages: [],
          created_at: row.created_at,
        }
        grouped.set(id, chat)
      }
      chat.messages.push({ id: row.id, role: row.role, content: row.content, created_at: row.created_at })
    }
    // Newest conversation first; keep a just-created empty chat from this device
    const synced = Array.from(grouped.values()).sort((x, y) =>
      new Date(y.messages[y.messages.length - 1].created_at).getTime() - new Date(x.messages[x.messages.length - 1].created_at).getTime())
    const emptyLocal = local.filter(s => s.messages.length === 0 && !grouped.has(s.id))
    const sessions = [...emptyLocal, ...synced]

    writeCache(userId, sessions)
    const current = get().activeSessionId
    set({
      sessions,
      activeSessionId: current && sessions.some(s => s.id === current) ? current : sessions[0]?.id ?? null,
      isLoading: false,
    })
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
    if (user?.id) writeCache(user.id, updatedSessions)

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
    if (!user?.id) return
    writeCache(user.id, updatedSessions)

    const removing = sessions.find(s => s.id === sessionId)
    if (sessionId === LEGACY_SESSION_ID) {
      const ids = removing?.messages.map(m => m.id) ?? []
      if (ids.length > 0) await supabase.from('chat_messages').delete().in('id', ids)
    } else if (await hasSessionColumns()) {
      await supabase.from('chat_messages').delete().eq('user_id', user.id).eq('session_id', sessionId)
    }
  },

  setSidebarOpen: (isOpen: boolean) => {
    set({ isSidebarOpen: isOpen })
  },

  sendMessage: async (content: string) => {
    const { activeSessionId } = get()
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
      
      writeCache(user.id, updated)
      return { sessions: updated, isTyping: true }
    })

    const sessionTitle = get().sessions.find(s => s.id === currentSessionId)?.title || titleFrom(content)
    await saveMessage(user.id, currentSessionId, sessionTitle, userMsg)

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
      
      writeCache(user.id, updated)
      return { sessions: updated, isTyping: false }
    })

    await saveMessage(user.id, currentSessionId, sessionTitle, assistantMsg)
  },

  clearHistory: async () => {
    set({ sessions: [], activeSessionId: null })
    const user = useAuthStore.getState().user
    if (!user?.id) return

    localStorage.removeItem(cacheKey(user.id))

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
      return `Oh no! I'm having a little trouble connecting right now. Can we try again in a moment, ${greetingName}?`
    }
  }
}))

