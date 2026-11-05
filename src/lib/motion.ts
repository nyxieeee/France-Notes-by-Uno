// Adapted from transitions.dev's public motion scale and page/modal recipes.
// https://github.com/Jakubantalik/transitions.dev (Transitions.dev License)
export const MOTION_EASE = [0.22, 1, 0.36, 1] as const
export const MOTION_ENTER = { duration: 0.25, ease: MOTION_EASE }
export const MOTION_EXIT = { duration: 0.15, ease: MOTION_EASE }
export const MOTION_INDICATOR = { type: 'spring', stiffness: 420, damping: 38, mass: 0.8 } as const
