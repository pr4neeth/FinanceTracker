import React from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route, Router } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import TransactionsPage from "@/pages/transactions-page";
import BudgetsPage from "@/pages/budgets-page";
import BillsPage from "@/pages/bills-page";
import AiInsightsPage from "@/pages/ai-insights-page";
import { AuthProvider } from "./hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import "./index.css";

// Create a wrapper component for each page that will be wrapped in the AuthProvider
function withAuth(Component: React.ComponentType) {
  return function WithAuth(props: any) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Component {...props} />
        </AuthProvider>
      </QueryClientProvider>
    );
  };
}

// Wrap each component that needs auth
const AuthenticatedHomePage = withAuth(HomePage);
const AuthenticatedAuthPage = withAuth(AuthPage);
const AuthenticatedTransactionsPage = withAuth(TransactionsPage);
const AuthenticatedBudgetsPage = withAuth(BudgetsPage);
const AuthenticatedBillsPage = withAuth(BillsPage);
const AuthenticatedAiInsightsPage = withAuth(AiInsightsPage);
const AuthenticatedNotFound = withAuth(NotFound);

// Main app
function App() {
  return (
    <>
      <Switch>
        <Route path="/auth" component={AuthenticatedAuthPage} />
        <Route path="/" component={AuthenticatedHomePage} />
        <Route path="/transactions" component={AuthenticatedTransactionsPage} />
        <Route path="/budgets" component={AuthenticatedBudgetsPage} />
        <Route path="/bills" component={AuthenticatedBillsPage} />
        <Route path="/insights" component={AuthenticatedAiInsightsPage} />
        <Route component={AuthenticatedNotFound} />
      </Switch>
      <Toaster />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
