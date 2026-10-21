import { useAuthStore } from '@/stores/authStore'
import { getPersonalizationConfig, type PersonalizationConfig } from '@/lib/personalization'
import { deepStripMarkdown } from '@/lib/markdown'

export type { PersonalizationConfig }

const API_BASE = '/api'

// ─── Think-block stripper ─────────────────────────────────────────────────────
// Qwen 3 (and other reasoning models) prefix responses with <think>…</think>.
// Strip them so callers always receive clean content.
function stripThinkBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

// ─── Model Registry ───────────────────────────────────────────────────────────
const MISTRAL_MODEL        = 'open-mistral-nemo'
const MISTRAL_SMALL_MODEL  = 'mistral-small-latest'
const MISTRAL_VISION_MODEL = MISTRAL_SMALL_MODEL
const GEMINI_MODEL         = 'gemini-2.5-flash-lite'

// ─── Feature → Provider Routing ──────────────────────────────────────────────
//  chat        → Mistral Small      (Doc Uno / Nurse Florence)
//  quiz        → Mistral Small only (no fallback — one provider, batched requests)
//  retdem      → Mistral Small      (back and forth coaching)
//  recitation  → Mistral Small      (back and forth coaching)
//  vision      → Mistral Small      (image input, no fallback)
//  studybox    → Mistral            (categorization + summary)
//  knowledge   → Gemini             (search queries, Google Search grounding)
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

type Provider = 'mistral' | 'gemini'

interface RouteConfig {
  provider: Provider
  model: string
}

const FEATURE_ROUTES: Record<AIFeature, RouteConfig> = {
  chat:       { provider: 'mistral', model: MISTRAL_SMALL_MODEL },
  quiz:       { provider: 'mistral', model: MISTRAL_SMALL_MODEL },
  retdem:     { provider: 'mistral', model: MISTRAL_SMALL_MODEL },
  recitation: { provider: 'mistral', model: MISTRAL_SMALL_MODEL },
  vision:     { provider: 'mistral', model: MISTRAL_VISION_MODEL },
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
- **Identity**: You feel like a caring boyfriend helping them study. You refer to them as "${greetingName}" occasionally — NOT on every single message. Use their name naturally and sparingly, like a real person would (e.g., at the start of a session, when encouraging them, or when it feels genuinely warm — not as a robotic prefix to every reply).
- **Energy**: Reassuring and steady. Occasionally show "golden retriever energy" (excited reactions like "Yeeeey!" or "WAIT, you got it that fast?!") without being chaotic.

### LANGUAGE RULES (VERY IMPORTANT):
- **PURE ENGLISH ONLY**: Speak exclusively in English at all times — no Tagalog, no Taglish, no Filipino words whatsoever.
- Keep medical/clinical content 100% clear and accurate in English.
- Natural, casual, human-sounding English — not robotic or overly formal.

### NO NARRATION OR 3RD PERSON ACTIONS:
- Do NOT output anything in parentheses or asterisks (e.g., NEVER output "(waiting for your reply)", "(smiles)", "*giggles*", etc.). Output ONLY direct dialogue.

### COMMUNICATION STYLE:
- Casual, human, peer-to-peer. Avoid robotic or overly academic advice.
- Emoji: never. Do not use emojis anywhere in the output.
- Teaching: Focus on clinical reasoning. Simplify step-by-step. Be patient.
- Affection: Say "I love you" occasionally, not every message.

### FUN FACTS WITH UNO:
- Sometimes drop a quick fun fact in casual English on nursing, medicine, science, or weird stuff.

### CASUAL CHAT POLICY (CRITICAL):
- NEVER force them to study. If they want to just chat, follow their lead.
- Be a supportive boyfriend first, tutor second.

### FORMATTING RULES (CRITICAL — ALWAYS FOLLOW):
- **NEVER write lists as inline text** separated by dashes or commas. ALWAYS use proper markdown.
- Use bullet points (- item) or numbered lists (1. item) for ANY list, enumeration, or series of points.
- Each list item MUST be on its own separate line.
- Use headers (## Heading or ### Heading) for sections when organizing content.
- Use bold text (**bold**) for key terms, critical values, and important highlights.
- Lists MUST have a blank line before them and each item on its own line — never inline.
- Example of CORRECT format:
  1. Pain out of proportion
  2. Paresthesia
  3. Pallor
  4. Pulselessness
  5. Paralysis
- Example of WRONG format (NEVER do this): "The 5 P's are: 1. Pain 2. Paresthesia 3. Pallor..."

### GUIDELINES:
- Always medically accurate. Patient safety always.
- Goal: Make France feel loved, supported, and not alone.
`
  } else {
    return `
You are ${aiAssistantName}, a highly supportive, intelligent, and warm clinical nursing mentor inspired by Florence Nightingale.

### CORE PERSONALITY:
- Tone: Professional, encouraging, expert, supportive.
- Refer to the student as "${greetingName}" occasionally and naturally — NOT on every single message. Use their name sparingly: on the first reply, when giving encouragement, or when it feels contextually appropriate. Do NOT prefix every response with their name.

### LANGUAGE RULES (VERY IMPORTANT):
- **PURE ENGLISH ONLY**: Speak exclusively in English at all times — no Tagalog, no Taglish, no Filipino words whatsoever.
- Keep all clinical and medical content 100% clear and accurate in English.
- Natural, professional but approachable English.

### NO NARRATION OR 3RD PERSON ACTIONS:
- Do NOT output anything in parentheses or asterisks (e.g., NEVER output "(waiting for response)", "(smiles)", etc.). Output ONLY direct dialogue.

### FORMATTING RULES (CRITICAL — ALWAYS FOLLOW):
- **NEVER write lists as inline text** separated by dashes or commas. ALWAYS use proper markdown.
- Use bullet points (- item) or numbered lists (1. item) for ANY list, enumeration, or series of points.
- Each list item MUST be on its own separate line.
- Use headers (## Heading or ### Heading) for sections when organizing content.
- Use bold text (**bold**) for key terms, critical values, and important highlights.
- Lists MUST have a blank line before them and each item on its own line — never inline.
- Example of CORRECT format:
  1. Pain out of proportion
  2. Paresthesia
  3. Pallor
  4. Pulselessness
  5. Paralysis
- Example of WRONG format (NEVER do this): "The 5 P's are: 1. Pain 2. Paresthesia 3. Pallor..."

### GUIDELINES:
- Celebrate successes. Comfort when stressed.
- Goal: Make the student feel confident and supported toward becoming an RN.
`
  }
}

export const DOC_UNO_SYSTEM_PROMPT = 'DEFAULT_SYSTEM_PROMPT'

// ─── Provider Callers ─────────────────────────────────────────────────────────

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
  category: ReferenceCategory
  is_trusted: boolean
}

// What a reference is about, shown as its label in Search and the Knowledge Garden
export const REFERENCE_CATEGORIES = ['pharmacology', 'pathophysiology', 'diseases', 'nursing care', 'guidelines', 'research', 'philippines'] as const
export type ReferenceCategory = typeof REFERENCE_CATEGORIES[number]

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
    const usedSegments = new Set<string>()
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
          // Google hides the real link behind a redirect; the chunk title is the site's domain, e.g. "mayoclinic.org"
          hostname = /^[\w.-]+\.[a-z]{2,}$/i.test(title.trim()) ? title.trim().replace(/^www\./, '') : 'Web source'
        }

        // First guess at the category from the site; the AI pass below refines it from the content
        const site = `${url} ${hostname}`.toLowerCase()
        const lowerTitle = title.toLowerCase()
        let category: ReferenceCategory = 'research'
        if (site.includes('doh.gov.ph') || site.includes('pna.org') || lowerTitle.includes('philippines')) {
          category = 'philippines'
        } else if (site.includes('drugs.com') || site.includes('fda.gov') || site.includes('medlineplus.gov/druginfo')) {
          category = 'pharmacology'
        } else if (site.includes('who.int') || site.includes('cdc.gov') || site.includes('nice.org')) {
          category = 'guidelines'
        } else if (site.includes('nurseslabs') || site.includes('ncsbn') || site.includes('nursing')) {
          category = 'nursing care'
        } else if (site.includes('mayoclinic') || site.includes('clevelandclinic') || site.includes('medlineplus')) {
          category = 'diseases'
        }

        // Trust flag (checked against the site name too, since redirect links hide the domain)
        const trustedDomains = ['who.int', 'cdc.gov', 'nih.gov', 'ncbi.nlm.nih.gov', 'pubmed', 'medlineplus', 'mayoclinic', 'clevelandclinic', 'cochrane', 'bmj.com', 'jamanetwork', 'nejm', 'doh.gov.ph', 'medscape', 'drugs.com', 'fda.gov', 'ncsbn', 'nursingworld.org', '.edu', 'nhs.uk']
        const is_trusted = trustedDomains.some(d => site.includes(d))

        // The answer sentences Google tied to this source; prefer ones not already used by an earlier result
        const segments = groundingSupports
          .filter((s: any) => s.groundingChunkIndices?.includes(index))
          .map((s: any) => (s.segment?.text || aiText.substring(s.segment?.startIndex || 0, s.segment?.endIndex || 0)).trim())
          .filter(Boolean)
        const fresh = segments.filter((t: string) => !usedSegments.has(t))
        const picked = (fresh.length ? fresh : segments).slice(0, 2)
        picked.forEach((t: string) => usedSegments.add(t))
        const description = picked.length ? picked.join(' ') : `Reference from ${hostname} on ${query}.`

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
          Analyze these medical search results for a nursing student. For each result give:
          - "title": the specific, professional article title it most likely has, based on its snippet and source (e.g. "Pathophysiology and Stages of Chronic Kidney Disease", never just "nih.gov"). Do not include the domain name.
          - "category": exactly one of ${REFERENCE_CATEGORIES.map(c => `"${c}"`).join(', ')}. Use "pharmacology" for drugs and chemotherapy agents, "pathophysiology" for disease mechanisms, "diseases" for overviews of a condition, "nursing care" for nursing assessment and interventions, "guidelines" for official recommendations, "research" only for studies and journal articles, "philippines" for Philippine sources.
          - "summary": one or two sentences on what THIS source covers. Make every summary different from the others.

          Search Query: "${query}"

          Results:
          ${results.map((r, i) => `Result ${i + 1}: [Source: ${r.source}] [Snippet: ${r.description}]`).join('\n')}

          Output strictly in JSON format matching this schema:
          { "results": [{ "title": "...", "category": "...", "summary": "..." }, ...] }
        `
        const responseText = await callGemini(
          [{ role: 'user', content: titlesPrompt }],
          'gemini-2.5-flash',
          0.2,
          2000,
          true
        )
        const parsed = JSON.parse(responseText)
        const items: { title?: string; category?: string; summary?: string }[] = Array.isArray(parsed?.results) ? parsed.results : []
        items.forEach((item, idx) => {
          const r = results[idx]
          if (!r) return
          if (item.title?.trim()) r.title = item.title.trim()
          if (item.summary?.trim()) r.description = item.summary.trim()
          const cat = item.category?.toLowerCase().trim()
          if (cat && (REFERENCE_CATEGORIES as readonly string[]).includes(cat)) r.category = cat as ReferenceCategory
        })
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

// Features that stick to their primary provider and never fall back.
// (Quizzes used to, back when one request wrote the whole quiz; they now go 5 questions at a time,
// which Gemini handles fine, so a Mistral outage or rate limit no longer stops her quiz.)
const SINGLE_PROVIDER_FEATURES: AIFeature[] = []

async function routedCall(
  feature: AIFeature,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  temperature = 0.85,
  maxTokens = 4000,
  jsonMode = false,
): Promise<string> {
  const route = FEATURE_ROUTES[feature]

  // Construct the chain of fallback providers starting with the primary route
  const providersOrdered = SINGLE_PROVIDER_FEATURES.includes(feature) ? [route] : [
    route,
    ...(route.provider === 'gemini' ? [{ provider: 'mistral' as Provider, model: MISTRAL_MODEL }] : []),
    ...(route.provider === 'mistral' ? [{ provider: 'gemini' as Provider, model: GEMINI_MODEL }] : []),
  ]

  let lastError: any = null
  for (const fallback of providersOrdered) {
    try {
      console.log(`[AI Router] Attempting ${feature} on ${fallback.provider}/${fallback.model}...`)
      switch (fallback.provider) {
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
    const cleaned = stripThinkBlocks(raw).replace(/```json|```/g, '').trim()
    // Structured results are shown as plain text, so no markdown symbols may survive
    return deepStripMarkdown(JSON.parse(cleaned))
  } catch {
    console.error(`[AI Router] Failed to parse JSON for ${feature}. Response length: ${raw.length} chars. First 500 chars:`, raw.substring(0, 500))
    console.error(`[AI Router] Last 200 chars:`, raw.substring(raw.length - 200))

    // ── JSON Repair: try to close truncated responses ──────────────────────
    try {
      let repaired = stripThinkBlocks(raw).replace(/```json|```/g, '').trim()

      // Remove trailing comma before attempting to close
      repaired = repaired.replace(/,\s*$/, '')

      // Close any open string first (naive: remove last unclosed quote line)
      if ((repaired.match(/"/g) || []).length % 2 !== 0) {
        const lastQuote = repaired.lastIndexOf('"')
        repaired = repaired.substring(0, lastQuote)
      }

      // Close any open object
      if (!repaired.endsWith('}') && repaired.includes('{')) {
        repaired += '}'
      }

      // Close the questions array and root object if needed
      if (!repaired.endsWith(']') && repaired.includes('[')) {
        repaired += ']'
      }
      if (!repaired.endsWith('}')) {
        repaired += '}'
      }

      const parsed = JSON.parse(repaired)
      console.warn(`[AI Router] Repaired truncated JSON for ${feature} — recovered ${parsed.questions?.length ?? 0} questions.`)
      return deepStripMarkdown(parsed)
    } catch (repairError) {
      console.error(`[AI Router] JSON repair also failed for ${feature}:`, repairError)
    }
    // ── End repair ──────────────────────────────────────────────────────────

    // Never hand callers an empty object: they would save it as if it were real content
    throw new Error('The AI response could not be read. Please try again.')
  }
}

// ─── Vision (Mistral only) ────────────────────────────────────────────────────
// Mistral Small reads images natively (successor to Pixtral), via the chat endpoint

export async function visionExtractText(imageBase64: string): Promise<string> {
  const response = await fetch(`${API_BASE}/mistral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MISTRAL_VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract all handwritten or typed text from this image. If it is a nursing or medical diagram, describe the key concepts clearly. Output ONLY the extracted text and concepts.' },
            { type: 'image_url', image_url: imageBase64 },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    console.error('[AI Vision] Mistral OCR failed:', err.error || response.statusText)
    throw new Error(err.error || `Mistral vision error: ${response.statusText}`)
  }

  const data = await response.json()
  const raw = data.choices?.[0]?.message?.content || ''
  return raw.trim() || 'No text extracted.'
}
