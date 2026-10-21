import { useState } from 'react'
import { generateId } from '@/lib/utils'
import type { KnowledgeSearchResult } from '@/types'
import { callGeminiGroundedSearch, generateJSON } from '@/lib/ai'
import { usePersonalization } from '@/hooks/usePersonalization'
import { deepStripMarkdown } from '@/lib/markdown'

// Web search over trusted nursing/medical sources (Gemini with Google Search grounding)
export function useTrustedSourceSearch() {
  const { isFrance, greetingName } = usePersonalization()
  const [results, setResults] = useState<KnowledgeSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchedQuery, setSearchedQuery] = useState('')
  const [page, setPage] = useState(1)

  const search = async (q: string, isLoadMore = false) => {
    if (!q.trim()) return

    setIsSearching(true)
    setSearchedQuery(q)
    const currentPage = isLoadMore ? page + 1 : 1

    const systemPrompt = `
      You are a professional medical librarian and nursing search engine for ${isFrance ? 'France' : greetingName}, a nursing student.
      Search and retrieve ONLY evidence-based, peer-reviewed, and clinically trusted references.
      TRUSTED SOURCES: WHO, CDC, NIH, NCBI, PubMed, Cochrane, Mayo Clinic, Medscape, ANA, NCSBN, NurseLabs, Drugs.com, FDA, DOH Philippines, PNA.
      NEVER include unreliable blogs, AI spam, or unverified claims.
    `

    const apply = (found: KnowledgeSearchResult[]) => {
      const clean = found.map(r => ({ ...r, title: deepStripMarkdown(r.title), description: deepStripMarkdown(r.description) }))
      setResults(prev => isLoadMore ? [...prev, ...clean] : clean)
      setPage(currentPage)
    }

    try {
      // Primary: Gemini with Google Search grounding — real web results with real URLs
      const groundedResults = await callGeminiGroundedSearch(q, systemPrompt, currentPage)
      if (groundedResults.length > 0) {
        apply(groundedResults.map(r => ({ ...r, id: generateId() })) as KnowledgeSearchResult[])
        return
      }

      // Fallback: plain AI JSON if Gemini grounding returns nothing
      console.warn('[Trusted Sources] Falling back to AI JSON generation')
      const prompt = `
        Search query: ${q} — Page ${currentPage}
        Generate 8-10 evidence-based nursing references for ${greetingName}.
        Output strictly as JSON:
        { results: [{ title: ..., description: ..., source: ..., url: ..., search_url: ..., category: nursing, is_trusted: true }] }
      `
      const response = await generateJSON(prompt, systemPrompt, 'knowledge')
      apply((response.results || []).map((r: any) => ({ ...r, id: generateId() })) as KnowledgeSearchResult[])
    } catch (error) {
      console.error('Trusted source search error:', error)
      if (!isLoadMore) setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  return { results, isSearching, searchedQuery, search }
}
