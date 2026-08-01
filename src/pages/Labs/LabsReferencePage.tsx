import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FlaskConical, Search, ChevronDown, TrendingUp, TrendingDown, AlertTriangle, Star, Copy, Check } from 'lucide-react'
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
  emoji: string
  color: string
  labs: LabValue[]
}

const LAB_DATA: LabCategory[] = [
  {
    id: 'electrolytes',
    label: 'Electrolytes',
    emoji: '⚡',
    color: '#F7A8B8',
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
    emoji: '🩸',
    color: '#FFB3C1',
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
    emoji: '🧪',
    color: '#A8D8B9',
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
    emoji: '💨',
    color: '#B3E5FC',
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
    emoji: '🩹',
    color: '#FFD59E',
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
    <motion.div
      layout
      className={cn(
        'fn-card border-2 transition-all cursor-pointer overflow-hidden',
        expanded ? 'border-[var(--pink)]/40' : 'hover:border-[var(--pink)]/20'
      )}
      onClick={() => setExpanded(p => !p)}
    >
      <div className="p-4 flex items-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSave(lab.name) }}
          className={cn(
            "p-1.5 rounded-xl transition-all shrink-0",
            isSaved ? "text-amber-500 bg-amber-50 dark:bg-amber-900/30" : "text-[var(--text-secondary)] hover:text-amber-500"
          )}
          title={isSaved ? "Unbookmark Lab" : "Bookmark Lab"}
        >
          <Star size={18} fill={isSaved ? "currentColor" : "none"} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h4 className="font-black text-base">{lab.name}</h4>
            {lab.abbreviation && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--secondary-bg)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full">
                {lab.abbreviation}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            Normal: <span className="font-bold text-[var(--text)]">{lab.normalRange} {lab.unit}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={copyLabSummary}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--pink)] hover:bg-[var(--pink)]/10 rounded-xl transition-all"
            title="Copy Lab Reference"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
          </button>
          <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
            <TrendingDown size={10} /> {lab.lowName}
          </span>
          <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
            <TrendingUp size={10} /> {lab.highName}
          </span>
          <ChevronDown
            size={18}
            className={cn('text-[var(--text-secondary)] transition-transform duration-300 shrink-0', expanded && 'rotate-180')}
          />
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
            <div className="px-4 pb-5 space-y-4 border-t border-[var(--border)] pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown size={14} className="text-blue-500" />
                    <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      {lab.lowName} (Too Low)
                    </p>
                  </div>
                  <ul className="space-y-1">
                    {lab.lowComplications.map((c, i) => (
                      <li key={i} className="text-xs text-blue-700 dark:text-blue-300 flex gap-1.5">
                        <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-red-500" />
                    <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-wider">
                      {lab.highName} (Too High)
                    </p>
                  </div>
                  <ul className="space-y-1">
                    {lab.highComplications.map((c, i) => (
                      <li key={i} className="text-xs text-red-700 dark:text-red-300 flex gap-1.5">
                        <span className="text-red-400 mt-0.5 shrink-0">•</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {lab.clinicalPearl && (
                <div className="flex gap-2.5 p-3 bg-[var(--pink)]/8 border border-[var(--pink)]/20 rounded-2xl">
                  <AlertTriangle size={14} className="text-[var(--pink)] shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    <span className="font-bold text-[var(--pink)]">Clinical Pearl: </span>
                    {lab.clinicalPearl}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-16 h-16 bg-[var(--secondary-bg)] text-[var(--pink)] rounded-[2rem] flex items-center justify-center mb-4 shadow-sm"
        >
          <FlaskConical size={32} />
        </motion.div>
        <h1 className="text-4xl font-black mb-2 font-heading">Normal Labs 🧪</h1>
        <p className="text-[var(--text-secondary)] text-sm max-w-lg">
          Quick-reference normal ranges with low/high clinical implications. Star your essential labs to sync with your account!
        </p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value) }}
            placeholder="Search labs (e.g. sodium, potassium, pH...)"
            className="fn-input pl-11"
          />
        </div>
      </div>

      {/* Category Tabs */}
      {!search.trim() && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar justify-start sm:justify-center">
          <button
            onClick={() => setActiveTab('saved')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all border-2 shrink-0',
              activeTab === 'saved'
                ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                : 'bg-[var(--card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-amber-400'
            )}
          >
            <Star size={14} fill={activeTab === 'saved' ? 'currentColor' : 'none'} className="text-amber-300" />
            <span>Saved Labs ({savedLabs.length})</span>
          </button>

          {LAB_DATA.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all border-2 shrink-0',
                activeTab === cat.id
                  ? 'text-white border-transparent shadow-md'
                  : 'bg-[var(--card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--pink)]/30'
              )}
              style={activeTab === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Lab Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={search || activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="space-y-3 max-w-4xl mx-auto"
        >
          {search.trim() ? (
            filtered.length > 0 ? (
              filtered.map(cat => (
                <div key={cat.id} className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-1.5 px-1">
                    <span>{cat.emoji}</span> {cat.label}
                  </p>
                  {cat.labs.map(lab => (
                    <LabCard key={lab.name} lab={lab} isSaved={savedLabs.includes(lab.name)} onToggleSave={toggleSaveLab} />
                  ))}
                </div>
              ))
            ) : (
              <div className="text-center py-20 fn-card border-dashed">
                <p className="text-lg font-bold mb-2">No labs found 🔬</p>
                <p className="text-[var(--text-secondary)] text-sm">Try searching with a different term.</p>
              </div>
            )
          ) : activeTab === 'saved' ? (
            savedLabObjects.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center text-lg font-bold">
                    ⭐
                  </div>
                  <div>
                    <h2 className="font-black text-xl">Saved & Bookmarked Labs</h2>
                    <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">{savedLabObjects.length} bookmarked lab values synced with Supabase</p>
                  </div>
                </div>
                {savedLabObjects.map(lab => (
                  <LabCard key={lab.name} lab={lab} isSaved={true} onToggleSave={toggleSaveLab} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 fn-card border-dashed">
                <Star size={36} className="mx-auto mb-2 text-amber-400 opacity-40" />
                <p className="text-lg font-bold mb-1">No bookmarked labs yet ⭐</p>
                <p className="text-[var(--text-secondary)] text-xs">Tap the star icon on any lab value to save it to your Supabase account!</p>
              </div>
            )
          ) : (
            activeCategory ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-bold"
                    style={{ backgroundColor: activeCategory.color + '33' }}
                  >
                    {activeCategory.emoji}
                  </div>
                  <div>
                    <h2 className="font-black text-xl">{activeCategory.label}</h2>
                    <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">{activeCategory.labs.length} values • tap to expand</p>
                  </div>
                </div>
                {activeCategory.labs.map(lab => (
                  <LabCard key={lab.name} lab={lab} isSaved={savedLabs.includes(lab.name)} onToggleSave={toggleSaveLab} />
                ))}
              </div>
            ) : null
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
