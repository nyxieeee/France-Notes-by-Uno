import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import AppShell from '@/components/layout/AppShell'
import { PersonalizationProvider } from '@/context/PersonalizationContext'

// Pages
import LoginPage from '@/pages/Auth/LoginPage'
import SignupPage from '@/pages/Auth/SignupPage'
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
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <PersonalizationProvider>
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

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

