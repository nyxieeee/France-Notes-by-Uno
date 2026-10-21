import type { ReviewerItem } from '@/types'

// Hand-off state for starting a quiz from a reviewer
export const quizStateFor = (r: ReviewerItem) => ({
  preSelectedTopic: r.title,
  preSelectedText: r.content.summary + '\n\n' + (r.content.key_points?.length ? r.content.key_points.join('\n') : ''),
  preSelectedName: r.source_file,
})
