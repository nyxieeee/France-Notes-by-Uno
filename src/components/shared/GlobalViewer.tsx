import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useViewerStore } from '@/stores/viewerStore'
import { useBackToClose } from '@/hooks/useBackToClose'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { StudyBoxDetailModal } from '@/pages/StudyBox/StudyBoxPage'
import { ReviewerDetail } from '@/pages/ReviewerLibrary/ReviewerLibraryPage'
import { quizStateFor } from '@/lib/reviewers'

// Materials and reviewers opened from Home, Search or the Knowledge Garden show here,
// over the current page, so closing them leaves her exactly where she was
export default function GlobalViewer() {
  const { material, reviewer, closeMaterial, closeReviewer, closeAll } = useViewerStore()
  const { topics, removeItem } = useStudyBoxStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  useBackToClose(!!material, closeMaterial)
  useBackToClose(!!reviewer, closeReviewer)

  // Moving to another page (e.g. starting a quiz from the viewer) closes it
  useEffect(() => { closeAll() }, [pathname, closeAll])

  const topicTitle = (id: string | null) => topics.find(t => t.id === id)?.title || 'General'

  return (
    <>
      <AnimatePresence>
        {material && (
          <StudyBoxDetailModal
            item={material}
            onClose={closeMaterial}
            topics={topics}
            removeItem={removeItem}
            navigate={navigate}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {reviewer && (
          <ReviewerDetail
            reviewer={reviewer}
            onClose={closeReviewer}
            topicTitle={topicTitle(reviewer.topic_id)}
            onQuiz={() => navigate('/quiz', { state: quizStateFor(reviewer) })}
          />
        )}
      </AnimatePresence>
    </>
  )
}
