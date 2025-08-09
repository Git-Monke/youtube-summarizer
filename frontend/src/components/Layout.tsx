import { type ReactNode } from 'react'
import { useAtom } from 'jotai'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { sidebarOpenAtom } from '../store/ui'
import { cn } from '../lib/utils'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen] = useAtom(sidebarOpenAtom)

  return (
    <div className="bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main
          className={cn(
            "flex-1 transition-all duration-200 ease-in-out pt-4 mt-8",
            sidebarOpen ? "ml-64" : "ml-0"
          )}
        >
          <div className="container mx-auto px-4">
            {children}
          </div>
        </main>
      </div>
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => {
            // This will be handled by clicking outside the sidebar
          }}
        />
      )}
    </div>
  )
}
