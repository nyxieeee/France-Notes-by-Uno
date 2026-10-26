// Voices she can pick for each host. Free neural voices (Microsoft Edge Neural, no quota)
// provide natural, conversational speech with zero API keys or monthly costs.
// Choices sync seamlessly across her iPad, laptop, and phone.

import { supabase } from '@/lib/supabase'

export type HostSpeaker = 'DOC_UNO' | 'NURSE_FLORENCE'

export interface VoiceOption { id: string; name: string; description: string }

const voice = (id: string, name: string, description: string): VoiceOption => ({ id, name, description })

export const HOST_VOICES: Record<HostSpeaker, VoiceOption[]> = {
  DOC_UNO: [
    voice('en-US-AndrewMultilingualNeural', 'Andrew', 'Warm and conversational'),
    voice('en-US-BrianMultilingualNeural', 'Brian', 'Casual and easygoing'),
    voice('en-PH-JamesNeural', 'James', 'Filipino English accent'),
    voice('en-US-ChristopherNeural', 'Christopher', 'Calm and steady'),
    voice('en-GB-RyanNeural', 'Ryan', 'Friendly British accent'),
  ],
  NURSE_FLORENCE: [
    voice('en-US-AvaMultilingualNeural', 'Ava', 'Warm and caring'),
    voice('en-US-EmmaMultilingualNeural', 'Emma', 'Bright and cheerful'),
    voice('en-PH-RosaNeural', 'Rosa', 'Filipino English accent'),
    voice('en-US-JennyNeural', 'Jenny', 'Soft and friendly'),
    voice('en-GB-SoniaNeural', 'Sonia', 'Gentle British accent'),
  ],
}

// The first voice in each list is the default when nothing has been chosen
const storageKey = (speaker: HostSpeaker) => `fn-voice-${speaker}`

export function getVoiceChoice(speaker: HostSpeaker): string {
  try {
    const saved = localStorage.getItem(storageKey(speaker))
    if (saved && HOST_VOICES[speaker].some(v => v.id === saved)) return saved
  } catch { /* storage unavailable */ }
  return HOST_VOICES[speaker][0].id
}

export function findVoice(speaker: HostSpeaker, id: string): VoiceOption | undefined {
  return HOST_VOICES[speaker].find(v => v.id === id)
}

/** Apply a voice choice coming from cloud sync or another device */
export function applyRemoteVoiceChoice(speaker: HostSpeaker, id: string) {
  if (!HOST_VOICES[speaker].some(v => v.id === id)) return
  try {
    localStorage.setItem(storageKey(speaker), id)
  } catch { /* storage unavailable */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fn-voice-change', { detail: { speaker, id } }))
  }
}

/** Set voice locally and sync across all her devices */
export function setVoiceChoice(speaker: HostSpeaker, id: string) {
  try { localStorage.setItem(storageKey(speaker), id) } catch { /* storage unavailable */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fn-voice-change', { detail: { speaker, id } }))
  }
  syncVoiceToCloud(speaker, id)
}

async function syncVoiceToCloud(speaker: HostSpeaker, id: string) {
  try {
    const metaKey = speaker === 'DOC_UNO' ? 'voice_doc_uno' : 'voice_nurse_florence'
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Save to Supabase user metadata so it persists in cloud
    await supabase.auth.updateUser({
      data: { [metaKey]: id }
    })

    // 2. Broadcast via Supabase Realtime so all open devices update immediately
    const channel = supabase.channel(`settings-sync-${user.id}`)
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'voice_change',
          payload: { speaker, id },
        })
      }
    })
  } catch (err) {
    console.warn('[Voices] Cloud sync failed:', err)
  }
}
