// Voices she can pick for each host. Free voices (Microsoft neural, no quota) come first and
// are the defaults; ElevenLabs premade voices use the account's monthly credits.

export type HostSpeaker = 'DOC_UNO' | 'NURSE_FLORENCE'

export type VoiceProvider = 'free' | 'elevenlabs'

export interface VoiceOption { id: string; name: string; description: string; provider: VoiceProvider }

const free = (id: string, name: string, description: string): VoiceOption => ({ id, name, description, provider: 'free' })
const eleven = (id: string, name: string, description: string): VoiceOption => ({ id, name, description, provider: 'elevenlabs' })

export const HOST_VOICES: Record<HostSpeaker, VoiceOption[]> = {
  DOC_UNO: [
    free('en-US-AndrewMultilingualNeural', 'Andrew', 'Warm and conversational'),
    free('en-US-BrianMultilingualNeural', 'Brian', 'Casual and easygoing'),
    free('en-PH-JamesNeural', 'James', 'Filipino English accent'),
    free('en-US-ChristopherNeural', 'Christopher', 'Calm and steady'),
    free('en-GB-RyanNeural', 'Ryan', 'Friendly British accent'),
    eleven('iP95p4xoKVk53GtZA4qT', 'Chris', 'Natural and down-to-earth, like a real conversation'),
    eleven('cjVigY5qzO86Huf0OWal', 'Eric', 'Smooth and friendly'),
    eleven('nPczCjzI2devNBz1zQrb', 'Brian', 'Deep, calm and reassuring'),
    eleven('TX3LPaxmHKxFdv7VOQHJ', 'Liam', 'Young, warm and clear'),
    eleven('bIHbv24MWmeRgasZH58o', 'Will', 'Relaxed and chill'),
    eleven('IKne3meq5aSn9XLyUdCD', 'Charlie', 'Easygoing, Australian accent'),
    eleven('JBFqnCBsd6RMkjVDRZzb', 'George', 'Warm British storyteller'),
    eleven('pNInz6obpgDQGcFmaJgB', 'Adam', 'The original voice'),
  ],
  NURSE_FLORENCE: [
    free('en-US-AvaMultilingualNeural', 'Ava', 'Warm and caring'),
    free('en-US-EmmaMultilingualNeural', 'Emma', 'Bright and cheerful'),
    free('en-PH-RosaNeural', 'Rosa', 'Filipino English accent'),
    free('en-US-JennyNeural', 'Jenny', 'Soft and friendly'),
    free('en-GB-SoniaNeural', 'Sonia', 'Gentle British accent'),
    eleven('EXAVITQu4vr4xnSDxMaL', 'Sarah', 'Soft and reassuring (the original voice)'),
    eleven('XrExE9yKIg1WjnnlVkGX', 'Matilda', 'Warm and friendly'),
    eleven('cgSgspJ2msm6clMCkdW9', 'Jessica', 'Bright, playful and warm'),
    eleven('FGY2WhTYpPnrIDTdsKH5', 'Laura', 'Upbeat and lively'),
    eleven('9BWtsMINqrJLrRacOk9x', 'Aria', 'Expressive and natural'),
    eleven('pFZP5JQG7iQjIQuC4Bku', 'Lily', 'Gentle British accent'),
    eleven('Xb7hH8MSUJpSbSDYk0k2', 'Alice', 'Clear and confident, British'),
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

export function setVoiceChoice(speaker: HostSpeaker, id: string) {
  try { localStorage.setItem(storageKey(speaker), id) } catch { /* storage unavailable */ }
}
