import { useState, useRef, useEffect } from 'react'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { useReviewerStore } from '@/stores/reviewerStore'
import { useNavigate } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import type { StudyBoxItem, Topic } from '@/types'
import { 
  Upload, 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Heart, 
  MoreVertical,
  Camera,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  BrainCircuit,
  ArrowRight,
  BookOpen,
  Loader2,
  Download,
  RefreshCw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getFileIcon, formatRelativeDate, cn } from '@/lib/utils'
import CameraModal from '@/components/shared/CameraModal'
import MarkdownText from '@/components/shared/MarkdownText'
import { generateCompletion } from '@/lib/groq'
import { useAuthStore } from '@/stores/authStore'
import { usePersonalization } from '@/hooks/usePersonalization'

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
  
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<StudyBoxItem | null>(null)

  const { isFrance, aiAssistantName, studyBoxName, greetingName } = usePersonalization()
  const { generatePresentation, generateReviewer, isGeneratingReviewer, isGeneratingPresentation } = useReviewerStore()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const firstName = user?.full_name?.split(' ')[0] || 'Your'

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

  return (
    <div className="page-container">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{studyBoxName} ✨</h1>
          <p className="text-[var(--text-secondary)] font-medium">Upload, organize, and transform your nursing notes into smart reviewers! {isFrance ? '🩺🌸' : '🩺✨'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsCaseModalOpen(true)}
            className="btn-primary flex items-center gap-2 bg-gradient-to-r from-[var(--pink)] to-[#F7A8B8] hover:opacity-90 shadow-fn text-xs sm:text-sm px-3 sm:px-4"
            disabled={isUploading || isProcessing}
          >
            <Sparkles size={18} />
            <span>Generate Case Study</span>
          </button>
          <button 
            onClick={() => setIsCameraOpen(true)}
            className="btn-secondary flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4"
            disabled={isUploading || isProcessing}
          >
            <Camera size={18} />
            <span className="hidden sm:inline">Take Photo</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4"
            disabled={isUploading || isProcessing}
          >
            <Upload size={18} />
            <span className="hidden sm:inline">Upload Files</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden"
            multiple
          />
        </div>
      </div>

      {/* Upload State / Processing */}
      <AnimatePresence>
        {(isUploading || isProcessing) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="fn-card p-4 sm:p-6 bg-gradient-to-r from-[var(--secondary-bg)]/50 to-[var(--pink)]/10 border-dashed border-2 border-[var(--pink)] flex items-center gap-4 sm:gap-6">
               <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-2xl shadow-fn flex items-center justify-center text-[var(--pink)] shrink-0">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-[var(--pink)]/30 border-t-[var(--pink)] rounded-full animate-spin"></div>
               </div>
               <div className="flex-1 min-w-0">
                 <h3 className="font-bold text-base sm:text-lg mb-1">
                   {isUploading ? 'Uploading your study materials...' : `${aiAssistantName} is analyzing your notes... 🩺✨`}
                 </h3>
                 <p className="text-sm text-[var(--text-secondary)]">
                   {isUploading ? (isFrance ? 'Almost there, babe! 🌸' : 'Almost there! 🩺') : 'Extracting text and identifying key nursing concepts... This will only take a moment!'}
                 </p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="md:col-span-3 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50" size={18} />
            <input 
              type="text" 
              placeholder="Search your library..." 
              className="fn-input pl-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 sm:pb-0">
             <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl flex p-1 whitespace-nowrap min-w-max">
                <button 
                  onClick={() => setSelectedTopic(null)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    selectedTopic === null ? "bg-[var(--pink)] text-white shadow-fn" : "text-[var(--text-secondary)] hover:bg-[var(--bg)]"
                  )}
                >
                  All
                </button>
                {topics.filter(topic => items.some(item => item.topic_id === topic.id)).map(topic => (
                  <button 
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      selectedTopic === topic.id ? "bg-[var(--pink)] text-white shadow-fn" : "text-[var(--text-secondary)] hover:bg-[var(--bg)]"
                    )}
                  >
                    {topic.title}
                  </button>
                ))}
             </div>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <button className="btn-secondary w-full md:w-auto flex items-center justify-center gap-2">
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

      {/* Document Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={item.id} 
              className={cn(
                "fn-card group relative overflow-hidden transition-all duration-300 cursor-pointer",
                selectedItemIds.includes(item.id) && "ring-2 ring-[var(--pink)] border-[var(--pink)]"
              )}
              onClick={() => setSelectedItem(item)}
            >
              <div 
                className="aspect-[4/3] bg-[var(--bg)] flex items-center justify-center relative overflow-hidden"
              >
                {item.preview_image ? (
                  <img 
                    src={item.preview_image} 
                    alt={item.file_name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col justify-between p-6 relative bg-gradient-to-br from-[var(--pink)]/10 to-[var(--secondary-bg)]/20">
                    <div className="space-y-2 w-full opacity-60">
                      <div className="h-2.5 bg-[var(--border)] rounded-full w-3/4"></div>
                      <div className="h-2 bg-[var(--border)] rounded-full w-5/6"></div>
                      <div className="h-2 bg-[var(--border)] rounded-full w-2/3"></div>
                      <div className="h-2 bg-[var(--border)] rounded-full w-1/2"></div>
                    </div>
                    
                    <div className="absolute right-4 bottom-4 text-5xl opacity-45 group-hover:opacity-65 group-hover:scale-110 transition-all duration-300">
                      {getFileIcon(item.file_type)}
                    </div>
                    
                    <span 
                      className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md text-white w-max"
                      style={{ backgroundColor: topics.find(t => t.id === item.topic_id)?.color || 'var(--pink)' }}
                    >
                      {topics.find(t => t.id === item.topic_id)?.title || 'General'}
                    </span>
                  </div>
                )}
                
                {/* Selection Indicator Checkbox */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleItemSelection(item.id)
                  }}
                  className={cn(
                    "absolute top-3 left-3 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center z-20 cursor-pointer",
                    selectedItemIds.includes(item.id) 
                      ? "bg-[var(--pink)] border-[var(--pink)] text-white shadow-md" 
                      : "bg-white/50 border-white opacity-0 group-hover:opacity-100"
                  )}
                >
                  {selectedItemIds.includes(item.id) && <CheckCircle2 size={16} />}
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-1 relative">
                  <h4 className="font-bold text-sm truncate pr-6 group-hover:text-[var(--pink)] transition-colors">
                    {item.file_name.startsWith('[Reference]')
                      ? item.file_name.replace('[Reference] ', '').replace('.txt', '')
                      : item.file_name}
                  </h4>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(item.id)
                    }}
                    className={cn(
                      "absolute top-0 right-0 p-1.5 rounded-full bg-white/80 backdrop-blur-sm transition-all shadow-sm z-10",
                      item.is_favorite ? "text-[var(--pink)] opacity-100" : "text-[var(--text-secondary)] opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <Heart size={14} fill={item.is_favorite ? "currentColor" : "none"} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{formatRelativeDate(item.created_at)}</span>
                  <div className="flex gap-1 z-10">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        removeItem(item.id)
                      }} 
                      className="p-1 hover:text-[var(--error)] transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                      className="p-1 hover:text-[var(--pink)] transition-colors"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-[var(--secondary-bg)] rounded-full flex items-center justify-center text-[var(--pink)] mb-6 animate-float">
            <Archive size={48} />
          </div>
          <h3 className="text-xl font-bold mb-2 tracking-tight">Your Study Box is empty 🌸</h3>
          <p className="text-[var(--text-secondary)] max-w-xs mb-8">
            Upload your lecture notes, handouts, or screenshots to start your nursing review!
          </p>
          <button 
             onClick={() => fileInputRef.current?.click()}
             className="btn-primary"
          >
            Upload your first note
          </button>
        </div>
      )}

      {/* Mobile Quick Action FAB */}
      <div className="md:hidden fixed bottom-20 right-4 flex flex-col gap-3">
        <button 
          onClick={() => setIsCameraOpen(true)}
          className="w-12 h-12 bg-[var(--card)] text-[var(--text)] rounded-full shadow-lg border border-[var(--border)] flex items-center justify-center hover:scale-105 transition-transform"
        >
           <Camera size={24} />
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-14 h-14 bg-[var(--pink)] text-white rounded-full shadow-fn flex items-center justify-center hover:scale-105 transition-transform"
        >
           <Plus size={32} />
        </button>
      </div>

      {/* Floating AI Source Selection Bar */}
      <AnimatePresence>
        {selectedItemIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-2xl"
          >
            <div className="bg-[var(--card)] border-2 border-[var(--pink)] rounded-[2rem] p-4 shadow-2xl flex items-center justify-between gap-4 backdrop-blur-xl bg-opacity-90">
              <div className="flex items-center gap-4 pl-2">
                <div className="w-10 h-10 bg-[var(--secondary-bg)] text-[var(--pink)] rounded-full flex items-center justify-center font-bold">
                  {selectedItemIds.length}
                </div>
                <div>
                  <p className="text-sm font-bold">Sources selected</p>
                  <button 
                    onClick={clearSelection}
                    className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--pink)] transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    navigate('/quiz', { state: { selectedItemIds } })
                    clearSelection()
                  }}
                  className="btn-secondary px-6 py-2.5 text-xs flex items-center gap-2"
                >
                  <BrainCircuit size={16} />
                  Quiz
                </button>
                <button 
                  onClick={handleGeneratePresentation}
                  disabled={isGeneratingReviewer || isGeneratingPresentation}
                  className="btn-secondary px-6 py-2.5 text-xs flex items-center gap-2"
                >
                  <FileText size={16} />
                  {isGeneratingPresentation ? 'Generating...' : 'PPTX'}
                </button>
                <button 
                  onClick={handleGenerateReviewer}
                  disabled={isGeneratingReviewer || isGeneratingPresentation}
                  className="btn-primary px-6 py-2.5 text-xs flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  {isGeneratingReviewer ? 'Generating...' : 'AI Reviewer'}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCameraOpen && (
          <CameraModal 
            onCapture={handleCapture}
            onClose={() => setIsCameraOpen(false)}
          />
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
function formatDocumentText(text: string): React.ReactNode {
  if (!text) return ''
  
  let formatted = text
  
  // 1. Clean up consecutive spaces
  formatted = formatted.replace(/[ \t]+/g, ' ')
  
  // 2. Put number lists on new paragraphs
  // e.g., " 1. ", " 2. ", " 10. "
  formatted = formatted.replace(/\s+(\d+\.)\s+/g, '\n\n$1 ')
  
  // 3. Put standard bullet points (•, ▪, *, -) on new lines
  // Ensure they are separated cleanly
  formatted = formatted.replace(/\s*[•▪]\s*/g, '\n• ')
  
  // 4. Put sub-bullets like " o " or " - " on new indented lines
  // Let's match " o " where it represents a bullet (followed by text)
  formatted = formatted.replace(/\s+o\s+([A-Za-z])/g, '\n  ◦ $1')
  
  // 5. If we have headings or lists like "Etiology / Risk Factors" or "Physiologic Causes" or "Lifestyle Factors"
  // let's put them on new lines to break the wall of text
  const keySections = [
    'Anatomy & Physiology Relevance',
    'Lower Esophageal Sphincter \\(LES\\)',
    'Lower Esophageal Sphincter',
    'Stomach',
    'Etiology / Risk Factors',
    'Physiologic Causes',
    'Lifestyle Factors',
    'Medical Conditions',
    'Pathophysiology \\(Step-by-Step\\)',
    'Pathophysiology',
    'Clinical Manifestations',
    'Diagnostic Assessments',
    'Medical Management',
    'Nursing Interventions',
    'Normal:',
    'GERD:'
  ]
  
  keySections.forEach(section => {
    // Replace section name with a newlined version if it exists
    const regex = new RegExp(`\\s*(${section})\\s*`, 'g')
    formatted = formatted.replace(regex, '\n\n$1\n')
  })

  // 6. Clean up multiple newlines
  formatted = formatted.replace(/\n{3,}/g, '\n\n')
  
  const trimmed = formatted.trim()
  
  // Regex to extract and link URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = trimmed.split(urlRegex)
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={index} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[var(--pink)] hover:underline break-all font-semibold inline"
        >
          {part}
        </a>
      )
    }
    return part
  })
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

  const getTopicColor = (topicId: string | null) => {
    if (!topicId) return '#6b7280'
    return topics.find(t => t.id === topicId)?.color || '#6b7280'
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
          - Use highly decorative, cute, and friendly emojis (e.g., 🌸, 🩺, 🧸, 🩹, ✨, 🎀, 🌷, 🦦) inside your markdown headings and scattered naturally throughout the content to make it visually adorable for France!
          - Speak to her in a sweet, supportive Taglish boyfriend tone. Call her "babe", cheer her on, and make the review feel like a cozy, romantic, and extremely smart study date!
          
          CRITICAL FORMATTING RULE:
          - Do NOT use markdown tables (e.g. | BP | Stage | etc.) under any circumstances. If you need to make comparisons or show lists of stages/diagnostics, present them as clean bullet points, bold key-value lines, or indented lists. Raw tables are hard to read, so they must be avoided.
          
          Use markdown formatting and structure it with:
          1. **🧬 Clinical Pathophysiology & Concepts Overview**: Exhaustive, deep-dive description of the disease/topic process, mechanisms, anatomical changes, etiology, and why they occur.
          2. **📋 High-Yield Clinical Assessment & Laboratory Findings**: Complete breakdown of physical assessments (early vs late signs, priority assessments), diagnostics, and critical lab values she must look out for.
          3. **💊 Pharmacological & Medical Management**: Critical medications, drug classes, therapeutic actions, adverse effects, and nursing interventions during drug administration.
          4. **🩺 Exhaustive Nursing Care Priorities & Scientific Rationales**: Detailed step-by-step nursing interventions (assess, do, teach) with clinical rationales.
          5. **🎯 Doc Uno's PNLE Board Appraisal & Study Pearls**: Specific board-exam style clinical focus scenarios, SATA concepts, and test-taking tips, written in a loving boyfriend tone (call her "babe", cheer her on!).
          
          Text to summarize:
          "${currentItem.extracted_text.substring(0, 6000)}"
        `
      } else {
        summaryPrompt = `
          You are ${aiAssistantName}, an expert clinical nursing instructor.
          Review the following document text and write a HIGHLY DETAILED, comprehensive, and clinically rigorous nursing study guide/summary of this material.
          Do not output a simple or brief summary. Ensure it provides extensive, board-ready clinical reviews.
          
          PROFESSIONAL ENCOURAGING RULE:
          - Use clear, professional clinical emojis (🩺, 👩‍⚕️, 🧠, 📝, ✨, 💊) inside markdown headings and bullet points.
          - Address the student as ${greetingName}. Keep the tone extremely professional, warm, highly intelligent, and focused on helping them excel on the board exams.
          - Absolutely NO romantic references or boyfriend endearments.
          
          CRITICAL FORMATTING RULE:
          - Do NOT use markdown tables (e.g. | BP | Stage | etc.) under any circumstances. If you need to make comparisons or show lists of stages/diagnostics, present them as clean bullet points, bold key-value lines, or indented lists. Raw tables are hard to read, so they must be avoided.
          
          Use markdown formatting and structure it with:
          1. **🧬 Clinical Pathophysiology & Concepts Overview**: Exhaustive, deep-dive description of the disease/topic process, mechanisms, anatomical changes, etiology, and why they occur.
          2. **📋 High-Yield Clinical Assessment & Laboratory Findings**: Complete breakdown of physical assessments (early vs late signs, priority assessments), diagnostics, and critical lab values.
          3. **💊 Pharmacological & Medical Management**: Critical medications, drug classes, therapeutic actions, adverse effects, and nursing interventions during drug administration.
          4. **🩺 Exhaustive Nursing Care Priorities & Scientific Rationales**: Detailed step-by-step nursing interventions (assess, do, teach) with clinical rationales.
          5. **🎯 Board Appraisal & Study Pearls**: Specific board-exam style clinical focus scenarios, SATA concepts, and test-taking tips.
          
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[var(--card)] w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 flex gap-4 border-b border-[var(--border)] bg-gradient-to-br from-[var(--pink)]/10 to-[var(--secondary-bg)]/20 relative items-center">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-colors text-xs font-bold"
          >
            Close
          </button>

          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 text-2xl"
            style={{ backgroundColor: getTopicColor(currentItem.topic_id) }}
          >
            {getFileIcon(currentItem.file_type)}
          </div>

          <div className="pr-12">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 bg-white rounded-md text-[var(--text-secondary)] shadow-sm border border-[var(--border)]">
                {getTopicTitle(currentItem.topic_id)}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                Uploaded {formatRelativeDate(currentItem.created_at)}
              </span>
            </div>
            <h2 className="text-base font-bold tracking-tight truncate max-w-[450px]">
              {currentItem.file_name.startsWith('[Reference]')
                ? currentItem.file_name.replace('[Reference] ', '').replace('.txt', '')
                : currentItem.file_name}
            </h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8 bg-[var(--secondary-bg)]/10">
          
          {/* Main Paper Document Container */}
          <div className="bg-white border border-[var(--border)] rounded-[2rem] shadow-sm p-8 md:p-10 flex flex-col gap-6 relative select-text shrink-0">
            {/* Soft decorative badge on the paper */}
            <div className="absolute top-4 right-6 text-[10px] font-bold text-[var(--text-secondary)]/30 uppercase tracking-widest">
              Original Document
            </div>

            {/* Embedded image preview if it is an image */}
            {currentItem.preview_image && (
              <div className="w-full max-h-96 rounded-2xl overflow-hidden border border-[var(--border)] shadow-sm shrink-0 mb-4 bg-black/[0.02]">
                <img src={currentItem.preview_image} alt={currentItem.file_name} className="w-full h-full object-contain" />
              </div>
            )}

            {/* Document Text Content */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-2">
                <BookOpen size={16} className="text-[var(--pink)]" />
                <span className="text-xs font-bold uppercase tracking-wider">Document Reader</span>
              </div>
              <div className="text-sm md:text-base text-[var(--text)] leading-relaxed font-sans select-text">
                <MarkdownText content={currentItem.extracted_text} />
              </div>
            </div>

            {/* Paper Footer / Page details */}
            <div className="border-t border-[var(--border)]/60 pt-4 mt-6 flex justify-between items-center text-[10px] text-[var(--text-secondary)]/50 font-bold uppercase tracking-widest">
              <span>Type: {currentItem.file_type}</span>
              <span>{currentItem.extracted_text.split(/\s+/).length} Words</span>
            </div>
          </div>

          {/* Elegant Page Break & AI Separator */}
          <div className="my-2 relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-dashed border-[var(--border)]"></div>
            </div>
            <div className="relative z-10 bg-[var(--card)] px-6 py-2 rounded-full border border-[var(--border)] shadow-sm">
              <span className="text-xs font-bold text-[var(--text)] uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--pink)] animate-pulse" /> 
                {isFrance ? "Doc Uno's Study Space" : `${aiAssistantName}'s Study Space`}
              </span>
            </div>
          </div>

          {/* AI Summary Section */}
          <div id="doc-unos-love-notes-card" className="bg-gradient-to-tr from-[var(--pink)]/[0.02] to-[var(--pink)]/[0.08] border-2 border-[var(--pink)]/20 rounded-[2rem] p-8 flex flex-col gap-5 relative overflow-hidden shrink-0">
            {/* Love theme decor elements */}
            <div 
              className="absolute top-0 right-0 p-6 pointer-events-none"
              style={{ color: 'var(--pink)', opacity: 0.08 }}
            >
              <Sparkles size={120} />
            </div>

            <div className="flex items-center justify-between relative z-10 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-[var(--pink)]">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--pink)] block">
                    {isFrance ? "Doc Uno's Love Notes" : `${aiAssistantName}'s Clinical Notes`}
                  </span>
                  <h3 className="font-bold text-base text-[var(--text)]">Clinical Summary & Study Guide {isFrance ? '🩺💖' : '🩺✨'}</h3>
                </div>
              </div>

              {currentItem.summary && (
                <div className="flex gap-2 shrink-0">
                  <button 
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    className="btn-secondary py-2 px-4 text-xs flex items-center gap-1.5 rounded-xl border-[var(--pink)]/30 hover:bg-[var(--pink)]/10 text-[var(--pink)] font-bold transition-all shadow-sm"
                  >
                    <RefreshCw size={13} className={isGeneratingSummary ? "animate-spin" : ""} />
                    {isGeneratingSummary ? 'Regenerating...' : 'Regenerate'}
                  </button>
                  <button 
                    onClick={handleDownloadSummary}
                    className="btn-secondary download-notes-btn py-2 px-4 text-xs flex items-center gap-1.5 rounded-xl border-[var(--pink)]/30 hover:bg-[var(--pink)]/10 text-[var(--pink)] font-bold transition-all shadow-sm"
                    title={`Download ${isFrance ? "Doc Uno's Study Guide" : 'Study Guide'} as a PDF!`}
                  >
                    <Download size={13} />
                    Download Notes
                  </button>
                </div>
              )}
            </div>

            <div className="relative z-10 select-text">
              {isGeneratingSummary ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-4 animate-in fade-in zoom-in duration-300">
                  <div className="relative w-20 h-20 shrink-0 mb-2">
                    <div className="w-20 h-20 rounded-[2rem] overflow-hidden border-2 border-[var(--pink)]/30 shadow-md animate-float">
                      <img src={isFrance ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'} alt={aiAssistantName} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full shadow-sm flex items-center justify-center text-[var(--pink)] border border-[var(--pink)]/10 animate-spin" style={{ animationDuration: '3s' }}>
                      <Loader2 size={14} />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[var(--text)]">
                      {isFrance ? 'Uno is studying your notes hard, babe... 🩺📚' : `${aiAssistantName} is studying your notes... 🩺📚`}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {isFrance ? 'Writing you a cute custom summary and clinical exam pearls! 💕' : 'Analyzing key nursing concepts and PNLE board exam highlights... 🩺'}
                    </p>
                  </div>
                  <div className="w-48 h-1 bg-[var(--border)] rounded-full overflow-hidden mt-2">
                    <motion.div 
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                      className="h-full w-1/2 bg-[var(--pink)] rounded-full"
                    ></motion.div>
                  </div>
                </div>
              ) : currentItem.summary ? (
                <div className="prose prose-pink max-w-none text-sm leading-relaxed text-[var(--text-secondary)] flex flex-col gap-6">
                  <div>
                    <MarkdownText content={currentItem.summary} />
                  </div>
                  
                  {/* Custom Boyfriend Signature Section */}
                  <div className="mt-6 pt-6 border-t border-[var(--pink)]/20 text-center flex flex-col items-center justify-center gap-1 shrink-0">
                    <span className="text-xs font-bold text-[var(--pink)] uppercase tracking-wider flex items-center gap-1.5">
                      Made with 💖 by {isFrance ? 'Doc Uno for France' : `${aiAssistantName}`}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)]/50 uppercase tracking-widest">
                      {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ) : summaryError ? (
                <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
                  <p className="text-xs font-bold text-[var(--error)]">{summaryError}</p>
                  <button onClick={handleGenerateSummary} className="btn-secondary py-2 px-4 text-xs flex items-center gap-1.5">
                    <Loader2 size={12} /> Retry Summarizing
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                  <p className="text-xs text-[var(--text-secondary)] font-medium max-w-md">
                    {isFrance 
                      ? 'No summary generated yet. Let Doc Uno read this document and extract key board exam concepts and nursing priorities for you, babe! 🌸'
                      : `No summary generated yet. Let ${aiAssistantName} read this document and extract clinical concepts and board exam priorities for you! 🩺`
                    }
                  </p>
                  <button onClick={handleGenerateSummary} className="btn-primary py-3 px-6 text-xs flex items-center gap-2 shadow-fn">
                    <Sparkles size={14} /> Write AI Summary
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tags list */}
          {currentItem.tags && currentItem.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] mr-1">Tags:</span>
              {currentItem.tags.map((tag, idx) => (
                <span key={idx} className="text-[10px] font-bold bg-[var(--pink)]/10 text-[var(--pink)] px-3 py-1 rounded-full border border-[var(--pink)]/10">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-[var(--border)] bg-[var(--bg)]/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <button onClick={handleDelete} className="text-xs font-bold text-[var(--error)] hover:bg-[var(--error)]/10 px-4 py-2.5 rounded-xl transition-colors">
            Delete Note
          </button>
          <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
            <button onClick={onClose} className="btn-secondary px-4 py-2.5 text-xs rounded-xl">
              Close
            </button>
            <button 
              onClick={handleModalGeneratePresentation}
              disabled={isGeneratingReviewer || isGeneratingPresentation}
              className="btn-secondary px-4 py-2.5 text-xs flex items-center gap-1.5 rounded-xl"
            >
              <FileText size={13} /> 
              {isGeneratingPresentation ? 'Generating...' : 'Generate PPTX'}
            </button>
            <button 
              onClick={handleModalGenerateReviewer}
              disabled={isGeneratingReviewer || isGeneratingPresentation}
              className="btn-primary px-4 py-2.5 text-xs flex items-center gap-1.5 rounded-xl shadow-sm"
            >
              <Sparkles size={13} /> 
              {isGeneratingReviewer ? 'Generating...' : 'Make Reviewer'}
            </button>
            <button onClick={handleStartQuiz} className="btn-primary bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 border-none text-white px-4 py-2.5 text-xs flex items-center gap-1.5 shadow-sm rounded-xl">
              <BrainCircuit size={13} /> Start Quiz
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}


function Archive(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="5" x="2" y="3" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) return
    setIsGenerating(true)
    setError(null)

    try {
      let prompt = ''
      if (genType === 'case-study') {
        prompt = `
          You are a professional clinical educator and nursing case analyst.
          Generate a textbook-grade, highly-detailed Nursing Case Study / Case Presentation for the topic: "${topic}".
          
          Scenario/Condition details provided by student:
          "${scenario || 'No custom scenario details provided.'}"
          
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
          
          Style: Strictly formal, clinical-grade, academic, and extremely detailed. Keep it in clear clinical English. Do NOT use any markdown symbols (such as "**" for bold, "#" for headings, or backticks). Use plain text capitalization for headings and standard line spacing. Aim for 800-1200 words.
        `
      } else {
        prompt = `
          You are a clinical pathophysiology specialist and nursing educator.
          Generate a comprehensive Pathophysiology & Disease Mechanism guide for the condition: "${topic}".

          Patient Scenario/Condition context provided by student:
          "${scenario || 'No custom scenario/condition context provided.'}"

          STRUCTURE:
          Provide a complete, comprehensive document structured as follows:

          DISEASE OVERVIEW & DEFINITION
          Clear clinical definition, classifications, and primary homeostatic disruptions.

          ETIOLOGY & CLINICAL RISK FACTORS
          Predisposing factors, precipitating events, and direct etiologies categorized clearly.

          PATHOPHYSIOLOGY DIAGRAM
          Create a visual flowchart using arrows (→, ↓, ↑, ↕), indentation, and vertical branching to trace the mechanism from initial insult to systemic manifestations. WRAP THE ENTIRE DIAGRAM in a markdown code fence (triple backticks \`\`\`) so it renders as a monospace preformatted block that preserves spacing and alignment. Use this style inside the code block:

          INITIAL INSULT / TRIGGER
               ↓
          [Phase 1 Name] --- brief description
               ↓
          [Phase 2 Name] --- description
               ↓
          [Phase 3 Name] --- description
               ↓
          SYSTEMIC MANIFESTATIONS

          Include parallel branches and feedback loops using indentation. Make it visual and scannable.

          CLINICAL CORRELATIONS & SYMPTOM PATHWAYS
          Explain exactly HOW the pathophysiological changes lead to the classic signs and symptoms (e.g., why ischemia causes chest pain, why heart failure causes crackles).

          PREVENTATIVE & CLINICAL INFLUENCES
          Key medical and nursing actions that directly interrupt this pathway to restore homeostasis.

          Style: Strictly formal, academic, and highly detailed. Keep it in clinical English. Use plain text capitalization for headings (NO #, ##, or ### symbols). Do NOT use bold (**) or italic (*) markdown. Aim for 600-1000 words.
        `
      }

      const articleContent = await generateCompletion(
        prompt, 
        `You are ${aiAssistantName}, a professional nursing clinical instructor drafting textbook-grade clinical materials for ${greetingName}.`, 
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[var(--card)] w-full max-w-2xl rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-2xl relative my-8"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text)] text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--border)]/20 transition-all"
        >
          &times;
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[var(--pink)]/15 rounded-2xl flex items-center justify-center text-[var(--pink)] shadow-sm">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">AI Clinical Generator 🩺✨</h2>
            <p className="text-xs text-[var(--text-secondary)]">Create a detailed case study or detailed pathophysiology guide.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 text-red-600 rounded-2xl text-xs border border-red-500/20 font-medium">
            ⚠️ {error}
          </div>
        )}

        {isGenerating ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 border-4 border-[var(--pink)]/30 border-t-[var(--pink)] rounded-full animate-spin mb-6"></div>
            <h3 className="font-bold text-lg mb-2 text-[var(--pink)] animate-pulse">Drafting Clinical Document...</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-md">
              {genType === 'case-study' 
                ? "Nurse Florence is conducting physical assessments, mapping diagnostics, and detailing the Nursing Care Plans..." 
                : "Doc Uno is tracing cell injury pathways, homeostatic changes, and clinical symptom correlations..."
              }
            </p>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Generator Type Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
                Generation Category
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGenType('case-study')}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center gap-1.5",
                    genType === 'case-study' 
                      ? "border-[var(--pink)] bg-[var(--pink)]/5 text-[var(--pink)] font-bold shadow-sm"
                      : "border-[var(--border)] hover:bg-[var(--border)]/20 text-[var(--text-secondary)]"
                  )}
                >
                  <BookOpen size={20} />
                  <span className="text-sm font-semibold">Clinical Case Study</span>
                  <span className="text-[10px] opacity-75">Patient profile, labs, meds, care plan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGenType('pathophysiology')}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center gap-1.5",
                    genType === 'pathophysiology' 
                      ? "border-[var(--pink)] bg-[var(--pink)]/5 text-[var(--pink)] font-bold shadow-sm"
                      : "border-[var(--border)] hover:bg-[var(--border)]/20 text-[var(--text-secondary)]"
                  )}
                >
                  <BrainCircuit size={20} />
                  <span className="text-sm font-semibold">Pathophysiology Guide</span>
                  <span className="text-[10px] opacity-75">Cellular pathways, risk factors, etiologies</span>
                </button>
              </div>
            </div>

            {/* Medical Topic/Condition */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Medical Condition / Topic Name
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Myocardial Infarction, Acute Appendicitis, Chronic Kidney Disease"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--pink)] transition-all font-semibold"
              />
            </div>

            {/* Scenario Textarea */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex justify-between">
                <span>Patient Scenario / Clinical Details (Optional)</span>
                <span className="text-[10px] font-normal lowercase tracking-normal text-[var(--text-secondary)]/60">help custom-tailor the content</span>
              </label>
              <textarea
                value={scenario}
                onChange={e => setScenario(e.target.value)}
                placeholder={
                  genType === 'case-study'
                    ? "e.g., A 56-year-old female presenting with crushing retrosternal chest pain radiating to the left shoulder, diaphoresis, and blood pressure of 150/90 mmHg. History of hypertension..."
                    : "e.g., Explain the mechanism of ischemic injury, necrosis pathways, cardiac enzyme release (troponin), and ventricular remodeling..."
                }
                rows={5}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--pink)] transition-all leading-relaxed"
              />
            </div>

            {/* Submit Buttons */}
            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary px-6 py-2.5 text-xs font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary bg-gradient-to-r from-[var(--pink)] to-[#F7A8B8] hover:opacity-90 shadow-fn px-6 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                Generate Document <ArrowRight size={14} />
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  )
}
