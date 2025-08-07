import { useAtom } from 'jotai'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Upload, Settings } from 'lucide-react'
import { sidebarOpenAtom } from '../store/ui'
import { VideoList } from './VideoList'
import { cn } from '../lib/utils'

export function Sidebar() {
  const [sidebarOpen] = useAtom(sidebarOpenAtom)
  const navigate = useNavigate()
  const location = useLocation()

  const handleDashboardClick = () => {
    navigate('/')
  }

  const handleUploadClick = () => {
    navigate('/upload')
  }

  const handleSettingsClick = () => {
    navigate('/settings')
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-in-out z-40 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Navigation buttons */}
      <div className="p-4 space-y-2">
        <button
          onClick={handleDashboardClick}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            location.pathname === '/' 
              ? "bg-sidebar-accent text-sidebar-accent-foreground" 
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Home className="h-4 w-4" />
          Dashboard
        </button>
        
        <button
          onClick={handleUploadClick}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            location.pathname === '/upload' 
              ? "bg-sidebar-accent text-sidebar-accent-foreground" 
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Upload className="h-4 w-4" />
          Upload Video
        </button>

        <button
          onClick={handleSettingsClick}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            location.pathname === '/settings' 
              ? "bg-sidebar-accent text-sidebar-accent-foreground" 
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>

      {/* Separator */}
      <div className="border-t border-sidebar-border" />

      {/* Video list */}
      <div className="flex-1 overflow-y-auto py-4">
        <VideoList />
      </div>
    </aside>
  )
}