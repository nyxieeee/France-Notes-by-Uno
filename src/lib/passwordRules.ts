// Password requirements shown on sign up and password reset
export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: '1 uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: '1 number or symbol', test: (p: string) => /[^A-Za-z]/.test(p) },
]

export const passwordMeetsRules = (p: string) => PASSWORD_RULES.every(r => r.test(p))
