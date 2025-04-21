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
import ProfilePage from "@/pages/profile-page";
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
  const { user, isLoading, refreshUser } = useAuth();
  const [, navigate] = useLocation();

  // Add explicit refresh on mount to ensure we have the latest user data
  React.useEffect(() => {
    refreshUser().catch(error => {
      console.error("Error refreshing user data:", error);
    });
  }, [refreshUser]);

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
  const { user, isLoading, refreshUser } = useAuth();
  const [, navigate] = useLocation();

  // Also add refresh to auth route for consistency
  React.useEffect(() => {
    refreshUser().catch(error => {
      console.error("Error refreshing user data:", error);
    });
  }, [refreshUser]);

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

// Route wrapper that forces data refetch on navigation
function DataRefreshRoute({ path, component: Component }: { path: string, component: React.ComponentType }) {
  // Force fresh data on mount by setting a key based on the path
  const currentLocation = useLocation()[0];
  const isActive = currentLocation === path;
  
  // This will cause the component to remount when navigating back to it
  return (
    <Route path={path}>
      <ProtectedRoute>
        {/* Using a key here forces a remount of the component, causing it to refetch data */}
        <div key={`page-${path}-${Date.now()}`}>
          <Component />
        </div>
      </ProtectedRoute>
    </Route>
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

        {/* Use the DataRefreshRoute wrapper for all pages to ensure data is refreshed */}
        <DataRefreshRoute path="/" component={HomePage} />
        <DataRefreshRoute path="/transactions" component={TransactionsPage} />
        <DataRefreshRoute path="/budgets" component={BudgetsPage} />
        <DataRefreshRoute path="/bills" component={BillsPage} />
        <DataRefreshRoute path="/ai-insights" component={AiInsightsPage} />
        <DataRefreshRoute path="/accounts" component={AccountsPage} />
        <DataRefreshRoute path="/profile" component={ProfilePage} />

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
