import { useState, useRef, useEffect } from 'react'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { useReviewerStore } from '@/stores/reviewerStore'
import { useNavigate, useLocation } from 'react-router-dom'
import type { StudyBoxItem, Topic } from '@/types'
import {
  UploadSimple as Upload, FileText, MagnifyingGlass as Search, Funnel as Filter, Trash as Trash2, Heart, Camera,
  Image as ImageIcon, Sparkle as Sparkles, Brain as BrainCircuit, BookOpen,
  CircleNotch as Loader2, DownloadSimple as Download, ArrowsClockwise as RefreshCw, ArrowSquareOut as ExternalLink,
  Globe, X, Archive as ArchiveIcon, Folder, CaretRight, Printer, PresentationChart, Books, Check,
} from '@phosphor-icons/react'
import type { IconProps } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { motion, AnimatePresence } from 'framer-motion'
import { formatRelativeDate, cn } from '@/lib/utils'
import CameraModal from '@/components/shared/CameraModal'
import MarkdownText from '@/components/shared/MarkdownText'
import { generateCompletion } from '@/lib/ai'
import { extractTextFromFile } from '@/lib/extractor'
import { usePersonalization } from '@/hooks/usePersonalization'
import { tintFor } from '@/lib/tints'

const SORT_OPTIONS = [['newest', 'Newest first'], ['oldest', 'Oldest first'], ['az', 'Name A–Z']] as const
const TYPE_OPTIONS = [['all', 'All types'], ['pdf', 'PDF'], ['docx', 'Word'], ['pptx', 'PowerPoint'], ['image', 'Images'], ['txt', 'Text']] as const

const displayName = (item: StudyBoxItem) =>
  item.file_name.replace(/^\[(Reference|Case Study|Pathophysiology)\] /, '').replace(/\.txt$/, '')

// Icon for a material: photo, saved web reference, slides, or document
function ItemTypeIcon({ item, ...props }: { item: StudyBoxItem } & IconProps) {
  if (item.file_type === 'image') return <ImageIcon {...props} />
  if (item.file_name.startsWith('[Reference]')) return <Globe {...props} />
  if (item.file_type === 'pptx') return <PresentationChart {...props} />
  return <FileText {...props} />
}

export default function StudyBoxPage() {
  const {
    items,
    topics,
    isUploading,
    isProcessing,
    addItem,
    removeItem,
    toggleFavorite,
    getFilteredItems,
    searchQuery,
    setSearchQuery,
    selectedTopic,
    setSelectedTopic,
    selectedItemIds,
    toggleItemSelection,
    clearSelection,
    addGeneratedItem
  } = useStudyBoxStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const filteredItems = getFilteredItems()

  // Filter panel state
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az'>('newest')
  const [showFavorites, setShowFavorites] = useState(false)
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all')
  const filterRef = useRef<HTMLDivElement>(null)

  // Close filter on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false)
      }
    }
    if (isFilterOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isFilterOpen])

  // Compute displayed items applying local filters on top of store filters
  const displayedItems = (() => {
    let list = [...filteredItems]
    if (showFavorites) list = list.filter(i => i.is_favorite)
    if (fileTypeFilter !== 'all') list = list.filter(i => i.file_type === fileTypeFilter)
    if (sortBy === 'newest') list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    else if (sortBy === 'oldest') list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    else if (sortBy === 'az') list.sort((a, b) => a.file_name.localeCompare(b.file_name))
    return list
  })()

  const activeFilterCount = (showFavorites ? 1 : 0) + (fileTypeFilter !== 'all' ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0)

  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<StudyBoxItem | null>(null)

  const { isFrance, aiAssistantName, studyBoxName, greetingName } = usePersonalization()
  const { generatePresentation, generateReviewer, isGeneratingReviewer, isGeneratingPresentation } = useReviewerStore()
  const navigate = useNavigate()
  const location = useLocation()

  // Auto-open item if navigated here from dashboard with openItemId state
  useEffect(() => {
    const openItemId = (location.state as any)?.openItemId
    if (openItemId) {
      const target = items.find(i => i.id === openItemId)
      if (target) {
        setSelectedItem(target)
        // Clear the state so re-visiting doesn't re-open
        window.history.replaceState({}, '')
      }
    }
  }, [location.state, items])

  const handleCapture = async (base64Image: string) => {
    setIsCameraOpen(false)
    const res = await fetch(base64Image)
    const blob = await res.blob()
    const file = new File([blob], `captured_note_${Date.now()}.jpg`, { type: 'image/jpeg' })
    await addItem(file, selectedTopic || undefined)
  }

  const handleGeneratePresentation = async () => {
    if (selectedItemIds.length === 0) return
    const firstItem = items.find(i => i.id === selectedItemIds[0])
    await generatePresentation(selectedItemIds, firstItem?.topic_id || undefined)
    clearSelection()
    navigate('/reviewer-library')
  }

  const handleGenerateReviewer = async () => {
    if (selectedItemIds.length === 0) return
    const firstItem = items.find(i => i.id === selectedItemIds[0])
    await generateReviewer(selectedItemIds, firstItem?.topic_id || undefined)
    clearSelection()
    navigate('/reviewer-library')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      await addItem(file, selectedTopic || undefined)
    }
    // reset so same files can be re-uploaded if needed
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const topicTitle = (id: string | null) => topics.find(t => t.id === id)?.title || 'General'
  const activeTopic = topics.find(t => t.id === selectedTopic) || null
  // Topic folders only show on the top-level view, not while searching or inside a topic
  const showFolders = !selectedTopic && !searchQuery.trim() && items.length > 0
  const topicFolders = topics
    .map(t => ({ topic: t, count: items.filter(i => i.topic_id === t.id).length }))
    .filter(f => f.count > 0)
    .sort((a, b) => b.count - a.count)
  const busy = isUploading || isProcessing

  return (
    <div className="page-container max-w-7xl">
      <PageHeader
        icon={ArchiveIcon}
        title={studyBoxName}
        subtitle={isFrance ? 'Upload, organize, and turn your notes into smart reviewers, babe!' : 'Upload, organize, and turn your nursing notes into smart reviewers.'}
        actions={<>
          <button onClick={() => setIsCaseModalOpen(true)} disabled={busy} className="btn-secondary px-4 py-2.5 text-sm flex items-center gap-2" title="Generate a case study or pathophysiology guide">
            <Sparkles size={16} /> <span className="hidden sm:inline">Case Study</span>
          </button>
          <button onClick={() => setIsCameraOpen(true)} disabled={busy} className="btn-secondary px-4 py-2.5 text-sm flex items-center gap-2" title="Take a photo of your notes">
            <Camera size={16} /> <span className="hidden sm:inline">Photo</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={busy} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
            <Upload size={16} weight="bold" /> Upload
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
        </>}
      />

      {/* Upload / processing progress */}
      <AnimatePresence>
        {busy && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden">
            <div className="fn-card p-4 flex items-center gap-4 bg-[var(--rose-soft)]">
              <div className="w-11 h-11 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--pink)] shrink-0">
                <Loader2 size={20} className="animate-spin" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{isUploading ? 'Uploading your study materials…' : `${aiAssistantName} is reading your notes…`}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {isUploading ? (isFrance ? 'Almost there, babe!' : 'Almost there!') : 'Extracting text and sorting it into the right topic.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-full px-4 py-2.5 focus-within:ring-2 focus-within:ring-th-pink/25">
          <Search size={17} className="text-[var(--text-secondary)] shrink-0" />
          <input
            type="text"
            placeholder={activeTopic ? `Search in ${activeTopic.title}…` : 'Search your materials…'}
            className="bg-transparent outline-none text-sm w-full placeholder:text-th-text-secondary/70"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} aria-label="Clear search" className="text-[var(--text-secondary)] hover:text-[var(--pink)]"><X size={15} /></button>}
        </div>

        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(prev => !prev)}
            className={cn('btn-secondary w-full sm:w-auto px-5 py-2.5 text-sm flex items-center justify-center gap-2', activeFilterCount > 0 && 'border-[var(--pink)]')}
          >
            <Filter size={16} /> Filters
            {activeFilterCount > 0 && <span className="min-w-[18px] h-[18px] px-1 bg-[var(--pink)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>}
          </button>

          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-2 w-60 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-fn-lg p-3 z-50 origin-top-right space-y-3"
              >
                <FilterGroup label="Sort by" options={SORT_OPTIONS} value={sortBy} onChange={v => setSortBy(v as typeof sortBy)} />
                <FilterGroup label="Show" options={[['all', 'All files'], ['fav', 'Favorites only']] as const} value={showFavorites ? 'fav' : 'all'} onChange={v => setShowFavorites(v === 'fav')} />
                <FilterGroup label="File type" options={TYPE_OPTIONS} value={fileTypeFilter} onChange={setFileTypeFilter} />
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setSortBy('newest'); setShowFavorites(false); setFileTypeFilter('all') }}
                    className="w-full py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--pink)] rounded-xl hover:bg-[var(--rose-soft)]"
                  >
                    Reset filters
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Breadcrumb when inside a topic */}
      {activeTopic && (
        <div className="flex items-center gap-1.5 text-sm mb-4">
          <button onClick={() => setSelectedTopic(null)} className="text-[var(--text-secondary)] hover:text-[var(--pink)]">All topics</button>
          <CaretRight size={13} className="text-[var(--text-secondary)]" />
          <span className="font-semibold text-[var(--text)]">{activeTopic.title}</span>
          <span className="text-[var(--text-secondary)]">· {displayedItems.length} material{displayedItems.length === 1 ? '' : 's'}</span>
        </div>
      )}

      {/* Topic folders */}
      {showFolders && topicFolders.length > 0 && (
        <section className="mb-7">
          <h2 className="text-[15px] font-heading font-semibold mb-3 flex items-center gap-2"><Folder size={16} className="text-[var(--pink)]" /> Topics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {topicFolders.map(({ topic, count }) => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id)}
                className="fn-card overflow-hidden text-left group hover:border-[var(--accent)]"
              >
                <div className={`h-16 bg-gradient-to-br ${tintFor(topic.id)} flex items-center justify-center`}>
                  <Folder size={26} weight="duotone" className="text-th-pink/70 group-hover:scale-110 transition-transform" />
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[13px] font-semibold line-clamp-1">{topic.title}</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">{count} material{count === 1 ? '' : 's'}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Materials */}
      {displayedItems.length > 0 ? (
        <section>
          {showFolders && (
            <h2 className="text-[15px] font-heading font-semibold mb-3 flex items-center gap-2"><BookOpen size={16} className="text-[var(--pink)]" /> All materials</h2>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {displayedItems.map((item) => {
              const selected = selectedItemIds.includes(item.id)
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={item.id}
                  className={cn('fn-card group relative overflow-hidden cursor-pointer hover:border-[var(--accent)]', selected && 'ring-2 ring-[var(--pink)] border-[var(--pink)]')}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="aspect-[16/10] relative overflow-hidden">
                    {item.preview_image ? (
                      <img src={item.preview_image} alt={item.file_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${tintFor(item.id)}`}>
                        <ItemTypeIcon item={item} size={34} weight="light" className="text-th-pink/70 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); toggleItemSelection(item.id) }}
                      aria-label={selected ? 'Deselect' : 'Select for quiz or reviewer'}
                      className={cn(
                        'absolute top-2.5 left-2.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                        selected ? 'bg-[var(--pink)] border-[var(--pink)] text-white' : 'bg-th-card/80 border-[var(--card)] text-transparent sm:opacity-0 group-hover:opacity-100'
                      )}
                    >
                      <Check size={13} weight="bold" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id) }}
                      aria-label={item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                      className={cn(
                        'absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-th-card/85 flex items-center justify-center transition-all',
                        item.is_favorite ? 'text-[var(--pink)]' : 'text-[var(--text-secondary)] sm:opacity-0 group-hover:opacity-100'
                      )}
                    >
                      <Heart size={14} weight={item.is_favorite ? 'fill' : 'regular'} />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-[13px] font-semibold line-clamp-1 group-hover:text-[var(--pink)] transition-colors">{displayName(item)}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">
                        {!activeTopic && <>{topicTitle(item.topic_id)} · </>}{formatRelativeDate(item.created_at)}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm(`Delete “${displayName(item)}”?`)) removeItem(item.id) }}
                        className="p-1 -mr-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-th-error/10 sm:opacity-0 group-hover:opacity-100 transition-all"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>
      ) : (
        <div className="fn-card flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center mb-4">
            <ArchiveIcon size={30} weight="duotone" />
          </div>
          {items.length === 0 ? (
            <>
              <h3 className="font-heading font-semibold">Your {studyBoxName} is empty</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm mt-1 mb-5">Upload lecture notes, handouts, PDFs or photos of your notes to start reviewing.</p>
              <button onClick={() => fileInputRef.current?.click()} className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2"><Upload size={16} /> Upload your first note</button>
            </>
          ) : (
            <>
              <h3 className="font-heading font-semibold">Nothing matches</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Try a different search, topic or filter.</p>
            </>
          )}
        </div>
      )}

      {/* Selection bar — turn selected materials into a quiz, reviewer or slides */}
      <AnimatePresence>
        {selectedItemIds.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-2xl"
          >
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-full shadow-fn-lg pl-3 pr-2 py-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--pink)] text-white flex items-center justify-center text-sm font-semibold shrink-0">{selectedItemIds.length}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">selected</p>
                <button onClick={clearSelection} className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--pink)]">Clear</button>
              </div>
              <button
                onClick={() => { navigate('/quiz', { state: { selectedItemIds } }); clearSelection() }}
                className="btn-secondary px-3 sm:px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <BrainCircuit size={14} /> Quiz
              </button>
              <button
                onClick={handleGeneratePresentation}
                disabled={isGeneratingReviewer || isGeneratingPresentation}
                className="btn-secondary px-3 sm:px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <PresentationChart size={14} /> {isGeneratingPresentation ? 'Making…' : 'Slides'}
              </button>
              <button
                onClick={handleGenerateReviewer}
                disabled={isGeneratingReviewer || isGeneratingPresentation}
                className="btn-primary px-3 sm:px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <Sparkles size={14} /> {isGeneratingReviewer ? 'Making…' : 'Reviewer'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCameraOpen && (
          <CameraModal onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCaseModalOpen && (
          <CaseStudyModal
            onClose={() => setIsCaseModalOpen(false)}
            addGeneratedItem={addGeneratedItem}
            greetingName={greetingName}
            aiAssistantName={aiAssistantName}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedItem && (
          <StudyBoxDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            topics={topics}
            removeItem={removeItem}
            navigate={navigate}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function FilterGroup({ label, options, value, onChange }: {
  label: string
  options: readonly (readonly [string, string])[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1 px-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map(([val, text]) => (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
              value === val ? 'bg-[var(--pink)] border-[var(--pink)] text-white' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]'
            )}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

function StudyBoxDetailModal({ item, onClose, topics, removeItem, navigate }: {
  item: StudyBoxItem,
  onClose: () => void,
  topics: Topic[],
  removeItem: (id: string) => void,
  navigate: any
}) {
  const storeItem = useStudyBoxStore(state => state.items.find(i => i.id === item.id))
  const currentItem = storeItem || item

  const { isFrance, greetingName, aiAssistantName } = usePersonalization()

  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const { generateReviewer, generatePresentation, isGeneratingReviewer, isGeneratingPresentation } = useReviewerStore()

  const handleModalGenerateReviewer = async () => {
    await generateReviewer([currentItem.id], currentItem.topic_id || undefined)
    onClose()
    navigate('/reviewer-library')
  }

  const handleModalGeneratePresentation = async () => {
    await generatePresentation([currentItem.id], currentItem.topic_id || undefined)
    onClose()
    navigate('/reviewer-library')
  }

  const handleDownloadSummary = () => {
    const element = document.getElementById('doc-unos-love-notes-card')
    if (!element) return
    
    // 1. Temporarily hide the download button inside the card so it doesn't print
    const downloadBtn = element.querySelector('.download-notes-btn') as HTMLElement
    if (downloadBtn) {
      downloadBtn.style.setProperty('display', 'none', 'important')
    }
    
    // 2. Set beautiful PDF options
    const opt = {
      margin:       [10, 10, 10, 10], // Margin top, left, bottom, right in mm
      filename:     `${currentItem.file_name.split('.')[0]}_Doc_Unos_Love_Notes.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2.5, 
        useCORS: true, 
        logging: false, 
        scrollY: 0, 
        scrollX: 0 
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    
    const runGeneration = () => {
      (window as any).html2pdf().from(element).set(opt).save().then(() => {
        // Restore button visibility
        if (downloadBtn) {
          downloadBtn.style.removeProperty('display')
        }
      }).catch((err: any) => {
        console.error("PDF generation failed:", err)
        if (downloadBtn) {
          downloadBtn.style.removeProperty('display')
        }
      })
    }

    // 3. Load script dynamically if not present
    if ((window as any).html2pdf) {
      runGeneration()
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
      script.onload = () => {
        runGeneration()
      }
      document.head.appendChild(script)
    }
  }

  const getTopicTitle = (topicId: string | null) => {
    if (!topicId) return 'General'
    return topics.find(t => t.id === topicId)?.title || 'General'
  }

  const handleDelete = () => {
    removeItem(currentItem.id)
    onClose()
  }

  const handleStartQuiz = () => {
    navigate('/quiz', {
      state: {
        preSelectedTopic: currentItem.file_name.split('.')[0],
        preSelectedText: currentItem.extracted_text,
        preSelectedName: currentItem.file_name
      }
    })
    onClose()
  }

  const markdownToHtml = (md: string) => {
    return md
      .split('\n')
      .map(line => {
        const trimmed = line.trim()
        if (!trimmed) return '<div style="height:8px"></div>'
        if (/^[A-Z][A-Z0-9\s&,()/-]+$/.test(trimmed) && trimmed.length > 3 && !trimmed.endsWith(':')) {
          return `<h2 style="font-size:15px;font-weight:700;color:#ff8fa3;margin:16px 0 6px">${trimmed}</h2>`
        }
        if (/^\d+[.)]\s/.test(trimmed)) {
          return `<div style="margin:0 0 3px 20px">${trimmed}</div>`
        }
        if (/^[-•]\s/.test(trimmed)) {
          return `<div style="margin:0 0 3px 20px">${trimmed.replace(/^[-•]\s*/, '• ')}</div>`
        }
        return `<p style="margin:0 0 4px">${trimmed}</p>`
      })
      .join('\n')
  }

  const getDocTitle = () => {
    return currentItem.file_name
      .replace('.txt', '')
      .replace('[Case Study] ', '')
      .replace('[Pathophysiology] ', '')
      .replace('[Reference] ', '')
  }

  const buildPrintContent = () => {
    const title = getDocTitle()
    const isGenerated = currentItem.tags?.includes('generated')
    const typeLabel = isGenerated && currentItem.tags?.includes('case-study') ? 'CASE STUDY' :
                      isGenerated && currentItem.tags?.includes('pathophysiology') ? 'PATHOPHYSIOLOGY GUIDE' : 'DOCUMENT'

    const originalHtml = markdownToHtml(currentItem.extracted_text || '')
    const summaryHtml = currentItem.summary ? markdownToHtml(currentItem.summary) : ''
    const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

    return `
      <div class="print-page">
        <div class="print-header">
          <div class="type-badge">${typeLabel}</div>
          <h1 class="doc-title">${title}</h1>
          <p class="doc-date">${today}</p>
        </div>

        <div class="doc-card">
          <div class="card-label">Original Document</div>
          <div class="card-body">${originalHtml}</div>
          <div class="card-footer">
            <span>Type: ${currentItem.file_type}</span>
            <span>${currentItem.extracted_text?.split(/\s+/).length || 0} Words</span>
          </div>
        </div>

        ${summaryHtml ? `
        <div class="summary-card">
          <div class="card-label summary-label">${isFrance ? "Doc Uno's Clinical Notes" : `${aiAssistantName}'s Clinical Notes`}</div>
          <div class="card-body">${summaryHtml}</div>
          <div class="signature">
            Made with &#10084;&#65039; by ${isFrance ? 'Doc Uno for France' : aiAssistantName}
            <span class="signature-date">${today}</span>
          </div>
        </div>
        ` : ''}
      </div>
    `
  }

  const handlePrint = () => {
    const w = window.open('', '_blank')
    if (!w) return

    const content = buildPrintContent()
    const assistantName = isFrance ? 'Doc Uno' : aiAssistantName

    w.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${getDocTitle()} - ${assistantName}</title>
<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #fef6f8; color: #1a1a2e; line-height: 1.7;
}
.print-page { max-width: 750px; margin: 0 auto; }
.print-header { text-align: center; margin-bottom: 24px; }
.type-badge {
  display: inline-block; background: #ff8fa3; color: white;
  font-size: 11px; font-weight: 800; letter-spacing: 2px;
  text-transform: uppercase; padding: 6px 20px; border-radius: 20px;
  margin-bottom: 10px;
}
.doc-title {
  font-size: 24px; font-weight: 800; margin: 0 0 4px;
  background: linear-gradient(135deg, #ff8fa3, #f7a8b8);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.doc-date { font-size: 12px; color: #999; font-weight: 600; margin: 0; letter-spacing: 0.5px; }
.doc-card, .summary-card {
  background: white; border: 1px solid #f0e0e4;
  border-radius: 16px; padding: 28px 32px; margin-bottom: 20px;
}
.summary-card {
  background: linear-gradient(135deg, #fff9fa, #fff0f2);
  border-color: #ffcad3; border-width: 2px;
}
.card-label {
  font-size: 10px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 2px; color: #aaa;
  margin-bottom: 14px; padding-bottom: 10px;
  border-bottom: 1px solid #f0e0e4;
}
.summary-label { color: #ff8fa3; border-bottom-color: #ffcad3; }
.card-body { font-size: 14px; color: #333; }
.section-heading {
  font-size: 15px; font-weight: 700; color: #ff8fa3;
  margin: 18px 0 6px; letter-spacing: 0.3px;
}
.section-heading:first-child { margin-top: 0; }
.text-paragraph { margin: 0 0 4px; }
.list-item { margin: 0 0 3px 20px; }
.card-footer {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1px; color: #bbb;
  padding-top: 14px; margin-top: 18px;
  border-top: 1px solid #f0e0e4;
  display: flex; justify-content: space-between;
}
.signature {
  margin-top: 20px; padding-top: 14px;
  border-top: 1px solid #ffcad3; text-align: center;
  font-size: 12px; font-weight: 700; color: #ff8fa3;
}
.signature-date { font-size: 10px; color: #bbb; font-weight: 600; display: block; margin-top: 4px; }
@media print {
  @page { margin: 15mm; }
  body { background: white; padding: 0 !important; }
  .doc-card, .summary-card { box-shadow: none; break-inside: avoid; }
}
</style></head><body>${content}</body></html>`)
    w.document.close()
    w.document.addEventListener('DOMContentLoaded', () => w.print())
  }

  const handleDownloadFullPDF = () => {
    const content = buildPrintContent()
    const assistantName = isFrance ? 'Doc Uno' : aiAssistantName

    const containerId = 'pdf-capture-container'
    let container = document.getElementById(containerId) as HTMLElement
    if (!container) {
      container = document.createElement('div')
      container.id = containerId
      document.body.appendChild(container)
    }
    container.style.cssText = `position:fixed;top:0;left:0;width:800px;background:#fef6f8;padding:24px 20px;z-index:999999;opacity:0;pointer-events:none;overflow:visible`
    container.innerHTML = content

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `${getDocTitle().replace(/\s+/g, '_')}_${assistantName.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, logging: false, width: 800 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    const run = () => {
      (window as any).html2pdf().from(container).set(opt).save().then(() => {
        container!.style.display = 'none'
        container!.innerHTML = ''
      }).catch((err: any) => {
        console.error('PDF generation failed:', err)
        container!.style.display = 'none'
        container!.innerHTML = ''
      })
    }

    if ((window as any).html2pdf) {
      run()
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
      script.onload = run
      document.head.appendChild(script)
    }
  }

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true)
    setSummaryError(null)
    try {
      let summaryPrompt = ""
      if (isFrance) {
        summaryPrompt = `
          You are Doc Uno, a loving and extremely smart nursing tutor helping your girlfriend France study.
          Review the following document text and write a HIGHLY DETAILED, comprehensive, and clinically rigorous nursing study guide/summary of this material.
          Do not output a simple or brief summary. Ensure it provides extensive information suitable for both clinical practice and high-stakes board exams like the PNLE.
          
          CUTE AESTHETIC & PERSONALITY RULE:
          - Do not use emojis anywhere in the output.
          - Speak to her in a sweet, supportive Taglish boyfriend tone. Call her "babe", cheer her on, and make the review feel like a cozy, romantic, and extremely smart study date!
          
          CRITICAL FORMATTING RULE:
          - Do NOT use markdown tables (e.g. | BP | Stage | etc.) under any circumstances. If you need to make comparisons or show lists of stages/diagnostics, present them as clean bullet points, bold key-value lines, or indented lists. Raw tables are hard to read, so they must be avoided.
          
          Use markdown formatting and structure it with:
          1. **Clinical Pathophysiology & Concepts Overview**: Exhaustive, deep-dive description of the disease/topic process, mechanisms, anatomical changes, etiology, and why they occur.
          2. **High-Yield Clinical Assessment & Laboratory Findings**: Complete breakdown of physical assessments (early vs late signs, priority assessments), diagnostics, and critical lab values she must look out for.
          3. **Pharmacological & Medical Management**: Critical medications, drug classes, therapeutic actions, adverse effects, and nursing interventions during drug administration.
          4. **Exhaustive Nursing Care Priorities & Scientific Rationales**: Detailed step-by-step nursing interventions (assess, do, teach) with clinical rationales.
          5. **Doc Uno's PNLE Board Appraisal & Study Pearls**: Specific board-exam style clinical focus scenarios, SATA concepts, and test-taking tips, written in a loving boyfriend tone (call her "babe", cheer her on!).
          
          Text to summarize:
          "${currentItem.extracted_text.substring(0, 6000)}"
        `
      } else {
        summaryPrompt = `
          You are ${aiAssistantName}, an expert clinical nursing instructor.
          Review the following document text and write a HIGHLY DETAILED, comprehensive, and clinically rigorous nursing study guide/summary of this material.
          Do not output a simple or brief summary. Ensure it provides extensive, board-ready clinical reviews.
          
          PROFESSIONAL ENCOURAGING RULE:
          - Do not use emojis anywhere in the output.
          - Address the student as ${greetingName}. Keep the tone extremely professional, warm, highly intelligent, and focused on helping them excel on the board exams.
          - Absolutely NO romantic references or boyfriend endearments.
          
          CRITICAL FORMATTING RULE:
          - Do NOT use markdown tables (e.g. | BP | Stage | etc.) under any circumstances. If you need to make comparisons or show lists of stages/diagnostics, present them as clean bullet points, bold key-value lines, or indented lists. Raw tables are hard to read, so they must be avoided.
          
          Use markdown formatting and structure it with:
          1. **Clinical Pathophysiology & Concepts Overview**: Exhaustive, deep-dive description of the disease/topic process, mechanisms, anatomical changes, etiology, and why they occur.
          2. **High-Yield Clinical Assessment & Laboratory Findings**: Complete breakdown of physical assessments (early vs late signs, priority assessments), diagnostics, and critical lab values.
          3. **Pharmacological & Medical Management**: Critical medications, drug classes, therapeutic actions, adverse effects, and nursing interventions during drug administration.
          4. **Exhaustive Nursing Care Priorities & Scientific Rationales**: Detailed step-by-step nursing interventions (assess, do, teach) with clinical rationales.
          5. **Board Appraisal & Study Pearls**: Specific board-exam style clinical focus scenarios, SATA concepts, and test-taking tips.
          
          Text to summarize:
          "${currentItem.extracted_text.substring(0, 6000)}"
        `
      }
      const summaryText = await generateCompletion(summaryPrompt, undefined, 'studybox')
      if (summaryText) {
        useStudyBoxStore.getState().updateSummary(currentItem.id, summaryText)
      } else {
        setSummaryError("Failed to generate summary.")
      }
    } catch (e) {
      console.error(e)
      setSummaryError(`Failed to connect to ${aiAssistantName}.`)
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  useEffect(() => {
    if (currentItem.file_name.startsWith('[Reference]')) {
      if (!currentItem.summary) {
        useStudyBoxStore.getState().updateSummary(currentItem.id, currentItem.extracted_text)
      }
      return
    }

    if (!currentItem.summary && currentItem.extracted_text && !currentItem.extracted_text.startsWith('[SYSTEM MESSAGE')) {
      handleGenerateSummary()
    }
  }, [currentItem.id])

  const [tab, setTab] = useState<'document' | 'guide'>('guide')
  const isReference = currentItem.file_name.startsWith('[Reference]')
  const wordCount = currentItem.extracted_text ? currentItem.extracted_text.split(/\s+/).length : 0
  const assistantLabel = isFrance ? 'Doc Uno' : aiAssistantName

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="bg-[var(--card)] w-full max-w-4xl h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-2xl shadow-fn-lg border border-[var(--border)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start gap-3.5 border-b border-[var(--border)]">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tintFor(currentItem.id)} border border-[var(--border)] text-[var(--pink)] flex items-center justify-center shrink-0`}>
            <ItemTypeIcon item={currentItem} size={22} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading font-semibold text-[16px] leading-snug line-clamp-2">{displayName(currentItem)}</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {getTopicTitle(currentItem.topic_id)} · {formatRelativeDate(currentItem.created_at)} · {wordCount.toLocaleString()} words
            </p>
          </div>
          <button onClick={onClose} className="btn-icon p-2 -mr-1" aria-label="Close"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 flex gap-1.5">
          {([['guide', `${assistantLabel}'s Study Guide`, Sparkles], ['document', isReference ? 'Reference Article' : 'Original Document', BookOpen]] as const).map(([id, label, TabIcon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors',
                tab === id ? 'bg-[var(--pink)] border-[var(--pink)] text-white' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]'
              )}
            >
              <TabIcon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {tab === 'document' ? (
            <div className="space-y-4 select-text">
              {currentItem.preview_image && (
                <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg)]">
                  <img src={currentItem.preview_image} alt={currentItem.file_name} className="w-full max-h-96 object-contain" />
                </div>
              )}

              {isReference && (() => {
                const text = currentItem.extracted_text || ''
                const sourceName = text.match(/^SOURCE:\s*(.+)/m)?.[1]?.trim()
                const sourceUrl = text.match(/^URL:\s*(.+)/m)?.[1]?.trim()
                if (!sourceUrl && !sourceName) return null
                return (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--rose-soft)] border border-[var(--border)]">
                    <Globe size={14} className="text-[var(--pink)] shrink-0" />
                    <span className="text-xs font-medium truncate flex-1">{sourceName || sourceUrl}</span>
                    {sourceUrl && (
                      <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-[var(--pink)] hover:underline flex items-center gap-1 shrink-0">
                        Open source <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                )
              })()}

              <div className="text-[14.5px] text-[var(--text)] leading-relaxed">
                <MarkdownText content={isReference ? (currentItem.extracted_text || '').replace(/^SOURCE:.*\nURL:.*\n?\n?/, '').trim() : currentItem.extracted_text} />
              </div>

              {currentItem.tags && currentItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {currentItem.tags.map((tag, idx) => (
                    <span key={idx} className="text-[11px] font-medium bg-[var(--rose-soft)] text-[var(--pink)] px-2.5 py-0.5 rounded-full border border-[var(--border)]">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div id="doc-unos-love-notes-card" className="select-text">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <img src={isFrance ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'} alt={aiAssistantName} className="w-9 h-9 rounded-full object-cover border border-[var(--border)]" />
                  <div>
                    <p className="text-sm font-semibold leading-tight">Clinical Summary & Study Guide</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">{isFrance ? "Doc Uno's Love Notes" : `${aiAssistantName}'s Clinical Notes`}</p>
                  </div>
                </div>
                {currentItem.summary && !isGeneratingSummary && (
                  <div className="flex gap-1.5 download-notes-btn">
                    <button onClick={handleGenerateSummary} className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5">
                      <RefreshCw size={13} /> Regenerate
                    </button>
                    <button onClick={handleDownloadSummary} className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5">
                      <Download size={13} /> Save PDF
                    </button>
                  </div>
                )}
              </div>

              {isGeneratingSummary ? (
                <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
                  <img src={isFrance ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'} alt={aiAssistantName} className="w-16 h-16 rounded-2xl object-cover border border-[var(--border)] animate-float" />
                  <p className="text-sm font-semibold">{isFrance ? 'Uno is studying your notes, babe…' : `${aiAssistantName} is studying your notes…`}</p>
                  <p className="text-xs text-[var(--text-secondary)] max-w-xs">Writing a study guide with key concepts, nursing priorities and board-exam pearls.</p>
                  <Loader2 size={18} className="animate-spin text-[var(--pink)]" />
                </div>
              ) : currentItem.summary ? (
                <div className="text-[14px] leading-relaxed text-[var(--text)]">
                  <MarkdownText content={currentItem.summary} />
                  <p className="mt-6 pt-4 border-t border-[var(--border)] text-center text-xs font-medium text-[var(--pink)]">
                    Made with by {isFrance ? 'Doc Uno for France' : aiAssistantName}
                  </p>
                </div>
              ) : summaryError ? (
                <div className="flex flex-col items-center py-10 text-center gap-3">
                  <p className="text-sm text-[var(--error)]">{summaryError}</p>
                  <button onClick={handleGenerateSummary} className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5"><RefreshCw size={13} /> Try again</button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-12 text-center gap-4">
                  <p className="text-sm text-[var(--text-secondary)] max-w-md">
                    {isFrance
                      ? 'No study guide yet. Let Doc Uno read this and pull out the board-exam concepts for you, babe!'
                      : `No study guide yet. Let ${aiAssistantName} read this and pull out the key concepts and board-exam priorities.`}
                  </p>
                  <button onClick={handleGenerateSummary} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2"><Sparkles size={15} /> Write study guide</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-3.5 border-t border-[var(--border)] flex items-center gap-2 overflow-x-auto">
          <button onClick={() => { if (confirm('Delete this material?')) handleDelete() }} className="btn-icon p-2 hover:text-[var(--error)] shrink-0" title="Delete" aria-label="Delete">
            <Trash2 size={18} />
          </button>
          <button onClick={handlePrint} className="btn-icon p-2 shrink-0" title="Print" aria-label="Print"><Printer size={18} /></button>
          <button onClick={handleDownloadFullPDF} className="btn-icon p-2 shrink-0" title="Download as PDF" aria-label="Download as PDF"><Download size={18} /></button>
          <div className="flex-1" />
          <button
            onClick={handleModalGeneratePresentation}
            disabled={isGeneratingReviewer || isGeneratingPresentation}
            className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5 shrink-0"
          >
            <PresentationChart size={14} /> {isGeneratingPresentation ? 'Making…' : 'Slides'}
          </button>
          <button
            onClick={handleModalGenerateReviewer}
            disabled={isGeneratingReviewer || isGeneratingPresentation}
            className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5 shrink-0"
          >
            <Books size={14} /> {isGeneratingReviewer ? 'Making…' : 'Reviewer'}
          </button>
          <button onClick={handleStartQuiz} className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5 shrink-0">
            <BrainCircuit size={14} /> Quiz me
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function CaseStudyModal({
  onClose,
  addGeneratedItem,
  greetingName,
  aiAssistantName
}: {
  onClose: () => void,
  addGeneratedItem: (title: string, content: string, type: 'case-study' | 'pathophysiology') => Promise<void>,
  greetingName: string,
  aiAssistantName: string
}) {
  const [topic, setTopic] = useState('')
  const [scenario, setScenario] = useState('')
  const [genType, setGenType] = useState<'case-study' | 'pathophysiology'>('case-study')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referenceFiles, setReferenceFiles] = useState<{ name: string, text: string | null, loading: boolean, error?: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) return
    setIsGenerating(true)
    setError(null)

    try {
      const referenceSection = referenceFiles
        .filter(f => f.text)
        .map(f => `\n--- Reference from "${f.name}" ---\n${f.text}\n--- End Reference ---`)
        .join('\n')

      let prompt = ''
      const trustedSources = `\nTRUSTED SOURCES (base ALL content on these references only):
- WHO (World Health Organization)
- CDC (Centers for Disease Control and Prevention)
- NIH / NCBI / PubMed
- Cochrane Library
- Mayo Clinic
- Medscape
- ANA (American Nurses Association)
- NCSBN (National Council of State Boards of Nursing)
- NurseLabs
- Drugs.com / FDA
- DOH Philippines / PNA (Philippine Nurses Association)
- Saunders Comprehensive Review for NCLEX-RN
- Brunner & Suddarth's Textbook of Medical-Surgical Nursing
- Lippincott Nursing textbooks

Cite the specific source for each lab value, diagnostic criterion, medication, and nursing intervention using parentheses like (Source Name). Include a REFERENCES section at the end listing all sources used. NEVER fabricate data or use non-authoritative sources.`

      if (genType === 'case-study') {
        prompt = `
          You are a professional clinical educator and nursing case analyst.
          Generate a textbook-grade, highly-detailed Nursing Case Study / Case Presentation for the topic: "${topic}".
          
          Scenario/Condition details provided by student:
          "${scenario || 'No custom scenario details provided.'}"
          ${referenceSection ? `\nReference materials provided by student (use these to tailor the content):\n${referenceSection}` : ''}
          ${trustedSources}
          
          STRUCTURE:
          Provide a complete, comprehensive document structured as follows (do NOT use any markdown #, ##, or ### headings, bold symbols like **, or backticks):
          
          CASE PROFILE & CLINICAL PRESENTATION
          Detailed profile of the patient (age, gender, history), chief complaint, and detailed narrative of the clinical scenario.
          
          NURSING PHYSICAL ASSESSMENT (BY SYSTEM)
          Exhaustive system-by-system findings relevant to the condition (Neurological, Cardiovascular, Respiratory, Gastrointestinal, Genitourinary, Integumentary).
          
          DIAGNOSTIC & LABORATORY MATRIX
          Main tests (labs, imaging, ECG, etc.) with values, interpretation, and nursing rationales for why they were ordered.
          
          PHARMACOLOGICAL & MEDICAL THERAPIES
          Active medications, intravenous fluids, and clinical treatments, specifying classification, mechanism, dosage, and nursing considerations.
          
          NURSING CARE PLAN (NCP)
          At least 3 specific nursing diagnoses, goals, evidence-based nursing interventions, and logical scientific rationales.
          
          CLINICAL QUESTIONS & CRITICAL DISCUSSION
          3 high-yield clinical discussion questions with detailed, expert-level rationales for nursing review.

          REFERENCES
          List all sources cited throughout the document.
          
           Style: Strictly formal, clinical-grade, academic, and extremely detailed. Keep it in clear clinical English. Do NOT use any markdown symbols (such as "**" for bold, "#" for headings, "|" for tables, or backticks). Use plain text capitalization for headings and standard line spacing. Present the DIAGNOSTIC & LABORATORY section using clean BULLET POINTS (not tables). Aim for 800-1200 words.
         `
       } else {
         prompt = `
           You are a clinical pathophysiology specialist and nursing educator.
           Generate a comprehensive, step-by-step Pathophysiology & Disease Mechanism guide for the condition: "${topic}".

           Patient Scenario/Condition context provided by student:
           "${scenario || 'No custom scenario/condition context provided.'}"
           ${referenceSection ? `\nReference materials provided by student (use these to tailor the content):\n${referenceSection}` : ''}
           ${trustedSources}

           STRUCTURE:
           Provide a complete, comprehensive document structured as follows (do NOT use any markdown #, ##, or ### headings, bold symbols like **, "|" for tables, or backticks):

           DISEASE OVERVIEW & DEFINITION
           Clear clinical definition, classifications, and primary homeostatic disruptions.

           ETIOLOGY & CLINICAL RISK FACTORS
           Predisposing factors, precipitating events, and direct etiologies categorized clearly.

           STEP-BY-STEP PATHOPHYSIOLOGY PATHWAY
           A detailed, sequential, step-by-step description of the cellular and physiological mechanism from the initial insult/insulting agent to systemic manifestations.

           CLINICAL CORRELATIONS & SYMPTOM PATHWAYS
           Explain exactly HOW the pathophysiological changes lead to the classic signs and symptoms (e.g., why ischemia causes chest pain, why heart failure causes crackles).

           PREVENTATIVE & CLINICAL INFLUENCES
           Key medical and nursing actions that directly interrupt this pathway to restore homeostasis.

           REFERENCES
           List all sources cited throughout the document.

           Style: Strictly formal, academic, and highly detailed. Keep it in clinical English. Do NOT use any markdown symbols (such as "**" for bold, "#" for headings, "|" for tables, or backticks). Use plain text capitalization for headings and standard line spacing. Aim for 800-1200 words.
        `
      }

      const articleContent = await generateCompletion(
        prompt, 
        `You are ${aiAssistantName}, a professional nursing clinical instructor drafting textbook-grade clinical materials for ${greetingName}. You must base all content exclusively on the TRUSTED SOURCES listed in the prompt and cite them. Never fabricate data.`, 
        'knowledge'
      )

      if (!articleContent) {
        throw new Error("Failed to generate content from AI model.")
      }

      await addGeneratedItem(topic, articleContent, genType)
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err.message || "An unexpected error occurred. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (e.target) e.target.value = ''

    for (const file of files) {
      setReferenceFiles(prev => [...prev, { name: file.name, text: null, loading: true }])
      try {
        const text = await extractTextFromFile(file)
        setReferenceFiles(prev => prev.map(f => f.name === file.name && f.text === null ? { ...f, text, loading: false } : f))
      } catch (err: any) {
        setReferenceFiles(prev => prev.map(f => f.name === file.name && f.loading ? { ...f, loading: false, error: err.message } : f))
      }
    }
  }

  const removeFile = (name: string) => {
    setReferenceFiles(prev => prev.filter(f => f.name !== name))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-[100]" onClick={() => !isGenerating && onClose()}>
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-[var(--card)] w-full max-w-xl rounded-t-3xl sm:rounded-2xl border border-[var(--border)] shadow-fn-lg max-h-[92vh] overflow-y-auto custom-scrollbar"
      >
        <div className="px-6 pt-6 pb-4 flex items-start gap-3 border-b border-[var(--border)]">
          <div className="w-11 h-11 rounded-xl bg-[var(--rose-soft)] border border-[var(--border)] text-[var(--pink)] flex items-center justify-center shrink-0">
            <Sparkles size={22} weight="duotone" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading font-semibold text-[17px]">AI Clinical Generator</h2>
            <p className="text-xs text-[var(--text-secondary)]">A detailed case study or pathophysiology guide, saved to your Study Box.</p>
          </div>
          <button onClick={onClose} disabled={isGenerating} className="btn-icon p-2 -mr-1" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="p-6">
          {error && (
            <p className="mb-5 px-3 py-2.5 rounded-xl bg-th-error/10 border border-th-error/25 text-[var(--error)] text-[13px]">{error}</p>
          )}

          {isGenerating ? (
            <div className="py-10 flex flex-col items-center text-center gap-3">
              <Loader2 size={30} className="animate-spin text-[var(--pink)]" />
              <p className="font-semibold">Drafting your {genType === 'case-study' ? 'case study' : 'pathophysiology guide'}…</p>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                {genType === 'case-study'
                  ? `${aiAssistantName} is writing the assessment, diagnostics and nursing care plan.`
                  : `${aiAssistantName} is tracing the disease pathway and symptom correlations.`}
              </p>
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-5">
              <div className="grid grid-cols-2 gap-2.5">
                {([
                  ['case-study', 'Case Study', 'Profile, labs, meds, care plan', BookOpen],
                  ['pathophysiology', 'Pathophysiology', 'Pathways, causes, symptoms', BrainCircuit],
                ] as const).map(([id, title, sub, OptIcon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setGenType(id)}
                    className={cn(
                      'p-3.5 rounded-xl border text-left transition-colors',
                      genType === id ? 'border-[var(--pink)] bg-[var(--rose-soft)]' : 'border-[var(--border)] hover:bg-[var(--rose-soft)]'
                    )}
                  >
                    <OptIcon size={20} className="text-[var(--pink)] mb-1.5" weight={genType === id ? 'fill' : 'regular'} />
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">{sub}</p>
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="block text-[13px] font-medium mb-1.5">Condition or topic</span>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Myocardial Infarction, Chronic Kidney Disease"
                  className="fn-input rounded-xl bg-[var(--card)] py-2.5 text-sm"
                />
              </label>

              <label className="block">
                <span className="flex justify-between text-[13px] font-medium mb-1.5">
                  Patient scenario <span className="text-[11px] font-normal text-[var(--text-secondary)]">optional</span>
                </span>
                <textarea
                  value={scenario}
                  onChange={e => setScenario(e.target.value)}
                  placeholder={genType === 'case-study'
                    ? 'e.g. 56-year-old female with crushing chest pain radiating to the left shoulder, BP 150/90, history of hypertension…'
                    : 'e.g. Focus on ischemic injury, troponin release and ventricular remodeling…'}
                  rows={4}
                  className="fn-input rounded-xl bg-[var(--card)] py-2.5 text-sm leading-relaxed resize-none"
                />
              </label>

              <div>
                <span className="flex justify-between text-[13px] font-medium mb-1.5">
                  Reference files <span className="text-[11px] font-normal text-[var(--text-secondary)]">optional · PDF, Word, images</span>
                </span>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.txt,.md,.csv,.jpg,.jpeg,.png,.webp" onChange={handleFileSelect} className="hidden" />
                {referenceFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {referenceFiles.map(f => (
                      <span key={f.name} className="flex items-center gap-1.5 bg-[var(--rose-soft)] border border-[var(--border)] rounded-full pl-2.5 pr-1.5 py-1 text-xs max-w-full">
                        {f.loading ? <Loader2 size={12} className="animate-spin shrink-0" /> : <FileText size={12} className={cn('shrink-0', f.error ? 'text-[var(--error)]' : 'text-[var(--pink)]')} />}
                        <span className="truncate max-w-[160px]" title={f.error}>{f.name}</span>
                        {!f.loading && (
                          <button type="button" onClick={() => removeFile(f.name)} className="text-[var(--text-secondary)] hover:text-[var(--error)]" aria-label={`Remove ${f.name}`}><X size={12} /></button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full border border-dashed border-[var(--accent)] rounded-xl py-3 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--pink)] hover:bg-[var(--rose-soft)] flex items-center justify-center gap-2">
                  <Upload size={14} /> {referenceFiles.length > 0 ? 'Add more files' : 'Upload reference files'}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
                <button type="submit" className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2"><Sparkles size={15} /> Generate</button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
