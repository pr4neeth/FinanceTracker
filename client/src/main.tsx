import React from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";
import HomePage from "@/pages/home-page";
import SimpleAuthPage from "@/pages/simple-auth";
import NotFound from "@/pages/not-found";
import TransactionsPage from "@/pages/transactions-page";
import BudgetsPage from "@/pages/budgets-page";
import BillsPage from "@/pages/bills-page";
import AccountsPage from "@/pages/accounts-page";
import AiInsightsPage from "@/pages/ai-insights-page";
import { AuthProvider, useAuth } from "@/hooks/use-simple-auth";
import {
  BudgetAlertsProvider,
  useBudgetAlerts,
} from "./hooks/use-budget-alerts";
import { BudgetAlertContainer } from "./components/UI/BudgetAlertBanner";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import "./index.css";

// Create a centralized provider component that will wrap the entire app
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BudgetAlertsProvider>{children}</BudgetAlertsProvider>
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

// Main app with full routes
function App() {
  return (
    <Providers>
      <AppContent />
    </Providers>
  );
}

// App content wrapped by providers
function AppContent() {
  const { alerts, dismissAlert } = useBudgetAlerts();

  return (
    <>
      <Switch>
        <Route path="/auth">
          <AuthRoute>
            <SimpleAuthPage />
          </AuthRoute>
        </Route>

        <Route path="/">
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        </Route>

        <Route path="/transactions">
          <ProtectedRoute>
            <TransactionsPage />
          </ProtectedRoute>
        </Route>

        <Route path="/budgets">
          <ProtectedRoute>
            <BudgetsPage />
          </ProtectedRoute>
        </Route>

        <Route path="/bills">
          <ProtectedRoute>
            <BillsPage />
          </ProtectedRoute>
        </Route>

        <Route path="/insights">
          <ProtectedRoute>
            <AiInsightsPage />
          </ProtectedRoute>
        </Route>

        <Route path="/accounts">
          <ProtectedRoute>
            <AccountsPage />
          </ProtectedRoute>
        </Route>

        <Route>
          <NotFound />
        </Route>
      </Switch>

      {/* Display budget alerts */}
      <BudgetAlertContainer alerts={alerts} onDismiss={dismissAlert} />

      <Toaster />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
