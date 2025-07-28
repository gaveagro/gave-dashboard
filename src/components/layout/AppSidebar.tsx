
import {
  Calendar,
  ChevronUp,
  Home,
  Inbox,
  Search,
  Settings,
  TreePine,
  MapPin,
  FileText,
  Calculator,
  User,
  Users,
  TrendingUp,
  ClipboardList,
  LogOut,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import LanguageToggle from "@/components/LanguageToggle"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate, useLocation } from "react-router-dom"

export function AppSidebar() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Menu items.
  const items = [
    {
      title: t('nav.dashboard'),
      url: "/dashboard",
      icon: Home,
    },
    {
      title: t('nav.investments'),
      url: "/investments",
      icon: TrendingUp,
    },
    {
      title: t('nav.plots'),
      url: "/plots",
      icon: MapPin,
    },
    {
      title: "Simula tu Próxima Inversión",
      url: "/simulator",
      icon: Calculator,
    },
  ]

  const adminItems = [
    {
      title: t('nav.admin'),
      url: "/admin",
      icon: Users,
    },
  ]

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      navigate('/');
    } catch (error) {
      console.error('Error during sign out:', error);
      // Even if there's an error, navigate to home
      navigate('/');
    }
  };

  const allItems = profile?.role === 'admin' ? [...items, ...adminItems] : items;

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Aplicación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <LanguageToggle />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User /> {profile?.name || user?.email}
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
