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
import { Calculator, TrendingUp, Leaf, Info } from "lucide-react";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: TrendingUp,
    description: "Resumen de inversiones"
  },
  {
    title: "Simulador",
    url: "/simulator",
    icon: Calculator,
    description: "Simular nueva inversión"
  },
  {
    title: "Mis Inversiones",
    url: "/investments",
    icon: Leaf,
    description: "Ver inversiones actuales"
  },
  {
    title: "Parcelas",
    url: "/plots",
    icon: Info,
    description: "Información de cultivos"
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

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
            <div className="space-y-1">
              <h2 className="text-xl font-bold bg-gradient-agave bg-clip-text text-transparent">
                Gavé
              </h2>
              <p className="text-xs text-muted-foreground">
                Agrotecnología
              </p>
            </div>
          ) : (
            <div className="text-xl font-bold text-primary text-center">
              G
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
              <div className="text-sm font-medium">Usuario Ejemplo</div>
              <div className="text-xs text-muted-foreground">
                hectoreduardo.gox@gmail.com
              </div>
              <div className="text-xs text-primary font-medium">
                Balance: $50,000 MXN
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                H
              </div>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSidebar;