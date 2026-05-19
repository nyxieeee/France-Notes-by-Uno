import { useRef, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useStudyBoxStore } from '@/stores/studyBoxStore'
import { useQuizStore } from '@/stores/quizStore'
import { useReviewerStore } from '@/stores/reviewerStore'
import { useRetDemStore } from '@/stores/retDemStore'
import { useReminderStore } from '@/stores/reminderStore'
import { 
  User, 
  Settings, 
  LogOut, 
  Moon, 
  Sun, 
  Award, 
  Calendar, 
  GraduationCap,
  ChevronRight,
  Shield,
  Bell,
  Palette,
  Camera,
  X,
  Save,
  Heart,
  Lock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatDate } from '@/lib/utils'
import { usePersonalization } from '@/hooks/usePersonalization'

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { isFrance, appName, aiAssistantName, greetingName, studyBoxName } = usePersonalization()

  const [activeSetting, setActiveSetting] = useState<string | null>(null)
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
          updateProfile({ avatar_url: reader.result })
        }
      }
      reader.readAsDataURL(file)
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
    { icon: ' Otter ', label: 'Fast Learner', desc: 'Created slides presentation', unlocked: reviewers.some(r => r.content.slides && r.content.slides.length > 0) },
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
    <div className="page-container max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Your Profile {isFrance ? '🌸' : '✨'}</h1>
        <p className="text-[var(--text-secondary)] font-medium">Manage your nursing journey and study preferences. {isFrance ? '✨' : '🩺'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="fn-card p-8 text-center relative overflow-hidden">
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
                       ? `"Babe, hindi ko pa nakikita ang mga materials mo sa Study Box! 📂 Upload your notes now so I can turn them into beautiful clinical reviewers. I believe in you! 🩺🌸"`
                       : `"I haven't seen any study materials in your Study Box yet! 📂 Please upload your nursing notes so I can generate comprehensive clinical study guides for you. Let's excel together! 👩‍⚕️✨"`
                   ) : quizzes.length > 0 ? (
                     isFrance
                       ? `"${greetingName}, you've completed ${quizzes.filter(q => q.completed).length} quiz${quizzes.filter(q => q.completed).length > 1 ? 'zes' : ''} already! Ang galing mo talaga. You're getting closer to that RN title. Drink some water and keep going! 💧🌷"`
                       : `"${greetingName}, you've completed ${quizzes.filter(q => q.completed).length} quiz${quizzes.filter(q => q.completed).length > 1 ? 'zes' : ''}! Excellent dedication. You are making steady progress toward your RN certification. Keep studying! 🩺✨"`
                   ) : reviewers.length > 0 ? (
                     isFrance
                       ? `"Ang sipag mo naman mag-study, babe! 📚 May ${reviewers.length} custom reviewers ka na. Subukan nating mag-generate ng Quiz or RetDem para lalo nating ma-master ang clinical flow! Proud of you! 💕"`
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
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="fn-card p-4 flex flex-col items-center justify-center text-center"
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
             <div className="p-6 border-b border-[var(--border)] bg-gradient-to-r from-white to-[var(--secondary-bg)]/10">
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
                    className="w-full flex items-center justify-between p-6 hover:bg-[var(--bg)] transition-colors group"
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
             <div className="flex flex-wrap gap-6">
                {badgesList.map((badge, i) => (
                  <div key={badge.label} className="flex flex-col items-center gap-2 group cursor-help relative" title={badge.desc}>
                     <div className={cn(
                       "w-14 h-14 bg-[var(--bg)] rounded-[1.5rem] border-2 flex items-center justify-center text-2xl transition-all shadow-sm",
                       badge.unlocked 
                         ? "border-[var(--pink)] bg-[var(--pink)]/5 scale-105" 
                         : "border-dashed border-[var(--border)] grayscale opacity-45 group-hover:opacity-70"
                     )}>
                        {badge.icon}
                     </div>
                     <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-tight">{badge.label}</span>
                     
                     {/* Premium hover description popup */}
                     <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-black/80 backdrop-blur-md text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center shadow-lg z-30 font-medium">
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
              className="fn-card w-full max-w-md relative z-10 overflow-hidden flex flex-col max-h-[85vh]"
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
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] ml-1 mb-1 block">Year Level</label>
                      <select 
                        value={editForm.year_level}
                        onChange={(e) => setEditForm({ ...editForm, year_level: e.target.value })}
                        className="fn-input appearance-none bg-white"
                      >
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="RN">Registered Nurse</option>
                      </select>
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
                    
                    <button className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--border)] hover:border-[var(--pink)] hover:bg-[var(--pink)]/5 transition-colors text-left group">
                      <div>
                        <p className="font-bold text-sm group-hover:text-[var(--pink)]">Change Password</p>
                        <p className="text-xs text-[var(--text-secondary)]">Update your account credentials</p>
                      </div>
                      <ChevronRight size={18} className="text-[var(--text-secondary)] group-hover:text-[var(--pink)]" />
                    </button>
                    
                    <button className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--border)] hover:border-[var(--error)]/40 hover:bg-[var(--error)]/5 transition-colors text-left group">
                      <div>
                        <p className="font-bold text-sm text-[var(--error)]">Clear Local Cache</p>
                        <p className="text-xs text-[var(--text-secondary)]">Free up space (does not delete data)</p>
                      </div>
                      <ChevronRight size={18} className="text-[var(--text-secondary)]" />
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
    </div>
  )
}
