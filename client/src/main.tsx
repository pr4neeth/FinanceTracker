import React from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";
import SimpleHomePage from "@/pages/simple-home";
import SimpleAuthPage from "@/pages/simple-auth";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "./hooks/use-simple-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
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
  const [, navigate] = useLocation();
  
  // Use React's useEffect to handle navigation to avoid direct DOM manipulation
  React.useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  return <>{children}</>;
}

// Create a wrapper for the auth page that redirects when logged in
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  
  // Use React's useEffect to handle navigation to avoid direct DOM manipulation
  React.useEffect(() => {
    if (!isLoading && user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (user) {
    return null;
  }
  
  return <>{children}</>;
}

// Main app with simplified routes
function App() {
  return (
    <Providers>
      <Switch>
        <Route path="/auth">
          <AuthRoute>
            <SimpleAuthPage />
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
