import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, DollarSign, CreditCard, PiggyBank } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface FinancialSummaryProps {
  data?: {
    income: number;
    expenses: number;
    savings: number;
  };
  isLoading?: boolean;
}

export default function FinancialSummary({ data, isLoading = false }: FinancialSummaryProps) {
  // State to store total balance
  const [totalBalance, setTotalBalance] = useState(0);
  
  // Get current date for previous month comparison
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
  
  // Calculate previous month and year
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  
  // Query to fetch total balance from all accounts
  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ["/api/accounts-total-balance"],
    queryFn: async () => {
      const response = await fetch("/api/accounts-total-balance");
      if (!response.ok) throw new Error("Failed to fetch total balance");
      return await response.json();
    }
  });
  
  // Query to fetch previous month's data for comparison
  const { data: previousMonthData } = useQuery({
    queryKey: ["/api/analytics/monthly-summary", previousYear, previousMonth],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/monthly-summary?year=${previousYear}&month=${previousMonth}`);
      if (!response.ok) throw new Error("Failed to fetch previous month summary");
      return await response.json();
    },
    // Only fetch if we have current month data to compare with
    enabled: !!data
  });
  
  // Update total balance when data is fetched
  useEffect(() => {
    if (balanceData) {
      setTotalBalance(balanceData.totalBalance);
    }
  }, [balanceData]);
  
  // Calculate percentage changes between current and previous month
  const calculatePercentageChange = (current: number, previous: number): number => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Default values when no data is available
  const income = data?.income || 0;
  const expenses = data?.expenses || 0;
  const savings = data?.savings || 0;
  
  // Use the actual total balance from accounts instead of calculating it
  const balance = totalBalance;

  // Calculate real percentage changes if we have previous month data
  const incomeChange = previousMonthData ? 
    calculatePercentageChange(income, previousMonthData.income) : 
    0;
  
  const expensesChange = previousMonthData ? 
    calculatePercentageChange(expenses, previousMonthData.expenses) : 
    0;
  
  const savingsChange = previousMonthData ? 
    calculatePercentageChange(savings, previousMonthData.savings) : 
    0;
  
  // For balance, we don't have historical data yet, so this would remain random
  // In a real app, you would calculate this from historical balance data
  const balanceChange = previousMonthData ? 
    calculatePercentageChange(balance, balance * 0.95) : // Simplified demo - replace with real historical data
    0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Balance Card */}
      <Card className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-sm text-neutral-500 flex items-center">
              <Wallet className="h-4 w-4 mr-1 text-neutral-400" /> Total Balance
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mt-1" />
            ) : (
              <h2 className="text-2xl font-bold text-neutral-900">
                ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            )}
          </div>
        </div>
        <p className="text-xs text-neutral-500">From all linked accounts</p>
      </Card>
      
      {/* Income Card */}
      <Card className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-sm text-neutral-500 flex items-center">
              <DollarSign className="h-4 w-4 mr-1 text-neutral-400" /> Monthly Income
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mt-1" />
            ) : (
              <h2 className="text-2xl font-bold text-neutral-900">
                ${income.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            )}
          </div>
        </div>
        <p className="text-xs text-neutral-500">Income from Transactions</p>
      </Card>
      
      {/* Spending Card */}
      <Card className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-sm text-neutral-500 flex items-center">
              <CreditCard className="h-4 w-4 mr-1 text-neutral-400" /> Monthly Spending
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mt-1" />
            ) : (
              <h2 className="text-2xl font-bold text-neutral-900">
                ${expenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            )}
          </div>
        </div>
        <p className="text-xs text-neutral-500">Expenses from Transactions</p>
      </Card>
      
      {/* Savings Card */}
    </div>
  );
}
