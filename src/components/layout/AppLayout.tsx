import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header with trigger */}
          <header className="h-16 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold bg-gradient-agave bg-clip-text text-transparent">
                  Gavé Agrotecnología
                </h1>
                <p className="text-xs text-muted-foreground">
                  Plataforma de Inversiones en Agricultura Regenerativa
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium">Usuario Ejemplo</div>
                <div className="text-xs text-muted-foreground">
                  Balance: $50,000 MXN
                </div>
              </div>
              <div className="w-8 h-8 bg-gradient-agave rounded-full flex items-center justify-center text-white text-sm font-medium">
                H
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default AppLayout;