
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { DemoProvider } from "@/contexts/DemoContext";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import React, { Suspense } from "react";

const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Investments = React.lazy(() => import("./pages/Investments"));
const Plots = React.lazy(() => import("./pages/Plots"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Simulator = React.lazy(() => import("./pages/Simulator"));
const Admin = React.lazy(() => import("./pages/Admin"));

const queryClient = new QueryClient();

const LazyFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <DemoProvider>
          <AuthProvider>
            <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<AppLayout><Outlet /></AppLayout>}>
                  <Route path="dashboard" element={<Suspense fallback={<LazyFallback />}><Dashboard /></Suspense>} />
                  <Route path="investments" element={<Suspense fallback={<LazyFallback />}><Investments /></Suspense>} />
                  <Route path="plots" element={<Suspense fallback={<LazyFallback />}><Plots /></Suspense>} />
                  <Route path="profile" element={<Suspense fallback={<LazyFallback />}><Profile /></Suspense>} />
                  <Route path="simulator" element={<Suspense fallback={<LazyFallback />}><Simulator /></Suspense>} />
                  <Route path="admin" element={<Suspense fallback={<LazyFallback />}><Admin /></Suspense>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
        </DemoProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
