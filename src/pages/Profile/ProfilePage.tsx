import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { useQuizStore } from '@/stores/quizStore'
import { useReviewerStore } from '@/stores/reviewerStore'
import { useRetDemStore } from '@/stores/retDemStore'
import { useReminderStore } from '@/stores/reminderStore'
import { User, SignOut as LogOut, Moon, Sun, Calendar, GraduationCap, CaretRight as ChevronRight, Camera, Check, Lock, Footprints, Target, FirstAidKit, Books, Exam, Trophy, MoonStars, Star, PresentationChart, Certificate, Folder, Heart, Medal } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatDate } from '@/lib/utils'
import { usePersonalization } from '@/hooks/usePersonalization'
import { toast } from '@/stores/feedbackStore'

const YEAR_LEVELS = [
  { value: '1st Year', label: '1st Year' },
  { value: '2nd Year', label: '2nd Year' },
  { value: '3rd Year', label: '3rd Year' },
  { value: '4th Year', label: '4th Year' },
  { value: 'RN', label: 'Registered Nurse' },
]

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuthStore()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { isFrance, aiAssistantName, greetingName, studyBoxName } = usePersonalization()

  const [editForm, setEditForm] = useState({
    full_name: user?.full_name || '',
    school: user?.school || '',
    year_level: user?.year_level || ''
  })
  const [savedAt, setSavedAt] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // Cropper State
  const [selectedImageToCrop, setSelectedImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const { items, topics } = useStudyBoxStore()
  const { quizzes } = useQuizStore()
  const { reviewers } = useReviewerStore()
  const { procedures } = useRetDemStore()
  const { reminders } = useReminderStore()

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setSelectedImageToCrop(reader.result)
          setCrop({ x: 0, y: 0 })
          setZoom(1)
        }
      }
      reader.readAsDataURL(file)
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const handleCropSave = async () => {
    if (!selectedImageToCrop || !croppedAreaPixels) return

    try {
      const img = new Image()
      img.src = selectedImageToCrop
      
      await new Promise((resolve) => {
        img.onload = resolve
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      const MAX_SIZE = 150
      canvas.width = MAX_SIZE
      canvas.height = MAX_SIZE
      
      if (ctx) {
        ctx.drawImage(
          img,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          MAX_SIZE,
          MAX_SIZE
        )
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)
        await updateProfile({ avatar_url: compressedBase64 })
        toast('Profile picture updated.', 'success')
      }
    } catch (e) {
      console.error(e)
      toast('Couldn\'t save your profile picture. Check your connection and try again.', 'error')
    } finally {
      setSelectedImageToCrop(null)
    }
  }

  // Calculate dynamic stats
  const completedQuizzes = quizzes.filter(q => q.completed).length
  const favoritesCount = items.filter(item => item.is_favorite).length + reviewers.filter(r => r.is_favorite).length

  const badgesList: { icon: Icon; label: string; desc: string; unlocked: boolean }[] = [
    { icon: Footprints, label: 'First Step', desc: 'Created your first reviewer', unlocked: reviewers.length > 0 },
    { icon: Target, label: 'Quiz Whiz', desc: 'Scored 100% on a quiz', unlocked: quizzes.some(q => q.score !== null && q.score === 100) },
    { icon: FirstAidKit, label: 'Clinical Explorer', desc: 'Generated a RetDem procedure', unlocked: procedures.length > 0 },
    { icon: Books, label: 'Scholar', desc: `Uploaded 5+ files to ${studyBoxName}`, unlocked: items.length >= 5 },
    { icon: Exam, label: 'Pathology Master', desc: 'Completed 3+ quizzes', unlocked: completedQuizzes >= 3 },
    { icon: Trophy, label: 'Board Topnotcher', desc: 'Average quiz score of 85% or more', unlocked: quizzes.length > 0 && (quizzes.reduce((acc, q) => acc + (q.score || 0), 0) / quizzes.length) >= 85 },
    { icon: MoonStars, label: 'Night Duty', desc: 'Added a clinical duty to the planner', unlocked: reminders.some(r => r.reminder_type === 'duty') },
    { icon: Star, label: isFrance ? "Uno's Favorite" : 'Starred Scholar', desc: 'Favorited 5+ materials', unlocked: favoritesCount >= 5 },
    { icon: PresentationChart, label: 'Fast Learner', desc: 'Created a slide presentation', unlocked: reviewers.some(r => r.content.slides && r.content.slides.length > 0) },
    { icon: Certificate, label: 'NCLEX Survivor', desc: 'Finished an NCLEX-style quiz', unlocked: quizzes.some(q => q.question_type === 'nclex' && q.completed) },
  ]
  const badgesCount = badgesList.filter(b => b.unlocked).length

  const stats = [
    { label: 'Topics', value: topics.length, icon: Folder },
    { label: 'Quizzes done', value: completedQuizzes, icon: Exam },
    { label: 'Badges', value: badgesCount, icon: Medal },
    { label: 'Favorites', value: favoritesCount, icon: Heart },
  ]

  const isDirty = editForm.full_name !== (user?.full_name || '') || editForm.school !== (user?.school || '') || editForm.year_level !== (user?.year_level || '')

  const assistantNote = items.length === 0 ? (
    isFrance
      ? "Babe, I haven't seen your materials in the Study Box yet! Upload your notes so I can turn them into reviewers. I believe in you."
      : "I haven't seen any study materials in your Study Box yet. Upload your nursing notes and I'll turn them into study guides."
  ) : completedQuizzes > 0 ? (
    isFrance
      ? `${greetingName}, you've completed ${completedQuizzes} quiz${completedQuizzes > 1 ? 'zes' : ''} already! You're getting closer to that RN title every day. Drink some water and keep going.`
      : `${greetingName}, you've completed ${completedQuizzes} quiz${completedQuizzes > 1 ? 'zes' : ''}. Steady progress toward your RN license. Keep it up.`
  ) : reviewers.length > 0 ? (
    isFrance
      ? `You already have ${reviewers.length} reviewer${reviewers.length > 1 ? 's' : ''}, babe! Try a quiz or a RetDem next to lock it in. I'm so proud of you.`
      : `You have ${reviewers.length} study guide${reviewers.length > 1 ? 's' : ''}. Try a quiz or a clinical simulation next to test your recall.`
  ) : (
    isFrance
      ? `${greetingName}, you've uploaded ${items.length} note${items.length > 1 ? 's' : ''} to your Study Box! Let's turn them into reviewers next.`
      : `${greetingName}, you have ${items.length} note${items.length > 1 ? 's' : ''} in your Study Box. Generate a study guide from them next.`
  )

  return (
    <div className="page-container max-w-5xl overflow-x-hidden">
      <PageHeader icon={User} title="Profile & Settings" subtitle="Your account, progress and preferences." />

      {/* Profile hero */}
      <section className="fn-card overflow-hidden mb-5">
        <div className="h-24 sm:h-28 bg-gradient-to-r from-th-pink/25 via-[var(--rose-soft)] to-th-pink/10" />
        <div className="px-5 sm:px-7 pb-6 -mt-12 sm:-mt-14 flex flex-col sm:flex-row sm:items-start gap-4">
          <button onClick={handleAvatarClick} className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 group" aria-label="Change profile picture">
            <div className="w-full h-full rounded-full border-4 border-[var(--card)] bg-[var(--rose-soft)] overflow-hidden shadow-fn">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-heading font-semibold text-[var(--pink)]">{user?.full_name?.charAt(0)}</div>
              )}
              <div className="absolute inset-1 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera size={22} className="text-white" />
              </div>
            </div>
            <span className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[var(--pink)] text-white border-2 border-[var(--card)] flex items-center justify-center">
              <Camera size={14} weight="fill" />
            </span>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />

          <div className="min-w-0 flex-1 sm:pt-[60px]">
            <h2 className="font-heading font-semibold text-2xl truncate">{user?.full_name}</h2>
            <p className="text-[13px] text-[var(--text-secondary)] flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
              {user?.year_level && <span className="px-2 py-0.5 rounded-full bg-th-pink/10 text-[var(--pink)] font-medium">{user.year_level}</span>}
              {user?.school && <span className="flex items-center gap-1"><GraduationCap size={14} /> {user.school}</span>}
              <span className="flex items-center gap-1"><Calendar size={14} /> Joined {formatDate(user?.created_at || '')}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-[var(--border)]">
          {stats.map((stat, i) => (
            <div key={stat.label} className={cn('px-5 py-4 flex items-center gap-3', i > 0 && 'sm:border-l', i % 2 === 1 && 'border-l', i >= 2 && 'border-t sm:border-t-0', 'border-[var(--border)]')}>
              <div className="w-9 h-9 rounded-xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center shrink-0"><stat.icon size={18} /></div>
              <div>
                <p className="text-lg font-semibold leading-none">{stat.value}</p>
                <p className="text-[11.5px] text-[var(--text-secondary)] mt-1">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* Personal information */}
          <section className="fn-card p-5 sm:p-6">
            <h3 className="font-heading font-semibold text-[16px]">Personal information</h3>
            <p className="text-[13px] text-[var(--text-secondary)] mb-4">Shown on your profile and used to personalize the app.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-[13px] font-medium mb-1.5">Full name</span>
                <input type="text" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} className="fn-input rounded-xl bg-[var(--card)] py-2.5 text-sm" placeholder="Your full name" />
              </label>
              <label className="block">
                <span className="block text-[13px] font-medium mb-1.5">Nursing school</span>
                <input type="text" value={editForm.school} onChange={e => setEditForm({ ...editForm, school: e.target.value })} className="fn-input rounded-xl bg-[var(--card)] py-2.5 text-sm" placeholder="University name" />
              </label>
            </div>
            <div className="mt-4">
              <span className="block text-[13px] font-medium mb-1.5">Year level</span>
              <div className="flex flex-wrap gap-1.5">
                {YEAR_LEVELS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setEditForm({ ...editForm, year_level: o.value })}
                    className={cn('px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors', editForm.year_level === o.value ? 'border-[var(--pink)] bg-[var(--rose-soft)] text-[var(--pink)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--rose-soft)]')}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-5">
              {savedAt > 0 && !isDirty && <span className="text-[12.5px] text-[var(--success)] flex items-center gap-1"><Check size={14} weight="bold" /> Saved</span>}
              <button
                disabled={!isDirty || isSaving}
                onClick={async () => {
                  setIsSaving(true)
                  try {
                    await updateProfile(editForm)
                    setSavedAt(Date.now())
                  } catch {
                    toast('Couldn\'t save your changes. Check your connection and try again.', 'error')
                  } finally {
                    setIsSaving(false)
                  }
                }}
                className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </section>

          {/* Badges */}
          <section className="fn-card p-5 sm:p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-heading font-semibold text-[16px]">Badges</h3>
              <span className="text-[12.5px] text-[var(--text-secondary)]">{badgesCount} of {badgesList.length} unlocked</span>
            </div>
            <div className="h-1.5 rounded-full bg-th-pink/10 overflow-hidden mb-5">
              <div className="h-full bg-[var(--pink)] rounded-full" style={{ width: `${(badgesCount / badgesList.length) * 100}%` }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {badgesList.map(badge => (
                <div key={badge.label} className={cn('flex items-center gap-3 p-3 rounded-xl border', badge.unlocked ? 'border-th-pink/30 bg-[var(--rose-soft)]' : 'border-[var(--border)]')}>
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', badge.unlocked ? 'bg-[var(--pink)] text-white' : 'bg-[var(--bg)] text-[var(--text-secondary)] opacity-60')}>
                    {badge.unlocked ? <badge.icon size={19} weight="fill" /> : <Lock size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className={cn('text-[13.5px] font-medium', !badge.unlocked && 'text-[var(--text-secondary)]')}>{badge.label}</p>
                    <p className="text-[11.5px] text-[var(--text-secondary)] leading-snug">{badge.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          {/* Assistant note */}
          <section className="fn-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <img src={isFrance ? '/doc-uno-avatar.jpg' : '/nurse-florence-avatar.jpg'} alt={aiAssistantName} className="w-10 h-10 rounded-full object-cover border border-th-pink/20" />
              <div>
                <p className="font-heading font-semibold text-[14px] leading-tight">{aiAssistantName}</p>
                <p className="text-[11.5px] text-[var(--text-secondary)]">A note for you</p>
              </div>
            </div>
            <p className="text-[13.5px] leading-relaxed text-[var(--text-secondary)] bg-[var(--rose-soft)] rounded-xl rounded-tl-sm p-3.5">{assistantNote}</p>
          </section>

          {/* Appearance */}
          <section className="fn-card p-5">
            <h3 className="font-heading font-semibold text-[15px] mb-3">Appearance</h3>
            <div className="grid grid-cols-2 gap-2">
              {([['light', 'Light', Sun], ['dark', 'Dark', Moon]] as const).map(([mode, label, ModeIcon]) => (
                <button
                  key={mode}
                  onClick={() => theme !== mode && toggleTheme()}
                  className={cn('p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 text-[13px] font-medium transition-colors', theme === mode ? 'border-[var(--pink)] bg-[var(--rose-soft)] text-[var(--pink)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]')}
                >
                  <ModeIcon size={22} weight={theme === mode ? 'fill' : 'regular'} />
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Account */}
          <section className="fn-card p-2">
            <button onClick={() => navigate('/update-password')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--rose-soft)] transition-colors text-left">
              <div className="w-9 h-9 rounded-xl bg-[var(--rose-soft)] text-[var(--pink)] flex items-center justify-center"><Lock size={17} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-medium">Change password</p>
                <p className="text-[11.5px] text-[var(--text-secondary)] truncate">{user?.email}</p>
              </div>
              <ChevronRight size={16} className="text-[var(--text-secondary)]" />
            </button>
            <button onClick={logout} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-th-error/5 transition-colors text-left text-[var(--error)]">
              <div className="w-9 h-9 rounded-xl bg-th-error/10 flex items-center justify-center"><LogOut size={17} /></div>
              <p className="flex-1 text-[13.5px] font-medium">Sign out</p>
            </button>
          </section>
        </div>
      </div>

      {/* Crop Modal */}
      <AnimatePresence>
        {selectedImageToCrop && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fn-card w-full max-w-md relative z-10 overflow-hidden flex flex-col bg-[var(--card)] p-6"
            >
              <h3 className="font-heading font-bold text-lg mb-4 text-center">Adjust Profile Picture</h3>
              
              <div className="relative w-full h-64 bg-black/10 rounded-2xl overflow-hidden mb-6 shadow-inner">
                <Cropper
                  image={selectedImageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedImageToCrop(null)}
                  className="flex-1 btn-ghost border border-[var(--border)] bg-transparent hover:bg-[var(--bg)]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCropSave}
                  className="flex-1 btn-primary"
                >
                  Save Picture
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
