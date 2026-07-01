import { useState } from 'react'
import { useReviewerStore } from '@/stores/reviewerStore'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { useNavigate } from 'react-router-dom'
import { usePersonalization } from '@/hooks/usePersonalization'
import { 
  Library, 
  Search, 
  Heart, 
  Play, 
  ChevronRight, 
  ChevronUp,
  Sparkles,
  BookOpen,
  Zap,
  RotateCcw,
  X,
  FileText,
  Clock,
  Download,
  Printer,
  Share2,
  Trash2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatRelativeDate } from '@/lib/utils'
import MarkdownText from '@/components/shared/MarkdownText'
import { exportToPDF, exportToDOCX, exportToPPTX, printFlashcards } from '@/lib/export'
import type { ReviewerItem } from '@/types'

export default function ReviewerLibraryPage() {
  const { isFrance, greetingName, aiAssistantName } = usePersonalization()
  const { 
    reviewers, 
    getFilteredReviewers, 
    searchQuery, 
    setSearchQuery,
    toggleFavorite,
    deleteReviewer,
    selectedReviewer,
    setSelectedReviewer,
    generateReviewer,
    generatePresentation,
    isGenerating
  } = useReviewerStore()
  const { topics, items } = useStudyBoxStore()
  const navigate = useNavigate()
  
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [generationSourceType, setGenerationSourceType] = useState<'topic' | 'uploaded'>('topic')
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id || '')
  const [selectedUploadIds, setSelectedUploadIds] = useState<string[]>([])
  const [reviewerType, setReviewerType] = useState<'study_guide' | 'slides'>('study_guide')
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false)

  const handleGenerateReviewer = async () => {
    if (generationSourceType === 'uploaded' && selectedUploadIds.length === 0) {
      alert(isFrance ? "Please select at least one uploaded file to generate from, babe! 🌸" : "Please select at least one uploaded file to generate from! 🩺")
      return
    }

    try {
      if (reviewerType === 'study_guide') {
        const sourceIds = generationSourceType === 'uploaded' ? selectedUploadIds : []
        const topicId = generationSourceType === 'topic' ? selectedTopicId : undefined
        await generateReviewer(sourceIds, topicId)
      } else {
        const sourceIds = generationSourceType === 'uploaded' ? selectedUploadIds : []
        const topicId = generationSourceType === 'topic' ? selectedTopicId : undefined
        await generatePresentation(sourceIds, topicId)
      }
      setSelectedUploadIds([])
      setIsGenerateModalOpen(false)
    } catch (err) {
      console.error(err)
      alert(isFrance ? "Oops! Failed to generate reviewer, babe. Please try again! 🩺🌸" : "Failed to generate reviewer. Please try again! 🩺")
    }
  }
  
  const filteredReviewers = getFilteredReviewers()

  const getTopicColor = (topicId: string | null) => {
    if (!topicId) return 'bg-gray-100'
    return topics.find(t => t.id === topicId)?.color || 'bg-[var(--secondary-bg)]'
  }

  const getTopicTitle = (topicId: string | null) => {
    if (!topicId) return 'General'
    return topics.find(t => t.id === topicId)?.title || 'General'
  }

  return (
    <div className="page-container">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{isFrance ? "France's Reviewer Library 🩺✨" : "Reviewer Library 🩺✨"}</h1>
          <p className="text-[var(--text-secondary)] font-medium">
            {isFrance 
              ? "Deep dive into your personalized study guides and AI insights, babe! 🌸" 
              : "Deep dive into your professional study guides and AI insights! 🩺"
            }
          </p>
        </div>
        <button
          onClick={() => {
            if (topics.length > 0 && !selectedTopicId) {
              setSelectedTopicId(topics[0].id)
            }
            setIsGenerateModalOpen(true)
          }}
          className="btn-primary px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2 self-stretch sm:self-auto shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 text-xs sm:text-sm"
        >
          <Sparkles size={16} />
          <span>Generate Reviewer</span>
        </button>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="md:col-span-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50" size={18} />
            <input 
              type="text" 
              placeholder="Search reviewers by title or source..." 
              className="fn-input pl-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between px-2">
           <div className="text-center">
             <p className="text-xl font-bold">{reviewers.length}</p>
             <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Total</p>
           </div>
           <div className="h-8 w-[1px] bg-[var(--border)]"></div>
           <div className="text-center">
             <p className="text-xl font-bold text-[var(--pink)]">{reviewers.filter(r => r.is_favorite).length}</p>
             <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Favorites</p>
           </div>
           <div className="h-8 w-[1px] bg-[var(--border)]"></div>
           <div className="text-center">
             <p className="text-xl font-bold text-[var(--success)]">100%</p>
             <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">AI Powered</p>
           </div>
        </div>
      </div>

      {/* Reviewer List */}
      <div className="space-y-4">
        {filteredReviewers.length > 0 ? (
          filteredReviewers.map((reviewer) => (
            <motion.div 
              layout
              key={reviewer.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="fn-card p-4 md:p-6 group hover:border-[var(--pink)] transition-all cursor-pointer relative overflow-hidden"
              onClick={() => setSelectedReviewer(reviewer)}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: getTopicColor(reviewer.topic_id) }}
                >
                   <BookOpen size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                     <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-[var(--bg)] rounded-full text-[var(--text-secondary)]">
                       {getTopicTitle(reviewer.topic_id)}
                     </span>
                     <span className="text-[10px] text-[var(--text-secondary)]">• {formatRelativeDate(reviewer.created_at)}</span>
                  </div>
                  <h3 className="text-lg font-bold truncate group-hover:text-[var(--pink)] transition-colors">{reviewer.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                    <FileText size={12} /> Source: {reviewer.source_file}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3">
                   <button 
                     onClick={(e) => {
                       e.stopPropagation()
                       toggleFavorite(reviewer.id)
                     }}
                     className={cn(
                       "p-2 sm:p-2.5 rounded-xl transition-all",
                       reviewer.is_favorite ? "text-[var(--pink)] bg-[var(--pink)]/10" : "text-[var(--text-secondary)] hover:bg-[var(--bg)]"
                     )}
                     title={reviewer.is_favorite ? "Remove from favorites" : "Add to favorites"}
                   >
                     <Heart size={18} fill={reviewer.is_favorite ? "currentColor" : "none"} />
                   </button>
                   <button 
                     onClick={(e) => {
                       e.stopPropagation()
                       deleteReviewer(reviewer.id)
                     }}
                     className="p-2 sm:p-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-all"
                     title="Delete reviewer"
                   >
                     <Trash2 size={18} />
                   </button>
                   <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate('/quiz', {
                          state: {
                            preSelectedTopic: reviewer.title,
                            preSelectedText: reviewer.content.summary + '\n\n' + (reviewer.content.key_points ? reviewer.content.key_points.join('\n') : ''),
                            preSelectedName: reviewer.source_file
                          }
                        })
                      }}
                      className="btn-primary p-2 sm:p-2.5 rounded-xl flex items-center justify-center"
                      title="Start quiz from this reviewer"
                    >
                      <Play size={18} fill="currentColor" />
                    </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="w-20 h-20 bg-[var(--secondary-bg)] rounded-full flex items-center justify-center text-[var(--pink)] mb-6">
                <Library size={40} />
             </div>
             <p className="text-[var(--text-secondary)]">No reviewers found matching your search. {isFrance ? '🌸' : '🩺'}</p>
          </div>
        )}
      </div>

      {/* Reviewer Detail Modal */}
      <AnimatePresence>
        {selectedReviewer && (
          <ReviewerDetail 
            reviewer={selectedReviewer} 
            onClose={() => setSelectedReviewer(null)} 
            getTopicColor={getTopicColor}
            getTopicTitle={getTopicTitle}
            navigate={navigate}
          />
        )}
      </AnimatePresence>

      {/* Generate Reviewer Modal */}
      <AnimatePresence>
        {isGenerateModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[var(--bg)]/90 backdrop-blur-md overflow-y-auto"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[var(--card)] w-full max-w-lg rounded-[2.5rem] shadow-fn-lg border border-[var(--border)] p-6 md:p-8 relative overflow-hidden"
            >
              {isGenerating ? (
                /* LOADING SCREEN */
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative mb-6">
                    {/* Glowing outer circle */}
                    <div className="absolute inset-0 bg-[var(--pink)]/20 blur-xl rounded-full scale-125 animate-pulse"></div>
                    {/* Animated book/heart container */}
                    <div className="w-20 h-20 bg-[var(--pink)]/10 rounded-full flex items-center justify-center text-[var(--pink)] relative border border-[var(--pink)]/20 animate-spin-slow">
                      <Sparkles size={40} className="animate-bounce" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{aiAssistantName} is reviewing... 🩺{isFrance ? '🌸' : '✨'}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic max-w-xs">
                    {isFrance 
                      ? '"Sandali lang, France! Gagawa ako ng highly detailed at high-yield study reviewer para sa\'yo, babe! ✨"'
                      : `"Please wait while ${aiAssistantName} synthesizes a highly detailed and high-yield clinical study reviewer for you! 🩺"`
                    }
                  </p>
                  {/* Subtle cute micro-animation status */}
                  <div className="mt-6 flex gap-1.5 justify-center">
                    <span className="w-2 h-2 rounded-full bg-[var(--pink)] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-[var(--pink)] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-[var(--pink)] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              ) : (
                /* SELECTION FORM */
                <div className="space-y-6">
                  {/* Close button */}
                  <button 
                    onClick={() => {
                      setSelectedUploadIds([])
                      setIsGenerateModalOpen(false)
                    }}
                    className="absolute top-4 md:top-6 right-4 md:right-6 p-1.5 md:p-2 rounded-full hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-colors"
                  >
                    <X size={16} />
                  </button>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-1">Generate Reviewer 🩺{isFrance ? '🌸' : '✨'}</h2>
                    <p className="text-xs text-[var(--text-secondary)] font-medium">
                      {isFrance 
                        ? 'Doc Uno will create a personalized study guide or slides for you, babe! 🌸'
                        : `${aiAssistantName} will create a professional study guide or slides for you!`
                      }
                    </p>
                  </div>

                  {/* STEP 1: SOURCE TYPE TAB */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">1. Choose Study Source</label>
                    <div className="grid grid-cols-2 gap-2 bg-[var(--bg)] p-1 rounded-2xl border border-[var(--border)]">
                      <button
                        type="button"
                        onClick={() => setGenerationSourceType('topic')}
                        className={cn(
                          "py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all",
                          generationSourceType === 'topic' 
                            ? "bg-white text-[var(--pink)] shadow-sm border border-[var(--border)]" 
                            : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                        )}
                      >
                        <span className="sm:hidden">Subject Topic</span>
                        <span className="hidden sm:inline">By BSN Subject Topic</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGenerationSourceType('uploaded')}
                        className={cn(
                          "py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all",
                          generationSourceType === 'uploaded' 
                            ? "bg-white text-[var(--pink)] shadow-sm border border-[var(--border)]" 
                            : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                        )}
                      >
                        <span className="sm:hidden">Study Box Files</span>
                        <span className="hidden sm:inline">From Study Box Files</span>
                      </button>
                    </div>
                  </div>

                  {/* STEP 2: SELECT TOPIC OR FILES */}
                  <div className="space-y-2">
                    {generationSourceType === 'topic' ? (
                      /* TOPIC DROPDOWN */
                      <>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">2. Select BSN Subject Topic</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsTopicDropdownOpen(!isTopicDropdownOpen)}
                            className="w-full flex items-center justify-between bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-4 py-3.5 text-sm font-semibold text-left focus:border-[var(--pink)] transition-all active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-2">
                              <span 
                                className="w-3 h-3 rounded-full shrink-0" 
                                style={{ backgroundColor: topics.find(t => t.id === selectedTopicId)?.color || 'var(--pink)' }}
                              />
                              <span className="truncate">{topics.find(t => t.id === selectedTopicId)?.title || 'Select Subject'}</span>
                            </div>
                            <ChevronUp 
                              size={18} 
                              className={cn(
                                "text-[var(--text-secondary)] transition-transform duration-300 shrink-0",
                                isTopicDropdownOpen ? "" : "rotate-180"
                              )} 
                            />
                          </button>

                          <AnimatePresence>
                            {isTopicDropdownOpen && (
                              <>
                                {/* Backdrop overlay to close when clicking outside */}
                                <div 
                                  className="fixed inset-0 z-40 cursor-default" 
                                  onClick={() => setIsTopicDropdownOpen(false)}
                                />
                                
                                <motion.div
                                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-[var(--border)] rounded-[1.5rem] shadow-fn-lg max-h-60 overflow-y-auto custom-scrollbar p-2"
                                >
                                  <div className="space-y-1">
                                    {topics.map(t => (
                                      <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedTopicId(t.id)
                                          setIsTopicDropdownOpen(false)
                                        }}
                                        className={cn(
                                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all hover:bg-[var(--pink)]/5",
                                          selectedTopicId === t.id 
                                            ? "bg-[var(--pink)]/10 text-[var(--pink)]" 
                                            : "text-[var(--text)]"
                                        )}
                                      >
                                        <span 
                                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                                          style={{ backgroundColor: t.color }}
                                        />
                                        <span className="truncate">{t.title}</span>
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </>
                    ) : (
                      /* FILE CHECKBOXES LIST */
                      <>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">2. Select Notes/Files from Study Box</label>
                        {items.length === 0 ? (
                          <div className="p-4 bg-[var(--pink)]/5 rounded-2xl border border-[var(--pink)]/10 text-center">
                            <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                              {isFrance 
                                ? <>Your Study Box is empty, France! 🌸<br />Pumunta muna sa Study Box page para mag-upload ng mga medical notes o files.</>
                                : <>Your Study Box is currently empty! 🩺<br />Please go to the Study Box page and upload clinical notes or study files first.</>
                              }
                            </p>
                          </div>
                        ) : (
                          <div className="max-h-40 overflow-y-auto border border-[var(--border)] rounded-2xl p-3 bg-[var(--bg)]/50 space-y-2 custom-scrollbar">
                            {items.map(item => {
                              const isChecked = selectedUploadIds.includes(item.id)
                              return (
                                <label 
                                  key={item.id}
                                  className={cn(
                                    "flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer bg-white text-xs font-semibold hover:border-[var(--pink)]/50",
                                    isChecked ? "border-[var(--pink)] bg-[var(--pink)]/5" : "border-[var(--border)]"
                                  )}
                                >
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setSelectedUploadIds(prev => 
                                        prev.includes(item.id)
                                          ? prev.filter(id => id !== item.id)
                                          : [...prev, item.id]
                                      )
                                    }}
                                    className="accent-[var(--pink)] w-4 h-4"
                                  />
                                  <div className="flex-1 truncate">
                                    <p className="truncate text-xs">{item.file_name}</p>
                                    <p className="text-[10px] text-[var(--text-secondary)] truncate">
                                      {topics.find(t => t.id === item.topic_id)?.title || 'General'}
                                    </p>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* STEP 3: FORMAT SELECTOR */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">3. Choose Reviewer Format</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setReviewerType('study_guide')}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all hover:scale-[1.02]",
                          reviewerType === 'study_guide' 
                            ? "border-[var(--pink)] bg-[var(--pink)]/5" 
                            : "border-[var(--border)] bg-white"
                        )}
                      >
                        <FileText size={24} className={reviewerType === 'study_guide' ? "text-[var(--pink)]" : "text-[var(--text-secondary)]"} />
                        <span className="text-xs font-bold mt-2">Study Guide</span>
                        <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">Flashcards & Mnemonics</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setReviewerType('slides')}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all hover:scale-[1.02]",
                          reviewerType === 'slides' 
                            ? "border-[var(--pink)] bg-[var(--pink)]/5" 
                            : "border-[var(--border)] bg-white"
                        )}
                      >
                        <Play size={24} fill={reviewerType === 'slides' ? "currentColor" : "none"} className={reviewerType === 'slides' ? "text-[var(--pink)]" : "text-[var(--text-secondary)]"} />
                        <span className="text-xs font-bold mt-2">Slide Deck</span>
                        <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">PowerPoint Presentation</span>
                      </button>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUploadIds([])
                        setIsGenerateModalOpen(false)
                      }}
                      className="btn-ghost flex-1 py-2.5 text-[10px] sm:text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateReviewer}
                      disabled={generationSourceType === 'uploaded' && selectedUploadIds.length === 0}
                      className="btn-primary flex-1 py-2.5 text-[10px] sm:text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Sparkles size={12} />
                      <span className="sm:hidden">Generate</span>
                      <span className="hidden sm:inline">Generate Reviewer</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ReviewerDetail({ reviewer, onClose, getTopicColor, getTopicTitle, navigate }: { 
  reviewer: ReviewerItem, 
  onClose: () => void,
  getTopicColor: (id: string | null) => string,
  getTopicTitle: (id: string | null) => string,
  navigate: any
}) {
  const { isFrance, aiAssistantName } = usePersonalization()
  const [activeTab, setActiveTab] = useState<string>('summary')

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4 bg-[var(--bg)]/90 backdrop-blur-md overflow-y-auto pt-10 md:pt-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[var(--card)] w-full max-w-5xl max-h-[90vh] md:h-[85vh] rounded-[2.5rem] shadow-fn-lg border border-[var(--border)] overflow-hidden flex flex-col my-auto"
      >
        {/* Header */}
        <div className="p-4 md:p-8 flex flex-col md:flex-row gap-4 md:gap-6 border-b border-[var(--border)] bg-gradient-to-br from-[var(--pink)]/10 to-[var(--secondary-bg)]/20 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 md:top-6 right-4 md:right-6 p-2 rounded-full hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-colors"
          >
            <X size={20} />
          </button>

          <div 
            className="w-12 h-12 md:w-16 md:h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-md shrink-0 mx-auto md:mx-0"
            style={{ backgroundColor: getTopicColor(reviewer.topic_id) }}
          >
            <BookOpen size={24} className="md:size-8" />
          </div>

          <div className="text-center md:text-left min-w-0 pr-8 md:pr-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-white rounded-full text-[var(--text-secondary)] shadow-sm">
                {getTopicTitle(reviewer.topic_id)}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 font-medium whitespace-nowrap">
                <Clock size={12} /> {formatRelativeDate(reviewer.created_at)}
              </span>
            </div>
            <h2 className="text-lg md:text-2xl font-bold tracking-tight truncate">{reviewer.title}</h2>
            <p className="text-xs md:text-sm text-[var(--text-secondary)] font-medium italic truncate">Source: {reviewer.source_file}</p>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[var(--border)] p-3 md:p-4 bg-[var(--bg)]/30 overflow-y-auto custom-scrollbar md:max-h-none max-h-40 shrink-0">
            <div className="space-y-2">
              {(() => {
                const isPresentation = reviewer.content.slides && reviewer.content.slides.length > 0;
                const tabs = isPresentation ? [
                  { id: 'summary', icon: FileText, label: 'AI Summary' },
                  { id: 'slides', icon: Play, label: 'Slide Deck' }
                ] : [
                  { id: 'summary', icon: FileText, label: 'AI Summary' },
                  { id: 'key_points', icon: Sparkles, label: 'Key Points' },
                  { id: 'flashcards', icon: Zap, label: 'Flashcards' },
                  { id: 'mnemonics', icon: RotateCcw, label: 'Mnemonics' }
                ];
                return tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-heading font-semibold text-sm transition-all",
                      activeTab === tab.id 
                        ? "bg-white text-[var(--pink)] shadow-sm border border-[var(--border)]" 
                        : "text-[var(--text-secondary)] hover:bg-white/50"
                    )}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ));
              })()}
            </div>
            
            <div className="mt-8 p-4 bg-[var(--pink)]/5 rounded-2xl border border-[var(--pink)]/10">
               <p className="text-[10px] font-bold text-[var(--pink)] uppercase tracking-widest mb-1">
                 {isFrance ? "Doc Uno's Insight 🩺" : `${aiAssistantName}'s Clinical Insight 🩺`}
               </p>
               <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                 {isFrance 
                   ? '"Focus on the patient safety rationales in this section, France! ✨"'
                   : `"Focus closely on the clinical rationales and nursing interventions outlined here. ✨"`
                 }
               </p>
            </div>
          </div>
 
          {/* Tab Content */}
          <div className="flex-1 p-4 md:p-10 overflow-y-auto custom-scrollbar min-h-0">
             <AnimatePresence mode="wait">
               {activeTab === 'summary' && (
                 <motion.div 
                   key="summary"
                   initial={{ opacity: 0, x: 10 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -10 }}
                   className="space-y-6 pb-10"
                 >
                    <div>
                      <h3 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
                        <FileText className="text-[var(--pink)]" size={20} />
                        AI Summary
                      </h3>
                      <div className="text-sm md:text-base text-[var(--text)] leading-relaxed">
                        <MarkdownText content={reviewer.content.summary} />
                      </div>
                    </div>
                    <div className="bg-[var(--secondary-bg)]/20 p-4 md:p-6 rounded-3xl border border-[var(--border)]">
                       <h4 className="font-bold text-xs md:text-sm mb-3 uppercase tracking-widest text-[var(--pink)]">
                         {isFrance ? "Doc Uno's Simple Explanation" : `${aiAssistantName}'s Clinical Breakdown`}
                       </h4><div className="text-sm md:text-base italic leading-relaxed text-[var(--text-secondary)]">
                         <MarkdownText content={reviewer.content.simplified_explanation} />
                       </div>
                    </div>
                 </motion.div>
               )}

               {activeTab === 'key_points' && (
                 <motion.div 
                   key="key_points"
                   initial={{ opacity: 0, x: 10 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="space-y-4 pb-10"
                 >
                    <h3 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
                      <Sparkles className="text-[var(--pink)]" size={20} />
                      Key Concepts
                    </h3>
                    <div className="space-y-3">
                      {reviewer.content.key_points.map((point, i) => (
                        <div key={i} className="flex gap-3 p-3 md:p-4 bg-white border border-[var(--border)] rounded-2xl shadow-sm">
                           <div className="w-6 h-6 rounded-full bg-[var(--secondary-bg)] flex items-center justify-center shrink-0 text-[var(--pink)] text-xs font-bold">{i+1}</div>
                           <p className="text-sm md:text-base font-medium">{point}</p>
                        </div>
                      ))}
                    </div>
                 </motion.div>
               )}

               {activeTab === 'flashcards' && (
                  <motion.div 
                    key="flashcards"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                        <Zap className="text-[var(--pink)]" size={20} />
                        Flashcards
                      </h3>
                      <p className="text-[9px] md:text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Tap to flip</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-10">
                      {reviewer.content.flashcards.map((card) => (
                        <FlashcardItem key={card.id} card={card} />
                      ))}
                    </div>
                  </motion.div>
                )}

               {activeTab === 'mnemonics' && (
                  <motion.div 
                    key="mnemonics"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <h3 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
                      <RotateCcw className="text-[var(--pink)]" size={20} />
                      Memory Aids
                    </h3>
                     <div className="space-y-4 pb-10">
                        {reviewer.content.mnemonics.map((m) => (
                          <div key={m.id} className="p-4 md:p-6 bg-white border border-[var(--border)] rounded-3xl shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                               <Sparkles size={48} />
                            </div>
                            <h4 className="text-lg font-bold text-[var(--pink)] mb-3">{m.title}</h4>
                            <div className="space-y-2">
                               {m.content.split('\n').map((line, idx) => (
                                 <div key={idx} className="flex gap-2 text-sm font-medium">
                                   <span className="text-[var(--pink)]">•</span>
                                   <p className={cn("tracking-wide", line.length < 50 ? "uppercase" : "")}>{line}</p>
                                 </div>
                               ))}
                            </div>
                         </div>
                       ))}
                     </div>
                  </motion.div>
                )}

                {activeTab === 'slides' && reviewer.content.slides && (
                  <motion.div 
                    key="slides"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6 pb-10"
                  >
                    <SlideViewer slides={reviewer.content.slides} />
                  </motion.div>
                )}
             </AnimatePresence>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 md:p-6 border-t border-[var(--border)] bg-[var(--bg)]/50 flex flex-col md:flex-row gap-2 md:gap-3 md:items-center md:justify-between">
           <button onClick={onClose} className="btn-ghost w-full md:w-auto justify-center md:justify-start text-xs">Close Reviewer</button>
           <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              <button 
                onClick={() => exportToPDF(reviewer)}
                className="btn-secondary px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs flex items-center gap-1 md:gap-1.5"
              >
                <Download size={11} /> PDF
              </button>
              <button 
                onClick={() => exportToDOCX(reviewer)}
                className="btn-secondary px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs flex items-center gap-1 md:gap-1.5"
              >
                <FileText size={11} /> DOCX
              </button>
              {reviewer.content.slides && reviewer.content.slides.length > 0 && (
                <button 
                  onClick={() => exportToPPTX(reviewer)}
                  className="btn-primary px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs flex items-center gap-1 md:gap-1.5 bg-gradient-to-r from-[var(--pink)] to-[#F7A8B8] hover:opacity-90 shadow-fn text-white font-bold"
                >
                  <Download size={11} /> PPTX
                </button>
              )}
               <button 
                 onClick={() => printFlashcards(reviewer)}
                 disabled={!reviewer.content.flashcards || reviewer.content.flashcards.length === 0}
                 className="btn-secondary px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs flex items-center gap-1 md:gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
               >
                 <Printer size={11} /> Print
               </button>
              <button 
                onClick={() => {
                  navigate('/quiz', {
                    state: {
                      preSelectedTopic: reviewer.title,
                      preSelectedText: reviewer.content.summary + '\n\n' + (reviewer.content.key_points && reviewer.content.key_points.length > 0 ? reviewer.content.key_points.join('\n') : ''),
                      preSelectedName: reviewer.source_file
                    }
                  })
                  onClose()
                }}
                className="btn-primary px-3 md:px-6 py-1.5 md:py-2 text-[10px] md:text-sm flex items-center gap-1 md:gap-1.5"
              >
                <Play size={11} fill="currentColor" /> Quiz
              </button>
           </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
function FlashcardItem({ card }: { card: any }) {
  const [isFlipped, setIsFlipped] = useState(false)
  
  return (
    <div 
      className="h-48 perspective cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
       <div className={cn(
         "relative w-full h-full transition-all duration-500 transform-style-3d",
         isFlipped && "rotate-y-180"
       )}>
          {/* Front */}
          <div className="absolute inset-0 backface-hidden bg-white border border-[var(--border)] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm overflow-y-auto custom-scrollbar">
             <p className="text-[10px] font-bold text-[var(--pink)] uppercase tracking-widest mb-2">Question</p>
             <p className="text-sm font-bold leading-relaxed">{card.front}</p>
          </div>
          {/* Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[var(--pink)] text-white rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-md overflow-y-auto custom-scrollbar">
             <p className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-80">Answer</p>
             <p className="text-sm font-bold leading-relaxed">{card.back}</p>
          </div>
       </div>
    </div>
  )
}


function SlideViewer({ slides }: { slides: any[] }) {
  const { isFrance, aiAssistantName } = usePersonalization()
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0)
  
  if (!slides || slides.length === 0) return <p className="text-center text-[var(--text-secondary)]">No slides found. {isFrance ? '🌸' : '🩺'}</p>
  
  const currentSlide = slides[currentSlideIdx]
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
          <Play className="text-[var(--pink)]" size={20} fill="currentColor" />
          Slide Deck
        </h3>
        <span className="text-[10px] md:text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest bg-[var(--secondary-bg)]/20 px-2 md:px-3 py-1 rounded-full border border-[var(--border)] shrink-0">
          {currentSlideIdx + 1}/{slides.length}
        </span>
      </div>
      
      {/* Slide Container */}
      <div className="bg-white border-2 border-[var(--border)] rounded-3xl p-4 md:p-8 shadow-md relative min-h-[250px] flex flex-col justify-between overflow-hidden">
        {/* Slide Title */}
        <div>
          <h4 className="text-lg md:text-2xl font-bold text-[var(--pink)] mb-4 md:mb-6 border-b border-[var(--border)] pb-3 md:pb-4">
            {currentSlide.title}
          </h4>
          
          {/* Bullet Points */}
          <ul className="space-y-3 md:space-y-4">
            {currentSlide.bullet_points.map((pt: string, idx: number) => (
              <li key={idx} className="text-sm md:text-base font-medium text-[var(--text)] flex items-start gap-2 md:gap-3">
                <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[var(--pink)] shrink-0 mt-1.5 md:mt-2"></span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Navigation Controls inside Slide */}
        <div className="flex items-center justify-between mt-6 md:mt-8 border-t border-[var(--border)] pt-3 md:pt-4 gap-2">
          <button 
            disabled={currentSlideIdx === 0}
            onClick={() => setCurrentSlideIdx(prev => prev - 1)}
            className="btn-secondary px-3 md:px-4 py-1.5 md:py-2 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] md:text-xs flex items-center gap-1"
          >
            ← Prev
          </button>
          
          <div className="flex gap-1 md:gap-1.5">
            {slides.map((_, idx) => (
              <span 
                key={idx} 
                className={cn(
                  "w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all duration-300", 
                  idx === currentSlideIdx ? "bg-[var(--pink)] w-3 md:w-5" : "bg-[var(--border)]"
                )}
              />
            ))}
          </div>
          
          <button 
            disabled={currentSlideIdx === slides.length - 1}
            onClick={() => setCurrentSlideIdx(prev => prev + 1)}
            className="btn-primary px-3 md:px-4 py-1.5 md:py-2 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] md:text-xs flex items-center gap-1"
          >
            Next →
          </button>
        </div>
      </div>
      
      {/* Presenter Notes */}
      {currentSlide.presenter_notes && (
        <div className="bg-[var(--pink)]/5 p-6 rounded-3xl border border-[var(--pink)]/10">
          <p className="text-[10px] font-bold text-[var(--pink)] uppercase tracking-widest mb-2 flex items-center gap-1.5">
            {isFrance ? "Doc Uno's Presentation Script 🩺" : `${aiAssistantName}'s Presentation Script 🩺`}
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">
            "{currentSlide.presenter_notes}"
          </p>
        </div>
      )}
    </div>
  )
}
