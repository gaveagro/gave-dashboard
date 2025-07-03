import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LanguageToggle from "@/components/LanguageToggle";
import { LogOut } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, profile, signOut, loading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <img 
            src="/lovable-uploads/18fae893-7739-4fe1-bd49-75690fca47bd.png" 
            alt="Gavé Logo" 
            className="w-16 h-12 object-contain mx-auto"
          />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in (except on auth page)
  if (!user && location.pathname !== '/auth') {
    return <Navigate to="/auth" replace />;
  }

  // Don't wrap auth page in layout
  if (location.pathname === '/auth') {
    return <>{children}</>;
  }

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
                <div className="flex items-center gap-3">
                  <img 
                    src="/lovable-uploads/18fae893-7739-4fe1-bd49-75690fca47bd.png" 
                    alt="Gavé Logo" 
                    className="w-8 h-6 object-contain"
                  />
                  <div>
                    <h1 className="text-lg font-semibold bg-gradient-agave bg-clip-text text-transparent">
                      Gavé Agrotecnología
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Plataforma de Inversiones en Agricultura Regenerativa
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <LanguageToggle />
              
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium">
                  {profile?.name || user?.email}
                  {profile?.role === 'admin' && (
                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Balance: ${profile?.account_balance?.toLocaleString() || '0'} MXN
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-agave rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {(profile?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
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