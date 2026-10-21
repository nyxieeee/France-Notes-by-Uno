// Left alone, the AI writes the same default patient over and over ("John, a 68-year-old male...").
// So before a quiz is written, every question gets its own patient, setting and angle, chosen here.

const FEMALE_NAMES = ['Maria', 'Liza', 'Angelica', 'Rosario', 'Jasmine', 'Carmela', 'Bea', 'Nora', 'Trisha', 'Lourdes', 'Kristine', 'Aileen', 'Fatima', 'Grace', 'Imelda', 'Joy', 'Mae', 'Precious', 'Sophia', 'Hannah']
const MALE_NAMES = ['Jose', 'Ramon', 'Paolo', 'Andres', 'Miguel', 'Danilo', 'Rafael', 'Ernesto', 'Jun', 'Carlo', 'Benjie', 'Arnel', 'Nathan', 'Rico', 'Teodoro', 'Marvin', 'Gabriel', 'Luis', 'Kenneth', 'Eduardo']
const SURNAMES = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Villanueva', 'Dela Cruz', 'Ramos', 'Aquino', 'Castillo', 'Navarro', 'Torres', 'Flores', 'Lim', 'Tan', 'Domingo', 'Pascual', 'Salazar', 'Ocampo']

// Spread across the lifespan; the AI may shift an age only when the topic makes it impossible
const AGE_BANDS: [number, number][] = [[1, 9], [12, 17], [18, 29], [30, 44], [45, 59], [60, 74], [75, 92]]

const SETTINGS = [
  'emergency department', 'medical-surgical ward', 'intensive care unit', 'outpatient clinic',
  'home health visit', 'rural health unit', 'post-anesthesia care unit', 'telemetry unit',
  'step-down unit', 'school clinic', 'long-term care facility', 'discharge planning on the ward',
]

const ANGLES = [
  'first priority assessment', 'medication safety and side effects', 'interpreting lab or diagnostic results',
  'patient and family teaching', 'delegation to a nursing assistant', 'recognizing an early complication',
  'evaluating whether an intervention worked', 'positioning and comfort measures', 'ethical or legal dilemma',
  'discharge and follow-up planning', 'infection control', 'documentation and handoff report',
  'nutrition and fluid balance', 'risk factors and prevention', 'calling the physician: what to report',
]

const shuffle = <T,>(items: T[]) => {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export interface CaseBlueprint {
  patient: string
  setting: string
  angle: string
}

/** One distinct case per question in the quiz: no repeated names, ages spread out, every angle different */
export function quizBlueprints(count: number): CaseBlueprint[] {
  const female = shuffle(FEMALE_NAMES)
  const male = shuffle(MALE_NAMES)
  const surnames = shuffle(SURNAMES)
  const ages = shuffle(AGE_BANDS)
  const settings = shuffle(SETTINGS)
  const angles = shuffle(ANGLES)

  let nextFemale = 0
  let nextMale = 0
  return Array.from({ length: count }, (_, i) => {
    const isFemale = Math.random() < 0.5
    const first = isFemale ? female[nextFemale++ % female.length] : male[nextMale++ % male.length]
    const [lo, hi] = ages[i % ages.length]
    const age = lo + Math.floor(Math.random() * (hi - lo + 1))
    return {
      patient: `${first} ${surnames[i % surnames.length]}, ${age}-year-old ${isFemale ? 'female' : 'male'}`,
      setting: settings[i % settings.length],
      angle: angles[i % angles.length],
    }
  })
}

export function blueprintInstructions(blueprints: CaseBlueprint[]): string {
  return `
          QUESTION PLAN (follow it exactly, one line per question, in order):
          ${blueprints.map((b, i) => `${i + 1}. Patient: ${b.patient}. Setting: ${b.setting}. Focus: ${b.angle}.`).join('\n          ')}
          - Use each question's assigned patient, setting and focus. Change the age only if it is clinically impossible for the topic, and then pick a clearly different age.
          - Question types without a patient (true or false, identification, fill in the blank) still follow their assigned focus.
          - Every question must test a different fact or decision. Vary the vital signs, labs, history and medications between patients.
          - Do not mention race or ethnicity unless it changes the nursing care.`
}
