import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

// Profile photo originals and cover photo. The avatar shown around the app stays small in the
// account metadata; the full-size original and its crop live here so the photo can be re-adjusted.

export interface CropSettings { crop: { x: number; y: number }; zoom: number }

export interface ProfileMedia {
  avatar_original: string | null
  avatar_crop: CropSettings | null
  cover_image: string | null
  cover_original: string | null
  cover_crop: CropSettings | null
}

const EMPTY: ProfileMedia = { avatar_original: null, avatar_crop: null, cover_image: null, cover_original: null, cover_crop: null }
const cacheKey = (userId: string) => `fn-profile-media-${userId}`

interface ProfileMediaState extends ProfileMedia {
  loadedFor: string | null
  fetchMedia: (userId: string) => Promise<void>
  saveMedia: (userId: string, changes: Partial<ProfileMedia>) => Promise<void>
}

export const useProfileMediaStore = create<ProfileMediaState>()((set, get) => ({
  ...EMPTY,
  loadedFor: null,

  fetchMedia: async (userId) => {
    let media: ProfileMedia = EMPTY
    try { media = { ...EMPTY, ...JSON.parse(localStorage.getItem(cacheKey(userId)) || '{}') } } catch { /* ignore a bad cache */ }
    set({ ...media, loadedFor: userId })
    const { data, error } = await supabase.from('profile_media').select('*').eq('user_id', userId).maybeSingle()
    if (!error && data) {
      const fresh = { ...EMPTY, ...(data as Partial<ProfileMedia>) }
      set({ ...fresh, loadedFor: userId })
      try { localStorage.setItem(cacheKey(userId), JSON.stringify(fresh)) } catch { /* storage full: the server copy is enough */ }
    }
  },

  saveMedia: async (userId, changes) => {
    const current: ProfileMedia = {
      avatar_original: get().avatar_original, avatar_crop: get().avatar_crop,
      cover_image: get().cover_image, cover_original: get().cover_original, cover_crop: get().cover_crop,
    }
    const next = { ...current, ...changes }
    set(next)
    try { localStorage.setItem(cacheKey(userId), JSON.stringify(next)) } catch { /* storage full: the server copy is enough */ }
    const { error } = await supabase.from('profile_media').upsert([{ user_id: userId, ...next, updated_at: new Date().toISOString() }])
    if (error) {
      // Table not created yet: keep it on this device instead of failing
      if (/profile_media|relation|schema cache/i.test(error.message)) {
        console.warn('Profile photos saved on this device only:', error.message)
        return
      }
      throw new Error("Couldn't save your photo. Check your connection and try again.")
    }
  },
}))

/** Read an image file and shrink it so its longest side is at most `maxSide` pixels */
export function readImageFile(file: File, maxSide = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Couldn't read that photo."))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("That file doesn't look like a photo."))
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
