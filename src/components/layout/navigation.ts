import {
  House, Archive, Books, NotePencil, Brain, Stethoscope, Microphone, MagnifyingGlass, Sparkle,
  FirstAidKit, ChatCircleDots, Calendar, Gear,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { usePersonalization } from '@/hooks/usePersonalization'

export type NavItem = {
  icon: Icon
  label: string
  shortLabel?: string // used in the compact mobile "More" grid
  path: string
  // Other routes that belong to this item (e.g. tools opened from the Nursing Tools hub)
  also?: string[]
  isBeta?: boolean
}

export type NavGroup = { label: string | null; items: NavItem[] }

// Single source of truth for the sidebar and the mobile menu
export function useNavigation(): NavGroup[] {
  const { aiAssistantName, studyBoxName, knowledgeGardenName } = usePersonalization()

  return [
    { label: null, items: [
      { icon: House, label: 'Home', path: '/home' },
    ]},
    { label: 'Study', items: [
      { icon: Archive, label: studyBoxName, shortLabel: 'Study Box', path: '/study-box' },
      { icon: Books, label: 'Reviewer Library', shortLabel: 'Reviewers', path: '/reviewer-library' },
      { icon: NotePencil, label: 'Notes', path: '/notes' },
      { icon: Brain, label: 'Quizzes', path: '/quiz' },
    ]},
    { label: 'Practice', items: [
      { icon: Stethoscope, label: 'Clinical Simulations', shortLabel: 'Simulations', path: '/simulations', also: ['/recitation', '/retdem'], isBeta: true },
    ]},
    { label: 'Listen & Search', items: [
      { icon: Microphone, label: 'Nursepod', path: '/podcast-review' },
      { icon: MagnifyingGlass, label: 'Search', path: '/search' },
      { icon: Sparkle, label: knowledgeGardenName, shortLabel: 'Garden', path: '/knowledge-garden' },
    ]},
    { label: 'Tools', items: [
      { icon: FirstAidKit, label: 'Nursing Tools', shortLabel: 'Tools', path: '/nursing-tools', also: ['/labs-reference', '/dosage-calculator'] },
      { icon: ChatCircleDots, label: `Ask ${aiAssistantName}`, shortLabel: `Ask ${aiAssistantName.split(' ').pop()}`, path: '/ai' },
    ]},
    { label: 'Planning', items: [
      { icon: Calendar, label: 'Planner', path: '/planner' },
      { icon: Gear, label: 'Profile & Settings', shortLabel: 'Profile', path: '/profile' },
    ]},
  ]
}

export const isNavItemActive = (item: NavItem, pathname: string) =>
  [item.path, ...(item.also ?? [])].some(p => pathname === p || pathname.startsWith(p + '/'))
