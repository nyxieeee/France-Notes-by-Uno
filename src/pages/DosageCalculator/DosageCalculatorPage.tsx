import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, Drop as Droplets, Pill, ArrowCounterClockwise as RotateCcw, WarningCircle as AlertCircle, CheckCircle as CheckCircle2, ClockCounterClockwise as History, Trash as Trash2 } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'
import { usePersonalization } from '@/hooks/usePersonalization'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

type Tab = 'iv' | 'med'

export interface DosageHistoryRecord {
  id: string
  type: Tab
  title: string
  summary: string
  details: string
  created_at: string
}

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
const DOSE_UNITS = ['mg', 'mcg', 'g', 'mEq', 'units', 'mL']

const ResultBadge = ({ label, value, unit, accent = false }: { label: string; value: string; unit: string; accent?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    className={cn(
      'flex flex-col items-center justify-center p-5 rounded-3xl border-2',
      accent
        ? 'bg-th-pink/10 border-th-pink/40 text-[var(--pink)]'
        : 'bg-th-secondary-bg/30 border-[var(--border)] text-[var(--text)]'
    )}
  >
    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1">{label}</p>
    <p className={cn('text-4xl font-black tabular-nums', accent && 'text-[var(--pink)]')}>{value}</p>
    <p className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">{unit}</p>
  </motion.div>
)

export default function DosageCalculatorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('iv')
  const { isFrance, aiAssistantName } = usePersonalization()
  const user = useAuthStore(s => s.user)

  // History State
  const [history, setHistory] = useState<DosageHistoryRecord[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // IV State
  const [ivInputs, setIvInputs] = useState<IVInputs>({ volume: '', hours: '', minutes: '', dropFactor: '20' })
  const [ivResult, setIvResult] = useState<{ gttsMin: number; mlHr: number } | null>(null)
  const [ivError, setIvError] = useState<string | null>(null)

  // Med State
  const [medInputs, setMedInputs] = useState<MedInputs>({
    orderedDose: '', orderedUnit: 'mg',
    doseOnHand: '', handUnit: 'mg',
    volumeOnHand: ''
  })
  const [medResult, setMedResult] = useState<number | null>(null)
  const [medError, setMedError] = useState<string | null>(null)

  // Load history from Supabase (with localStorage fallback)
  useEffect(() => {
    const fetchHistory = async () => {
      const storageKey = `france_notes_dosage_history_${user?.id || 'guest'}`
      const localData = localStorage.getItem(storageKey)
      let initialData: DosageHistoryRecord[] = localData ? JSON.parse(localData) : []

      if (user?.id) {
        const { data, error } = await supabase
          .from('dosage_calculations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (!error && data) {
          initialData = data.map(d => ({
            id: d.id,
            type: d.calc_type as Tab,
            title: d.title,
            summary: d.summary,
            details: d.details || '',
            created_at: d.created_at
          }))
          localStorage.setItem(storageKey, JSON.stringify(initialData))
        }
      }

      setHistory(initialData)
    }

    fetchHistory()
  }, [user?.id])

  const saveRecord = async (record: DosageHistoryRecord) => {
    const storageKey = `france_notes_dosage_history_${user?.id || 'guest'}`
    setHistory(prev => {
      const updated = [record, ...prev]
      localStorage.setItem(storageKey, JSON.stringify(updated))
      return updated
    })

    if (user?.id) {
      const { error } = await supabase.from('dosage_calculations').insert([{
        id: record.id,
        user_id: user.id,
        calc_type: record.type,
        title: record.title,
        summary: record.summary,
        details: record.details,
        created_at: record.created_at
      }])

      if (error) {
        console.warn('Failed to insert dosage calculation to Supabase:', error.message)
      }
    }
  }

  const deleteRecord = async (id: string) => {
    const storageKey = `france_notes_dosage_history_${user?.id || 'guest'}`
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== id)
      localStorage.setItem(storageKey, JSON.stringify(updated))
      return updated
    })

    if (user?.id) {
      await supabase.from('dosage_calculations').delete().eq('id', id).eq('user_id', user.id)
    }
  }

  const clearAllHistory = async () => {
    const storageKey = `france_notes_dosage_history_${user?.id || 'guest'}`
    localStorage.removeItem(storageKey)
    setHistory([])

    if (user?.id) {
      await supabase.from('dosage_calculations').delete().eq('user_id', user.id)
    }
  }

  // IV Calculation
  const calculateIV = () => {
    const vol = parseFloat(ivInputs.volume)
    const hrs = parseFloat(ivInputs.hours) || 0
    const mins = parseFloat(ivInputs.minutes) || 0
    const df = parseFloat(ivInputs.dropFactor)
    const totalMins = hrs * 60 + mins

    if (!vol || isNaN(vol) || vol <= 0) { setIvError('Please enter a valid volume in mL.'); return }
    if (totalMins <= 0) { setIvError('Please enter a valid infusion time (hours and/or minutes).'); return }
    if (!df) { setIvError('Please select a drop factor.'); return }

    const mlHr = (vol / (totalMins / 60))
    const gttsMin = (vol * df) / totalMins
    const roundedGtts = Math.round(gttsMin)
    const roundedMlHr = Math.round(mlHr * 10) / 10

    setIvResult({ gttsMin: roundedGtts, mlHr: roundedMlHr })
    setIvError(null)

    // Save to history (Supabase + localStorage)
    saveRecord({
      id: `iv-${Date.now()}`,
      type: 'iv',
      title: `IV Drip Rate: ${vol} mL over ${hrs > 0 ? `${hrs}h ` : ''}${mins > 0 ? `${mins}m` : ''}`,
      summary: `${roundedGtts} gtts/min (${roundedMlHr} mL/hr)`,
      details: `Volume: ${vol} mL | Drop Factor: ${df} gtts/mL | Time: ${totalMins} mins`,
      created_at: new Date().toISOString()
    })
  }

  // Med Dose Calculation
  const calculateMed = () => {
    const od = parseFloat(medInputs.orderedDose)
    const dh = parseFloat(medInputs.doseOnHand)
    const vh = parseFloat(medInputs.volumeOnHand)

    if (!od || od <= 0) { setMedError('Please enter the ordered dose.'); return }
    if (!dh || dh <= 0) { setMedError('Please enter the dose on hand.'); return }
    if (!vh || vh <= 0) { setMedError('Please enter the volume on hand.'); return }

    const giveVolume = Math.round((od / dh) * vh * 100) / 100
    setMedResult(giveVolume)
    setMedError(null)

    // Save to history (Supabase + localStorage)
    saveRecord({
      id: `med-${Date.now()}`,
      type: 'med',
      title: `Med Dose: ${od} ${medInputs.orderedUnit} Ordered`,
      summary: `Give ${giveVolume} mL`,
      details: `Ordered: ${od} ${medInputs.orderedUnit} | On Hand: ${dh} ${medInputs.handUnit} per ${vh} mL`,
      created_at: new Date().toISOString()
    })
  }

  return (
    <div className="page-container">
      <PageHeader
        icon={Calculator}
        title="Dosage Calculator"
        subtitle={isFrance ? 'Safe and accurate medication dosing, babe! Always double-check your computations.' : `Accurate dose calculations powered by ${aiAssistantName}. Always verify before administering.`}
        actions={
          <button
            onClick={() => setShowHistory(p => !p)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all border",
              showHistory
                ? "bg-[var(--pink)] text-white border-[var(--pink)] shadow-md"
                : "bg-[var(--card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-th-pink/50"
            )}
          >
            <History size={15} />
            Calculation History ({history.length})
          </button>
        }
      />

      <div className="max-w-xl mx-auto">
        {/* HISTORY DRAWER */}
        {showHistory ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fn-card p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-black text-lg flex items-center gap-2">
                <History size={20} className="text-[var(--pink)]" /> Calculation History
              </h3>
              {history.length > 0 && (
                <button
                  onClick={clearAllHistory}
                  className="text-xs font-bold text-[var(--error)] hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-10 text-[var(--text-secondary)]">
                <Calculator size={36} className="mx-auto mb-2 opacity-30" />
                <p className="font-bold text-sm">No calculations saved yet</p>
                <p className="text-xs opacity-70 mt-1">Calculations auto-save to Supabase for quick clinical reference!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar p-1">
                {history.map(rec => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl border bg-[var(--bg)] border-[var(--border)] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                          rec.type === 'iv' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" : "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300"
                        )}>
                          {rec.type === 'iv' ? 'IV Infusion' : 'Med Dose'}
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)]">{new Date(rec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <h4 className="font-bold text-sm truncate">{rec.title}</h4>
                      <p className="text-xs font-black text-[var(--pink)] mt-0.5">{rec.summary}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">{rec.details}</p>
                    </div>

                    <button
                      onClick={() => deleteRecord(rec.id)}
                      className="p-2 text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors shrink-0"
                      title="Delete record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <>
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
                      : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-th-secondary-bg/50'
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Calculator Panel */}
            <div className="fn-card p-6 md:p-8">
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
                      <div className="w-10 h-10 rounded-2xl bg-th-pink/10 flex items-center justify-center text-[var(--pink)]">
                        <Droplets size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-black">IV Drip Rate</h2>
                        <p className="text-[11px] text-[var(--text-secondary)] font-medium">Calculate drops/min and mL/hr for IV infusions</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Volume to Infuse</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={ivInputs.volume}
                              onChange={e => { setIvInputs(p => ({ ...p, volume: e.target.value })); setIvResult(null); setIvError(null); }}
                              placeholder="e.g. 500"
                              className="fn-input pr-12 text-lg font-bold"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">mL</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Drop Factor (gtt set)</label>
                          <div className="grid grid-cols-4 gap-2">
                            {DROP_FACTORS.map(df => (
                              <button
                                key={df}
                                onClick={() => { setIvInputs(p => ({ ...p, dropFactor: String(df) })); setIvResult(null); setIvError(null); }}
                                className={cn(
                                  'py-3 rounded-2xl border-2 text-sm font-black transition-all',
                                  ivInputs.dropFactor === String(df)
                                    ? 'bg-[var(--pink)] border-[var(--pink)] text-white shadow-md scale-105'
                                    : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text)] hover:border-th-pink/50'
                                )}
                              >
                                {df}
                                <span className="block text-[8px] font-bold opacity-70">gtts/mL</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Infusion Time</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={ivInputs.hours}
                              onChange={e => { setIvInputs(p => ({ ...p, hours: e.target.value })); setIvResult(null); setIvError(null); }}
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
                              value={ivInputs.minutes}
                              onChange={e => { setIvInputs(p => ({ ...p, minutes: e.target.value })); setIvResult(null); setIvError(null); }}
                              placeholder="0"
                              className="fn-input pr-14 text-lg font-bold"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">mins</span>
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {ivError && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="flex items-center gap-2 p-3 bg-th-error/10 border border-th-error/30 rounded-2xl text-sm font-semibold text-[var(--error)]"
                          >
                            <AlertCircle size={16} /> {ivError}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex gap-3">
                        <button onClick={() => { setIvInputs({ volume: '', hours: '', minutes: '', dropFactor: '20' }); setIvResult(null); setIvError(null); }} className="btn-ghost flex items-center gap-2 px-4">
                          <RotateCcw size={15} /> Reset
                        </button>
                        <button onClick={calculateIV} className="btn-primary flex-1 flex items-center justify-center gap-2">
                          <Calculator size={16} /> Calculate & Save
                        </button>
                      </div>

                      <AnimatePresence>
                        {ivResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="space-y-4"
                          >
                            <div className="flex items-center justify-between text-[var(--success)]">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} />
                                <p className="text-xs font-bold uppercase tracking-widest">Results</p>
                              </div>
                              <span className="text-[10px] font-bold bg-th-success/10 text-[var(--success)] px-2 py-0.5 rounded-full">Saved to Supabase</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <ResultBadge label="Flow Rate" value={String(ivResult.gttsMin)} unit="gtts / min" accent />
                              <ResultBadge label="Hourly Rate" value={String(ivResult.mlHr)} unit="mL / hr" />
                            </div>
                            <div className="p-4 bg-th-secondary-bg/20 rounded-2xl border border-[var(--border)] text-xs text-[var(--text-secondary)] leading-relaxed">
                              <span className="font-bold text-[var(--text)]">Formula used: </span>
                              Flow Rate (gtts/min) = Volume (mL) × Drop Factor (gtts/mL) ÷ Time (min)
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
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
                      <div className="w-10 h-10 rounded-2xl bg-th-pink/10 flex items-center justify-center text-[var(--pink)]">
                        <Pill size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-black">Medication Dose</h2>
                        <p className="text-[11px] text-[var(--text-secondary)] font-medium">Calculate volume to administer using D/H × V formula</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Ordered Dose (Desired)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={medInputs.orderedDose}
                            onChange={e => { setMedInputs(p => ({ ...p, orderedDose: e.target.value })); setMedResult(null); setMedError(null); }}
                            placeholder="e.g. 500"
                            className="fn-input flex-1 text-lg font-bold"
                          />
                          <select
                            value={medInputs.orderedUnit}
                            onChange={e => setMedInputs(p => ({ ...p, orderedUnit: e.target.value }))}
                            className="fn-input w-24 font-bold"
                          >
                            {DOSE_UNITS.map(u => <option key={u}>{u}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Dose On Hand (Available)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={medInputs.doseOnHand}
                            onChange={e => { setMedInputs(p => ({ ...p, doseOnHand: e.target.value })); setMedResult(null); setMedError(null); }}
                            placeholder="e.g. 250"
                            className="fn-input flex-1 text-lg font-bold"
                          />
                          <select
                            value={medInputs.handUnit}
                            onChange={e => setMedInputs(p => ({ ...p, handUnit: e.target.value }))}
                            className="fn-input w-24 font-bold"
                          >
                            {DOSE_UNITS.map(u => <option key={u}>{u}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Volume On Hand</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={medInputs.volumeOnHand}
                            onChange={e => { setMedInputs(p => ({ ...p, volumeOnHand: e.target.value })); setMedResult(null); setMedError(null); }}
                            placeholder="e.g. 5"
                            className="fn-input pr-12 text-lg font-bold"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">mL</span>
                        </div>
                      </div>

                      <AnimatePresence>
                        {medError && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="flex items-center gap-2 p-3 bg-th-error/10 border border-th-error/30 rounded-2xl text-sm font-semibold text-[var(--error)]"
                          >
                            <AlertCircle size={16} /> {medError}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex gap-3">
                        <button onClick={() => { setMedInputs({ orderedDose: '', orderedUnit: 'mg', doseOnHand: '', handUnit: 'mg', volumeOnHand: '' }); setMedResult(null); setMedError(null); }} className="btn-ghost flex items-center gap-2 px-4">
                          <RotateCcw size={15} /> Reset
                        </button>
                        <button onClick={calculateMed} className="btn-primary flex-1 flex items-center justify-center gap-2">
                          <Calculator size={16} /> Calculate & Save
                        </button>
                      </div>

                      <AnimatePresence>
                        {medResult !== null && (
                          <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="space-y-4"
                          >
                            <div className="flex items-center justify-between text-[var(--success)]">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} />
                                <p className="text-xs font-bold uppercase tracking-widest">Volume to Administer</p>
                              </div>
                              <span className="text-[10px] font-bold bg-th-success/10 text-[var(--success)] px-2 py-0.5 rounded-full">Saved to Supabase</span>
                            </div>
                            <ResultBadge label="Give" value={String(medResult)} unit="mL" accent />
                            <div className="p-4 bg-th-secondary-bg/20 rounded-2xl border border-[var(--border)] text-xs text-[var(--text-secondary)] leading-relaxed">
                              <span className="font-bold text-[var(--text)]">Formula used: </span>
                              Volume to Give = (Ordered Dose ÷ Dose on Hand) × Volume on Hand
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 p-4 bg-th-warning/10 border border-th-warning/30 rounded-2xl flex items-start gap-3"
            >
              <AlertCircle size={16} className="text-[var(--warning)] mt-0.5 shrink-0" style={{ color: '#F59E0B' }} />
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                <span className="font-bold text-[var(--text)]">Clinical Safety Reminder: </span>
                Always verify dosage calculations with a second nurse or pharmacist before administering any medication. This tool is for educational and reference purposes only.
              </p>
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}
