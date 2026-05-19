import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Leaf, 
  ExternalLink, 
  BookOpen, 
  ShieldCheck, 
  ArrowRight,
  Filter,
  Sparkles
} from 'lucide-react'
import { cn, generateId } from '@/lib/utils'
import type { KnowledgeSearchResult } from '@/types'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { Check, Heart } from 'lucide-react'
import { callGeminiGroundedSearch, generateJSON } from '@/lib/groq'
import { usePersonalization } from '@/hooks/usePersonalization'

export default function KnowledgeGardenPage() {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<KnowledgeSearchResult[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [page, setPage] = useState(1)
  const { savedKnowledge, saveKnowledge, removeKnowledge } = useStudyBoxStore()
  
  const { isFrance, aiAssistantName, greetingName, knowledgeGardenName } = usePersonalization()
 
  const handleSearch = async (e?: React.FormEvent, isLoadMore = false) => {
    if (e) e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    const currentPage = isLoadMore ? page + 1 : 1

    const systemPrompt = `
      You are a professional medical librarian and nursing search engine for ${isFrance ? 'France' : greetingName}, a nursing student.
      Search and retrieve ONLY evidence-based, peer-reviewed, and clinically trusted references.
      TRUSTED SOURCES: WHO, CDC, NIH, NCBI, PubMed, Cochrane, Mayo Clinic, Medscape, ANA, NCSBN, NurseLabs, Drugs.com, FDA, DOH Philippines, PNA.
      NEVER include unreliable blogs, AI spam, or unverified claims.
    `

    try {
      // Primary: Gemini with Google Search grounding — real web results with real URLs
      const groundedResults = await callGeminiGroundedSearch(query, systemPrompt, currentPage)

      if (groundedResults.length > 0) {
        const newResults = groundedResults.map(r => ({ ...r, id: generateId() })) as KnowledgeSearchResult[]
        if (isLoadMore) {
          setResults(prev => [...prev, ...newResults])
          setPage(currentPage)
        } else {
          setResults(newResults)
          setPage(1)
        }
        return
      }

      // Fallback: Groq JSON if Gemini grounding returns nothing
      console.warn('[Knowledge Garden] Falling back to Groq JSON generation')
      const prompt = `
        Search query: ${query} — Page ${currentPage}
        Generate 8-10 evidence-based nursing references for ${greetingName}.
        Output strictly as JSON:
        { results: [{ title: ..., description: ..., source: ..., url: ..., search_url: ..., category: nursing, is_trusted: true }] }
      `
      const response = await generateJSON(prompt, systemPrompt, 'knowledge')
      const newResults = (response.results || []).map((r: any) => ({ ...r, id: generateId() })) as KnowledgeSearchResult[]
      if (isLoadMore) {
        setResults(prev => [...prev, ...newResults])
        setPage(currentPage)
      } else {
        setResults(newResults)
        setPage(1)
      }
    } catch (error) {
      console.error('Knowledge Garden Search Error:', error)
      if (!isLoadMore) setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const categories = [
    { id: 'all', label: 'All Garden', icon: Leaf },
    { id: 'nursing', label: 'Nursing', icon: ShieldCheck },
    { id: 'pharmacology', label: 'Pharmacology', icon: BookOpen },
    { id: 'research', label: 'Medical Research', icon: Search },
    { id: 'guidelines', label: 'Clinical Guidelines', icon: ShieldCheck },
    { id: 'local', label: 'PH Local', icon: Filter },
  ]

  return (
    <div className="page-container">
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-16 h-16 bg-[var(--secondary-bg)] text-[var(--pink)] rounded-[2rem] flex items-center justify-center mb-6 shadow-sm"
        >
          <Leaf size={32} />
        </motion.div>
        <h1 className="text-4xl font-bold mb-4 font-heading">{knowledgeGardenName} 🌷</h1>
        <p className="text-[var(--text-secondary)] text-lg">
          A calm and intelligent space for trusted nursing and medical knowledge. Curated by {aiAssistantName}.
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-12">
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--text-secondary)] group-focus-within:text-[var(--pink)] transition-colors">
            <Search size={20} />
          </div>
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Explain hypovolemic shock..."
            className="w-full bg-[var(--card)] border-2 border-[var(--border)] rounded-[2.5rem] py-5 pl-14 pr-32 focus:border-[var(--pink)] focus:ring-4 focus:ring-[var(--pink)]/10 outline-none transition-all text-lg shadow-sm"
          />
          <button 
            type="submit"
            disabled={isSearching}
            className="absolute right-3 top-2.5 bottom-2.5 px-6 bg-[var(--pink)] text-white rounded-full font-bold hover:bg-[var(--pink-hover)] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSearching ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>Search <ArrowRight size={18} /></>
            )}
          </button>
        </form>
        
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 border",
                activeCategory === cat.id 
                  ? "bg-[var(--pink)] text-white border-[var(--pink)] shadow-fn" 
                  : "bg-[var(--card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--pink)]/50"
              )}
            >
              <cat.icon size={14} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {isSearching ? (
            <motion.div 
              key="searching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-[var(--secondary-bg)] rounded-full animate-ping opacity-20"></div>
                <div className="absolute inset-0 flex items-center justify-center text-[var(--pink)]">
                  <Sparkles size={40} className="animate-pulse-soft" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">{aiAssistantName} is tending the garden... {isFrance ? '🌷' : '🌱'}</h3>
              <p className="text-[var(--text-secondary)]">Curating trusted nursing references for you.</p>
            </motion.div>
          ) : results.length > 0 ? (
            results.map((result, i) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="fn-card p-6 group hover:border-[var(--pink)] transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-[var(--secondary-bg)] text-[var(--pink)] rounded-full">
                        {result.category}
                      </span>
                      {result.is_trusted && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--success)] uppercase tracking-widest">
                          <ShieldCheck size={12} /> Trusted Source
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-[var(--pink)] transition-colors">{result.title}</h3>
                    <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
                      {result.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <a 
                        href={result.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5 shadow-fn"
                      >
                        Read Article <ExternalLink size={14} />
                      </a>
                      <a 
                        href={(result as any).search_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5"
                      >
                        Search {result.source} <Search size={14} />
                      </a>
                      <button 
                        onClick={() => savedKnowledge.some(k => k.id === result.id) ? removeKnowledge(result.id) : saveKnowledge(result)}
                        className={cn(
                          "btn-secondary px-4 py-2 text-xs flex items-center gap-2",
                          savedKnowledge.some(k => k.id === result.id) && "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30"
                        )}
                      >
                        {savedKnowledge.some(k => k.id === result.id) ? (
                          <><Check size={12} /> Saved</>
                        ) : (
                          <><Heart size={12} /> Save Reference</>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-[var(--secondary-bg)] rounded-2xl flex items-center justify-center text-[var(--pink)] opacity-30 group-hover:opacity-100 transition-opacity">
                    <BookOpen size={24} />
                  </div>
                </div>
              </motion.div>
            ))
          ) : query && !isSearching ? (
             <div className="text-center py-20 fn-card border-dashed">
                <p className="text-lg font-bold mb-2">No references found 🥀</p>
                <p className="text-[var(--text-secondary)]">Try searching for broader nursing concepts or diseases.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: 'Global Trusted Sources', desc: 'WHO, CDC, NIH, PubMed, Mayo Clinic, Cleveland Clinic', icon: ShieldCheck },
                { title: 'Nursing & Local (PH)', desc: 'ANA, NCSBN, NurseLabs, DOH Philippines, PNA, PRC', icon: BookOpen },
              ].map((box, i) => (
                <div key={i} className="fn-card p-6 bg-[var(--secondary-bg)]/20 border-dashed">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[var(--pink)] mb-4 shadow-sm">
                    <box.icon size={20} />
                  </div>
                  <h4 className="font-bold mb-2 text-sm">{box.title}</h4>
                  <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed uppercase tracking-widest font-bold">{box.desc}</p>
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {results.length > 0 && !isSearching && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center mt-12 pb-12"
          >
            <button 
              onClick={() => handleSearch(undefined, true)}
              className="btn-secondary px-10 py-4 rounded-full flex items-center gap-3 group hover:border-[var(--pink)] transition-all"
            >
              <Sparkles size={18} className="text-[var(--pink)] group-hover:scale-125 transition-transform" />
              <span className="font-bold">Load More References</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
