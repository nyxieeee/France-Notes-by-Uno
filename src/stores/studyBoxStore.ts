import { create } from 'zustand'
import type { StudyBoxItem, Topic, KnowledgeSearchResult } from '@/types'
import { extractTextFromFile } from '@/lib/extractor'
import { generateJSON, DOC_UNO_SYSTEM_PROMPT, generateCompletion, getPersonalizationConfig } from '@/lib/groq'
import { supabase } from '@/lib/supabase'

interface StudyBoxState {
  items: StudyBoxItem[]
  topics: Topic[]
  isUploading: boolean
  isProcessing: boolean
  isLoading: boolean
  searchQuery: string
  selectedTopic: string | null
  selectedItemIds: string[]
  savedKnowledge: KnowledgeSearchResult[]
  
  allTopics: Topic[]

  fetchItems: () => Promise<void>
  fetchSavedKnowledge: () => Promise<void>

  addItem: (file: File, topicId?: string) => Promise<StudyBoxItem>
  removeItem: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  updateTags: (id: string, tags: string[]) => Promise<void>
  updateSummary: (id: string, summary: string) => Promise<void>
  setSearchQuery: (q: string) => void
  setSelectedTopic: (id: string | null) => void
  toggleItemSelection: (id: string) => void
  clearSelection: () => void
  saveKnowledge: (result: KnowledgeSearchResult) => Promise<void>
  removeKnowledge: (id: string) => Promise<void>
  addTopic: (title: string, description: string, color: string) => Topic
  getFilteredItems: () => StudyBoxItem[]
  getFavorites: () => StudyBoxItem[]
  getRecentItems: (count?: number) => StudyBoxItem[]
}

const DEFAULT_TOPICS: Topic[] = [
  { id: 'topic-tfn', user_id: 'user-1', title: 'Theoretical Foundations in Nursing', description: 'Nursing theories, frameworks, conceptual models, and nursing philosophies.', color: '#FFB7B2', created_at: new Date().toISOString() },
  { id: 'topic-anatomy', user_id: 'user-1', title: 'Anatomy and Physiology', description: 'Structure and function of human body systems and homeostatic mechanisms.', color: '#FFD3B6', created_at: new Date().toISOString() },
  { id: 'topic-biochemistry', user_id: 'user-1', title: 'Biochemistry', description: 'Chemical compounds, metabolic processes, and molecular pathways in human biology.', color: '#FFF9C4', created_at: new Date().toISOString() },
  { id: 'topic-health-assess', user_id: 'user-1', title: 'Health Assessment', description: 'Health history taking, physical examination techniques, and baseline screening.', color: '#A8E6CF', created_at: new Date().toISOString() },
  { id: 'topic-fundamentals', user_id: 'user-1', title: 'Fundamentals of Nursing', description: 'Core nursing theories, safety practices, ethical principles, and basic clinical skills.', color: '#B8F2E6', created_at: new Date().toISOString() },
  { id: 'topic-microbiology', user_id: 'user-1', title: 'Microbiology and Parasitology', description: 'Pathogenic agents, parasitic infections, immune responses, and sterilization protocols.', color: '#C8E6C9', created_at: new Date().toISOString() },
  { id: 'topic-nutrition', user_id: 'user-1', title: 'Nutrition and Diet Therapy', description: 'Macronutrients, micronutrients, metabolic processes, therapeutic diets, and clinical feeding.', color: '#D8F3DC', created_at: new Date().toISOString() },
  { id: 'topic-pharmacology', user_id: 'user-1', title: 'Pharmacology', description: 'Drug classifications, mechanisms of action, pharmacokinetics, dosages, and nursing care.', color: '#A8D8B9', created_at: new Date().toISOString() },
  { id: 'topic-health-ed', user_id: 'user-1', title: 'Health Education', description: 'Teaching-learning principles, clinical communication, and health promotion strategies.', color: '#B2F7EF', created_at: new Date().toISOString() },
  { id: 'topic-informatics', user_id: 'user-1', title: 'Nursing Informatics', description: 'Healthcare IT systems, clinical records management, and digital technologies in care.', color: '#B3E5FC', created_at: new Date().toISOString() },
  { id: 'topic-maternal-child', user_id: 'user-1', title: 'Maternal-Child Nursing', description: 'Antenatal care, stages of labor, postpartum recovery, neonatal assessments, and high-risk OB.', color: '#D4A8F7', created_at: new Date().toISOString() },
  { id: 'topic-medsurg-1', user_id: 'user-1', title: 'Medical-Surgical Nursing I', description: 'Nursing care for adult patients with oxygenation, fluid/electrolyte, cellular, and endocrine system challenges.', color: '#B8C5F7', created_at: new Date().toISOString() },
  { id: 'topic-medsurg-2', user_id: 'user-1', title: 'Medical-Surgical Nursing II', description: 'Nursing care for adult patients with cardiovascular, neurological, immunological, and sensory system challenges.', color: '#C3C9E9', created_at: new Date().toISOString() },
  { id: 'topic-pediatric', user_id: 'user-1', title: 'Pediatric Nursing', description: 'Childhood growth stages, milestone screening, developmental psychology, and pediatric care.', color: '#FFD59E', created_at: new Date().toISOString() },
  { id: 'topic-psychiatric', user_id: 'user-1', title: 'Psychiatric Nursing', description: 'Mental health assessment, therapeutic interaction, maladaptive behaviors, and psychiatric care.', color: '#FFC2D1', created_at: new Date().toISOString() },
  { id: 'topic-community', user_id: 'user-1', title: 'Community Health Nursing', description: 'Epidemiology, family-based nursing, public health programs, and local community health care.', color: '#E8F5E9', created_at: new Date().toISOString() },
  { id: 'topic-research', user_id: 'user-1', title: 'Nursing Research', description: 'Scientific methodology, evidence-based practices, qualitative/quantitative research, and thesis work.', color: '#E8D7FF', created_at: new Date().toISOString() },
  { id: 'topic-critical-care', user_id: 'user-1', title: 'Critical Care & Emergency Nursing', description: 'Nursing management of multi-organ failure, advanced life support, trauma, and critical intensive care.', color: '#FF8B94', created_at: new Date().toISOString() },
  { id: 'topic-gero', user_id: 'user-1', title: 'Gerontological Nursing', description: 'Care of older adults, physiological changes of aging, physiological conditions, and comfort/palliative care.', color: '#FFF176', created_at: new Date().toISOString() },
  { id: 'topic-disaster', user_id: 'user-1', title: 'Disaster Nursing & Emergency Prep', description: 'Mass casualty response, triage protocols, disaster planning, and immediate emergency care.', color: '#FFD180', created_at: new Date().toISOString() },
  { id: 'topic-perioperative', user_id: 'user-1', title: 'Anesthesia & OR/DR Care', description: 'Operating Room, Delivery Room, PACU care, aseptic methods, surgical instruments, and anesthesia.', color: '#81D4FA', created_at: new Date().toISOString() },
  { id: 'topic-leadership', user_id: 'user-1', title: 'Nursing Leadership and Management', description: 'Ward administration, nursing staff management, hospital systems, and legal/ethical mandates.', color: '#C5CAE9', created_at: new Date().toISOString() },
  { id: 'topic-appraisal', user_id: 'user-1', title: 'Nursing Competency Appraisal', description: 'High-yield comprehensive review and exam preparations for the Philippine Nurse Licensure Exam (PNLE).', color: '#FFC1CC', created_at: new Date().toISOString() }
]

export const useStudyBoxStore = create<StudyBoxState>()((set, get) => ({
  items: [],
  topics: DEFAULT_TOPICS,
  isUploading: false,
  isProcessing: false,
  isLoading: false,
  searchQuery: '',
  selectedTopic: null,
  selectedItemIds: [],
  savedKnowledge: [],
  allTopics: DEFAULT_TOPICS,

  fetchItems: async () => {
    set({ isLoading: true })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      set({ items: [], isLoading: false })
      return
    }
    const { data, error } = await supabase
      .from("study_materials")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      
    if (!error && data) {
      set({ items: data as StudyBoxItem[], isLoading: false })
    } else {
      set({ isLoading: false })
    }
  },

  fetchSavedKnowledge: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data, error } = await supabase
      .from("saved_knowledge")
      .select("*")
      .eq("user_id", session.user.id)
      .order("date_saved", { ascending: false })
      
    if (!error && data) {
      set({ savedKnowledge: data as KnowledgeSearchResult[] })
    }
  },

  addItem: async (file: File, topicId?: string) => {
    set({ isUploading: true })
    
    let extractedText = ''
    try {
      extractedText = await extractTextFromFile(file)
      if (!extractedText.trim()) {
        extractedText = `[SYSTEM MESSAGE: The uploaded document '${file.name}' did not contain any readable text. It might be a scanned image-based PDF without OCR text.]`
      }
    } catch (error) {
      console.error('Failed to extract text', error)
      extractedText = `[SYSTEM MESSAGE: Failed to extract text from this document: ${file.name}. It may be corrupted or encrypted.]`
    }
    
    set({ isUploading: false, isProcessing: true })

    let assignedTopicId = topicId || null
    if (!assignedTopicId && extractedText.trim() && !extractedText.startsWith('[SYSTEM MESSAGE')) {
      try {
        const prompt = `
          Based on the following document text, classify it into a broad nursing subject category (e.g., "Fundamentals", "Pharmacology", "Medical-Surgical", "Anatomy", "Maternal-Child", "Psychiatric", "Pediatrics").
          Keep the title short (max 3 words). Provide a short description.
          Return a hex color code that fits a soft, pastel, cozy feminine theme (e.g., "#FFB6C1", "#A8D8B9", "#B8C5F7").
          
          Text snippet:
          "${extractedText.substring(0, 1500)}"
          
          Format as JSON: { "title": "Topic Name", "description": "Short description", "color": "#HEX" }
        `
        const category = await generateJSON(prompt, DOC_UNO_SYSTEM_PROMPT, 'studybox')
        
        const existingTopics = get().topics
        const existingTopic = existingTopics.find((t: Topic) => t.title.toLowerCase() === category.title?.toLowerCase())
        
        if (existingTopic) {
          assignedTopicId = existingTopic.id
        } else {
          const newTopic = {
            id: `topic-${Math.random().toString(36).substring(7)}`,
            user_id: 'user-1',
            title: category.title || 'General Notes',
            description: category.description || 'Automatically categorized notes',
            color: category.color || '#F7A8B8',
            created_at: new Date().toISOString()
          }
          set((state) => ({ topics: [...state.topics, newTopic] }))
          assignedTopicId = newTopic.id
        }
      } catch (err) {
        console.error("Failed to auto-categorize:", err)
      }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const fileType = ['pdf'].includes(ext) ? 'pdf'
      : ['docx', 'doc'].includes(ext) ? 'docx'
      : ['pptx', 'ppt'].includes(ext) ? 'pptx'
      : ['txt'].includes(ext) ? 'txt'
      : 'image'

    let previewImage: string | null = null
    if (fileType === 'image') {
      try {
        previewImage = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(file)
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = error => reject(error)
        })
      } catch (e) {
        console.error('Failed to read image as base64 preview', e)
      }
    }

    let summaryText = ''
    if (extractedText.trim() && !extractedText.startsWith('[SYSTEM MESSAGE')) {
      try {
        const config = getPersonalizationConfig()
        const { isFrance, greetingName, aiAssistantName } = config

        let summaryPrompt = ""
        if (isFrance) {
          summaryPrompt = `
            You are Doc Uno, a loving and extremely smart nursing tutor helping your girlfriend France study.
            Review the following document text and write a HIGHLY DETAILED, comprehensive, and clinically rigorous nursing study guide/summary of this material.
            Do not output a simple or brief summary. Ensure it provides extensive information suitable for both clinical practice and high-stakes board exams like the PNLE.
            
            CUTE AESTHETIC & PERSONALITY RULE:
            - Use highly decorative, cute, and friendly emojis (e.g., 🌸, 🩺, 🧸, 🩹, ✨, 🎀, 🌷, 🦦) inside your markdown headings and scattered naturally throughout the content to make it visually adorable for France!
            - Speak to her in a sweet, supportive Taglish boyfriend tone. Call her "babe", cheer her on, and make the review feel like a cozy, romantic, and extremely smart study date!
            
            CRITICAL FORMATTING RULE:
            - Do NOT use markdown tables (e.g. | BP | Stage | etc.) under any circumstances. If you need to make comparisons or show lists of stages/diagnostics, present them as clean bullet points, bold key-value lines, or indented lists. Raw tables are hard to read, so they must be avoided.
            
            Use markdown formatting and structure it with:
            1. **🧬 Clinical Pathophysiology & Concepts Overview**: Exhaustive, deep-dive description of the disease/topic process, mechanisms, anatomical changes, etiology, and why they occur.
            2. **📋 High-Yield Clinical Assessment & Laboratory Findings**: Complete breakdown of physical assessments (early vs late signs, priority assessments), diagnostics, and critical lab values she must look out for.
            3. **💊 Pharmacological & Medical Management**: Critical medications, drug classes, therapeutic actions, adverse effects, and nursing interventions during drug administration.
            4. **🩺 Exhaustive Nursing Care Priorities & Scientific Rationales**: Detailed step-by-step nursing interventions (assess, do, teach) with clinical rationales.
            5. **🎯 Doc Uno's PNLE Board Appraisal & Study Pearls**: Specific board-exam style clinical focus scenarios, SATA concepts, and test-taking tips, written in a loving boyfriend tone (call her "babe", cheer her on!).
            
            Text to summarize:
            "${extractedText.substring(0, 6000)}"
          `
        } else {
          summaryPrompt = `
            You are ${aiAssistantName}, an expert clinical nursing instructor.
            Review the following document text and write a HIGHLY DETAILED, comprehensive, and clinically rigorous nursing study guide/summary of this material.
            Do not output a simple or brief summary. Ensure it provides extensive, board-ready clinical reviews.
            
            PROFESSIONAL ENCOURAGING RULE:
            - Use clear, professional clinical emojis (🩺, 👩‍⚕️, 🧠, 📝, ✨, 💊) inside markdown headings and bullet points.
            - Address the student as ${greetingName}. Keep the tone extremely professional, warm, highly intelligent, and focused on helping them excel on the board exams.
            - Absolutely NO romantic references or boyfriend endearments.
            
            CRITICAL FORMATTING RULE:
            - Do NOT use markdown tables (e.g. | BP | Stage | etc.) under any circumstances. If you need to make comparisons or show lists of stages/diagnostics, present them as clean bullet points, bold key-value lines, or indented lists. Raw tables are hard to read, so they must be avoided.
            
            Use markdown formatting and structure it with:
            1. **🧬 Clinical Pathophysiology & Concepts Overview**: Exhaustive, deep-dive description of the disease/topic process, mechanisms, anatomical changes, etiology, and why they occur.
            2. **📋 High-Yield Clinical Assessment & Laboratory Findings**: Complete breakdown of physical assessments (early vs late signs, priority assessments), diagnostics, and critical lab values.
            3. **💊 Pharmacological & Medical Management**: Critical medications, drug classes, therapeutic actions, adverse effects, and nursing interventions during drug administration.
            4. **🩺 Exhaustive Nursing Care Priorities & Scientific Rationales**: Detailed step-by-step nursing interventions (assess, do, teach) with clinical rationales.
            5. **🎯 Board Appraisal & Study Pearls**: Specific board-exam style clinical focus scenarios, SATA concepts, and test-taking tips.
            
            Text to summarize:
            "${extractedText.substring(0, 6000)}"
          `
        }

        summaryText = await generateCompletion(summaryPrompt, undefined, 'studybox')
      } catch (err) {
        console.error("Failed to generate AI summary:", err)
      }
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error("No active session found")

    const newItem = {
      file_name: file.name,
      file_type: fileType,
      file_size: file.size,
      extracted_text: extractedText,
      preview_image: previewImage,
      topic_id: assignedTopicId,
      is_favorite: false,
      tags: [],
      summary: summaryText || undefined,
      user_id: session.user.id
    }
    
    // Save to Supabase
    const { data, error } = await supabase
      .from('study_materials')
      .insert([newItem])
      .select()
      .single()

    if (error) console.error("Error inserting file to Supabase", error)

    set((state) => ({
      items: data ? [data as StudyBoxItem, ...state.items] : state.items,
      isProcessing: false,
    }))
    
    return data as StudyBoxItem || { ...newItem, id: 'temp-id' } as any
  },

  removeItem: async (id: string) => {
    set((state) => ({ items: state.items.filter(i => i.id !== id) }))
    await supabase.from('study_materials').delete().eq('id', id)
  },

  toggleFavorite: async (id: string) => {
    const current = get().items.find(i => i.id === id)
    if (!current) return
    set((state) => ({
      items: state.items.map(i => i.id === id ? { ...i, is_favorite: !i.is_favorite } : i)
    }))
    await supabase.from('study_materials').update({ is_favorite: !current.is_favorite }).eq('id', id)
  },

  updateTags: async (id: string, tags: string[]) => {
    set((state) => ({
      items: state.items.map(i => i.id === id ? { ...i, tags } : i)
    }))
    await supabase.from('study_materials').update({ tags }).eq('id', id)
  },

  updateSummary: async (id: string, summary: string) => {
    set((state) => ({
      items: state.items.map(i => i.id === id ? { ...i, summary } : i)
    }))
    await supabase.from('study_materials').update({ summary }).eq('id', id)
  },

  setSearchQuery: (q: string) => set({ searchQuery: q }),
  setSelectedTopic: (id: string | null) => set({ selectedTopic: id }),

  toggleItemSelection: (id: string) => {
    set((state) => ({
      selectedItemIds: state.selectedItemIds.includes(id)
        ? state.selectedItemIds.filter(itemId => itemId !== id)
        : [...state.selectedItemIds, id]
    }))
  },

  clearSelection: () => set({ selectedItemIds: [] }),

  saveKnowledge: async (result: KnowledgeSearchResult) => {
    const isAlreadySaved = get().savedKnowledge.some((k) => k.id === result.id)
    if (isAlreadySaved) return

    let fullArticleText = `SOURCE: ${result.source}\nURL: ${result.url}\n\n`
    try {
      const prompt = `
        You are a specialized clinical database librarian.
        Generate an exhaustive, highly-detailed, authoritative Nursing Study Guide / Clinical Reference Article for the topic: "${result.title}".
        Source reference context: "${result.description}" from ${result.source}.
        
        STRUCTURE:
        Provide a complete and highly professional textbook-style clinical entry containing:
        1. CLINICAL OVERVIEW & PATHOPHYSIOLOGY (Explain the mechanism, phases, and direct clinical significance)
        2. KEY ETIOLOGIES & RISK FACTORS (Detailed list of exact causes)
        3. KEY CLINICAL MANIFESTATIONS (Signs and symptoms categorised systematically)
        4. DIAGNOSTIC PROCEDURES & LABS (Complete nursing assessments, diagnostic tests, lab findings, and rationales)
        5. MEDICAL & PHARMACOLOGICAL TREATMENTS (Main therapies, fluids, medications, and surgical/interventional procedures)
        6. ESSENTIAL NURSING DIAGNOSES & EVIDENCE-BASED INTERVENTIONS (At least 3 distinct care plan lines with clear rationales, including vital monitoring, positioning, comfort, and patient education)
        
        Style: Strictly formal, academic, clear, and highly detailed. Ensure all information is 100% evidence-based and clinical-grade. Keep it in high-yield medical English. Do not write a summary; write the full article. Aim for a comprehensive length of 600-800 words.
      `
      const articleContent = await generateCompletion(prompt, "You are a specialized clinical database librarian generating textbook-grade clinical references.", 'knowledge')
      if (articleContent) {
        fullArticleText += articleContent
      } else {
        fullArticleText += `SUMMARY:\n${result.description}`
      }
    } catch (error) {
      console.error("Failed to generate full reference article:", error)
      fullArticleText += `SUMMARY:\n${result.description}`
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error("No active session found")

    const newItem = {
      file_name: `[Reference] ${result.title}.txt`,
      file_type: 'txt',
      file_size: 0,
      extracted_text: fullArticleText,
      preview_image: null,
      topic_id: null,
      is_favorite: true,
      tags: ['knowledge-garden', result.category],
      summary: undefined,
      user_id: session.user.id
    }

    const { data: insertedItem } = await supabase.from('study_materials').insert([newItem]).select().single()
    
    // In SQL we also had a saved_knowledge table
    const knowledgeToSave = {
      title: result.title,
      description: result.description,
      source: result.source,
      url: result.url,
      category: result.category,
      date_saved: new Date().toISOString(),
      user_id: session.user.id
    }
    const { data: insertedKnowledge } = await supabase.from('saved_knowledge').insert([knowledgeToSave]).select().single()

    set((state) => ({
      savedKnowledge: insertedKnowledge ? [insertedKnowledge as KnowledgeSearchResult, ...state.savedKnowledge] : state.savedKnowledge,
      items: insertedItem ? [insertedItem as StudyBoxItem, ...state.items] : state.items
    }))
  },

  removeKnowledge: async (id: string) => {
    set((state) => ({
      savedKnowledge: state.savedKnowledge.filter(k => k.id !== id)
    }))
    await supabase.from('saved_knowledge').delete().eq('id', id)
  },

  addTopic: (title: string, description: string, color: string) => {
    const topic: Topic = {
      id: `topic-${Math.random().toString(36).substring(7)}`,
      user_id: 'user-1',
      title,
      description,
      color,
      created_at: new Date().toISOString(),
    }
    set((state) => ({
      topics: [...state.topics, topic]
    }))
    return topic
  },

  getFilteredItems: () => {
    const { items, searchQuery, selectedTopic } = get()
    return items.filter((item) => {
      const matchesSearch = !searchQuery ||
        item.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesTopic = !selectedTopic || item.topic_id === selectedTopic
      return matchesSearch && matchesTopic
    })
  },

  getFavorites: () => get().items.filter(i => i.is_favorite),
  getRecentItems: (count = 4) =>
    [...get().items]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, count),
}))

// Initial fetches
useStudyBoxStore.getState().fetchItems()
useStudyBoxStore.getState().fetchSavedKnowledge()
