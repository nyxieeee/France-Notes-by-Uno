import { useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ArrowsOutSimple,
  X,
  MusicNotes,
} from '@phosphor-icons/react'
import { usePodcastStore } from '@/stores/podcastStore'
import { cn } from '@/lib/utils'

const SPEEDS = [0.75, 1, 1.25, 1.5]

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${rem.toString().padStart(2, '0')}`
}

function MiniWaveform({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-center gap-[2.5px] h-3.5 px-0.5" aria-hidden="true">
      {[0.4, 0.9, 0.6, 1, 0.5].map((h, i) => (
        <motion.span
          key={i}
          className="w-[2px] rounded-full bg-[var(--pink)]"
          animate={
            playing
              ? { height: [3, 14 * h, 4, 12 * h, 3] }
              : { height: 3 }
          }
          transition={
            playing
              ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.12 }
              : { duration: 0.2 }
          }
        />
      ))}
    </div>
  )
}

export default function FloatingPodcastPlayer() {
  const location = useLocation()
  const navigate = useNavigate()

  const {
    script,
    episodeTitle,
    episodeTopic,
    isPlaying,
    currentLine,
    speed,
    musicOn,
    isDismissed,
    elapsedSeconds,
    totalSeconds,
    lineStarts,
    togglePlay,
    goToLine,
    handlePrevious,
    handleNext,
    setSpeed,
    toggleMusic,
    pause,
    setIsDismissed,
  } = usePodcastStore()

  const [dragFraction, setDragFraction] = useState<number | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  // Strictly hide on Nursepod main page (/podcast-review)
  const isPodcastPage = location.pathname.includes('podcast')
  const hasEpisode = script.length > 0
  const isVisible = hasEpisode && !isPodcastPage && !isDismissed

  const currentSeconds = dragFraction !== null ? dragFraction * totalSeconds : elapsedSeconds
  const shownFraction = totalSeconds > 0 ? currentSeconds / totalSeconds : 0

  const seekFromClientX = (clientX: number) => {
    if (!barRef.current || totalSeconds === 0) return
    const rect = barRef.current.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const targetSec = frac * totalSeconds
    let pick = 0
    for (let i = 0; i < lineStarts.length; i++) {
      if (lineStarts[i] <= targetSec) pick = i
      else break
    }
    goToLine(pick)
  }

  const activeLine = currentLine >= 0 && currentLine < script.length ? script[currentLine] : null
  const speakerName = activeLine?.speaker === 'DOC_UNO' ? 'Doc Uno' : 'Nurse Florence'
  const avatarSrc = activeLine?.speaker === 'DOC_UNO' ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'

  // Cycle speed: 0.75 -> 1 -> 1.25 -> 1.5
  const cycleSpeed = () => {
    const nextIdx = (SPEEDS.indexOf(speed) + 1) % SPEEDS.length
    setSpeed(SPEEDS[nextIdx])
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed z-50 bottom-20 right-4 sm:bottom-6 sm:right-6 w-[330px] max-w-[calc(100vw-32px)] select-none touch-none"
      >
        <div className="fn-card p-3.5 bg-th-card/95 backdrop-blur-xl border border-[var(--border)] shadow-xl rounded-2xl relative overflow-hidden group">
          {/* Drag Handle Bar */}
          <div className="flex items-center justify-between mb-2">
            <div className="cursor-grab active:cursor-grabbing flex-1 py-1 flex items-center justify-center">
              <div className="w-9 h-1 rounded-full bg-[var(--border)] hover:bg-[var(--accent)] transition-colors" />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate('/podcast-review')}
                className="btn-icon p-1 text-[var(--text-secondary)] hover:text-[var(--pink)]"
                title="Expand to Full Player"
                aria-label="Expand to Full Player"
              >
                <ArrowsOutSimple size={15} weight="bold" />
              </button>
              <button
                onClick={() => {
                  pause()
                  setIsDismissed(true)
                }}
                className="btn-icon p-1 text-[var(--text-secondary)] hover:text-[var(--error)]"
                title="Close Mini Player"
                aria-label="Close Mini Player"
              >
                <X size={15} weight="bold" />
              </button>
            </div>
          </div>

          {/* Episode Info Row */}
          <div
            onClick={() => navigate('/podcast-review')}
            className="flex items-center gap-3 cursor-pointer group-hover:opacity-95 transition-opacity"
          >
            <div className="relative w-11 h-11 shrink-0 rounded-xl overflow-hidden border border-th-pink/20 shadow-sm bg-[var(--rose-soft)]">
              <img
                src={avatarSrc}
                alt={speakerName}
                className="w-full h-full object-cover"
                onError={e => {
                  ;(e.currentTarget as HTMLElement).style.display = 'none'
                }}
              />
              {isPlaying && (
                <div className="absolute bottom-0 inset-x-0 h-3 bg-black/40 flex items-center justify-center">
                  <MiniWaveform playing={isPlaying} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="font-heading font-semibold text-[13px] leading-tight truncate text-[var(--text)]">
                {episodeTitle || episodeTopic || 'Nursepod Episode'}
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5 flex items-center gap-1.5">
                {isPlaying ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--pink)] animate-pulse shrink-0" />
                    <span>{speakerName} is speaking</span>
                  </>
                ) : (
                  <span>Paused · Tap to resume</span>
                )}
              </p>
            </div>
          </div>

          {/* Real-Time Progress / Seek Bar */}
          <div className="mt-3">
            <div
              ref={barRef}
              role="slider"
              aria-label="Seek podcast"
              aria-valuemin={0}
              aria-valuemax={totalSeconds}
              aria-valuenow={currentSeconds}
              onPointerDown={e => {
                e.currentTarget.setPointerCapture(e.pointerId)
                if (!barRef.current || totalSeconds === 0) return
                const rect = barRef.current.getBoundingClientRect()
                setDragFraction(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)))
              }}
              onPointerMove={e => {
                if (dragFraction !== null && barRef.current && totalSeconds > 0) {
                  const rect = barRef.current.getBoundingClientRect()
                  setDragFraction(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)))
                }
              }}
              onPointerUp={e => {
                if (dragFraction !== null) {
                  setDragFraction(null)
                  seekFromClientX(e.clientX)
                }
              }}
              onPointerCancel={() => setDragFraction(null)}
              onClick={e => seekFromClientX(e.clientX)}
              className="relative h-2 rounded-full bg-[var(--rose-soft)] cursor-pointer group/bar flex items-center touch-none select-none"
            >
              <div
                className="h-full rounded-full bg-[var(--pink)] transition-[width] duration-75"
                style={{ width: `${Math.min(100, Math.max(0, shownFraction * 100))}%` }}
              />
              <div
                className="absolute w-3.5 h-3.5 rounded-full bg-white border-2 border-[var(--pink)] shadow-md -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity"
                style={{ left: `${Math.min(100, Math.max(0, shownFraction * 100))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] tabular-nums text-[var(--text-secondary)] mt-1 px-0.5 font-medium">
              <span>{formatTime(currentSeconds)}</span>
              <span>{formatTime(totalSeconds)}</span>
            </div>
          </div>

          {/* Player Media Controls Row */}
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-[var(--border)]/60">
            {/* Speed Pill */}
            <button
              onClick={cycleSpeed}
              className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--rose-soft)] transition-colors"
              title="Change Speed"
            >
              {speed}x
            </button>

            {/* Core Playback Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevious}
                className="btn-icon p-2 text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
                title="Previous line"
                aria-label="Previous line"
              >
                <SkipBack size={18} weight="fill" />
              </button>

              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-[var(--pink)] hover:opacity-95 text-white flex items-center justify-center shadow-md shadow-pink-500/20 active:scale-95 transition-transform"
                title={isPlaying ? 'Pause' : 'Play'}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause size={18} weight="fill" />
                ) : (
                  <Play size={18} weight="fill" />
                )}
              </button>

              <button
                onClick={handleNext}
                className="btn-icon p-2 text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
                title="Next line"
                aria-label="Next line"
              >
                <SkipForward size={18} weight="fill" />
              </button>
            </div>

            {/* Background Music Toggle */}
            <button
              onClick={toggleMusic}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                musicOn
                  ? 'text-[var(--pink)] bg-[var(--rose-soft)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              )}
              title={musicOn ? 'Background music: On' : 'Background music: Off'}
              aria-label={musicOn ? 'Background music: On' : 'Background music: Off'}
            >
              <MusicNotes size={16} weight={musicOn ? 'fill' : 'regular'} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
