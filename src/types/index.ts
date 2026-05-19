export type UserProfile = {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  theme_preference: 'light' | 'dark' | 'system'
  year_level: string
  school: string
  created_at: string
}

export type StudyBoxItem = {
  id: string
  user_id: string
  file_name: string
  file_type: 'pdf' | 'docx' | 'pptx' | 'txt' | 'image'
  storage_path: string
  extracted_text: string
  preview_image: string | null
  topic_id: string | null
  is_favorite: boolean
  tags: string[]
  created_at: string
  summary?: string
}

export type Topic = {
  id: string
  user_id: string
  title: string
  description: string
  color: string
  created_at: string
}

export type ReviewerItem = {
  id: string
  user_id: string
  topic_id: string | null
  title: string
  source_file: string
  content: ReviewerContent
  is_favorite: boolean
  created_at: string
}

export type ReviewerContent = {
  summary: string
  key_points: string[]
  flashcards: Flashcard[]
  mnemonics: Mnemonic[]
  simplified_explanation: string
  slides?: PresentationSlide[]
}

export type PresentationSlide = {
  id: string
  title: string
  bullet_points: string[]
  presenter_notes: string
}

export type Flashcard = {
  id: string
  front: string
  back: string
}

export type Mnemonic = {
  id: string
  title: string
  content: string
}

export type Quiz = {
  id: string
  user_id: string
  topic_id: string | null
  title: string
  total_items: number
  question_type: QuestionType
  score: number | null
  completed: boolean
  created_at: string
  questions?: QuizQuestion[]
  user_answers?: Record<string, string | string[]>
  timer_type?: 'untimed' | 'per_question' | 'total_quiz'
  timer_value?: number
}

export type QuestionType =
  | 'mixed'
  | 'multiple_choice'
  | 'sata'
  | 'true_false'
  | 'prioritization'
  | 'situational'
  | 'nclex'
  | 'identification'
  | 'fill_blank'
  | 'essay'
  | 'clinical_judgment'
  | 'case_study'

export type QuizQuestion = {
  id: string
  quiz_id: string
  question: string
  choices: string[]
  correct_answer: string | string[]
  rationale: string
  question_type: QuestionType
  image_url?: string
}

export type Reminder = {
  id: string
  user_id: string
  title: string
  due_date: string
  reminder_type: 'assignment' | 'quiz' | 'exam' | 'retdem' | 'duty' | 'other'
  completed: boolean
  notes?: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type FunFact = {
  id: string
  content: string
  type: 'nursing facts' | 'weird facts' | 'medical trivia' | 'funny facts' | 'random facts' | 'not so fun facts' | 'cursed facts' | 'dad jokes' | 'medical' | 'random' | 'weird' | 'funny' | 'warning'
}

export type RetDemProcedure = {
  id: string
  title: string
  category: string
  description: string
  materials: string[]
  steps: RetDemStep[]
  rationale: string
  duration: string
  is_favorite?: boolean
}

export type RetDemStep = {
  step: number
  action: string
  rationale: string
}

export type RecitationMode = 'gentle' | 'clinical_instructor' | 'doc_uno'

export type WeakTopic = {
  topic: string
  accuracy: number
  total_attempts: number
}

export type QuizSetupConfig = {
  topic: string
  size: number
  question_type: QuestionType
  sourceText?: string
  sourceName?: string
  timer_type?: 'untimed' | 'per_question' | 'total_quiz'
  timer_value?: number
}

export type KnowledgeSearchResult = {
  id: string
  title: string
  description: string
  source: string
  url: string
  category: 'pharmacology' | 'pathophysiology' | 'interventions' | 'diseases' | 'guidelines'
  is_trusted: boolean
}
