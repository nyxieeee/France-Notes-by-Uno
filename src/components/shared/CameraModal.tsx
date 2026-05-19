import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, RefreshCcw, Check } from 'lucide-react'

interface CameraModalProps {
  onCapture: (base64Image: string) => void
  onClose: () => void
}

export default function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    setError(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Prefer back camera on mobile
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setError("Could not access camera. Please check permissions! 🌸")
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
  }

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(imageDataUrl)
      }
    }
  }

  const handleRetake = () => {
    setCapturedImage(null)
  }

  const handleConfirm = () => {
    if (capturedImage) {
      stopCamera()
      onCapture(capturedImage)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--bg)]/90 backdrop-blur-md p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[var(--card)] w-full max-w-2xl rounded-[2.5rem] shadow-fn-lg border border-[var(--border)] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-[var(--border)]">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Camera className="text-[var(--pink)]" size={20} />
            Capture Note
          </h3>
          <button 
            onClick={() => { stopCamera(); onClose(); }}
            className="p-2 rounded-full hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <p className="text-[var(--error)] p-4 text-center">{error}</p>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured Note" className="w-full h-full object-contain" />
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="p-6 bg-[var(--bg)]/50 flex justify-center items-center gap-4">
          {capturedImage ? (
            <>
              <button onClick={handleRetake} className="btn-secondary flex items-center gap-2">
                <RefreshCcw size={18} /> Retake
              </button>
              <button onClick={handleConfirm} className="btn-primary flex items-center gap-2">
                <Check size={18} /> Use Photo
              </button>
            </>
          ) : (
            <button 
              onClick={handleCapture}
              disabled={!!error}
              className="w-16 h-16 rounded-full bg-[var(--pink)] border-4 border-white shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform disabled:opacity-50"
            >
              <Camera size={24} />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
