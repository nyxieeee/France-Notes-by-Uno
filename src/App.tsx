import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import AppShell from '@/components/layout/AppShell'
import { PersonalizationProvider } from '@/context/PersonalizationContext'

// Pages
import LoginPage from '@/pages/Auth/LoginPage'
import SignupPage from '@/pages/Auth/SignupPage'
import ForgotPasswordPage from '@/pages/Auth/ForgotPasswordPage'
import UpdatePasswordPage from '@/pages/Auth/UpdatePasswordPage'
import HomePage from '@/pages/Home/HomePage'
import StudyBoxPage from '@/pages/StudyBox/StudyBoxPage'
import ReviewerLibraryPage from '@/pages/ReviewerLibrary/ReviewerLibraryPage'
import QuizPage from '@/pages/Quiz/QuizPage'
import SimulationHubPage from '@/pages/Simulations/SimulationHubPage'
import RecitationPage from '@/pages/Simulations/RecitationPage'
import RetDemPage from '@/pages/RetDem/RetDemPage'
import AIPage from '@/pages/AI/AIPage'
import ProfilePage from '@/pages/Profile/ProfilePage'
import KnowledgeGardenPage from '@/pages/KnowledgeGarden/KnowledgeGardenPage'
import PlannerPage from '@/pages/Planner/PlannerPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialLoading } = useAuthStore()
  
  const searchParams = new URLSearchParams(window.location.search)
  const isOAuthCallback = window.location.hash.includes('access_token=') || 
                          window.location.hash.includes('id_token=') || 
                          searchParams.has('code')

  if (isInitialLoading || isOAuthCallback) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[var(--pink)]/30 border-t-[var(--pink)] rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)] text-sm font-body">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  const { initAuth, isInitialLoading } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [])

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[var(--pink)]/30 border-t-[var(--pink)] rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)] text-sm font-body">Loading France Notes...</p>
        </div>
      </div>
    )
  }

  return (
    <PersonalizationProvider>
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="home" element={<HomePage />} />
            <Route path="study-box" element={<StudyBoxPage />} />
            <Route path="reviewer-library" element={<ReviewerLibraryPage />} />
            <Route path="quiz" element={<QuizPage />} />
            <Route path="simulations" element={<SimulationHubPage />} />
            <Route path="recitation" element={<RecitationPage />} />
            <Route path="retdem" element={<RetDemPage />} />
            <Route path="ai" element={<AIPage />} />
            <Route path="knowledge-garden" element={<KnowledgeGardenPage />} />
            <Route path="planner" element={<PlannerPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Router>
    </PersonalizationProvider>
  )
}

export default App

