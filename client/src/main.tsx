import { createRoot } from "react-dom/client";
import { Switch, Route, Router, Redirect, useLocation } from "wouter";
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

// App component that handles routing based on auth state
function AppRoutes() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <>
      <Switch>
        {/* Public route */}
        <Route path="/auth">
          {user ? <Redirect to="/" /> : <AuthPage />}
        </Route>
        
        {/* Protected routes - only accessible when logged in */}
        <Route path="/">
          {!user ? <Redirect to="/auth" /> : <HomePage />}
        </Route>
        <Route path="/transactions">
          {!user ? <Redirect to="/auth" /> : <TransactionsPage />}
        </Route>
        <Route path="/budgets">
          {!user ? <Redirect to="/auth" /> : <BudgetsPage />}
        </Route>
        <Route path="/bills">
          {!user ? <Redirect to="/auth" /> : <BillsPage />}
        </Route>
        <Route path="/insights">
          {!user ? <Redirect to="/auth" /> : <AiInsightsPage />}
        </Route>
        
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </>
  );
}

// Main application wrapper with providers
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
