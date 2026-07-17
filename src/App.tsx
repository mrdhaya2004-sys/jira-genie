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
import SplashScreen from "@/components/auth/SplashScreen";

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

const PageLoader = () => <SplashScreen />;

// Redirect authenticated users away from auth pages
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Gate the entire router until the initial auth check finishes so we never
// flash the login page for users with a valid persisted session.
const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading } = useAuth();
  if (isLoading) return <SplashScreen />;
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
                  <AuthGate>
                    <AppRoutes />
                  </AuthGate>
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
