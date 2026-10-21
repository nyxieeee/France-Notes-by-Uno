import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flask as FlaskConical, MagnifyingGlass as Search, CaretDown as ChevronDown, ArrowDown, ArrowUp, Lightbulb, Star, Copy, Check, Lightning, Drop, Wind, Bandaids, X } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

interface LabValue {
  name: string
  abbreviation?: string
  normalRange: string
  unit: string
  lowName: string
  lowComplications: string[]
  highName: string
  highComplications: string[]
  clinicalPearl?: string
}

interface LabCategory {
  id: string
  label: string
  icon: Icon
  color: string
  labs: LabValue[]
}

const LAB_DATA: LabCategory[] = [
  {
    id: 'electrolytes',
    label: 'Electrolytes',
    icon: Lightning,
    color: '#C98552',
    labs: [
      {
        name: 'Sodium', abbreviation: 'Na⁺', normalRange: '135 – 145', unit: 'mEq/L',
        lowName: 'Hyponatremia',
        lowComplications: ['Cerebral edema', 'Seizures', 'Confusion & altered LOC', 'Headache', 'Nausea/vomiting', 'Coma (severe)'],
        highName: 'Hypernatremia',
        highComplications: ['Neurological irritability', 'Muscle twitching', 'Seizures', 'Intense thirst', 'Dry mucous membranes', 'Coma (severe)'],
        clinicalPearl: 'Remember SALT: Seizures, Altered LOC, Low sodium, Thirst. Correct hyponatremia SLOWLY to prevent osmotic demyelination syndrome.'
      },
      {
        name: 'Potassium', abbreviation: 'K⁺', normalRange: '3.5 – 5.0', unit: 'mEq/L',
        lowName: 'Hypokalemia',
        lowComplications: ['Life-threatening dysrhythmias', 'Muscle weakness/cramps', 'Paralytic ileus', 'Fatigue', 'U wave on ECG', 'Respiratory depression'],
        highName: 'Hyperkalemia',
        highComplications: ['Peaked T waves on ECG', 'Ventricular fibrillation', 'Cardiac arrest', 'Muscle weakness', 'Paralysis', 'Diarrhea'],
        clinicalPearl: 'MURDER mnemonic for Hyperkalemia: Muscle weakness, Urine (oliguria), Respiratory distress, Dysrhythmias, Elevated K, Reflexes decreased.'
      },
      {
        name: 'Calcium', abbreviation: 'Ca²⁺', normalRange: '8.5 – 10.5', unit: 'mg/dL',
        lowName: 'Hypocalcemia',
        lowComplications: ["Chvostek's sign (+)", "Trousseau's sign (+)", 'Tetany & muscle spasms', 'Laryngospasm', 'Seizures', 'Prolonged QT interval'],
        highName: 'Hypercalcemia',
        highComplications: ['Kidney stones (nephrolithiasis)', 'Shortened QT interval', 'Bone pain', 'Constipation', 'Confusion', 'Polyuria'],
        clinicalPearl: 'CATS for Hypocalcemia: Convulsions, Arrhythmias, Tetany, Stridor/Spasms. Stones, Bones, Groans, Moans for Hypercalcemia.'
      },
      {
        name: 'Magnesium', abbreviation: 'Mg²⁺', normalRange: '1.5 – 2.5', unit: 'mEq/L',
        lowName: 'Hypomagnesemia',
        lowComplications: ['Muscle cramps & tremors', 'Positive Chvostek & Trousseau signs', 'Dysrhythmias', 'Torsades de pointes', 'Confusion', 'Dysphagia'],
        highName: 'Hypermagnesemia',
        highComplications: ['Loss of deep tendon reflexes (first sign!)', 'Respiratory depression', 'Cardiac arrest', 'Bradycardia', 'Hypotension', 'Drowsiness'],
        clinicalPearl: 'Loss of deep tendon reflexes is the first sign of Mg toxicity. Antidote: Calcium gluconate IV.'
      },
      {
        name: 'Phosphate', abbreviation: 'PO₄³⁻', normalRange: '2.5 – 4.5', unit: 'mg/dL',
        lowName: 'Hypophosphatemia',
        lowComplications: ['Muscle weakness', 'Bone pain (osteomalacia)', 'Hemolytic anemia', 'Paresthesias', 'Confusion', 'Impaired WBC function'],
        highName: 'Hyperphosphatemia',
        highComplications: ['Hypocalcemia symptoms (inverse relationship)', 'Calcification of soft tissues', 'Tetany', 'Itching', 'Bone weakness'],
        clinicalPearl: 'Phosphate and calcium have an INVERSE relationship. High phosphate → low calcium and vice versa.'
      },
      {
        name: 'Chloride', abbreviation: 'Cl⁻', normalRange: '96 – 106', unit: 'mEq/L',
        lowName: 'Hypochloremia',
        lowComplications: ['Metabolic alkalosis', 'Muscle cramps', 'Agitation', 'Hypokalemia (often co-occurring)'],
        highName: 'Hyperchloremia',
        highComplications: ['Metabolic acidosis', 'Weakness', 'Lethargy', 'Deep rapid breathing (Kussmaul)'],
        clinicalPearl: 'Chloride follows sodium closely. Vomiting causes hypochloremia and metabolic alkalosis.'
      },
    ]
  },
  {
    id: 'hematology',
    label: 'Hematology',
    icon: Drop,
    color: '#BE5B6C',
    labs: [
      {
        name: 'Hemoglobin', abbreviation: 'Hgb', normalRange: 'M: 13.5–17.5 / F: 12–15.5', unit: 'g/dL',
        lowName: 'Anemia',
        lowComplications: ['Fatigue & pallor', 'Tachycardia', 'Shortness of breath', 'Dizziness', 'Headache', 'Palpitations'],
        highName: 'Polycythemia',
        highComplications: ['Thrombosis risk (DVT, PE, stroke)', 'Hypertension', 'Ruddy complexion', 'Headache', 'Blurred vision'],
        clinicalPearl: 'Critical low: <7 g/dL. Transfusion typically considered at Hgb <7–8 g/dL in stable patients.'
      },
      {
        name: 'Hematocrit', abbreviation: 'Hct', normalRange: 'M: 41–53% / F: 36–46%', unit: '%',
        lowName: 'Low Hematocrit',
        lowComplications: ['Anemia signs', 'Hemodilution (overhydration)', 'Blood loss', 'Decreased O₂ carrying capacity'],
        highName: 'High Hematocrit',
        highComplications: ['Hemoconcentration (dehydration)', 'Increased blood viscosity', 'Thrombosis', 'COPD polycythemia'],
        clinicalPearl: 'Hct is approximately 3× the Hgb value. Hct of 45% = Hgb ~15 g/dL.'
      },
      {
        name: 'WBC (Leukocytes)', abbreviation: 'WBC', normalRange: '4,500 – 11,000', unit: 'cells/μL',
        lowName: 'Leukopenia',
        lowComplications: ['Increased infection risk', 'Immunosuppression', 'Sepsis risk', 'Neutropenic precautions needed'],
        highName: 'Leukocytosis',
        highComplications: ['Bacterial infection (most common)', 'Leukemia/lymphoma', 'Inflammation', 'Stress response', 'Steroid use'],
        clinicalPearl: 'Critical low: <2,000. Neutropenia <500 = reverse isolation. "Left shift" = bands > 10% = acute infection.'
      },
      {
        name: 'Platelets', abbreviation: 'Plt', normalRange: '150,000 – 400,000', unit: '/μL',
        lowName: 'Thrombocytopenia',
        lowComplications: ['Petechiae & ecchymosis', 'Spontaneous bleeding', 'Hematuria', 'Intracranial hemorrhage (critical <20,000)', 'Prolonged bleeding time'],
        highName: 'Thrombocytosis',
        highComplications: ['Thrombosis risk', 'DVT', 'PE', 'Stroke', 'MI risk'],
        clinicalPearl: 'Critical: <20,000 = spontaneous bleeding risk. <50,000 = bleeding precautions. HIT (Heparin-Induced Thrombocytopenia): drop of >50% after heparin = suspect HIT.'
      },
    ]
  },
  {
    id: 'chemistry',
    label: 'Chemistry',
    icon: FlaskConical,
    color: '#5A9776',
    labs: [
      {
        name: 'Blood Glucose (Fasting)', normalRange: '70 – 99', unit: 'mg/dL',
        lowName: 'Hypoglycemia',
        lowComplications: ['Diaphoresis (first sign)', 'Tremors & shakiness', 'Tachycardia', 'Confusion', 'Seizures', 'Coma (if severe <40 mg/dL)'],
        highName: 'Hyperglycemia',
        highComplications: ['Polydipsia, polyuria, polyphagia', 'DKA (Type 1)', 'HHS (Type 2)', 'Poor wound healing', 'Blurred vision', 'Ketoacidosis'],
        clinicalPearl: 'RULE OF 15 for hypoglycemia: Give 15g fast carbs, wait 15 min, recheck. Critical: <40 mg/dL.'
      },
      {
        name: 'Blood Urea Nitrogen', abbreviation: 'BUN', normalRange: '7 – 20', unit: 'mg/dL',
        lowName: 'Low BUN',
        lowComplications: ['Liver failure (decreased urea synthesis)', 'Malnutrition', 'Overhydration'],
        highName: 'Azotemia (Uremia)',
        highComplications: ['Prerenal: dehydration, decreased perfusion', 'Renal: AKI/CKD', 'Postrenal: obstruction', 'Uremic symptoms: confusion, asterixis, pruritus'],
        clinicalPearl: 'BUN:Creatinine ratio >20:1 = prerenal cause. Normal ratio = 10:1 to 20:1.'
      },
      {
        name: 'Creatinine', normalRange: 'M: 0.7–1.3 / F: 0.6–1.1', unit: 'mg/dL',
        lowName: 'Low Creatinine',
        lowComplications: ['Muscle wasting', 'Malnutrition', 'Low muscle mass'],
        highName: 'Elevated Creatinine',
        highComplications: ['Acute Kidney Injury (AKI)', 'Chronic Kidney Disease (CKD)', 'Rhabdomyolysis', 'Nephrotoxic drug effects', 'Glomerulonephritis'],
        clinicalPearl: 'Creatinine is a more SPECIFIC indicator of renal function than BUN. Doubles in creatinine = 50% loss of GFR.'
      },
      {
        name: 'Serum Albumin', normalRange: '3.5 – 5.0', unit: 'g/dL',
        lowName: 'Hypoalbuminemia',
        lowComplications: ['Peripheral edema (fluid shifts)', 'Ascites', 'Malnutrition indicator', 'Poor wound healing', 'Increased drug toxicity (less protein binding)', 'Impaired immune function'],
        highName: 'Hyperalbuminemia',
        highComplications: ['Dehydration (hemoconcentration)', 'Rare finding'],
        clinicalPearl: 'Albumin <3.5 = nutritional deficiency. Albumin carries drugs (warfarin, phenytoin). Low albumin → more free (active/toxic) drug.'
      },
      {
        name: 'Total Bilirubin', normalRange: '0.1 – 1.2', unit: 'mg/dL',
        lowName: 'Low Bilirubin',
        lowComplications: ['Usually not clinically significant'],
        highName: 'Hyperbilirubinemia',
        highComplications: ['Jaundice (scleral icterus)', 'Pruritus', 'Dark urine', 'Clay-colored stools', 'Liver disease', 'Hemolytic anemia', 'Bile duct obstruction'],
        clinicalPearl: 'Direct (conjugated) bilirubin: liver or bile duct problem. Indirect (unconjugated): hemolysis or Gilberts. Jaundice visible when total >2.5 mg/dL.'
      },
    ]
  },
  {
    id: 'abg',
    label: 'Arterial Blood Gas',
    icon: Wind,
    color: '#4D8BA0',
    labs: [
      {
        name: 'pH', normalRange: '7.35 – 7.45', unit: '',
        lowName: 'Acidosis (pH < 7.35)',
        lowComplications: ['Respiratory acidosis: hypoventilation, CO₂ retention', 'Metabolic acidosis: DKA, lactic acidosis, renal failure', 'Dysrhythmias', 'Vasodilation & hypotension', 'Decreased myocardial contractility'],
        highName: 'Alkalosis (pH > 7.45)',
        highComplications: ['Respiratory alkalosis: hyperventilation, anxiety, pain', 'Metabolic alkalosis: vomiting, NG suction, diuretics', 'Tetany & muscle cramps', 'Hypokalemia', 'Arrhythmias'],
        clinicalPearl: 'ROME: Respiratory Opposite, Metabolic Equal. If pH ↓ and CO₂ ↑ = respiratory acidosis. If pH ↑ and HCO₃ ↑ = metabolic alkalosis.'
      },
      {
        name: 'PaCO₂', normalRange: '35 – 45', unit: 'mmHg',
        lowName: 'Hypocapnia (PaCO₂ < 35)',
        lowComplications: ['Respiratory alkalosis', 'Cerebral vasoconstriction', 'Lightheadedness', 'Paresthesias', 'Tetany', 'Hyperventilation cause'],
        highName: 'Hypercapnia (PaCO₂ > 45)',
        highComplications: ['Respiratory acidosis', 'CO₂ narcosis', 'Headache', 'Hypoventilation', 'COPD hypercapnic drive', 'Cyanosis'],
        clinicalPearl: 'CO₂ is the "respiratory component." ↑CO₂ = hypoventilating. ↓CO₂ = hyperventilating.'
      },
      {
        name: 'HCO₃⁻ (Bicarbonate)', abbreviation: 'HCO₃⁻', normalRange: '22 – 26', unit: 'mEq/L',
        lowName: 'Low HCO₃⁻',
        lowComplications: ['Metabolic acidosis', 'DKA', 'Lactic acidosis', 'Renal failure', 'Diarrhea-related loss', 'Kussmaul breathing (compensation)'],
        highName: 'High HCO₃⁻',
        highComplications: ['Metabolic alkalosis', 'Vomiting', 'NG suctioning', 'Excess antacid use', 'Hypokalemia', 'Diuretic use'],
        clinicalPearl: 'HCO₃⁻ is the "metabolic component." Compensation: acidosis → hyperventilate (blow off CO₂). Alkalosis → hypoventilate (retain CO₂).'
      },
      {
        name: 'PaO₂', normalRange: '80 – 100', unit: 'mmHg',
        lowName: 'Hypoxemia (PaO₂ < 80)',
        lowComplications: ['Tachypnea & dyspnea', 'Tachycardia', 'Cyanosis', 'Confusion & restlessness', 'Respiratory failure', 'Organ dysfunction'],
        highName: 'High PaO₂',
        highComplications: ['O₂ toxicity (prolonged 100% FiO₂)', 'Retinopathy in preterm neonates', 'Absorption atelectasis'],
        clinicalPearl: 'SaO₂ of 95% corresponds to PaO₂ ~80 mmHg (normal). Critical hypoxemia: PaO₂ < 60 mmHg. Avoid O₂ toxicity in COPD patients.'
      },
      {
        name: 'SaO₂ (O₂ Saturation)', abbreviation: 'SpO₂', normalRange: '95 – 100', unit: '%',
        lowName: 'Hypoxia (SpO₂ < 95%)',
        lowComplications: ['Cyanosis (central > peripheral)', 'Confusion & anxiety', 'Tachycardia', 'Respiratory failure', 'Organ ischemia'],
        highName: 'High SpO₂',
        highComplications: ['Oxygen toxicity with sustained 100% O₂', 'May be falsely elevated in CO poisoning'],
        clinicalPearl: 'Target SpO₂: 94–98% for most patients. COPD target: 88–92%. Pulse oximetry inaccurate in CO poisoning and severe anemia.'
      },
    ]
  },
  {
    id: 'coag',
    label: 'Coagulation',
    icon: Bandaids,
    color: '#8A72B5',
    labs: [
      {
        name: 'PT (Prothrombin Time)', abbreviation: 'PT', normalRange: '11 – 13', unit: 'seconds',
        lowName: 'Low PT',
        lowComplications: ['Hypercoagulable state (rare)', 'Thrombosis risk'],
        highName: 'Prolonged PT',
        highComplications: ['Warfarin therapy effect', 'Liver disease', 'Vitamin K deficiency', 'DIC', 'Bleeding risk'],
        clinicalPearl: 'PT monitors warfarin (Coumadin) therapy. Antidote: Vitamin K (phytonadione). Critical: >30 seconds.'
      },
      {
        name: 'INR', normalRange: '0.8 – 1.1 (therapeutic: 2.0–3.0)', unit: '',
        lowName: 'Low INR (< 2.0 when therapeutic)',
        lowComplications: ['Subtherapeutic anticoagulation', 'Thrombosis risk in atrial fibrillation or DVT'],
        highName: 'High INR (> 3.0 therapeutic)',
        highComplications: ['Bleeding risk increases', 'Supratherapeutic anticoagulation', 'Spontaneous hemorrhage > 5.0'],
        clinicalPearl: 'INR 2–3: AF, DVT, PE prophylaxis. INR 2.5–3.5: mechanical heart valves. INR > 4 = critical bleeding risk.'
      },
      {
        name: 'aPTT', normalRange: '25 – 35', unit: 'seconds',
        lowName: 'Low aPTT',
        lowComplications: ['Hypercoagulable state', 'Thrombosis'],
        highName: 'Prolonged aPTT',
        highComplications: ['Heparin therapy effect', 'Hemophilia A or B', 'DIC', 'Von Willebrand disease', 'Bleeding risk'],
        clinicalPearl: 'aPTT monitors UNFRACTIONATED heparin. Therapeutic: 60–100 seconds (1.5–2.5× normal). Antidote: Protamine sulfate.'
      },
      {
        name: 'D-Dimer', normalRange: '< 500', unit: 'ng/mL (FEU)',
        lowName: 'Normal / Negative D-Dimer',
        lowComplications: ['High negative predictive value', 'Effectively rules out DVT/PE in low-probability patients'],
        highName: 'Elevated D-Dimer',
        highComplications: ['DVT or PE (primary concern)', 'DIC', 'Recent surgery/trauma', 'Infection/sepsis', 'Pregnancy', 'Malignancy'],
        clinicalPearl: 'D-Dimer has HIGH sensitivity but LOW specificity. Elevated = further imaging needed (Doppler US, CT-PA). Normal = rules out VTE in low-risk patients.'
      },
    ]
  },
]

const LOW_HEX = '#4D8BA0'
const HIGH_HEX = '#BE5B6C'

function LabCard({ lab, isSaved, onToggleSave }: { lab: LabValue; isSaved: boolean; onToggleSave: (labName: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyLabSummary = (e: React.MouseEvent) => {
    e.stopPropagation()
    const summaryText = `${lab.name}${lab.abbreviation ? ` (${lab.abbreviation})` : ''}\nNormal Range: ${lab.normalRange} ${lab.unit}\nLow (${lab.lowName}): ${lab.lowComplications.join(', ')}\nHigh (${lab.highName}): ${lab.highComplications.join(', ')}${lab.clinicalPearl ? `\nClinical Pearl: ${lab.clinicalPearl}` : ''}`
    navigator.clipboard.writeText(summaryText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('fn-card overflow-hidden transition-colors', expanded && 'border-th-pink/40')}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded(p => !p)}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setExpanded(p => !p))}
        className="p-4 flex items-center gap-3 cursor-pointer hover:bg-[var(--rose-soft)]"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h3 className="font-heading font-semibold text-[15px]">{lab.name}</h3>
            {lab.abbreviation && (
              <span className="text-[11px] font-medium bg-th-pink/10 text-[var(--pink)] px-2 py-0.5 rounded-full">{lab.abbreviation}</span>
            )}
          </div>
          <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
            Normal <span className="font-semibold text-[var(--text)] tabular-nums">{lab.normalRange}</span>{lab.unit && <> {lab.unit}</>}
          </p>
        </div>

        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full" style={{ color: LOW_HEX, background: `${LOW_HEX}1a` }}>
            <ArrowDown size={11} weight="bold" /> {lab.lowName}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full" style={{ color: HIGH_HEX, background: `${HIGH_HEX}1a` }}>
            <ArrowUp size={11} weight="bold" /> {lab.highName}
          </span>
        </div>

        <div className="flex items-center shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onToggleSave(lab.name) }}
            className={cn('btn-icon p-2', isSaved ? 'text-[var(--pink)]' : '')}
            aria-label={isSaved ? `Remove ${lab.name} from saved` : `Save ${lab.name}`}
          >
            <Star size={17} weight={isSaved ? 'fill' : 'regular'} />
          </button>
          <button onClick={copyLabSummary} className="btn-icon p-2" aria-label={`Copy ${lab.name} reference`}>
            {copied ? <Check size={16} className="text-[var(--success)]" /> : <Copy size={16} />}
          </button>
          <ChevronDown size={16} className={cn('text-[var(--text-secondary)] transition-transform duration-300 ml-1', expanded && 'rotate-180')} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-4 space-y-3 border-t border-[var(--border)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { label: lab.lowName, sub: 'Too low', items: lab.lowComplications, hex: LOW_HEX, Arrow: ArrowDown },
                  { label: lab.highName, sub: 'Too high', items: lab.highComplications, hex: HIGH_HEX, Arrow: ArrowUp },
                ]).map(side => (
                  <div key={side.sub} className="p-3.5 rounded-xl border" style={{ background: `${side.hex}0f`, borderColor: `${side.hex}33` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: side.hex }}>
                        <side.Arrow size={12} weight="bold" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold leading-tight" style={{ color: side.hex }}>{side.label}</p>
                        <p className="text-[11px] text-[var(--text-secondary)]">{side.sub}</p>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {side.items.map((c, i) => (
                        <li key={i} className="text-[12.5px] text-[var(--text)] flex gap-2 leading-snug">
                          <span className="w-1 h-1 rounded-full mt-[7px] shrink-0" style={{ background: side.hex }} />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {lab.clinicalPearl && (
                <div className="flex gap-2.5 p-3.5 bg-[var(--rose-soft)] rounded-xl">
                  <Lightbulb size={16} weight="fill" className="text-[var(--pink)] shrink-0 mt-0.5" />
                  <p className="text-[12.5px] text-[var(--text)] leading-relaxed">
                    <span className="font-semibold text-[var(--pink)]">Clinical pearl. </span>
                    {lab.clinicalPearl}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CategoryHeading({ icon: CatIcon, color, title, subtitle }: { icon: Icon; color: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-3 px-1">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}1f`, color }}>
        <CatIcon size={20} weight="duotone" />
      </div>
      <div>
        <h2 className="font-heading font-semibold text-lg leading-tight">{title}</h2>
        <p className="text-[12px] text-[var(--text-secondary)]">{subtitle}</p>
      </div>
    </div>
  )
}

export default function LabsReferencePage() {
  const [activeTab, setActiveTab] = useState('electrolytes')
  const [search, setSearch] = useState('')
  const user = useAuthStore(s => s.user)

  // Saved / Bookmarked Labs State
  const [savedLabs, setSavedLabs] = useState<string[]>([])

  // Load saved labs from Supabase (with localStorage fallback)
  useEffect(() => {
    const fetchSavedLabs = async () => {
      const storageKey = `france_notes_saved_labs_${user?.id || 'guest'}`
      const localData = localStorage.getItem(storageKey)
      let initialData: string[] = localData ? JSON.parse(localData) : []

      if (user?.id) {
        const { data, error } = await supabase
          .from('saved_labs')
          .select('lab_name')
          .eq('user_id', user.id)

        if (!error && data) {
          initialData = data.map(d => d.lab_name)
          localStorage.setItem(storageKey, JSON.stringify(initialData))
        }
      }

      setSavedLabs(initialData)
    }

    fetchSavedLabs()
  }, [user?.id])

  const toggleSaveLab = async (labName: string) => {
    const storageKey = `france_notes_saved_labs_${user?.id || 'guest'}`
    const isCurrentlySaved = savedLabs.includes(labName)

    // Update local state and localStorage
    const updated = isCurrentlySaved
      ? savedLabs.filter(n => n !== labName)
      : [...savedLabs, labName]

    setSavedLabs(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))

    // Persist to Supabase if authenticated
    if (user?.id) {
      if (isCurrentlySaved) {
        await supabase.from('saved_labs').delete().eq('user_id', user.id).eq('lab_name', labName)
      } else {
        await supabase.from('saved_labs').insert([{ user_id: user.id, lab_name: labName }])
      }
    }
  }

  const allLabs = LAB_DATA.flatMap(c => c.labs)
  const savedLabObjects = allLabs.filter(l => savedLabs.includes(l.name))

  const filtered = LAB_DATA.map(cat => ({
    ...cat,
    labs: cat.labs.filter(lab =>
      !search.trim() || [lab.name, lab.abbreviation || '', lab.lowName, lab.highName, lab.unit]
        .some(field => field.toLowerCase().includes(search.toLowerCase()))
    )
  })).filter(cat => !search.trim() || cat.labs.length > 0)

  const activeCategory = filtered.find(c => c.id === activeTab) || filtered[0]
  const searching = !!search.trim()

  const navItems: { id: string; label: string; icon: Icon; color: string; count: number }[] = [
    { id: 'saved', label: 'Saved', icon: Star, color: '#B76E79', count: savedLabs.length },
    ...LAB_DATA.map(c => ({ id: c.id, label: c.label, icon: c.icon, color: c.color, count: c.labs.length })),
  ]

  return (
    <div className="page-container max-w-6xl">
      <PageHeader back={{ label: 'Nursing Tools', to: '/nursing-tools' }} icon={FlaskConical} title="Reference Lab Charts" subtitle="Normal ranges with what too low and too high look like. Star the labs you use most." />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-5 items-start">
        {/* Sidebar: search + categories */}
        <aside className="space-y-3 lg:sticky lg:top-4 min-w-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value) }}
              placeholder="Search labs"
              className="fn-input rounded-xl bg-[var(--card)] pl-10 pr-9 py-2.5 text-sm"
            />
            {searching && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon p-1" aria-label="Clear search"><X size={14} /></button>
            )}
          </div>

          <nav className={cn('flex lg:flex-col gap-1.5 lg:gap-0.5 overflow-x-auto no-scrollbar lg:fn-card lg:p-2 -mx-4 px-4 lg:mx-0', searching && 'opacity-50 pointer-events-none')}>
            {navItems.map(item => {
              const active = !searching && activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'flex items-center gap-2.5 shrink-0 rounded-full lg:rounded-xl px-3.5 lg:px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors border lg:border-0',
                    active ? 'bg-[var(--rose-soft)] text-[var(--text)] border-[var(--pink)]' : 'text-[var(--text-secondary)] border-[var(--border)] bg-[var(--card)] lg:bg-transparent hover:bg-[var(--rose-soft)]'
                  )}
                >
                  <span className="w-7 h-7 rounded-lg hidden lg:flex items-center justify-center shrink-0" style={{ background: `${item.color}1f`, color: item.color }}>
                    <item.icon size={15} weight={active ? 'fill' : 'regular'} />
                  </span>
                  <item.icon size={14} className="lg:hidden" style={{ color: item.color }} weight={active ? 'fill' : 'regular'} />
                  <span className="lg:flex-1 text-left">{item.label}</span>
                  <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">{item.count}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Lab Cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={search || activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="min-w-0"
          >
            {searching ? (
              filtered.length > 0 ? (
                <div className="space-y-6">
                  {filtered.map(cat => (
                    <section key={cat.id}>
                      <CategoryHeading icon={cat.icon} color={cat.color} title={cat.label} subtitle={`${cat.labs.length} match${cat.labs.length === 1 ? '' : 'es'}`} />
                      <div className="space-y-2.5">
                        {cat.labs.map(lab => (
                          <LabCard key={lab.name} lab={lab} isSaved={savedLabs.includes(lab.name)} onToggleSave={toggleSaveLab} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <EmptyLabs icon={Search} title="No labs found" text={`Nothing matches "${search.trim()}". Try a name like sodium, INR or pH.`} />
              )
            ) : activeTab === 'saved' ? (
              savedLabObjects.length > 0 ? (
                <section>
                  <CategoryHeading icon={Star} color="#B76E79" title="Saved labs" subtitle={`${savedLabObjects.length} saved to your account`} />
                  <div className="space-y-2.5">
                    {savedLabObjects.map(lab => (
                      <LabCard key={lab.name} lab={lab} isSaved={true} onToggleSave={toggleSaveLab} />
                    ))}
                  </div>
                </section>
              ) : (
                <EmptyLabs icon={Star} title="No saved labs yet" text="Tap the star on any lab value to keep it here." />
              )
            ) : (
              activeCategory ? (
                <section>
                  <CategoryHeading icon={activeCategory.icon} color={activeCategory.color} title={activeCategory.label} subtitle={`${activeCategory.labs.length} values · tap one to expand`} />
                  <div className="space-y-2.5">
                    {activeCategory.labs.map(lab => (
                      <LabCard key={lab.name} lab={lab} isSaved={savedLabs.includes(lab.name)} onToggleSave={toggleSaveLab} />
                    ))}
                  </div>
                </section>
              ) : null
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function EmptyLabs({ icon: EmptyIcon, title, text }: { icon: Icon; title: string; text: string }) {
  return (
    <div className="fn-card p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center mx-auto mb-3"><EmptyIcon size={26} weight="duotone" /></div>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-[var(--text-secondary)] mt-1">{text}</p>
    </div>
  )
}
