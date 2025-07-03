import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Calculator, TrendingUp, Leaf, Info, FileText, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const getNavigationItems = (t: any, isAdmin: boolean = false) => {
  const items = [
    {
      title: t('nav.dashboard'),
      url: "/",
      icon: TrendingUp,
      description: "Resumen de inversiones"
    },
    {
      title: t('nav.simulator'),
      url: "/simulator",
      icon: Calculator,
      description: "Simular nueva inversión"
    },
    {
      title: t('nav.investments'),
      url: "/investments",
      icon: Leaf,
      description: "Ver inversiones actuales"
    },
    {
      title: t('nav.plots'),
      url: "/plots",
      icon: Info,
      description: "Información de cultivos"
    },
    {
      title: t('nav.documents'),
      url: "/documents",
      icon: FileText,
      description: "Documentos y contratos"
    }
  ];

  if (isAdmin) {
    items.push({
      title: t('nav.admin'),
      url: "/admin",
      icon: Settings,
      description: "Panel administrativo"
    });
  }

  return items;
};

export function AppSidebar() {
  const { state } = useSidebar();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  
  const navigationItems = getNavigationItems(t, profile?.role === 'admin');

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-muted/50 text-foreground";

  return (
    <Sidebar
      className={`${isCollapsed ? "w-14" : "w-64"} border-r border-border bg-gradient-to-b from-background to-muted/20`}
      collapsible="icon"
    >
      <SidebarContent>
        {/* Logo/Brand */}
        <div className="p-4 border-b border-border">
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <img 
                src="/lovable-uploads/18fae893-7739-4fe1-bd49-75690fca47bd.png" 
                alt="Gavé Logo" 
                className="w-8 h-6 object-contain"
              />
              <div className="space-y-1">
                <h2 className="text-xl font-bold bg-gradient-agave bg-clip-text text-transparent">
                  Gavé
                </h2>
                <p className="text-xs text-muted-foreground">
                  Agrotecnología
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <img 
                src="/lovable-uploads/18fae893-7739-4fe1-bd49-75690fca47bd.png" 
                alt="Gavé Logo" 
                className="w-6 h-4 object-contain"
              />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navegación Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{item.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Section */}
        <div className="mt-auto p-4 border-t border-border">
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">
                {profile?.name || 'Usuario'}
                {profile?.role === 'admin' && (
                  <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Admin
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {profile?.email}
              </div>
              <div className="text-xs text-primary font-medium">
                Balance: ${profile?.account_balance?.toLocaleString() || '0'} MXN
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                {(profile?.name || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSidebar;