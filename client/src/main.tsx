import React from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route, Router } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import SimpleHomePage from "@/pages/simple-home";
import AuthPage from "@/pages/auth-page";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Loader2 } from "lucide-react";
import "./index.css";

// Create a centralized provider component that will wrap the entire app
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Create a wrapper for protected routes that checks authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    window.location.href = "/auth";
    return null;
  }
  
  return <>{children}</>;
}

// Create a wrapper for the auth page that redirects when logged in
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (user) {
    window.location.href = "/";
    return null;
  }
  
  return <>{children}</>;
}

// Main app with simplified routing
function App() {
  return (
    <Providers>
      <Switch>
        <Route path="/auth">
          <AuthRoute>
            <AuthPage />
          </AuthRoute>
        </Route>
        
        <Route path="/">
          <ProtectedRoute>
            <SimpleHomePage />
          </ProtectedRoute>
        </Route>
        
        <Route>
          <NotFound />
        </Route>
      </Switch>
      
      <Toaster />
    </Providers>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
