import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import TransactionsPage from "@/pages/transactions-page";
import BudgetsPage from "@/pages/budgets-page";
import BillsPage from "@/pages/bills-page";
import AiInsightsPage from "@/pages/ai-insights-page";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Loader2 } from "lucide-react";
import "./index.css";

// Redirect component using useLocation
function Redirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  
  // Effect to navigate on render
  useEffect(() => {
    navigate(to);
  }, [navigate, to]);
  
  return null;
}

// Routes component that uses the auth context
function Routes() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Handle redirection based on auth status and current location
  if (!user && !location.startsWith('/auth')) {
    return <Redirect to="/auth" />;
  }
  
  if (user && location === '/auth') {
    return <Redirect to="/" />;
  }
  
  return (
    <>
      <Switch>
        <Route path="/auth">
          <AuthPage />
        </Route>
        
        <Route path="/">
          <HomePage />
        </Route>
        
        <Route path="/transactions">
          <TransactionsPage />
        </Route>
        
        <Route path="/budgets">
          <BudgetsPage />
        </Route>
        
        <Route path="/bills">
          <BillsPage />
        </Route>
        
        <Route path="/insights">
          <AiInsightsPage />
        </Route>
        
        <Route>
          <NotFound />
        </Route>
      </Switch>
      <Toaster />
    </>
  );
}

// Main app with providers
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
