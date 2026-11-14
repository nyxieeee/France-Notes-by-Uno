import type { QuestionType } from '@/types'

export const QUIZ_TYPES: QuestionType[] = ['multiple_choice', 'sata', 'prioritization', 'situational', 'nclex', 'true_false', 'identification', 'fill_blank', 'essay', 'clinical_judgment', 'case_study']

export function quizTypePlan(type: QuestionType | 'mixed', count: number): QuestionType[] {
  if (type !== 'mixed') return Array(count).fill(type)
  const types = [...QUIZ_TYPES]
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); [types[i], types[j]] = [types[j], types[i]]
  }
  return Array.from({ length: count }, (_, i) => types[i % types.length])
}

// Reject a wrong format instead of relabeling a question that the UI cannot answer.
export function validQuizQuestion(raw: any, expected: QuestionType): boolean {
  if (!raw || (raw.type || raw.question_type) !== expected || typeof raw.question !== 'string' || !raw.question.trim() || typeof raw.rationale !== 'string' || !raw.rationale.trim()) return false
  const choices = raw.choices
  if (!Array.isArray(choices) || choices.some((c: unknown) => typeof c !== 'string' || !c.trim()) || new Set(choices).size !== choices.length) return false
  const answer = raw.correct_answer
  if (expected === 'essay' || expected === 'case_study' || expected === 'identification' || expected === 'fill_blank') return choices.length === 0 && typeof answer === 'string' && answer.trim().length > 0
  if (expected === 'sata') return choices.length >= 5 && choices.length <= 6 && Array.isArray(answer) && answer.length > 0 && new Set(answer).size === answer.length && answer.every((a: unknown) => choices.includes(a))
  if (expected === 'true_false') return choices.length === 2 && choices.includes('True') && choices.includes('False') && choices.includes(answer)
  return choices.length === 4 && typeof answer === 'string' && choices.includes(answer)
}

export function questionFingerprint(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
