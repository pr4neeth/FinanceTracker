import { useAuth } from "@/hooks/use-simple-auth";
import { useBudgetAlerts } from "@/hooks/use-budget-alerts";
import Header from "@/components/Layout/Header";
import Sidebar from "@/components/Layout/Sidebar";
import MobileNavigation from "@/components/Layout/MobileNavigation";
import FinancialSummary from "@/components/Dashboard/FinancialSummary";
import MonthlySpending from "@/components/Dashboard/MonthlySpending";
import BudgetOverview from "@/components/Dashboard/BudgetOverview";
import AiInsights from "@/components/Dashboard/AiInsights";
import RecentTransactions from "@/components/Dashboard/RecentTransactions";
import BillReminders from "@/components/Bills/BillReminders";
import { useState, useEffect } from "react";
import ReceiptScannerModal from "@/components/Modals/ReceiptScannerModal";
import AddTransactionMenu from "@/components/Modals/AddTransactionMenu";
import { useQuery } from "@tanstack/react-query";

export default function HomePage() {
  const { user } = useAuth();
  const { addBudgetAlert } = useBudgetAlerts();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [receiptScannerOpen, setReceiptScannerOpen] = useState(false);
  const [addTransactionMenuOpen, setAddTransactionMenuOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const toggleAddTransactionMenu = () => setAddTransactionMenuOpen(!addTransactionMenuOpen);
  const closeAddTransactionMenu = () => setAddTransactionMenuOpen(false);

  const openReceiptScanner = () => {
    setReceiptScannerOpen(true);
    setAddTransactionMenuOpen(false);
  };
  
  const closeReceiptScanner = () => setReceiptScannerOpen(false);
  
  // Fetch budget alerts from the server
  const { data: budgetAlerts } = useQuery({
    queryKey: ["/api/budgets/alerts"],
    queryFn: async () => {
      const response = await fetch("/api/budgets/alerts");
      if (!response.ok) throw new Error("Failed to fetch budget alerts");
      return await response.json();
    }
  });
  
  // Process alerts when they're loaded
  useEffect(() => {
    if (budgetAlerts && budgetAlerts.length > 0) {
      budgetAlerts.forEach((alert: any) => {
        addBudgetAlert(
          alert.categoryName,
          alert.budgetAmount,
          alert.spentAmount,
          alert.isExceeded
        );
      });
    }
  }, [budgetAlerts, addBudgetAlert]);

  // Get current date information
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed

  // Fetch monthly summary data
  const { data: monthlySummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/analytics/monthly-summary", currentYear, currentMonth],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/monthly-summary?year=${currentYear}&month=${currentMonth}`);
      if (!response.ok) throw new Error("Failed to fetch monthly summary");
      return await response.json();
    }
  });

  // Fetch recent transactions
  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions"],
    queryFn: async () => {
      const response = await fetch("/api/transactions?limit=5");
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return await response.json();
    }
  });

  // Fetch budgets
  const { data: budgets, isLoading: budgetsLoading } = useQuery({
    queryKey: ["/api/budgets"],
    queryFn: async () => {
      const response = await fetch("/api/budgets");
      if (!response.ok) throw new Error("Failed to fetch budgets");
      return await response.json();
    }
  });

  // Fetch AI insights
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["/api/insights"],
    queryFn: async () => {
      const response = await fetch("/api/insights?limit=3");
      if (!response.ok) throw new Error("Failed to fetch insights");
      return await response.json();
    }
  });

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Header 
        toggleMobileMenu={toggleMobileMenu} 
        username={user?.fullName || user?.username || "User"}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage="dashboard" />
        
        <main className="flex-1 overflow-y-auto p-4 bg-neutral-50">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900">Financial Dashboard</h1>
            <p className="text-neutral-600">
              Welcome back, {user?.fullName || user?.username || "User"}! Here's your financial overview.
            </p>
          </div>
          
          <BillReminders />
          
          <FinancialSummary 
            data={monthlySummary} 
            isLoading={summaryLoading} 
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <MonthlySpending 
              className="lg:col-span-2"
              year={currentYear}
              month={currentMonth} 
            />
            <BudgetOverview 
              budgets={budgets || []} 
              isLoading={budgetsLoading} 
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AiInsights 
              insights={insights || []} 
              isLoading={insightsLoading} 
            />
            <RecentTransactions 
              transactions={recentTransactions || []} 
              isLoading={transactionsLoading} 
              className="lg:col-span-2"
            />
          </div>
        </main>
      </div>
      
      <MobileNavigation activePage="dashboard" />
      
      <div className="fixed right-6 bottom-20 md:bottom-6">
        <AddTransactionMenu 
          isOpen={addTransactionMenuOpen}
          onToggle={toggleAddTransactionMenu}
          onClose={closeAddTransactionMenu}
          onScanReceipt={openReceiptScanner}
        />
      </div>
      
      <ReceiptScannerModal 
        isOpen={receiptScannerOpen} 
        onClose={closeReceiptScanner} 
      />
      
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={closeMobileMenu}>
          <div className="fixed right-0 top-0 bottom-0 w-4/5 max-w-xs bg-white shadow-lg overflow-y-auto z-50" onClick={(e) => e.stopPropagation()}>
            <Sidebar isMobile={true} onClose={closeMobileMenu} activePage="dashboard" />
          </div>
        </div>
      )}
    </div>
  );
}
