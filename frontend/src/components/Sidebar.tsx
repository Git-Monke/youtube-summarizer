import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Upload, Settings } from 'lucide-react'
import { VideoList } from './VideoList'
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from './ui/sidebar'

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setOpenMobile } = useSidebar()

  const handleNavigation = (path: string) => {
    navigate(path)
    setOpenMobile(false)
  }

  const navigationItems = [
    {
      title: 'Dashboard',
      icon: Home,
      path: '/',
      onClick: () => handleNavigation('/'),
    },
    {
      title: 'Upload Video',
      icon: Upload, 
      path: '/upload',
      onClick: () => handleNavigation('/upload'),
    },
    {
      title: 'Settings',
      icon: Settings,
      path: '/settings', 
      onClick: () => handleNavigation('/settings'),
    },
  ]

  return (
    <SidebarPrimitive>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    onClick={item.onClick}
                    isActive={location.pathname === item.path}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <div className="flex-1 overflow-y-auto">
              <VideoList />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarPrimitive>
  )
}
