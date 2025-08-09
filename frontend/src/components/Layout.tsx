import { type ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { SidebarProvider, SidebarInset } from './ui/sidebar'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="bg-background flex min-h-screen w-full">
        <Sidebar />
        <SidebarInset>
          <Header />
          <main className="flex-1 pt-4">
            <div className="container mx-auto px-4">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
