import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/motion.css'
import { MotionConfig } from 'framer-motion'
import { MOTION_ENTER } from '@/lib/motion'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user" transition={MOTION_ENTER}>
      <App />
    </MotionConfig>
  </React.StrictMode>,
)
