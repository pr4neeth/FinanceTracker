import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

interface Budget {
  id: number;
  categoryId: number;
  amount: number;
  period: string;
  alertThreshold: number;
}

interface Category {
  id: number;
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

  // In a real app, we would fetch the actual spending for each budget category
  // Here we'll simulate it with random percentages for demonstration
  const getSpendingAmount = (budget: Budget) => {
    const percentage = Math.random();
    return budget.amount * (percentage > 1 ? 1 : percentage);
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
                <div key={budget.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-neutral-700">
                      {/* In a real app, we would look up the category name */}
                      {`Category ${budget.categoryId}`}
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
            
            <Button 
              className="w-full mt-4"
              onClick={() => navigate("/budgets")}
            >
              Adjust Budgets
            </Button>
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
