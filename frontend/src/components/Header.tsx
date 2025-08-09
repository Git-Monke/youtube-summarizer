import { Youtube } from 'lucide-react'
import { SidebarTrigger } from './ui/sidebar'

export function Header() {
  return (
    <header className="sticky top-0 h-14 border-b border-border bg-background flex items-center px-4 gap-4 z-50">
      <SidebarTrigger />
      
      <div className="flex items-center gap-2">
        <Youtube className="h-6 w-6 text-red-500" />
        <span className="font-semibold text-foreground">YouTube Summarizer</span>
      </div>
    </header>
  )
}