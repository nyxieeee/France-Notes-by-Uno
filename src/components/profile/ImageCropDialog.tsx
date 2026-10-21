import { useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { motion } from 'framer-motion'
import { MagnifyingGlassMinus, MagnifyingGlassPlus, CircleNotch } from '@phosphor-icons/react'
import type { CropSettings } from '@/stores/profileMediaStore'

// Crop/position a photo. Returns the cropped image and the crop settings, so it can be re-adjusted later.
export default function ImageCropDialog({ image, title, aspect, round, outputWidth, initial, onCancel, onSave }: {
  image: string
  title: string
  aspect: number
  round?: boolean
  outputWidth: number
  initial?: CropSettings | null
  onCancel: () => void
  onSave: (cropped: string, settings: CropSettings) => Promise<void>
}) {
  const [crop, setCrop] = useState<Point>(initial?.crop ?? { x: 0, y: 0 })
  const [zoom, setZoom] = useState(initial?.zoom ?? 1)
  const [area, setArea] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!area || saving) return
    setSaving(true)
    try {
      const img = new Image()
      img.src = image
      await new Promise(resolve => { img.onload = resolve })
      const canvas = document.createElement('canvas')
      canvas.width = outputWidth
      canvas.height = Math.round(outputWidth / aspect)
      canvas.getContext('2d')!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)
      await onSave(canvas.toDataURL('image/jpeg', 0.85), { crop, zoom })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="relative z-10 w-full max-w-xl bg-[var(--card)] border border-[var(--border)] rounded-t-3xl sm:rounded-2xl shadow-fn-lg p-5 sm:p-6"
      >
        <h3 className="font-heading font-semibold text-[17px]">{title}</h3>
        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 mb-4">Drag to reposition. Pinch or use the slider to zoom.</p>

        <div className="relative w-full h-72 bg-black/80 rounded-xl overflow-hidden">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={round ? 'round' : 'rect'}
            showGrid={!round}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
          />
        </div>

        <div className="flex items-center gap-3 mt-4 text-[var(--text-secondary)]">
          <MagnifyingGlassMinus size={18} />
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--pink)]" aria-label="Zoom" />
          <MagnifyingGlassPlus size={18} />
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
          <button onClick={save} disabled={!area || saving} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
            {saving && <CircleNotch size={15} className="animate-spin" />} Save
          </button>
        </div>
      </motion.div>
    </div>
  )
}
