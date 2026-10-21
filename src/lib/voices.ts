// ElevenLabs premade voices (available on every plan) that she can pick for each host

export type HostSpeaker = 'DOC_UNO' | 'NURSE_FLORENCE'

export interface VoiceOption { id: string; name: string; description: string }

export const HOST_VOICES: Record<HostSpeaker, VoiceOption[]> = {
  DOC_UNO: [
    { id: 'iP95p4xoKVk53GtZA4qT', name: 'Chris', description: 'Natural and down-to-earth, like a real conversation' },
    { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', description: 'Smooth and friendly' },
    { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Deep, calm and reassuring' },
    { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Young, warm and clear' },
    { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', description: 'Relaxed and chill' },
    { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Easygoing, Australian accent' },
    { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Warm British storyteller' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'The original voice' },
  ],
  NURSE_FLORENCE: [
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Soft and reassuring (the original voice)' },
    { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'Warm and friendly' },
    { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Bright, playful and warm' },
    { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Upbeat and lively' },
    { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', description: 'Expressive and natural' },
    { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Gentle British accent' },
    { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', description: 'Clear and confident, British' },
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

export function setVoiceChoice(speaker: HostSpeaker, id: string) {
  try { localStorage.setItem(storageKey(speaker), id) } catch { /* storage unavailable */ }
}
