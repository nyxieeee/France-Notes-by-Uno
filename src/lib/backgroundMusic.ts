// ─── Faint background music for Nursepod ────────────────────────────────────
// Generated live with the Web Audio API: a slow, warm chord loop with a few soft piano-like
// notes on top. No audio files, nothing to license, and it never repeats exactly.
// start() must be called from a tap so iPad Safari lets the audio context run.

const VOLUME = 0.05
const CHORD_SECONDS = 8

// Cmaj7 → Am7 → Fmaj7 → G6, voiced low and close so it stays out of the way of speech
const CHORDS = [
  [130.81, 164.81, 196.0, 246.94],
  [110.0, 130.81, 164.81, 196.0],
  [87.31, 110.0, 130.81, 164.81],
  [98.0, 123.47, 146.83, 164.81],
]
const ROOTS = [65.41, 55.0, 43.65, 49.0]
// C major pentatonic, an octave and a bit up, for the occasional soft note
const MELODY = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]

let ctx: AudioContext | null = null
let master: GainNode | null = null
let scheduler: ReturnType<typeof setInterval> | null = null
let nextChordAt = 0
let chordIndex = 0
let stopTimer: ReturnType<typeof setTimeout> | null = null

function reverbImpulse(context: AudioContext, seconds: number) {
  const length = Math.floor(context.sampleRate * seconds)
  const impulse = context.createBuffer(2, length, context.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5)
  }
  return impulse
}

function setup() {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return null
  // iOS 17+: play like media, so the ringer switch doesn't mute the music while the voices play
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
  if (session) { try { session.type = 'playback' } catch { /* not supported */ } }

  const context = new AudioCtx()
  const out = context.createGain()
  out.gain.value = 0

  const tone = context.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 1600

  const reverb = context.createConvolver()
  reverb.buffer = reverbImpulse(context, 3.5)
  const wet = context.createGain()
  wet.gain.value = 0.45

  out.connect(tone)
  tone.connect(context.destination)
  tone.connect(reverb)
  reverb.connect(wet)
  wet.connect(context.destination)

  ctx = context
  master = out
  return context
}

function note(freq: number, start: number, length: number, peak: number, type: OscillatorType, attack: number) {
  if (!ctx || !master) return
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + attack)
  gain.gain.setTargetAtTime(0, start + Math.max(attack, length - 1.5), 0.6)
  gain.connect(master)
  // Two slightly detuned oscillators per note give a soft, chorused pad
  for (const detune of [-6, 6]) {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    osc.detune.value = detune
    osc.connect(gain)
    osc.start(start)
    osc.stop(start + length + 3)
  }
}

function scheduleChord(at: number) {
  const chord = CHORDS[chordIndex % CHORDS.length]
  const root = ROOTS[chordIndex % ROOTS.length]
  chordIndex++
  const length = CHORD_SECONDS + 1.5
  chord.forEach(f => note(f, at, length, 0.11, 'triangle', 2.2))
  note(root, at, length, 0.16, 'sine', 1.2)
  // A couple of gentle notes per chord, at loose, human-feeling times
  const count = 1 + Math.floor(Math.random() * 3)
  for (let i = 0; i < count; i++) {
    const when = at + 1 + Math.random() * (CHORD_SECONDS - 2)
    note(MELODY[Math.floor(Math.random() * MELODY.length)], when, 2.6, 0.05, 'sine', 0.02)
  }
}

function tick() {
  if (!ctx) return
  // Keep two chords queued so a throttled timer in the background never leaves a gap
  while (nextChordAt < ctx.currentTime + CHORD_SECONDS * 2) {
    scheduleChord(nextChordAt)
    nextChordAt += CHORD_SECONDS
  }
}

export function startBackgroundMusic() {
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = null }
  const context = ctx ?? setup()
  if (!context || !master) return
  void context.resume()
  if (!scheduler) {
    nextChordAt = context.currentTime + 0.1
    tick()
    scheduler = setInterval(tick, 1000)
  }
  master.gain.cancelScheduledValues(context.currentTime)
  master.gain.setValueAtTime(master.gain.value, context.currentTime)
  master.gain.linearRampToValueAtTime(VOLUME, context.currentTime + 2.5)
}

export function stopBackgroundMusic() {
  if (!ctx || !master || !scheduler) return
  const context = ctx
  master.gain.cancelScheduledValues(context.currentTime)
  master.gain.setValueAtTime(master.gain.value, context.currentTime)
  master.gain.linearRampToValueAtTime(0, context.currentTime + 1.2)
  if (stopTimer) clearTimeout(stopTimer)
  stopTimer = setTimeout(() => {
    if (scheduler) { clearInterval(scheduler); scheduler = null }
    void context.suspend()
    stopTimer = null
  }, 1400)
}

const PREF_KEY = 'fn-podcast-music'

export function getMusicPreference(): boolean {
  try { return localStorage.getItem(PREF_KEY) !== 'off' } catch { return true }
}

export function setMusicPreference(on: boolean) {
  try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off') } catch { /* storage unavailable */ }
}
