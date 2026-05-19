import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 1 && days <= 7) return `In ${days} days`
  if (days < -1) return `${Math.abs(days)} days ago`
  return formatDate(dateStr)
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Studying late'
}

export function getFileIcon(type: string): string {
  switch (type) {
    case 'pdf': return '📄'
    case 'docx': return '📝'
    case 'pptx': return '📊'
    case 'txt': return '📃'
    case 'image': return '🖼️'
    default: return '📁'
  }
}

export function getReminderTypeColor(type: string): string {
  switch (type) {
    case 'exam': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    case 'quiz': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
    case 'assignment': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
    case 'retdem': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
    case 'duty': return 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
    default: return 'bg-[var(--secondary-bg)] text-[var(--text-secondary)]'
  }
}

export function getReminderTypeLabel(type: string): string {
  switch (type) {
    case 'exam': return '📝 Exam'
    case 'quiz': return '🧪 Quiz'
    case 'assignment': return '📋 Assignment'
    case 'retdem': return '🩺 RetDem'
    case 'duty': return '🏥 Duty'
    default: return '📌 Other'
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-[var(--success)]'
  if (score >= 60) return 'text-[var(--warning)]'
  return 'text-[var(--error)]'
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent! 🌟'
  if (score >= 80) return 'Great job! ✨'
  if (score >= 70) return 'Good work! 💪'
  if (score >= 60) return 'Keep going! 📚'
  return 'Keep studying! 🤗'
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

export function topicColors(): string[] {
  return [
    '#F7A8B8', '#FFB3C1', '#FFC2D1', '#FFD6E0',
    '#A8D8B9', '#B5E8C8', '#9FD4AF',
    '#FFD59E', '#F6C177', '#FFEBB0',
    '#B8C5F7', '#C2D1FF', '#D6E0FF',
    '#D4A8F7', '#C2B3FF', '#E0D6FF',
  ]
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

export function checkAnswerCorrectness(
  correctAnswer: string | string[] | undefined,
  userAnswer: string | string[] | undefined,
  questionType?: string
): boolean {
  if (correctAnswer === undefined || userAnswer === undefined) return false

  const cleanTextInput = (s: string) =>
    String(s || '')
      .toLowerCase()
      .replace(/[^\w\s]|_/g, "")
      .replace(/\s+/g, " ")
      .trim()

  const cleanGeneral = (s: string) =>
    String(s || '')
      .toLowerCase()
      .trim()

  // Normalize to arrays if it's SATA or either is an array
  const isSata = questionType === 'sata' || Array.isArray(correctAnswer) || Array.isArray(userAnswer)

  if (isSata) {
    const correctArr = Array.isArray(correctAnswer) 
      ? correctAnswer 
      : [correctAnswer]
    const userArr = Array.isArray(userAnswer) 
      ? userAnswer 
      : [userAnswer]

    if (correctArr.length !== userArr.length) return false

    const cleanCorrect = correctArr.map(cleanGeneral)
    const cleanUser = userArr.map(cleanGeneral)

    return cleanCorrect.every(val => cleanUser.includes(val))
  }

  if (questionType === 'essay') {
    return true // Essay is self-graded/qualitative, so we let the user pass it
  }

  // For identification and fill_blank, do a more aggressive text-cleaning
  const isTextInput = questionType === 'identification' || questionType === 'fill_blank'
  if (isTextInput) {
    return cleanTextInput(userAnswer as string) === cleanTextInput(correctAnswer as string)
  }

  // For standard single-answer types
  return cleanGeneral(userAnswer as string) === cleanGeneral(correctAnswer as string)
}

