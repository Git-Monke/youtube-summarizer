import { Menu, Youtube } from 'lucide-react'
import { useAtom } from 'jotai'
import { sidebarOpenAtom } from '../store/ui'

export function Header() {
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-14 border-b border-border bg-background flex items-center px-4 gap-4 z-50">
      <button
        onClick={toggleSidebar}
        className="p-2 hover:bg-accent rounded-md transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>
      
      <div className="flex items-center gap-2">
        <Youtube className="h-6 w-6 text-red-500" />
        <span className="font-semibold text-foreground">YouTube Summarizer</span>
      </div>
    </header>
  )
}