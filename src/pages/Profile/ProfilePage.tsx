import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileMediaStore, readImageFile } from '@/stores/profileMediaStore'
import type { CropSettings } from '@/stores/profileMediaStore'
import ImageCropDialog from '@/components/profile/ImageCropDialog'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useStudyBoxStore, isReferenceArticle } from '@/stores/studyBoxStore'
import { useQuizStore } from '@/stores/quizStore'
import { useReviewerStore } from '@/stores/reviewerStore'
import { useRetDemStore } from '@/stores/retDemStore'
import { useReminderStore } from '@/stores/reminderStore'
import { User, SignOut as LogOut, Moon, Sun, Calendar, GraduationCap, CaretRight as ChevronRight, Camera, Check, Lock, Footprints, Target, FirstAidKit, Books, Exam, Trophy, MoonStars, Star, PresentationChart, Certificate, Folder, Heart, Medal, ImageSquare, Crop, UploadSimple, Trash } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import PageHeader from '@/components/shared/PageHeader'
import { AnimatePresence } from 'framer-motion'
import { cn, formatDate } from '@/lib/utils'
import { usePersonalization } from '@/hooks/usePersonalization'
import { toast, confirmDialog } from '@/stores/feedbackStore'

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
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const { isFrance, aiAssistantName, greetingName, studyBoxName } = usePersonalization()

  const [editForm, setEditForm] = useState({
    full_name: user?.full_name || '',
    school: user?.school || '',
    year_level: user?.year_level || ''
  })
  const [savedAt, setSavedAt] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  const { items, topics } = useStudyBoxStore()
  const { quizzes } = useQuizStore()
  const { reviewers } = useReviewerStore()
  const { procedures } = useRetDemStore()
  const { reminders } = useReminderStore()

  // Profile photo and cover: originals are kept so either can be re-adjusted later
  const media = useProfileMediaStore()
  const fetchMedia = useProfileMediaStore(st => st.fetchMedia)
  const mediaLoadedFor = useProfileMediaStore(st => st.loadedFor)
  useEffect(() => {
    if (user?.id && mediaLoadedFor !== user.id) fetchMedia(user.id)
  }, [user?.id, mediaLoadedFor, fetchMedia])

  const [photoMenu, setPhotoMenu] = useState<null | 'avatar' | 'cover'>(null)
  const [cropJob, setCropJob] = useState<null | { kind: 'avatar' | 'cover'; image: string; initial: CropSettings | null }>(null)

  const pickPhoto = async (kind: 'avatar' | 'cover', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setCropJob({ kind, image: await readImageFile(file), initial: null })
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't open that photo.", 'error')
    }
  }

  const adjustPhoto = (kind: 'avatar' | 'cover') => {
    setPhotoMenu(null)
    if (kind === 'avatar') {
      const image = media.avatar_original || user?.avatar_url
      if (image) setCropJob({ kind, image, initial: media.avatar_original ? media.avatar_crop : null })
    } else if (media.cover_original || media.cover_image) {
      setCropJob({ kind, image: (media.cover_original || media.cover_image)!, initial: media.cover_original ? media.cover_crop : null })
    }
  }

  const saveCrop = async (cropped: string, settings: CropSettings) => {
    if (!cropJob || !user) return
    try {
      if (cropJob.kind === 'avatar') {
        await updateProfile({ avatar_url: cropped })
        await media.saveMedia(user.id, { avatar_original: cropJob.image, avatar_crop: settings })
        toast('Profile picture updated.', 'success')
      } else {
        await media.saveMedia(user.id, { cover_image: cropped, cover_original: cropJob.image, cover_crop: settings })
        toast('Cover photo updated.', 'success')
      }
      setCropJob(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't save your photo. Check your connection and try again.", 'error')
    }
  }

  const removePhoto = async (kind: 'avatar' | 'cover') => {
    setPhotoMenu(null)
    if (!user) return
    const ok = await confirmDialog({ title: kind === 'avatar' ? 'Remove profile picture?' : 'Remove cover photo?', confirmLabel: 'Remove', danger: true })
    if (!ok) return
    try {
      if (kind === 'avatar') {
        await updateProfile({ avatar_url: null })
        await media.saveMedia(user.id, { avatar_original: null, avatar_crop: null })
      } else {
        await media.saveMedia(user.id, { cover_image: null, cover_original: null, cover_crop: null })
      }
      toast(kind === 'avatar' ? 'Profile picture removed.' : 'Cover photo removed.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't remove the photo.", 'error')
    }
  }

  // Calculate dynamic stats
  const completedQuizzes = quizzes.filter(q => q.completed).length
  const uploads = items.filter(i => !isReferenceArticle(i))
  const favoritesCount = items.filter(item => item.is_favorite).length + reviewers.filter(r => r.is_favorite).length

  const badgesList: { icon: Icon; label: string; desc: string; unlocked: boolean }[] = [
    { icon: Footprints, label: 'First Step', desc: 'Created your first reviewer', unlocked: reviewers.length > 0 },
    { icon: Target, label: 'Quiz Whiz', desc: 'Scored 100% on a quiz', unlocked: quizzes.some(q => q.score !== null && q.score === 100) },
    { icon: FirstAidKit, label: 'Clinical Explorer', desc: 'Generated a RetDem procedure', unlocked: procedures.length > 0 },
    { icon: Books, label: 'Scholar', desc: `Uploaded 5+ files to ${studyBoxName}`, unlocked: uploads.length >= 5 },
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

  const assistantNote = uploads.length === 0 ? (
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
      ? `${greetingName}, you've uploaded ${uploads.length} note${uploads.length > 1 ? 's' : ''} to your Study Box! Let's turn them into reviewers next.`
      : `${greetingName}, you have ${uploads.length} note${uploads.length > 1 ? 's' : ''} in your Study Box. Generate a study guide from them next.`
  )

  return (
    <div className="page-container max-w-5xl overflow-x-hidden">
      <PageHeader icon={User} title="Profile & Settings" subtitle="Your account, progress and preferences." />

      {/* Profile hero */}
      <section className="fn-card mb-5">
        <div className="relative rounded-t-[inherit] h-32 sm:h-auto sm:aspect-[4/1] bg-gradient-to-r from-th-pink/25 via-[var(--rose-soft)] to-th-pink/10">
          {media.cover_image && <img src={media.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover rounded-t-[inherit]" />}
          <div className="absolute top-3 right-3">
            <button
              onClick={() => (media.cover_image ? setPhotoMenu(photoMenu === 'cover' ? null : 'cover') : coverInputRef.current?.click())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/35 hover:bg-black/50 backdrop-blur text-white text-[12.5px] font-medium transition-colors"
            >
              <ImageSquare size={15} /> {media.cover_image ? 'Edit cover' : 'Add cover photo'}
            </button>
            {photoMenu === 'cover' && (
              <PhotoMenu
                className="right-0 top-full mt-1.5"
                onClose={() => setPhotoMenu(null)}
                items={[
                  { label: 'Adjust cover', icon: Crop, onClick: () => adjustPhoto('cover') },
                  { label: 'Upload new cover', icon: UploadSimple, onClick: () => { setPhotoMenu(null); coverInputRef.current?.click() } },
                  { label: 'Remove cover', icon: Trash, onClick: () => removePhoto('cover'), danger: true },
                ]}
              />
            )}
          </div>
          <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={e => pickPhoto('cover', e)} />
        </div>
        <div className="px-5 sm:px-7 pb-6 -mt-12 sm:-mt-14 flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="relative shrink-0">
          <button
            onClick={() => (user?.avatar_url ? setPhotoMenu(photoMenu === 'avatar' ? null : 'avatar') : avatarInputRef.current?.click())}
            className="relative w-24 h-24 sm:w-28 sm:h-28 group block"
            aria-label="Change profile picture"
          >
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
          {photoMenu === 'avatar' && (
            <PhotoMenu
              className="left-0 top-full mt-1.5"
              onClose={() => setPhotoMenu(null)}
              items={[
                { label: 'Adjust current photo', icon: Crop, onClick: () => adjustPhoto('avatar') },
                { label: 'Upload new photo', icon: UploadSimple, onClick: () => { setPhotoMenu(null); avatarInputRef.current?.click() } },
                { label: 'Remove photo', icon: Trash, onClick: () => removePhoto('avatar'), danger: true },
              ]}
            />
          )}
          <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={e => pickPhoto('avatar', e)} />
          </div>

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

      <AnimatePresence>
        {cropJob && (
          <ImageCropDialog
            key={cropJob.image.length + cropJob.kind}
            image={cropJob.image}
            title={cropJob.kind === 'avatar' ? 'Adjust profile picture' : 'Adjust cover photo'}
            aspect={cropJob.kind === 'avatar' ? 1 : 4}
            round={cropJob.kind === 'avatar'}
            outputWidth={cropJob.kind === 'avatar' ? 192 : 1600}
            initial={cropJob.initial}
            onCancel={() => setCropJob(null)}
            onSave={saveCrop}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PhotoMenu({ items, onClose, className }: {
  items: { label: string; icon: Icon; onClick: () => void; danger?: boolean }[]
  onClose: () => void
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    // Wait a tick so the tap that opened the menu doesn't close it
    const id = setTimeout(() => document.addEventListener('pointerdown', close), 0)
    return () => { clearTimeout(id); document.removeEventListener('pointerdown', close) }
  }, [onClose])
  return (
    <div ref={ref} className={cn('absolute z-30 w-52 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-fn-lg p-1.5', className)}>
      {items.map(item => (
        <button
          key={item.label}
          onClick={item.onClick}
          className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-left hover:bg-[var(--rose-soft)]', item.danger ? 'text-[var(--error)]' : 'text-[var(--text)]')}
        >
          <item.icon size={16} /> {item.label}
        </button>
      ))}
    </div>
  )
}
