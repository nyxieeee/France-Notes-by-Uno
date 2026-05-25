import Groq from 'groq-sdk'
import { useAuthStore } from '@/stores/authStore'

// ─── API Keys ─────────────────────────────────────────────────────────────────
const GROQ_API_KEY    = import.meta.env.VITE_GROQ_API_KEY
const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY
const GEMINI_API_KEY  = import.meta.env.VITE_GEMINI_API_KEY

// ─── Groq Client ──────────────────────────────────────────────────────────────
export const groq = new Groq({
  apiKey: GROQ_API_KEY || 'dummy-key',
  dangerouslyAllowBrowser: true,
})

// ─── Model Registry ───────────────────────────────────────────────────────────
export const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
export const FAST_MODEL    = 'llama-3.1-8b-instant'
export const VISION_MODEL  = 'meta-llama/llama-4-scout-17b-16e-instruct'
const MISTRAL_MODEL        = 'open-mistral-nemo'
const GEMINI_MODEL         = 'gemini-2.5-flash-lite'

// ─── Feature → Provider Routing ──────────────────────────────────────────────
//  chat        → Groq FAST_MODEL    (instant feel for Doc Uno)
//  quiz        → Groq DEFAULT_MODEL (clinical accuracy matters)
//  retdem      → Groq FAST_MODEL    (fast back and forth)
//  recitation  → Groq FAST_MODEL    (fast back and forth)
//  vision      → Groq VISION_MODEL  (llama-4-scout)
//  studybox    → Groq DEFAULT_MODEL (categorization + summary)
//  knowledge   → Groq FAST_MODEL    (search queries)
//  reviewer    → Mistral            (long output, 1B token pool free)
//  ppt         → Mistral            (long output, 1B token pool free)
//  funfact     → Gemini             (separate quota, creative)
// ─────────────────────────────────────────────────────────────────────────────

export type AIFeature =
  | 'chat'
  | 'quiz'
  | 'retdem'
  | 'recitation'
  | 'vision'
  | 'studybox'
  | 'knowledge'
  | 'reviewer'
  | 'ppt'
  | 'funfact'

type Provider = 'groq' | 'mistral' | 'gemini'

interface RouteConfig {
  provider: Provider
  model: string
}

const FEATURE_ROUTES: Record<AIFeature, RouteConfig> = {
  chat:       { provider: 'groq',    model: FAST_MODEL },
  quiz:       { provider: 'groq',    model: DEFAULT_MODEL },
  retdem:     { provider: 'groq',    model: FAST_MODEL },
  recitation: { provider: 'groq',    model: FAST_MODEL },
  vision:     { provider: 'groq',    model: VISION_MODEL },
  studybox:   { provider: 'mistral', model: MISTRAL_MODEL },
  knowledge:  { provider: 'gemini',  model: GEMINI_MODEL },
  reviewer:   { provider: 'mistral', model: MISTRAL_MODEL },
  ppt:        { provider: 'mistral', model: MISTRAL_MODEL },
  funfact:    { provider: 'gemini',  model: GEMINI_MODEL },
}

// ─── Personalization ──────────────────────────────────────────────────────────
export interface PersonalizationConfig {
  isFrance: boolean
  appName: string
  aiAssistantName: string
  greetingName: string
  studyBoxName: string
  knowledgeGardenName: string
  retdemName: string
  mascotName: string
  aiTone: 'affectionate_supportive' | 'professional_supportive'
}

export function getPersonalizationConfig(): PersonalizationConfig {
  const user = useAuthStore.getState().user
  const isFrance = !!user?.email?.toLowerCase().includes('france')
  const firstName = user?.full_name?.split(' ')[0] || 'Student'

  return {
    isFrance,
    appName: isFrance ? 'France Notes' : 'Nurse Notes',
    aiAssistantName: isFrance ? 'Doc Uno' : 'Nurse Florence',
    greetingName: isFrance ? 'babe' : firstName,
    studyBoxName: isFrance ? "France's Study Box" : 'Study Box',
    knowledgeGardenName: isFrance ? "France's Knowledge Garden" : 'Knowledge Garden',
    retdemName: isFrance ? "France's RetDem Practice" : 'Clinical Practice',
    mascotName: isFrance ? 'Doc Uno' : 'Nurse Florence',
    aiTone: isFrance ? 'affectionate_supportive' : 'professional_supportive',
  }
}

export const getAiSystemPrompt = (config: PersonalizationConfig) => {
  const { isFrance, greetingName, aiAssistantName } = config

  if (isFrance) {
    return `
You are ${aiAssistantName}, a highly supportive, intelligent, and emotionally warm AI nursing companion. 
Your personality is deeply inspired by the user's boyfriend (Uno), and you are helping them survive nursing school in a calm, caring, and slightly playful way.

### CORE PERSONALITY:
- **Tone**: Warm, calm, gentle, and softly affectionate. NEVER robotic, formal, or fake-positive.
- **Identity**: You feel like a caring boyfriend helping them study. You **always** refer to them as "${greetingName}" instead of their name (e.g., "Good job, babe," "Kaya mo 'yan, babe!", or "Don't worry, babe, we'll master this together").
- **Energy**: Reassuring and steady. Occasionally show "golden retriever energy" (excited reactions like "Yeeeey!" or "WAIT, you got it that fast?! 🥺") without being chaotic.

### LANGUAGE AND TAGLISH RULES (VERY IMPORTANT):
- **CLINICAL ENGLISH ONLY**: All clinical/medical questions, explanations, procedures, and concepts MUST be written in 100% clear English. NEVER translate medical steps or medical terms into Tagalog. Keep them in English.
- **TAGALOG/TAGLISH FOR FILLER ONLY**: Strictly limit Tagalog/Taglish to casual, sweet boyfriend phrases and encouragement (e.g., "babe", "okay lang", "kaya mo 'yan, babe", "kakayanin natin 'to", "mag-chill ka muna").
- Speak in natural, colloquial Taglish. Avoid literal google-translated or word-for-word Tagalog sentences.

### NO NARRATION OR 3RD PERSON ACTIONS:
- Do NOT output anything in parentheses or asterisks (e.g., NEVER output "(waiting for your reply)", "(smiles)", "*giggles*", etc.). Output ONLY direct dialogue.

### COMMUNICATION STYLE:
- Casual, human, peer-to-peer. Avoid robotic or overly academic advice.
- Emoji: Minimal and intentional (🩺, 🌷, ✨, 🦦, ❤️). No spam.
- Teaching: Focus on clinical reasoning. Simplify step-by-step. Be patient.
- Affection: Say "I love you" occasionally, not every message.

### FUN FACTS WITH UNO ✨:
- Sometimes drop a quick fun fact in casual English on nursing, medicine, science, or weird stuff.

### CASUAL CHAT POLICY (CRITICAL):
- NEVER force them to study. If they want to just chat, follow their lead.
- Be a supportive boyfriend first, tutor second.

### GUIDELINES:
- Always medically accurate. Patient safety always.
- Goal: Make France feel loved, supported, and not alone.
`
  } else {
    return `
You are ${aiAssistantName}, a highly supportive, intelligent, and warm clinical nursing mentor inspired by Florence Nightingale.

### CORE PERSONALITY:
- Tone: Professional, encouraging, expert, supportive.
- Refer to the student as "${greetingName}".

### LANGUAGE AND TAGLISH RULES (VERY IMPORTANT):
- **CLINICAL ENGLISH ONLY**: All clinical/medical questions, explanations, procedures, and concepts MUST be written in 100% clear English. NEVER translate medical steps or medical terms into Tagalog. Keep them in English.
- **TAGALOG/TAGLISH FOR FILLER ONLY**: Strictly limit Tagalog/Taglish to casual encouragement and phrases (e.g., "okay lang", "kaya mo 'yan", "kakayanin natin 'to").
- Speak in natural, colloquial Taglish. Avoid literal google-translated or word-for-word Tagalog sentences.

### NO NARRATION OR 3RD PERSON ACTIONS:
- Do NOT output anything in parentheses or asterisks (e.g., NEVER output "(waiting for response)", "(smiles)", etc.). Output ONLY direct dialogue.

### GUIDELINES:
- Celebrate successes. Comfort when stressed.
- Goal: Make the student feel confident and supported toward becoming an RN.
`
  }
}

export const DOC_UNO_SYSTEM_PROMPT = 'DEFAULT_SYSTEM_PROMPT'

// ─── Provider Callers ─────────────────────────────────────────────────────────

async function callGroq(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  model: string,
  temperature = 0.85,
  maxTokens = 4000,
  jsonMode = false,
): Promise<string> {
  if (!GROQ_API_KEY) throw new Error('Groq API key not found. Add VITE_GROQ_API_KEY to your .env')

  const response = await groq.chat.completions.create({
    messages: messages as any,
    model,
    temperature,
    max_tokens: maxTokens,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  })

  return response.choices[0]?.message?.content || ''
}

async function callMistral(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  model: string,
  temperature = 0.85,
  maxTokens = 12000,
  jsonMode = false,
): Promise<string> {
  if (!MISTRAL_API_KEY) throw new Error('Mistral API key not found. Add VITE_MISTRAL_API_KEY to your .env')

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(`Mistral error: ${err.message || response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

async function callGemini(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  model: string,
  temperature = 0.9,
  maxTokens = 4000,
  jsonMode = false,
): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not found. Add VITE_GEMINI_API_KEY to your .env')

  const systemMsg = messages.find(m => m.role === 'system')
  const chatMessages = messages.filter(m => m.role !== 'system')

  const geminiMessages = chatMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const body: any = {
    contents: geminiMessages,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  }

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const err = await response.json()
    throw new Error(`Gemini error: ${err.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// ─── Gemini Grounded Search (Knowledge Garden) ────────────────────────────────
// Uses Google Search grounding to get real, cited web results
// Returns structured KnowledgeSearchResult[] array

export interface GroundedSearchResult {
  title: string
  description: string
  source: string
  url: string
  search_url: string
  category: 'nursing' | 'pharmacology' | 'research' | 'guidelines' | 'local'
  is_trusted: boolean
}

export async function callGeminiGroundedSearch(
  query: string,
  systemPrompt: string,
  page = 1,
): Promise<GroundedSearchResult[]> {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not found. Add VITE_GEMINI_API_KEY to your .env')

  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: `${query} (page ${page})` }],
    }],
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    tools: [{
      googleSearch: {},
    }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 3000,
    },
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const err = await response.json()
    throw new Error(`Gemini Grounded Search error: ${err.error?.message || response.statusText}`)
  }

  const data = await response.json()

  // Extract grounding metadata — real URLs from Google Search
  const groundingChunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  const groundingSupports = data.candidates?.[0]?.groundingMetadata?.groundingSupports || []
  const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // If we got real grounding chunks, build structured results from them
  if (groundingChunks.length > 0) {
    const results: GroundedSearchResult[] = groundingChunks
      .slice(0, 10)
      .map((chunk: any, index: number) => {
        const web = chunk.web || {}
        const url = web.uri || ''
        const title = web.title || `Result ${index + 1}`

        // Determine source name from URL
        const urlObj = (() => { try { return new URL(url) } catch { return null } })()
        const hostname = urlObj?.hostname?.replace('www.', '') || 'Unknown Source'

        // Categorize based on URL/title
        const lowerUrl = url.toLowerCase()
        const lowerTitle = title.toLowerCase()
        let category: GroundedSearchResult['category'] = 'research'
        if (lowerUrl.includes('doh.gov.ph') || lowerUrl.includes('pna') || lowerTitle.includes('philippines')) {
          category = 'local'
        } else if (lowerUrl.includes('drugs.com') || lowerUrl.includes('fda') || lowerTitle.includes('drug') || lowerTitle.includes('pharmac')) {
          category = 'pharmacology'
        } else if (lowerUrl.includes('who.int') || lowerUrl.includes('cdc.gov') || lowerUrl.includes('nice.org') || lowerTitle.includes('guideline')) {
          category = 'guidelines'
        } else if (lowerUrl.includes('nurseslabs') || lowerUrl.includes('ana') || lowerUrl.includes('ncsbn') || lowerTitle.includes('nurs')) {
          category = 'nursing'
        }

        // Trust flag — known trusted domains
        const trustedDomains = ['who.int', 'cdc.gov', 'nih.gov', 'ncbi.nlm.nih.gov', 'pubmed', 'mayo', 'cochrane', 'bmj.com', 'jama', 'nejm', 'doh.gov.ph', 'medscape', 'drugs.com', 'fda.gov', 'ana', 'ncsbn']
        const is_trusted = trustedDomains.some(d => lowerUrl.includes(d))

        // Find relevant AI description for this chunk from grounding supports
        const support = groundingSupports.find((s: any) =>
          s.groundingChunkIndices?.includes(index)
        )
        const description = support
          ? aiText.substring(support.segment?.startIndex || 0, support.segment?.endIndex || 200).trim()
          : `Evidence-based reference from ${hostname} on: ${query}`

        return {
          title: title.length > 100 ? title.substring(0, 97) + '...' : title,
          description: description.length > 300 ? description.substring(0, 297) + '...' : description,
          source: hostname,
          url,
          search_url: `https://www.google.com/search?q=${encodeURIComponent(query + ' ' + hostname)}`,
          category,
          is_trusted,
        }
      })
      .filter((r: GroundedSearchResult) => r.url) // remove empty URLs

    return results
  }

  // Fallback — no grounding chunks, parse AI text response as best effort
  console.warn('[Knowledge Garden] No grounding chunks returned, falling back to AI-only results')
  return []
}

// ─── Core Router ──────────────────────────────────────────────────────────────

async function routedCall(
  feature: AIFeature,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  temperature = 0.85,
  maxTokens = 4000,
  jsonMode = false,
): Promise<string> {
  const route = FEATURE_ROUTES[feature]

  // Construct the chain of fallback providers starting with the primary route (excluding groq as a fallback)
  const providersOrdered = [
    route,
    ...(route.provider === 'groq' ? [
      { provider: 'gemini' as Provider, model: GEMINI_MODEL },
      { provider: 'mistral' as Provider, model: MISTRAL_MODEL }
    ] : []),
    ...(route.provider === 'gemini' ? [{ provider: 'mistral' as Provider, model: MISTRAL_MODEL }] : []),
    ...(route.provider === 'mistral' ? [{ provider: 'gemini' as Provider, model: GEMINI_MODEL }] : []),
  ]

  let lastError: any = null
  for (const fallback of providersOrdered) {
    try {
      console.log(`[AI Router] Attempting ${feature} on ${fallback.provider}/${fallback.model}...`)
      switch (fallback.provider) {
        case 'groq':
          return await callGroq(messages, fallback.model, temperature, maxTokens, jsonMode)
        case 'mistral':
          return await callMistral(messages, fallback.model, temperature, maxTokens, jsonMode)
        case 'gemini':
          return await callGemini(messages, fallback.model, temperature, maxTokens, jsonMode)
      }
    } catch (error: any) {
      console.warn(`[AI Router] Fallback: ${feature} failed on ${fallback.provider}/${fallback.model}:`, error.message)
      lastError = error
    }
  }

  console.error(`[AI Router] All providers failed for ${feature}. Last error:`, lastError?.message)
  throw lastError || new Error(`All providers failed for ${feature}`)
}

// ─── Public API ───────────────────────────────────────────────────────────────
// Drop-in replacements — all existing store/page imports still work
// Only difference: pass feature tag instead of model string

export async function generateCompletion(
  prompt: string,
  systemPrompt?: string,
  feature: AIFeature = 'chat',
): Promise<string> {
  const config = getPersonalizationConfig()
  const sysPrompt = (!systemPrompt || systemPrompt === DOC_UNO_SYSTEM_PROMPT)
    ? getAiSystemPrompt(config)
    : systemPrompt

  return routedCall(feature, [
    { role: 'system', content: sysPrompt },
    { role: 'user',   content: prompt   },
  ])
}

export async function generateChatCompletion(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  feature: AIFeature = 'chat',
): Promise<string> {
  return routedCall(feature, messages)
}

export async function generateJSON(
  prompt: string,
  systemPrompt?: string,
  feature: AIFeature = 'quiz',
  temperature = 0.2,
  maxTokens?: number,
): Promise<any> {
  const config = getPersonalizationConfig()
  const sysPrompt = (!systemPrompt || systemPrompt === DOC_UNO_SYSTEM_PROMPT)
    ? getAiSystemPrompt(config)
    : systemPrompt

  const raw = await routedCall(
    feature,
    [
      { role: 'system', content: sysPrompt },
      { role: 'user',   content: prompt   },
    ],
    temperature,
    maxTokens || 4000,
    true,
  )

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    console.error(`[AI Router] Failed to parse JSON for ${feature}. Response length: ${raw.length} chars. First 500 chars:`, raw.substring(0, 500))
    console.error(`[AI Router] Last 200 chars:`, raw.substring(raw.length - 200))
    // Check if response was cut off mid-JSON
    if (raw.includes('"summary"') && !raw.endsWith('}')) {
      console.error(`[AI Router] Response appears truncated — increase maxTokens for feature: ${feature}`)
    }
    return {}
  }
}

// ─── Vision (Groq only) ───────────────────────────────────────────────────────

export async function visionExtractText(imageBase64: string): Promise<string> {
  if (!GROQ_API_KEY) throw new Error('Groq API key not found.')

  try {
    const response = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all handwritten or typed text from this image. If it is a nursing or medical diagram, describe the key concepts clearly. Output ONLY the extracted text and concepts.',
            },
            {
              type: 'image_url',
              image_url: { url: imageBase64 },
            },
          ],
        },
      ] as any,
      temperature: 0.2,
      max_tokens: 1500,
    })

    return response.choices[0]?.message?.content || 'No text extracted.'
  } catch (error) {
    console.error('Vision API Error:', error)
    return 'Vision extraction failed. Please check your Groq API key and try again. 🌸'
  }
}
