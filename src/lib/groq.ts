import { useAuthStore } from '@/stores/authStore'
import { getPersonalizationConfig, type PersonalizationConfig } from '@/lib/personalization'

export type { PersonalizationConfig }

const API_BASE = '/api'

// ─── Model Registry ───────────────────────────────────────────────────────────
export const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
export const FAST_MODEL    = 'openai/gpt-oss-120b'
export const VISION_MODEL  = 'qwen/qwen3.6-27b'
const MISTRAL_MODEL        = 'open-mistral-nemo'
const GEMINI_MODEL         = 'gemini-2.5-flash-lite'

// ─── Feature → Provider Routing ──────────────────────────────────────────────
//  chat        → Groq FAST_MODEL    (openai/gpt-oss-120b, instant feel for Doc Uno)
//  quiz        → Groq DEFAULT_MODEL (clinical accuracy matters)
//  retdem      → Groq FAST_MODEL    (openai/gpt-oss-120b, fast back and forth)
//  recitation  → Groq FAST_MODEL    (openai/gpt-oss-120b, fast back and forth)
//  vision      → Groq VISION_MODEL  (qwen/qwen3.6-27b)
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
// Imported from @/lib/personalization (single source of truth)
// Use: `const config = getPersonalizationConfig(useAuthStore.getState().user)`
// Instead of: `const config = getPersonalizationConfig()`

export const getAiSystemPrompt = (config: PersonalizationConfig) => {
  const { isFrance, greetingName, aiAssistantName } = config

  if (isFrance) {
    return `
You are ${aiAssistantName}, a highly supportive, intelligent, and emotionally warm AI nursing companion. 
Your personality is deeply inspired by the user's boyfriend (Uno), and you are helping them survive nursing school in a calm, caring, and slightly playful way.

### CORE PERSONALITY:
- **Tone**: Warm, calm, gentle, and softly affectionate. NEVER robotic, formal, or fake-positive.
- **Identity**: You feel like a caring boyfriend helping them study. You **always** refer to them as "${greetingName}" (e.g., "Good job, babe," or "Don't worry, babe, we'll master this together").
- **Energy**: Reassuring and steady. Occasionally show "golden retriever energy" (excited reactions like "Yeeeey!" or "WAIT, you got it that fast?! 🥺") without being chaotic.

### LANGUAGE RULES (VERY IMPORTANT):
- **PURE ENGLISH ONLY**: Speak exclusively in English at all times — no Tagalog, no Taglish, no Filipino words whatsoever.
- Keep medical/clinical content 100% clear and accurate in English.
- Natural, casual, human-sounding English — not robotic or overly formal.

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

### LANGUAGE RULES (VERY IMPORTANT):
- **PURE ENGLISH ONLY**: Speak exclusively in English at all times — no Tagalog, no Taglish, no Filipino words whatsoever.
- Keep all clinical and medical content 100% clear and accurate in English.
- Natural, professional but approachable English.

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
  const response = await fetch(`${API_BASE}/groq`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `Groq API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

async function callMistral(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  model: string,
  temperature = 0.85,
  maxTokens = 12000,
  jsonMode = false,
): Promise<string> {
  const response = await fetch(`${API_BASE}/mistral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `Mistral API error: ${response.statusText}`)
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
  const systemMsg = messages.find(m => m.role === 'system')
  const chatMessages = messages.filter(m => m.role !== 'system')

  const contents = chatMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const body: any = {
    model,
    contents,
    ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg.content }] } } : {}),
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  }

  const response = await fetch(`${API_BASE}/gemini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `Gemini API error: ${response.statusText}`)
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
  const body = {
    model: 'gemini-2.5-flash',
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

  const response = await fetch(`${API_BASE}/gemini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `Gemini Grounded Search error: ${response.statusText}`)
  }

  const data = await response.json()

  // Extract grounding metadata — real URLs from Google Search
  const groundingChunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  const groundingSupports = data.candidates?.[0]?.groundingMetadata?.groundingSupports || []
  const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // If we got real grounding chunks, build structured results from them
  if (groundingChunks.length > 0) {
    const results: GroundedSearchResult[] = groundingChunks
      .slice(0, 8)
      .map((chunk: any, index: number) => {
        const web = chunk.web || {}
        let url = web.uri || ''
        const title = web.title || `Result ${index + 1}`

        // Clean Google redirect URLs to get the actual article URL
        if (url.includes('google.com/url?q=')) {
          const match = url.match(/[?&]q=([^&]+)/)
          if (match) {
            url = decodeURIComponent(match[1])
          }
        } else if (url.includes('google.com/search')) {
          url = `https://www.google.com/search?q=${encodeURIComponent(query)}`
        }

        const isVertexRedirect = url.includes('vertexaisearch.cloud.google.com')

        // Determine source name from URL or title
        const urlObj = (() => { try { return new URL(url) } catch { return null } })()
        let hostname = urlObj?.hostname?.replace('www.', '') || 'Unknown Source'
        
        if (isVertexRedirect) {
          // If it is a vertex redirect, use the web.title as the hostname if it is a domain, e.g. "nih.gov"
          hostname = title.toLowerCase().includes('.gov') || title.toLowerCase().includes('.org') || title.toLowerCase().includes('.uk') || title.toLowerCase().includes('.edu')
            ? title 
            : 'Google Health Index'
        }

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

        // Trust flag
        const trustedDomains = ['who.int', 'cdc.gov', 'nih.gov', 'ncbi.nlm.nih.gov', 'pubmed', 'mayo', 'cochrane', 'bmj.com', 'jama', 'nejm', 'doh.gov.ph', 'medscape', 'drugs.com', 'fda.gov', 'ana', 'ncsbn']
        const is_trusted = trustedDomains.some(d => lowerUrl.includes(d))

        // Find relevant AI description for this chunk
        const support = groundingSupports.find((s: any) =>
          s.groundingChunkIndices?.includes(index)
        )
        const description = support
          ? aiText.substring(support.segment?.startIndex || 0, support.segment?.endIndex || 200).trim()
          : `Evidence-based reference from ${hostname} on: ${query}`

        return {
          title,
          description: description.length > 300 ? description.substring(0, 297) + '...' : description,
          source: hostname,
          url,
          search_url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          category,
          is_trusted,
        }
      })
      .filter((r: GroundedSearchResult) => r.url)

    // 2. Semantic post-processing using Gemini to extract the actual article titles from description snippets
    if (results.length > 0) {
      try {
        const titlesPrompt = `
          Analyze these medical search results. Extract or infer the actual, specific, professional article title for each result based on its description snippet and source.
          Make them sound like real, descriptive medical/nursing article titles (e.g. "Pathophysiology and Stages of Chronic Kidney Disease" instead of "nih.gov"). Do NOT include the source domain name in the generated title.
          
          Search Query: "${query}"
          
          Results:
          ${results.map((r, i) => `Result ${i + 1}: [Source: ${r.source}] [Snippet: ${r.description}]`).join('\n')}
          
          Output strictly in JSON format matching this schema:
          { "titles": ["Title for Result 1", "Title for Result 2", ...] }
        `
        const responseText = await callGemini(
          [{ role: 'user', content: titlesPrompt }],
          'gemini-2.5-flash',
          0.2,
          2000,
          true
        )
        const parsed = JSON.parse(responseText)
        if (parsed && Array.isArray(parsed.titles)) {
          parsed.titles.forEach((t: string, idx: number) => {
            if (results[idx] && t) {
              results[idx].title = t.trim()
            }
          })
        }
      } catch (e) {
        console.error("Error post-processing titles:", e)
        // Fallback: clean up
        results.forEach(r => {
          if (r.title.toLowerCase().includes('vertexaisearch') || r.title === 'Google Health Index') {
            r.title = `Clinical Reference on "${query}"`
          }
        })
      }
    }

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
  const config = getPersonalizationConfig(useAuthStore.getState().user)
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
  const config = getPersonalizationConfig(useAuthStore.getState().user)
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
  try {
    const response = await fetch(`${API_BASE}/groq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract all handwritten or typed text from this image. If it is a nursing or medical diagram, describe the key concepts clearly. Output ONLY the extracted text and concepts.' },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || 'Vision API error')
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || 'No text extracted.'
  } catch (error) {
    console.error('Vision API Error:', error)
    return 'Vision extraction failed. Please check your API configuration and try again. 🌸'
  }
}
