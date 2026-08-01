import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, Droplets, Pill, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePersonalization } from '@/hooks/usePersonalization'

type Tab = 'iv' | 'med'

interface IVInputs {
  volume: string
  hours: string
  minutes: string
  dropFactor: string
}

interface MedInputs {
  orderedDose: string
  orderedUnit: string
  doseOnHand: string
  handUnit: string
  volumeOnHand: string
}

const DROP_FACTORS = [10, 15, 20, 60]

const ResultBadge = ({ label, value, unit, accent = false }: { label: string; value: string; unit: string; accent?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    className={cn(
      'flex flex-col items-center justify-center p-5 rounded-3xl border-2',
      accent
        ? 'bg-[var(--pink)]/10 border-[var(--pink)]/40 text-[var(--pink)]'
        : 'bg-[var(--secondary-bg)]/30 border-[var(--border)] text-[var(--text)]'
    )}
  >
    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1">{label}</p>
    <p className={cn('text-4xl font-black tabular-nums', accent && 'text-[var(--pink)]')}>{value}</p>
    <p className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">{unit}</p>
  </motion.div>
)

function IVDripCalculator() {
  const [inputs, setInputs] = useState<IVInputs>({ volume: '', hours: '', minutes: '', dropFactor: '20' })
  const [result, setResult] = useState<{ gttsMin: number; mlHr: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof IVInputs, val: string) => {
    setInputs(prev => ({ ...prev, [key]: val }))
    setResult(null)
    setError(null)
  }

  const calculate = () => {
    const vol = parseFloat(inputs.volume)
    const hrs = parseFloat(inputs.hours) || 0
    const mins = parseFloat(inputs.minutes) || 0
    const df = parseFloat(inputs.dropFactor)
    const totalMins = hrs * 60 + mins

    if (!vol || isNaN(vol) || vol <= 0) { setError('Please enter a valid volume in mL.'); return }
    if (totalMins <= 0) { setError('Please enter a valid infusion time (hours and/or minutes).'); return }
    if (!df) { setError('Please select a drop factor.'); return }

    const mlHr = (vol / (totalMins / 60))
    const gttsMin = (vol * df) / totalMins

    setResult({ gttsMin: Math.round(gttsMin), mlHr: Math.round(mlHr * 10) / 10 })
    setError(null)
  }

  const reset = () => {
    setInputs({ volume: '', hours: '', minutes: '', dropFactor: '20' })
    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Volume */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Volume to Infuse</label>
          <div className="relative">
            <input
              type="number"
              min="0"
              value={inputs.volume}
              onChange={e => set('volume', e.target.value)}
              placeholder="e.g. 500"
              className="fn-input pr-12 text-lg font-bold"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">mL</span>
          </div>
        </div>

        {/* Drop Factor */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Drop Factor (gtt set)</label>
          <div className="grid grid-cols-4 gap-2">
            {DROP_FACTORS.map(df => (
              <button
                key={df}
                onClick={() => set('dropFactor', String(df))}
                className={cn(
                  'py-3 rounded-2xl border-2 text-sm font-black transition-all',
                  inputs.dropFactor === String(df)
                    ? 'bg-[var(--pink)] border-[var(--pink)] text-white shadow-md scale-105'
                    : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text)] hover:border-[var(--pink)]/50'
                )}
              >
                {df}
                <span className="block text-[8px] font-bold opacity-70">gtts/mL</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Time */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Infusion Time</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="number"
              min="0"
              value={inputs.hours}
              onChange={e => set('hours', e.target.value)}
              placeholder="0"
              className="fn-input pr-14 text-lg font-bold"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">hours</span>
          </div>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="59"
              value={inputs.minutes}
              onChange={e => set('minutes', e.target.value)}
              placeholder="0"
              className="fn-input pr-14 text-lg font-bold"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">mins</span>
          </div>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-2xl text-sm font-semibold text-[var(--error)]"
          >
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={reset} className="btn-ghost flex items-center gap-2 px-4">
          <RotateCcw size={15} /> Reset
        </button>
        <button onClick={calculate} className="btn-primary flex-1 flex items-center justify-center gap-2">
          <Calculator size={16} /> Calculate
        </button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-[var(--success)]">
              <CheckCircle2 size={16} />
              <p className="text-xs font-bold uppercase tracking-widest">Results</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ResultBadge label="Flow Rate" value={String(result.gttsMin)} unit="gtts / min" accent />
              <ResultBadge label="Hourly Rate" value={String(result.mlHr)} unit="mL / hr" />
            </div>
            <div className="p-4 bg-[var(--secondary-bg)]/20 rounded-2xl border border-[var(--border)] text-xs text-[var(--text-secondary)] leading-relaxed">
              <span className="font-bold text-[var(--text)]">Formula used: </span>
              Flow Rate (gtts/min) = Volume (mL) × Drop Factor (gtts/mL) ÷ Time (min)
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const DOSE_UNITS = ['mg', 'mcg', 'g', 'mEq', 'units', 'mL']

function MedDoseCalculator() {
  const [inputs, setInputs] = useState<MedInputs>({
    orderedDose: '', orderedUnit: 'mg',
    doseOnHand: '', handUnit: 'mg',
    volumeOnHand: ''
  })
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof MedInputs, val: string) => {
    setInputs(prev => ({ ...prev, [key]: val }))
    setResult(null)
    setError(null)
  }

  const calculate = () => {
    const od = parseFloat(inputs.orderedDose)
    const dh = parseFloat(inputs.doseOnHand)
    const vh = parseFloat(inputs.volumeOnHand)

    if (!od || od <= 0) { setError('Please enter the ordered dose.'); return }
    if (!dh || dh <= 0) { setError('Please enter the dose on hand.'); return }
    if (!vh || vh <= 0) { setError('Please enter the volume on hand.'); return }

    setResult(Math.round((od / dh) * vh * 100) / 100)
    setError(null)
  }

  const reset = () => {
    setInputs({ orderedDose: '', orderedUnit: 'mg', doseOnHand: '', handUnit: 'mg', volumeOnHand: '' })
    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* Ordered Dose */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Ordered Dose (Desired)</label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            value={inputs.orderedDose}
            onChange={e => set('orderedDose', e.target.value)}
            placeholder="e.g. 500"
            className="fn-input flex-1 text-lg font-bold"
          />
          <select
            value={inputs.orderedUnit}
            onChange={e => set('orderedUnit', e.target.value)}
            className="fn-input w-24 font-bold"
          >
            {DOSE_UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Dose On Hand */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Dose On Hand (Available)</label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            value={inputs.doseOnHand}
            onChange={e => set('doseOnHand', e.target.value)}
            placeholder="e.g. 250"
            className="fn-input flex-1 text-lg font-bold"
          />
          <select
            value={inputs.handUnit}
            onChange={e => set('handUnit', e.target.value)}
            className="fn-input w-24 font-bold"
          >
            {DOSE_UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Volume On Hand */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Volume On Hand</label>
        <div className="relative">
          <input
            type="number"
            min="0"
            value={inputs.volumeOnHand}
            onChange={e => set('volumeOnHand', e.target.value)}
            placeholder="e.g. 5"
            className="fn-input pr-12 text-lg font-bold"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">mL</span>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-2xl text-sm font-semibold text-[var(--error)]"
          >
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <button onClick={reset} className="btn-ghost flex items-center gap-2 px-4">
          <RotateCcw size={15} /> Reset
        </button>
        <button onClick={calculate} className="btn-primary flex-1 flex items-center justify-center gap-2">
          <Calculator size={16} /> Calculate
        </button>
      </div>

      <AnimatePresence>
        {result !== null && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-[var(--success)]">
              <CheckCircle2 size={16} />
              <p className="text-xs font-bold uppercase tracking-widest">Volume to Administer</p>
            </div>
            <ResultBadge label="Give" value={String(result)} unit="mL" accent />
            <div className="p-4 bg-[var(--secondary-bg)]/20 rounded-2xl border border-[var(--border)] text-xs text-[var(--text-secondary)] leading-relaxed">
              <span className="font-bold text-[var(--text)]">Formula used: </span>
              Volume to Give = (Ordered Dose ÷ Dose on Hand) × Volume on Hand
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function DosageCalculatorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('iv')
  const { isFrance, aiAssistantName } = usePersonalization()

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-16 h-16 bg-[var(--secondary-bg)] text-[var(--pink)] rounded-[2rem] flex items-center justify-center mb-6 shadow-sm"
        >
          <Calculator size={32} />
        </motion.div>
        <h1 className="text-4xl font-black mb-3 font-heading">Dosage Calculator 💊</h1>
        <p className="text-[var(--text-secondary)] text-base">
          {isFrance
            ? 'Safe and accurate medication dosing, babe! Always double-check your computations. 🩺'
            : `Accurate clinical dose calculations powered by ${aiAssistantName}. Always verify before administering. 🩺`}
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        {/* Tab Switcher */}
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[2rem] p-1.5 flex gap-1.5 mb-8">
          {([
            { id: 'iv' as Tab, label: 'IV Drip Rate', icon: Droplets },
            { id: 'med' as Tab, label: 'Medication Dose', icon: Pill },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-sm font-bold transition-all duration-200',
                activeTab === tab.id
                  ? 'bg-[var(--pink)] text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--secondary-bg)]/50'
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Calculator Panel */}
        <motion.div
          className="fn-card p-6 md:p-8"
        >
          <AnimatePresence mode="wait">
            {activeTab === 'iv' ? (
              <motion.div
                key="iv"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.18 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--pink)]/10 flex items-center justify-center text-[var(--pink)]">
                    <Droplets size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black">IV Drip Rate</h2>
                    <p className="text-[11px] text-[var(--text-secondary)] font-medium">Calculate drops/min and mL/hr for IV infusions</p>
                  </div>
                </div>
                <IVDripCalculator />
              </motion.div>
            ) : (
              <motion.div
                key="med"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--pink)]/10 flex items-center justify-center text-[var(--pink)]">
                    <Pill size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black">Medication Dose</h2>
                    <p className="text-[11px] text-[var(--text-secondary)] font-medium">Calculate volume to administer using D/H × V formula</p>
                  </div>
                </div>
                <MedDoseCalculator />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Safety Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-2xl flex items-start gap-3"
        >
          <AlertCircle size={16} className="text-[var(--warning)] mt-0.5 shrink-0" style={{ color: '#F59E0B' }} />
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            <span className="font-bold text-[var(--text)]">Clinical Safety Reminder: </span>
            Always verify dosage calculations with a second nurse or pharmacist before administering any medication. This tool is for educational and reference purposes only.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
