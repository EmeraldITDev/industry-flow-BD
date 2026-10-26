import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotificationProvider } from "@/context/NotificationContext";
import { AuthProvider } from "@/context/AuthContext";
import { ColorThemeProvider } from "@/context/ColorThemeContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RestrictedExecutiveTasksGuard } from "@/components/auth/RestrictedExecutiveTasksGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UpdateAvailableBanner } from "@/components/UpdateAvailableBanner";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import LoginPage from "./pages/LoginPage";

// Pages load on demand so the first paint does not parse every screen and export library.
const Index = lazy(() => import("./pages/Index"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const EmployeePerformancePage = lazy(() => import("./pages/EmployeePerformancePage"));
const NewProjectPage = lazy(() => import("./pages/NewProjectPage"));
const EditProjectPage = lazy(() => import("./pages/EditProject"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const AllTasksPage = lazy(() => import("./pages/AllTasksPage"));
const ChairmanViewPage = lazy(() => import("./pages/ChairmanViewPage"));
const OperationsPage = lazy(() => import("./pages/OperationsPage"));
const DocumentRepositoryPage = lazy(() => import("./pages/DocumentRepositoryPage"));
const PartnersPage = lazy(() => import("./pages/PartnersPage"));
const PartnerDetailPage = lazy(() => import("./pages/PartnerDetailPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ColorThemeProvider>
          <TooltipProvider>
            <AuthProvider>
              <CurrencyProvider>
                <NotificationProvider>
                  <Toaster />
                  <Sonner />
                  <UpdateAvailableBanner />
                  <InstallPrompt />
                  <BrowserRouter>
                  <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/executive" element={<ProtectedRoute><ChairmanViewPage /></ProtectedRoute>} />
                    <Route path="/operations" element={<ProtectedRoute><OperationsPage /></ProtectedRoute>} />
                    <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
                    <Route path="/projects/new" element={<ProtectedRoute><NewProjectPage /></ProtectedRoute>} />
                    <Route path="/projects/:id/edit" element={<ProtectedRoute><EditProjectPage /></ProtectedRoute>} />
                    <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
                    <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
                    <Route path="/team/:id" element={<ProtectedRoute><EmployeePerformancePage /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                    <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
                    <Route path="/tasks" element={<ProtectedRoute><RestrictedExecutiveTasksGuard><AllTasksPage /></RestrictedExecutiveTasksGuard></ProtectedRoute>} />
                    <Route path="/document-repository" element={<ProtectedRoute><DocumentRepositoryPage /></ProtectedRoute>} />
                    <Route path="/partners" element={<ProtectedRoute><PartnersPage /></ProtectedRoute>} />
                    <Route path="/partners/:id" element={<ProtectedRoute><PartnerDetailPage /></ProtectedRoute>} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  </Suspense>
                  </BrowserRouter>
                </NotificationProvider>
              </CurrencyProvider>
            </AuthProvider>
          </TooltipProvider>
        </ColorThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
