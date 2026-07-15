import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import HiveAIButton from "./components/hiveai/HiveAIButton";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { NavigationStackProvider } from "@/navigation/NavigationStack";
import SessionMonitor from "@/components/auth/SessionMonitor";
import testzoneLogo from "@/assets/testzone-logo.png";

// Lazy-loaded pages
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const QAMockTestPage = lazy(() => import("./pages/QAMockTestPage"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
    <div className="flex flex-col items-center gap-3">
      <img src={testzoneLogo} alt="Test Zone" className="h-12 w-12 rounded-xl" />
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
      <p className="text-sm text-muted-foreground">Loading Test Zone…</p>
    </div>
  </div>
);

// Redirect authenticated users away from auth pages
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <PageLoader />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Protected Routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/chat" 
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/qa-mock-test"
        element={
          <ProtectedRoute>
            <QAMockTestPage />
          </ProtectedRoute>
        }
      />

      {/* Auth Routes */}
      <Route 
        path="/auth/login" 
        element={
          <AuthRoute>
            <LoginPage />
          </AuthRoute>
        } 
      />
      <Route 
        path="/auth/signup" 
        element={
          <AuthRoute>
            <SignupPage />
          </AuthRoute>
        } 
      />
      <Route 
        path="/auth/forgot-password" 
        element={
          <AuthRoute>
            <ForgotPasswordPage />
          </AuthRoute>
        } 
      />
      <Route 
        path="/auth/reset-password" 
        element={<ResetPasswordPage />} 
      />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <ErrorBoundary label="Application shell">
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <NavigationStackProvider>
                <ErrorBoundary label="Routes">
                  <AppRoutes />
                </ErrorBoundary>
                <ErrorBoundary label="Session monitor" fallback={null}>
                  <SessionMonitor />
                </ErrorBoundary>
                <ErrorBoundary label="Hive AI button" fallback={null}>
                  <HiveAIButton />
                </ErrorBoundary>
              </NavigationStackProvider>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
