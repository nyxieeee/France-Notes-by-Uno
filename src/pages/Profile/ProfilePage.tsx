import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Cropper, { Area, Point } from 'react-easy-crop'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { useQuizStore } from '@/stores/quizStore'
import { useReviewerStore } from '@/stores/reviewerStore'
import { useRetDemStore } from '@/stores/retDemStore'
import { useReminderStore } from '@/stores/reminderStore'
import { User, Gear as Settings, SignOut as LogOut, Moon, Sun, Medal as Award, Calendar, GraduationCap, CaretRight as ChevronRight, CaretDown as ChevronDown, Shield, Bell, Palette, Camera, X, FloppyDisk as Save, Heart, Lock } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatDate } from '@/lib/utils'
import { usePersonalization } from '@/hooks/usePersonalization'

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuthStore()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { isFrance, appName, aiAssistantName, greetingName, studyBoxName } = usePersonalization()

  const [activeSetting, setActiveSetting] = useState<string | null>(null)
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: user?.full_name || '',
    school: user?.school || '',
    year_level: user?.year_level || ''
  })
  const [notifications, setNotifications] = useState({
    reminders: true,
    updates: true,
    marketing: false
  })

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

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
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
        updateProfile({ avatar_url: compressedBase64 })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSelectedImageToCrop(null)
    }
  }

  // Calculate dynamic stats
  const coursesCount = topics.length // 23 subjects

  const favoritesCount = items.filter(item => item.is_favorite).length + reviewers.filter(r => r.is_favorite).length

  const badgesList = [
    { icon: '🩺', label: 'First Step', desc: 'Started first reviewer', unlocked: reviewers.length > 0 },
    { icon: '🧪', label: 'Quiz Whiz', desc: 'Got 100% on any quiz', unlocked: quizzes.some(q => q.score !== null && q.score === 100) },
    { icon: '🌸', label: 'Clinical Explorer', desc: 'Generated a RetDem procedure', unlocked: procedures.length > 0 },
    { icon: '📚', label: 'Scholar', desc: `Uploaded 5+ notes in ${studyBoxName}`, unlocked: items.length >= 5 },
    { icon: '🧠', label: 'Pathology Master', desc: 'Completed 3+ quizzes', unlocked: quizzes.filter(q => q.completed).length >= 3 },
    { icon: '🎀', label: 'Board Topnotcher', desc: 'Average quiz score >= 85%', unlocked: quizzes.length > 0 && (quizzes.reduce((acc, q) => acc + (q.score || 0), 0) / quizzes.length) >= 85 },
    { icon: '🏥', label: 'Night Duty', desc: 'Active duty reminder set', unlocked: reminders.some(r => r.reminder_type === 'duty') },
    { icon: '💖', label: isFrance ? "Uno's Favorite" : "Starred Scholar", desc: 'Favorited 5+ materials', unlocked: favoritesCount >= 5 },
    { icon: '🦦', label: 'Fast Learner', desc: 'Created slides presentation', unlocked: reviewers.some(r => r.content.slides && r.content.slides.length > 0) },
    { icon: '🏆', label: 'NCLEX Survivor', desc: 'Finished NCLEX style quiz', unlocked: quizzes.some(q => q.question_type === 'nclex' && q.completed) }
  ]
  const badgesCount = badgesList.filter(b => b.unlocked).length

  const stats = [
    { label: 'Courses', value: String(coursesCount), icon: GraduationCap, color: 'bg-blue-100 text-blue-600' },
    { label: 'Badges', value: String(badgesCount), icon: Award, color: 'bg-purple-100 text-purple-600' },
    { label: 'Favorites', value: String(favoritesCount), icon: Heart, color: 'bg-[var(--pink)]/10 text-[var(--pink)]' }
  ]

  const settingsOptions = [
    { icon: User, label: 'Personal Information', sub: 'Name, email, and school' },
    { icon: Bell, label: 'Notifications', sub: 'Study reminders and alerts' },
    { icon: Shield, label: 'Privacy & Security', sub: 'Password and session' },
    { icon: Palette, label: 'Appearance', sub: 'Themes and animations' },
  ]

  return (
    <div className="page-container max-w-4xl overflow-x-hidden">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Your Profile {isFrance ? '🌸' : '✨'}</h1>
        <p className="text-[var(--text-secondary)] font-medium">Manage your nursing journey and study preferences. {isFrance ? '✨' : '🩺'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
                <div className="lg:col-span-1 space-y-1">
          <div className="fn-card p-4 text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <Settings size={80} />
             </div>
             
             <div className="relative mb-6 inline-block cursor-pointer group select-none" onClick={handleAvatarClick}>
                <div className="w-28 h-28 rounded-[2.5rem] bg-[var(--secondary-bg)] border-4 border-[var(--pink)] overflow-hidden shadow-fn mx-auto transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg relative">
                   {user?.avatar_url ? (
                     <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-4xl text-[var(--pink)] font-bold">
                        {user?.full_name?.charAt(0)}
                     </div>
                   )}
                   {/* Cool premium hover overlay */}
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1">
                     <Camera size={18} className="text-white animate-pulse-soft" />
                     <span className="text-white text-[10px] font-extrabold tracking-wider uppercase font-sans">Change</span>
                   </div>
                </div>
                <button 
                  className="absolute bottom-0 right-0 p-2 bg-[var(--pink)] text-white rounded-xl shadow-lg border-2 border-white transition-all duration-300 group-hover:scale-110 pointer-events-none"
                >
                   <Camera size={16} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                />
             </div>

             <h2 className="text-xl font-bold mb-1">{user?.full_name}</h2>
             <p className="text-sm font-semibold text-[var(--pink)] mb-4">{user?.year_level}</p>
             
             <div className="space-y-3 text-sm text-[var(--text-secondary)] font-medium mb-6 mx-auto w-fit max-w-[220px]">
                <div className="flex items-start gap-3">
                   <GraduationCap size={16} className="shrink-0 mt-0.5 opacity-80" />
                   <span className="text-left leading-snug">{user?.school}</span>
                </div>
                <div className="flex items-start gap-3">
                   <Calendar size={16} className="shrink-0 mt-0.5 opacity-80" />
                   <span className="text-left">Joined {formatDate(user?.created_at || '')}</span>
                </div>
             </div>

             {/* Centered, balanced, and perfectly aligned buttons */}
             <div className="flex items-center justify-center gap-3 w-full max-w-[260px] mx-auto">
                <button 
                  onClick={toggleTheme}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2 py-2 text-xs rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                  <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
                </button>
                <button 
                  onClick={logout}
                  className="flex-1 btn-ghost flex items-center justify-center gap-2 py-2 text-xs rounded-xl text-[var(--error)] border border-[var(--error)]/10 hover:bg-[var(--error)]/5 hover:border-[var(--error)]/20 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
             </div>
          </div>

          <div className="fn-card p-6">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm border border-[var(--pink)]/20 shrink-0">
                   <img src={isFrance ? "/doc-uno-avatar.jpg" : "/nurse-florence-avatar.jpg"} alt={aiAssistantName} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-heading font-bold text-base text-[var(--text)]">{aiAssistantName} says... {isFrance ? '🩺✨' : '👩‍⚕️✨'}</h3>
             </div>
             <div className="p-4 bg-[var(--pink)]/5 rounded-2xl border border-[var(--pink)]/10 text-center">
                <p className="text-sm italic leading-relaxed text-[var(--text-secondary)] font-medium">
                   {items.length === 0 ? (
                      isFrance 
                        ? `"Babe, I haven't seen your materials in the Study Box yet! 📂 Upload your notes now so I can turn them into beautiful clinical reviewers. I believe in you! 🩺🌸"`
                        : `"I haven't seen any study materials in your Study Box yet! 📂 Please upload your nursing notes so I can generate comprehensive clinical study guides for you. Let's excel together! 👩‍⚕️✨"`
                    ) : quizzes.length > 0 ? (
                      isFrance
                        ? `"${greetingName}, you've completed ${quizzes.filter(q => q.completed).length} quiz${quizzes.filter(q => q.completed).length > 1 ? 'zes' : ''} already! You are so brilliant, babe. You're getting closer to that RN title every single day. Drink some water and keep going! 💧🌷"`
                        : `"${greetingName}, you've completed ${quizzes.filter(q => q.completed).length} quiz${quizzes.filter(q => q.completed).length > 1 ? 'zes' : ''}! Excellent dedication. You are making steady progress toward your RN certification. Keep studying! 🩺✨"`
                    ) : reviewers.length > 0 ? (
                      isFrance
                        ? `"You are so dedicated to studying, babe! 📚 You already have ${reviewers.length} custom reviewers. Let's generate a Quiz or RetDem to master the clinical flow even more! I'm so proud of you! 💕"`
                        : `"Excellent study habits, ${greetingName}! 📚 You have generated ${reviewers.length} study guides. Let's create a custom quiz or clinical simulation next to test your recall! 👩‍⚕️✨"`
                    ) : (
                      isFrance
                        ? `"${greetingName}, you've uploaded ${items.length} notes to your Study Box! That's incredible. Let's start generating clinical reviewers to master the board exams together! 🌸🩺"`
                        : `"${greetingName}, you have uploaded ${items.length} notes to your Study Box. Outstanding! Let's start generating custom clinical study guides to master your nursing curriculum! 🩺✨"`
                    )}
                </p>
             </div>
          </div>
        </div>

        {/* Content Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4">
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="fn-card p-3 sm:p-4 flex flex-col items-center justify-center text-center"
              >
                <div className={cn("p-2 rounded-xl mb-2", stat.color)}>
                  <stat.icon size={20} />
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Settings Section */}
          <div className="fn-card overflow-hidden">
             <div className="p-6 border-b border-[var(--border)] bg-gradient-to-r from-[var(--pink)]/10 to-transparent">
                <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                   <Settings className="text-[var(--pink)]" size={20} />
                   Settings & Preferences
                </h3>
             </div>
             <div className="divide-y divide-[var(--border)]">
                {settingsOptions.map((option, i) => (
                  <button 
                    key={i}
                    onClick={() => setActiveSetting(option.label)}
                    className="w-full flex items-center justify-between p-4 md:p-6 hover:bg-[var(--bg)] transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-[var(--bg)] flex items-center justify-center text-[var(--text-secondary)] group-hover:bg-[var(--secondary-bg)] group-hover:text-[var(--pink)] transition-all">
                          <option.icon size={20} />
                       </div>
                       <div className="text-left">
                          <p className="font-bold text-sm leading-none mb-1">{option.label}</p>
                          <p className="text-xs text-[var(--text-secondary)] font-medium">{option.sub}</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-[var(--text-secondary)]/30 group-hover:text-[var(--pink)] group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
             </div>
          </div>

          {/* Badge Section */}
          <div className="fn-card p-6">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading font-bold text-lg">Unlocked Badges ({badgesCount}/{badgesList.length})</h3>
                <span className="text-xs font-bold text-[var(--pink)] hover:underline cursor-pointer">View Roadmap</span>
             </div>
             <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {badgesList.map((badge) => (
                  <div
                    key={badge.label}
                    className="group cursor-help relative flex flex-col items-center gap-1.5"
                    title={badge.desc}
                  >
                     <div className={cn(
                       "w-full aspect-square bg-[var(--bg)] rounded-[1.5rem] border-2 flex items-center justify-center text-2xl transition-all shadow-sm",
                       badge.unlocked 
                         ? "border-[var(--pink)] bg-[var(--pink)]/5 ring-2 ring-[var(--pink)]/20" 
                         : "border-dashed border-[var(--border)] grayscale opacity-40 group-hover:opacity-65"
                     )}>
                        {badge.icon}
                     </div>
                     <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-tight text-center leading-tight line-clamp-2 w-full px-0.5">
                       {badge.label}
                     </span>
                     
                     {/* Premium hover description popup */}
                     <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-44 p-2 bg-black/80 backdrop-blur-md text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center shadow-lg z-30 font-medium">
                       <p className="font-bold text-[var(--pink)] mb-0.5">{badge.label}</p>
                       <p className="text-gray-300 leading-normal">{badge.desc}</p>
                       <p className={cn("text-[9px] mt-1 font-bold", badge.unlocked ? "text-[var(--success)]" : "text-amber-400")}>
                         {badge.unlocked ? '✨ Unlocked!' : '🔒 Locked'}
                       </p>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Settings Modal Overlay */}
      <AnimatePresence>
        {activeSetting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSetting(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fn-card w-full max-w-md relative z-10 flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-[var(--border)] bg-gradient-to-r from-[var(--secondary-bg)]/20 to-transparent">
                <h3 className="font-heading font-bold text-lg">{activeSetting}</h3>
                <button 
                  onClick={() => setActiveSetting(null)}
                  className="w-8 h-8 rounded-full bg-[var(--bg)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--pink)]/10 hover:text-[var(--pink)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                {activeSetting === 'Personal Information' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] ml-1 mb-1 block">Full Name</label>
                      <input 
                        type="text" 
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="fn-input"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] ml-1 mb-1 block">Nursing School</label>
                      <input 
                        type="text" 
                        value={editForm.school}
                        onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
                        className="fn-input"
                        placeholder="University Name"
                      />
                    </div>
                    <div className="relative z-20">
                      <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] ml-1 mb-1 block">Year Level</label>
                      <div 
                        className="relative cursor-pointer"
                        onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                      >
                        <div className={`fn-input flex items-center bg-[var(--card)] ${!editForm.year_level ? 'text-[var(--text-secondary)]/70' : 'text-[var(--text)]'}`}>
                          {editForm.year_level ? [
                            { value: '1st Year', label: '1st Year' },
                            { value: '2nd Year', label: '2nd Year' },
                            { value: '3rd Year', label: '3rd Year' },
                            { value: '4th Year', label: '4th Year' },
                            { value: 'RN', label: 'Registered Nurse' }
                          ].find(o => o.value === editForm.year_level)?.label : "Select year level"}
                        </div>
                        <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/50 transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} size={18} />
                      </div>
                      
                      {isYearDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="w-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl max-h-48 overflow-y-auto"
                        >
                          {[
                            { value: '1st Year', label: '1st Year' },
                            { value: '2nd Year', label: '2nd Year' },
                            { value: '3rd Year', label: '3rd Year' },
                            { value: '4th Year', label: '4th Year' },
                            { value: 'RN', label: 'Registered Nurse' }
                          ].map(option => (
                            <div
                              key={option.value}
                              className={`px-4 py-3 hover:bg-[var(--secondary-bg)] cursor-pointer text-sm transition-colors ${editForm.year_level === option.value ? 'bg-[var(--pink)]/10 text-[var(--pink)] font-medium' : 'text-[var(--text)]'}`}
                              onClick={() => {
                                setEditForm({ ...editForm, year_level: option.value });
                                setIsYearDropdownOpen(false);
                              }}
                            >
                              {option.label}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        updateProfile(editForm)
                        setActiveSetting(null)
                      }}
                      className="btn-primary w-full mt-2 py-3 flex items-center justify-center gap-2"
                    >
                      <Save size={18} /> Save Changes
                    </button>
                  </div>
                )}

                {activeSetting === 'Notifications' && (
                  <div className="space-y-6">
                    {[
                      { id: 'reminders', label: 'Study Reminders', desc: 'Daily push alerts to keep you on track' },
                      { id: 'updates', label: 'App Updates', desc: 'New feature drops and content updates' },
                      { id: 'marketing', label: 'News & Promos', desc: 'Occasional promotional emails' }
                    ].map(toggle => (
                      <div key={toggle.id} className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-sm">{toggle.label}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{toggle.desc}</p>
                        </div>
                        <button 
                          onClick={() => setNotifications(prev => ({ ...prev, [toggle.id]: !prev[toggle.id as keyof typeof notifications] }))}
                          className={cn(
                            "w-12 h-6 rounded-full transition-colors relative shrink-0",
                            notifications[toggle.id as keyof typeof notifications] ? "bg-[var(--success)]" : "bg-[var(--border)]"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm",
                            notifications[toggle.id as keyof typeof notifications] ? "left-[26px]" : "left-[2px]"
                          )} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activeSetting === 'Privacy & Security' && (
                  <div className="space-y-6">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 flex gap-3">
                      <Lock className="shrink-0 mt-0.5" size={18} />
                      <div className="text-sm font-medium">
                        Your data is encrypted and securely stored locally. We never sell your personal information.
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => navigate('/update-password')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--border)] hover:border-[var(--pink)] hover:bg-[var(--pink)]/5 transition-colors text-left group"
                    >
                      <div>
                        <p className="font-bold text-sm group-hover:text-[var(--pink)]">Change Password</p>
                        <p className="text-xs text-[var(--text-secondary)]">Update your account credentials</p>
                      </div>
                      <ChevronRight size={18} className="text-[var(--text-secondary)] group-hover:text-[var(--pink)]" />
                    </button>

                  </div>
                )}

                {activeSetting === 'Appearance' && (
                  <div className="space-y-6">
                    <div>
                      <p className="font-bold text-sm mb-3">Color Theme</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => theme === 'dark' && toggleTheme()}
                          className={cn(
                            "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                            theme === 'light' ? "border-[var(--pink)] bg-[var(--pink)]/5 text-[var(--pink)]" : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--pink)]/50"
                          )}
                        >
                          <Sun size={24} />
                          <span className="font-bold text-xs">Light Mode</span>
                        </button>
                        <button 
                          onClick={() => theme === 'light' && toggleTheme()}
                          className={cn(
                            "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                            theme === 'dark' ? "border-[var(--pink)] bg-[var(--pink)]/5 text-[var(--pink)]" : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--pink)]/50"
                          )}
                        >
                          <Moon size={24} />
                          <span className="font-bold text-xs">Dark Mode</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
