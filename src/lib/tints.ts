// Soft header tints for cards (rose, peach, lilac, sage), with dark-mode variants
export const CARD_TINTS = [
  'from-[#F6D9DC] to-[#FBEDEC] dark:from-[#4A2F36] dark:to-[#33252A]',
  'from-[#F8E1D3] to-[#FCF1EA] dark:from-[#4A372C] dark:to-[#332822]',
  'from-[#E9DDF0] to-[#F6F0F9] dark:from-[#3D3248] dark:to-[#2C2533]',
  'from-[#DCEAE1] to-[#F0F6F2] dark:from-[#2E4036] dark:to-[#232E28]',
]

// Stable tint for an item, so a card keeps its color wherever it appears
export function tintFor(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return CARD_TINTS[Math.abs(hash) % CARD_TINTS.length]
}
