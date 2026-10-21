import { create } from 'zustand'
import type { StudyBoxItem, ReviewerItem } from '@/types'

// Opens a study material or reviewer on top of whatever page she is on,
// so closing it returns her to the same place instead of another section
interface ViewerState {
  material: StudyBoxItem | null
  reviewer: ReviewerItem | null
  openMaterial: (item: StudyBoxItem) => void
  openReviewer: (reviewer: ReviewerItem) => void
  closeMaterial: () => void
  closeReviewer: () => void
  closeAll: () => void
}

export const useViewerStore = create<ViewerState>()((set) => ({
  material: null,
  reviewer: null,
  openMaterial: (material) => set({ material, reviewer: null }),
  openReviewer: (reviewer) => set({ reviewer, material: null }),
  closeMaterial: () => set({ material: null }),
  closeReviewer: () => set({ reviewer: null }),
  closeAll: () => set({ material: null, reviewer: null }),
}))
