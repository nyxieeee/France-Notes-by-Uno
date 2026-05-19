import { Outlet } from 'react-router-dom'
import DesktopSidebar from './DesktopSidebar'
import MobileNav from './MobileNav'
import TopBar from './TopBar'
import XboxAchievementNotifier from './XboxAchievementNotifier'

export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      {/* Xbox Style Achievement Notifications */}
      <XboxAchievementNotifier />

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-72 md:flex-col">
        <DesktopSidebar />
      </div>

      <div className="flex flex-col flex-1 relative overflow-hidden">
        {/* Top Bar */}
        <TopBar />

        {/* Main Content */}
        <main className="flex-1 relative flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
          <Outlet />
        </main>

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </div>
  )
}
