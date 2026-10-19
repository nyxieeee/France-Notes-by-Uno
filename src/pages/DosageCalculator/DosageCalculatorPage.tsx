import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, Drop as Droplets, Pill, ArrowCounterClockwise as RotateCcw, WarningCircle as AlertCircle, CheckCircle as CheckCircle2, ClockCounterClockwise as History, Trash as Trash2, ShieldCheck, Function as FunctionIcon } from '@phosphor-icons/react'
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
    initial={{ opacity: 0, scale: 0.95, y: 8 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    className={cn('p-4 rounded-xl', accent ? 'bg-[var(--pink)] text-white' : 'bg-[var(--card)] border border-[var(--border)]')}
  >
    <p className={cn('text-[12px] font-medium', accent ? 'text-white/80' : 'text-[var(--text-secondary)]')}>{label}</p>
    <p className="font-heading text-2xl sm:text-3xl font-semibold tabular-nums leading-tight mt-0.5">
      {value} <span className={cn('text-sm font-medium whitespace-nowrap', accent ? 'text-white/80' : 'text-[var(--text-secondary)]')}>{unit}</span>
    </p>
  </motion.div>
)

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[13px] font-medium">{label}</span>
        {hint && <span className="text-[11.5px] text-[var(--text-secondary)]">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function UnitInput({ value, onChange, placeholder, unit, max }: { value: string; onChange: (v: string) => void; placeholder: string; unit: string; max?: string }) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        min="0"
        max={max}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="fn-input rounded-xl bg-[var(--card)] py-2.5 pr-14 text-[15px] font-medium tabular-nums"
      />
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--text-secondary)] pointer-events-none">{unit}</span>
    </div>
  )
}

function FormulaNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)] leading-relaxed">
      <FunctionIcon size={14} className="shrink-0 mt-0.5 text-[var(--pink)]" /> <span>{children}</span>
    </p>
  )
}

function ErrorNote({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="flex items-center gap-2 px-3.5 py-2.5 bg-th-error/10 rounded-xl text-[13px] font-medium text-[var(--error)]"
        >
          <AlertCircle size={16} className="shrink-0" /> {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

export default function DosageCalculatorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('iv')
  const { isFrance, aiAssistantName } = usePersonalization()
  const user = useAuthStore(s => s.user)

  // History State
  const [history, setHistory] = useState<DosageHistoryRecord[]>([])

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

  const resetIV = () => { setIvInputs({ volume: '', hours: '', minutes: '', dropFactor: '20' }); setIvResult(null); setIvError(null) }
  const resetMed = () => { setMedInputs({ orderedDose: '', orderedUnit: 'mg', doseOnHand: '', handUnit: 'mg', volumeOnHand: '' }); setMedResult(null); setMedError(null) }
  const setIv = (patch: Partial<IVInputs>) => { setIvInputs(p => ({ ...p, ...patch })); setIvResult(null); setIvError(null) }
  const setMed = (patch: Partial<MedInputs>, clear = true) => { setMedInputs(p => ({ ...p, ...patch })); if (clear) { setMedResult(null); setMedError(null) } }

  return (
    <div className="page-container max-w-6xl">
      <PageHeader
        icon={Calculator}
        title="Dosage Calculator"
        subtitle={isFrance ? 'Safe and accurate dosing, babe. Always double-check your computations.' : `Accurate dose calculations with ${aiAssistantName}. Always verify before administering.`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        {/* Calculator */}
        <section className="fn-card overflow-hidden min-w-0">
          <div className="grid grid-cols-2 border-b border-[var(--border)]">
            {([
              { id: 'iv' as Tab, label: 'IV drip rate', short: 'IV drip rate', sub: 'gtts/min and mL/hr', icon: Droplets },
              { id: 'med' as Tab, label: 'Medication dose', short: 'Med dose', sub: 'Desired ÷ have × volume', icon: Pill },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex items-center gap-3 px-4 sm:px-6 py-4 text-left transition-colors',
                  activeTab === tab.id ? 'bg-[var(--rose-soft)]' : 'hover:bg-[var(--rose-soft)]'
                )}
              >
                <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', activeTab === tab.id ? 'bg-[var(--pink)] text-white' : 'bg-th-pink/10 text-[var(--pink)]')}>
                  <tab.icon size={18} weight={activeTab === tab.id ? 'fill' : 'regular'} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold truncate"><span className="sm:hidden">{tab.short}</span><span className="hidden sm:inline">{tab.label}</span></span>
                  <span className="hidden sm:block text-[11.5px] text-[var(--text-secondary)] truncate">{tab.sub}</span>
                </span>
                {activeTab === tab.id && <motion.span layoutId="dosage-tab" className="absolute left-0 right-0 bottom-0 h-0.5 bg-[var(--pink)]" />}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'iv' ? (
                <motion.div key="iv" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18 }} className="space-y-5">
                  <Field label="Volume to infuse">
                    <UnitInput value={ivInputs.volume} onChange={v => setIv({ volume: v })} placeholder="e.g. 500" unit="mL" />
                  </Field>

                  <Field label="Infusion time">
                    <div className="grid grid-cols-2 gap-3">
                      <UnitInput value={ivInputs.hours} onChange={v => setIv({ hours: v })} placeholder="0" unit="hours" />
                      <UnitInput value={ivInputs.minutes} onChange={v => setIv({ minutes: v })} placeholder="0" unit="mins" max="59" />
                    </div>
                  </Field>

                  <Field label="Drop factor" hint="gtts/mL on the tubing package">
                    <div className="grid grid-cols-4 gap-2">
                      {DROP_FACTORS.map(df => (
                        <button
                          key={df}
                          onClick={() => setIv({ dropFactor: String(df) })}
                          className={cn(
                            'py-2.5 rounded-xl border text-[15px] font-semibold tabular-nums transition-colors',
                            ivInputs.dropFactor === String(df) ? 'bg-[var(--rose-soft)] border-[var(--pink)] text-[var(--pink)]' : 'border-[var(--border)] hover:bg-[var(--rose-soft)]'
                          )}
                        >
                          {df}
                          <span className="block text-[10.5px] font-normal text-[var(--text-secondary)]">{df === 60 ? 'micro' : 'macro'}</span>
                        </button>
                      ))}
                    </div>
                  </Field>

                  <ErrorNote message={ivError} />

                  <div className="flex gap-2.5">
                    <button onClick={resetIV} className="btn-secondary px-4 py-2.5 text-sm flex items-center gap-1.5"><RotateCcw size={15} /> Reset</button>
                    <button onClick={calculateIV} className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"><Calculator size={16} /> Calculate</button>
                  </div>

                  <AnimatePresence>
                    {ivResult && (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="rounded-2xl bg-[var(--rose-soft)] p-4 space-y-3">
                        <p className="text-[12.5px] font-medium text-[var(--success)] flex items-center gap-1.5"><CheckCircle2 size={15} weight="fill" /> Result saved to your history</p>
                        <div className="grid grid-cols-2 gap-3">
                          <ResultBadge label="Flow rate" value={String(ivResult.gttsMin)} unit="gtts/min" accent />
                          <ResultBadge label="Hourly rate" value={String(ivResult.mlHr)} unit="mL/hr" />
                        </div>
                        <FormulaNote>Flow rate (gtts/min) = volume (mL) × drop factor (gtts/mL) ÷ time (min)</FormulaNote>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div key="med" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }} className="space-y-5">
                  {([
                    { label: 'Ordered dose', hint: 'Desired', valueKey: 'orderedDose', unitKey: 'orderedUnit', placeholder: 'e.g. 500' },
                    { label: 'Dose on hand', hint: 'Available', valueKey: 'doseOnHand', unitKey: 'handUnit', placeholder: 'e.g. 250' },
                  ] as const).map(f => (
                    <Field key={f.valueKey} label={f.label} hint={f.hint}>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={medInputs[f.valueKey]}
                          onChange={e => setMed({ [f.valueKey]: e.target.value })}
                          placeholder={f.placeholder}
                          className="fn-input rounded-xl bg-[var(--card)] py-2.5 flex-1 min-w-0 text-[15px] font-medium tabular-nums"
                        />
                        <select
                          value={medInputs[f.unitKey]}
                          onChange={e => setMed({ [f.unitKey]: e.target.value }, false)}
                          className="fn-input rounded-xl bg-[var(--card)] py-2.5 w-24 text-sm font-medium"
                          aria-label={`${f.label} unit`}
                        >
                          {DOSE_UNITS.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                    </Field>
                  ))}

                  <Field label="Volume on hand" hint="The dose on hand comes in">
                    <UnitInput value={medInputs.volumeOnHand} onChange={v => setMed({ volumeOnHand: v })} placeholder="e.g. 5" unit="mL" />
                  </Field>

                  <ErrorNote message={medError} />

                  <div className="flex gap-2.5">
                    <button onClick={resetMed} className="btn-secondary px-4 py-2.5 text-sm flex items-center gap-1.5"><RotateCcw size={15} /> Reset</button>
                    <button onClick={calculateMed} className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"><Calculator size={16} /> Calculate</button>
                  </div>

                  <AnimatePresence>
                    {medResult !== null && (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="rounded-2xl bg-[var(--rose-soft)] p-4 space-y-3">
                        <p className="text-[12.5px] font-medium text-[var(--success)] flex items-center gap-1.5"><CheckCircle2 size={15} weight="fill" /> Result saved to your history</p>
                        <ResultBadge label="Volume to give" value={String(medResult)} unit="mL" accent />
                        <FormulaNote>Volume to give = (ordered dose ÷ dose on hand) × volume on hand</FormulaNote>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <div className="space-y-5 min-w-0">
          {/* History */}
          <section className="fn-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold text-[15px] flex items-center gap-2"><History size={17} className="text-[var(--pink)]" /> Recent calculations</h2>
              {history.length > 0 && (
                <button onClick={clearAllHistory} className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--error)]">Clear all</button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-[13px] text-[var(--text-secondary)] py-2">Your calculations are saved here automatically.</p>
            ) : (
              <div className="space-y-1 -mx-2 max-h-[440px] overflow-y-auto custom-scrollbar">
                {history.map(rec => (
                  <div key={rec.id} className="group flex items-start gap-3 px-2 py-2.5 rounded-xl hover:bg-[var(--rose-soft)] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-th-pink/10 text-[var(--pink)] flex items-center justify-center shrink-0 mt-0.5">
                      {rec.type === 'iv' ? <Droplets size={16} /> : <Pill size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-[var(--pink)] tabular-nums">{rec.summary}</p>
                      <p className="text-[12px] text-[var(--text)] truncate">{rec.title}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">
                        {new Date(rec.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {new Date(rec.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {rec.details}
                      </p>
                    </div>
                    <button onClick={() => deleteRecord(rec.id)} className="btn-icon p-1.5 hover:text-[var(--error)] sm:opacity-0 group-hover:opacity-100" aria-label="Delete calculation">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Safety */}
          <section className="fn-card p-5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center shrink-0"><ShieldCheck size={18} weight="duotone" /></div>
            <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
              <span className="font-semibold text-[var(--text)] block mb-0.5">Double-check before giving</span>
              Verify every calculation with a second nurse or pharmacist before administering. This tool is for learning and reference.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
