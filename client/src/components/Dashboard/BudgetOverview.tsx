import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useBudgetAlerts } from "@/hooks/use-budget-alerts";

interface Budget {
  _id: string;
  categoryId: string;
  amount: number;
  period: string;
  alertThreshold: number;
}

interface Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
}

interface BudgetOverviewProps {
  budgets: Budget[];
  isLoading: boolean;
}

export default function BudgetOverview({ budgets, isLoading }: BudgetOverviewProps) {
  const [_, navigate] = useLocation();
  const { addBudgetAlert } = useBudgetAlerts();

  // Fetch budget spending data
  const { data: budgetSpending } = useQuery({
    queryKey: ["/api/budgets/spending"],
    queryFn: async () => {
      const response = await fetch("/api/budgets/spending");
      if (!response.ok) throw new Error("Failed to fetch budget spending");
      return await response.json();
    }
  });
  
  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return await response.json();
    }
  });
  
  // Get category name from ID
  const getCategoryName = (categoryId: string) => {
    if (!categories) return "Loading...";
    const category = categories.find((c: any) => c._id === categoryId);
    return category ? category.name : `Category ${categoryId}`;
  };

  // Get actual spending for each budget category
  const getSpendingAmount = (budget: Budget) => {
    if (!budgetSpending) return 0;
    
    // Find the spending for this budget's category
    const spending = budgetSpending.find(
      (item: any) => item.categoryId === budget.categoryId
    );
    
    return spending ? spending.spent : 0;
  };

  const getBudgetPercentage = (budget: Budget) => {
    const spending = getSpendingAmount(budget);
    return Math.round((spending / budget.amount) * 100);
  };

  // Sort budgets by percentage spent (highest first) for better UI
  const sortedBudgets = [...(budgets || [])].sort((a, b) => {
    return getBudgetPercentage(b) - getBudgetPercentage(a);
  });

  return (
    <Card className="bg-white rounded-lg shadow">
      <CardHeader className="flex flex-row justify-between items-center pb-3">
        <CardTitle className="text-base font-semibold">Budget Overview</CardTitle>
        <Button 
          variant="link" 
          className="text-primary text-sm p-0 h-auto"
          onClick={() => navigate("/budgets")}
        >
          View All
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((_, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-2 w-full mb-4" />
              </div>
            ))}
            <Skeleton className="h-9 w-full mt-4" />
          </div>
        ) : budgets && budgets.length > 0 ? (
          <div className="space-y-4">
            {sortedBudgets.slice(0, 5).map((budget) => {
              const spentAmount = getSpendingAmount(budget);
              const percentage = getBudgetPercentage(budget);
              const isOverBudget = percentage > 100;
              const isCloseToLimit = percentage >= (budget.alertThreshold || 80) && percentage <= 100;
              
              return (
                <div key={budget._id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-neutral-700">
                      {getCategoryName(budget.categoryId)}
                    </span>
                    <span className="text-neutral-700">
                      ${spentAmount.toFixed(2)} / ${budget.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        isOverBudget 
                          ? "bg-red-500" 
                          : isCloseToLimit 
                          ? "bg-amber-500" 
                          : "bg-green-500"
                      }`} 
                      style={{ width: `${percentage > 100 ? 100 : percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button 
                className="w-full"
                onClick={() => navigate("/budgets")}
              >
                Adjust Budgets
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-8">
              <p className="text-neutral-500 mb-4">No budgets set up yet</p>
              <Button onClick={() => navigate("/budgets")}>
                Create Your First Budget
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
