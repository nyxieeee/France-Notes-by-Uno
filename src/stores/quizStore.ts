import { create } from 'zustand'
import type { Quiz, QuizQuestion, QuizSetupConfig } from '@/types'
import { shuffleArray, checkAnswerCorrectness } from '@/lib/utils'
import { generateJSON } from '@/lib/ai'
import { getPersonalizationConfig } from '@/lib/personalization'
import { useAuthStore } from './authStore'
import { supabase } from '@/lib/supabase'
import { toast } from './feedbackStore'

interface QuizState {
  quizzes: Quiz[]
  activeQuiz: Quiz | null
  questions: QuizQuestion[]
  currentIndex: number
  answers: Record<string, string | string[]>
  isGenerating: boolean
  generationProgress: { done: number; total: number }
  isFinished: boolean
  isLoading: boolean
  error: string | null
  // Set when quiz generation fails; the page shows it with Retry / Back
  generationError: string | null
  lastConfig: QuizSetupConfig | null

  fetchQuizzes: () => Promise<void>
  startQuiz: (config: QuizSetupConfig) => Promise<void>
  submitAnswer: (questionId: string, answer: string | string[]) => void
  nextQuestion: () => void
  prevQuestion: () => void
  finishQuiz: () => Promise<void>
  resetQuiz: () => void
  deleteQuiz: (id: string) => Promise<void>
  getScore: () => number
}

let finishing = false

export const useQuizStore = create<QuizState>()((set, get) => ({
  quizzes: [],
  activeQuiz: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  isGenerating: false,
  generationProgress: { done: 0, total: 0 },
  isFinished: false,
  isLoading: false,
  error: null,
  generationError: null,
  lastConfig: null,

  fetchQuizzes: async () => {
    set({ isLoading: true, error: null })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      set({ quizzes: [], isLoading: false })
      return
    }
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching quizzes:', error)
      set({ error: error.message, quizzes: [], isLoading: false })
    } else {
      set({ quizzes: data as Quiz[], isLoading: false })
    }
  },

  startQuiz: async (config: any) => {
    set({ isGenerating: true, generationError: null, lastConfig: config, generationProgress: { done: 0, total: config.size }, activeQuiz: null, questions: [], currentIndex: 0, answers: {}, isFinished: false })
    
    // Create temporary quiz object in memory while generating
    const newQuiz: Partial<Quiz> = {
      topic_id: config.topic || null,
      title: `${config.topic} Quiz`,
      total_items: config.size,
      question_type: config.question_type,
      score: null,
      completed: false,
      timer_type: config.timer_type || 'untimed',
      timer_value: config.timer_value || 0
    }

    try {
      const configDetails = getPersonalizationConfig(useAuthStore.getState().user)
      const { isFrance, greetingName, aiAssistantName } = configDetails

      // Built per batch so each request only asks for `count` questions
      const buildPrompts = (count: number, avoid: string[]) => {
        let systemPrompt = ""
        if (isFrance) {
          systemPrompt = `
            You are Doc Uno, an expert nursing instructor.
            Generate a ${count}-question ${config.question_type} quiz about ${config.topic}.

            CRITICAL PNLE BOARD APPRAISAL INSTRUCTION:
            The quiz questions must be HIGHLY DETAILED and emulate real board exam levels (PNLE, NCLEX-RN). 
            - For multiple choice/SATA/clinical judgment, write rich clinical scenarios or situational case studies describing a patient's condition, lab values, symptoms, or medication profile.
            - The 'rationale' field MUST be extremely detailed and educational: explain the pathophysiology of the condition, state exactly why the correct choice is correct, and provide clear clinical explanations for why EACH incorrect choice is wrong.
            - The 'clinical_logic' field should provide high-yield test-taking tips, priority clinical indicators, or memorization cues in clear English to help France easily recall it during her exams.

            CUTE AESTHETIC & PERSONALITY RULE:
            - Do not use emojis anywhere in the output.
            - Intersperse warm, encouraging English boyfriend words (e.g. calling her "babe", cheering her on) inside the 'rationale' and 'clinical_logic' fields so it feels like a sweet, private review session — in pure English only, no Tagalog!

            CRITICAL DIVERSITY & DYNAMIC VARIETY RULE:
            - Every single time a quiz is generated, it MUST be completely unique and highly dynamic!
            - Introduce diverse client cases with varying age groups, ethnicities, clinical backgrounds, and comorbidities.
            - Explore different sub-topics and disease stages (acute vs chronic, early vs late symptoms, primary vs secondary prevention).
            - Do NOT reuse identical questions or standard textbook templates — write fresh, engaging, and immersive clinical narratives.
          `
        } else {
          systemPrompt = `
            You are ${aiAssistantName}, an expert nursing instructor.
            Generate a ${count}-question ${config.question_type} quiz about ${config.topic}.

            CRITICAL PNLE BOARD APPRAISAL INSTRUCTION:
            The quiz questions must be HIGHLY DETAILED and emulate real board exam levels (PNLE, NCLEX-RN). 
            - For multiple choice/SATA/clinical judgment, write rich clinical scenarios or situational case studies describing a patient's condition, lab values, symptoms, or medication profile.
            - The 'rationale' field MUST be extremely detailed and educational: explain the pathophysiology of the condition, state exactly why the correct choice is correct, and provide clear clinical explanations for why EACH incorrect choice is wrong.
            - The 'clinical_logic' field should provide high-yield test-taking tips, priority clinical indicators, or board-exam mnemonics to help the student easily recall it during their exams.
            - Address the student as ${greetingName}. Maintain an encouraging, warm, but highly professional mentoring tone.
            - Strictly NO romantic references, endearments, or mentions of boyfriend/girlfriend.

            CLINICAL AESTHETIC & PERSONALITY RULE:
            - Do not use emojis anywhere in the output.

            CRITICAL DIVERSITY & DYNAMIC VARIETY RULE:
            - Every single time a quiz is generated, it MUST be completely unique and highly dynamic!
            - Introduce diverse client cases with varying age groups, ethnicities, clinical backgrounds, and comorbidities.
            - Explore different sub-topics and disease stages (acute vs chronic, early vs late symptoms, primary vs secondary prevention).
            - Do NOT reuse identical questions or standard textbook templates — write fresh, engaging, and immersive clinical narratives.
          `
        }

        if (config.sourceText) {
          // Trim aggressively — the system prompt itself is already ~800 tokens
          // leaving ~6-7k tokens for source context + generation
          const trimmedSource = config.sourceText.substring(0, 8000)
          systemPrompt += `
          CRITICAL SOURCE-ONLY INSTRUCTION: You MUST generate ALL quiz questions EXCLUSIVELY from the following source material provided below.
          - Do NOT introduce conditions, diseases, drugs, or clinical scenarios that are NOT mentioned in the source material.
          - Do NOT add unrelated comorbidities (e.g., if the source is about Myocardial Infarction, do NOT generate questions about Type 2 Diabetes unless it is explicitly discussed in the source text).
          - Every question MUST be directly traceable to a fact, concept, or scenario present in the source material.
          - If the source material does not have enough content for ${count} questions, generate the remaining questions using closely related sub-concepts strictly within the same topic as the source.
          - You MUST generate EXACTLY ${count} questions. Do NOT generate fewer.

          SOURCE MATERIAL:
          """
          ${trimmedSource}
          """
          `
        }

        let typeInstruction = config.question_type === 'mixed' 
          ? "You MUST generate a highly varied mix of 'multiple_choice', 'sata', 'situational', 'clinical_judgment', 'prioritization', 'true_false', 'identification', 'fill_blank', 'essay', and 'case_study' questions."
          : `You MUST strictly generate ONLY '${config.question_type}' style questions.`

        systemPrompt += `
          Output strictly as a JSON object with a 'questions' array containing exactly ${count} objects.
          ${typeInstruction}
          Each question must have: 
          - 'id' (string)
          - 'question' (string. For 'case_study', include a full clinical scenario here. For 'fill_blank', use '_____' for the blank. For 'essay', ask an open-ended clinical scenario requiring deep clinical rationale.)
          - 'type' (must be exactly one of: 'multiple_choice', 'sata', 'situational', 'clinical_judgment', 'nclex', 'prioritization', 'true_false', 'identification', 'fill_blank', 'essay', 'case_study')
          - 'choices' (array of strings. EXACTLY 4 choices. For SATA, provide 5-6. For True/False, provide exactly ["True", "False"]. For Identification, Fill in the blanks, or Essay, provide an empty array [].)
          - 'correct_answer' (string or array of strings. For SATA, this MUST be an array of strings. For Essay, provide a detailed bulleted sample/model response highlighting all the key medical terms/rationales that the student should have included.)
          - 'rationale' (string. Extremely detailed explanation of the pathology, why the correct answer is right, and why each incorrect option is wrong. For Essay, explain the key points of the model response.)
          - 'clinical_logic' (string. Board-exam test-taking strategy or memory hook.)
        `
      
        const randomSeed = Math.random().toString(36).substring(7)
        const prompt = config.sourceText
          ? `Generate a quiz now based STRICTLY on the provided source material. 
        Random seed: ${randomSeed}-${new Date().getTime()}.
        CRITICAL INSTRUCTION: You MUST generate EXACTLY ${count} questions. Count them as you generate: 1, 2, ..., ${count}. Do NOT stop until you have exactly ${count} questions.
        STRICT SOURCE RULE: Every single question MUST come from the source material provided. Do NOT introduce any clinical scenario, condition, drug, or concept outside the source text.`
          : `Generate a fresh, unique, and completely new clinical quiz now. 
        Random seed: ${randomSeed}-${new Date().getTime()}.
        CRITICAL INSTRUCTION: You MUST generate EXACTLY ${count} questions. Please count them as you generate: 1, 2, ..., ${count}. Do NOT stop generating until you have exactly ${count} questions. If you generate fewer than ${count}, you fail the task.
        CRITICAL DIVERSITY INSTRUCTION: Ensure that all questions, scenario profiles, lab values, and clinical settings are completely different from prior quizzes. Explore a different sub-focus within this topic area (e.g. drug side effects, priority assessments, post-op instructions, or ethical nurse dilemmas) to keep it fully dynamic!`

        if (avoid.length > 0) {
          systemPrompt += `
        Do NOT repeat or closely paraphrase any of these questions already in this quiz:
        ${avoid.map(q => `- ${q.substring(0, 140)}`).join('\n')}
        `
        }
        return { prompt, systemPrompt }
      }

      // Generate in small batches — one big request for 20+ detailed questions
      // overflows the output limit and comes back cut off (unparseable)
      const BATCH_SIZE = 5
      const generatedQuestions: QuizQuestion[] = []
      let failedAttempts = 0

      while (generatedQuestions.length < config.size && failedAttempts < 2) {
        const count = Math.min(BATCH_SIZE, config.size - generatedQuestions.length)
        const { prompt, systemPrompt } = buildPrompts(count, generatedQuestions.map(q => q.question))

        let batch: QuizQuestion[] = []
        try {
          const result = await generateJSON(prompt, systemPrompt, 'quiz', 0.85, 6000)
          batch = (result.questions || [])
            .filter((q: any) => q && typeof q.question === 'string')
            .slice(0, count)
            .map((q: any) => ({
              ...q,
              id: `q-${Math.random().toString(36).substring(7)}`, // Ensure unique ID
              choices: q.type === 'true_false' ? (q.choices || ["True", "False"]) : shuffleArray(q.choices || []),
              question_type: q.type || q.question_type || config.question_type || 'multiple_choice'
            })) as QuizQuestion[]
        } catch (batchError) {
          console.warn('Quiz batch failed:', batchError)
        }

        if (batch.length === 0) {
          failedAttempts++
          continue
        }
        failedAttempts = 0
        generatedQuestions.push(...batch)
        set({ generationProgress: { done: generatedQuestions.length, total: config.size } })
      }

      if (generatedQuestions.length === 0) throw new Error("No questions generated by AI.")

      set(() => ({
        activeQuiz: { ...newQuiz, total_items: generatedQuestions.length, created_at: new Date().toISOString() } as Quiz,
        questions: generatedQuestions,
        isGenerating: false
      }))
    } catch (error) {
      console.error("Quiz Generation Error:", error)
      set({
        isGenerating: false,
        activeQuiz: null,
        questions: [],
        generationError: "The AI couldn't finish writing your quiz. Check your connection and try again, or pick a smaller quiz size.",
      })
    }
  },

  submitAnswer: (questionId: string, answer: string | string[]) => {
    set((state) => ({
      answers: { ...state.answers, [questionId]: answer }
    }))
  },

  nextQuestion: () => {
    const { currentIndex, questions } = get()
    if (currentIndex < questions.length - 1) {
      set({ currentIndex: currentIndex + 1 })
    }
  },

  prevQuestion: () => {
    const { currentIndex } = get()
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 })
    }
  },

  finishQuiz: async () => {
    const { activeQuiz, questions, answers, isFinished } = get()
    // A timed-out quiz and a tap on Finish can both land here; only the first one saves
    if (!activeQuiz || isFinished || finishing) return
    finishing = true

    const score = get().getScore()
    const { data: { session } } = await supabase.auth.getSession()
    
    const updatedQuiz = { 
      ...activeQuiz, 
      score, 
      completed: true,
      questions,
      user_answers: answers,
      ...(session?.user ? { user_id: session.user.id } : {})
    }
    
    // Save to Supabase
    const { data, error } = await supabase
      .from('quizzes')
      .insert([updatedQuiz])
      .select()
      .single()

    if (error) {
      console.error("Failed to save quiz to Supabase:", error)
      toast("Your score couldn't be saved to your history. Check your connection.", 'error')
    }
    finishing = false

    set((state) => ({
      isFinished: true,
      activeQuiz: (data as Quiz) || updatedQuiz,
      quizzes: data ? [data as Quiz, ...state.quizzes] : [updatedQuiz as Quiz, ...state.quizzes]
    }))
  },

  resetQuiz: () => {
    set({ activeQuiz: null, questions: [], currentIndex: 0, answers: {}, isFinished: false, generationError: null })
  },
  
  deleteQuiz: async (id: string) => {
    set((state) => ({
      quizzes: state.quizzes.filter(q => q.id !== id)
    }))

    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id)
      
    if (error) {
      console.error("Error deleting quiz:", error)
      await get().fetchQuizzes() // revert if error
    }
  },

  getScore: () => {
    const { questions, answers } = get()
    let correctCount = 0
    
    questions.forEach((q) => {
      const userAnswer = answers[q.id]
      if (checkAnswerCorrectness(q.correct_answer, userAnswer, q.question_type)) {
        correctCount++
      }
    })

    return Math.round((correctCount / questions.length) * 100)
  }
}))

