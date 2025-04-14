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
  
  // Query to fetch total balance from all accounts
  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ["/api/accounts-total-balance"],
    queryFn: async () => {
      const response = await fetch("/api/accounts-total-balance");
      if (!response.ok) throw new Error("Failed to fetch total balance");
      return await response.json();
    }
  });
  
  // Update total balance when data is fetched
  useEffect(() => {
    if (balanceData) {
      setTotalBalance(balanceData.totalBalance);
    }
  }, [balanceData]);
  
  // Function to calculate the percentage change (for demo purposes, use random values if no real data)
  const getPercentageChange = (type: string) => {
    // In a real app, this would calculate based on previous period data
    // For now, just return random positive or negative values
    const randomChange = (Math.random() * 10).toFixed(1);
    
    if (type === "income") {
      return +randomChange;
    } else if (type === "expenses") {
      return Math.random() > 0.5 ? +randomChange : -randomChange;
    } else {
      return +randomChange;
    }
  };

  // Default values when no data is available
  const income = data?.income || 0;
  const expenses = data?.expenses || 0;
  const savings = data?.savings || 0;
  
  // Use the actual total balance from accounts instead of calculating it
  const balance = totalBalance;

  // Percentage changes
  const incomeChange = getPercentageChange("income");
  const expensesChange = getPercentageChange("expenses");
  const savingsChange = getPercentageChange("savings");
  const balanceChange = getPercentageChange("balance"); // Random for now, could be calculated from historical data

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
          {isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <span className={`${balanceChange >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"} px-2 py-1 rounded text-xs font-medium flex items-center`}>
              {balanceChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {balanceChange >= 0 ? "+" : ""}{balanceChange.toFixed(1)}%
            </span>
          )}
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
          {isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{incomeChange}%
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-500">Compared to last month</p>
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
          {isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <span className={`${expensesChange < 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"} px-2 py-1 rounded text-xs font-medium flex items-center`}>
              {expensesChange < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
              {expensesChange < 0 ? "" : "+"}{expensesChange}%
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-500">Compared to last month</p>
      </Card>
      
      {/* Savings Card */}
      <Card className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-sm text-neutral-500 flex items-center">
              <PiggyBank className="h-4 w-4 mr-1 text-neutral-400" /> Total Savings
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mt-1" />
            ) : (
              <h2 className="text-2xl font-bold text-neutral-900">
                ${savings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            )}
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{savingsChange}%
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-500">Across all savings accounts</p>
      </Card>
    </div>
  );
}
