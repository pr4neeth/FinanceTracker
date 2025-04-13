import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ShoppingCart, Film, Utensils, Car, Briefcase, Gift, Building } from "lucide-react";

interface Transaction {
  _id: string;
  description: string;
  amount: number;
  date: string;
  categoryId: string | null;
  isIncome: boolean;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  isLoading: boolean;
  className?: string;
}

export default function RecentTransactions({ transactions, isLoading, className }: RecentTransactionsProps) {
  const [_, navigate] = useLocation();

  // Fetch categories for displaying category names
  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return await response.json();
    }
  });

  // Get category name by ID
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId || !categories) return "Uncategorized";
    const category = categories.find((c: any) => c._id === categoryId);
    return category ? category.name : "Uncategorized";
  };

  // Get icon for transaction based on category or description
  const getTransactionIcon = (transaction: Transaction) => {
    const categoryName = transaction.categoryId ? getCategoryName(transaction.categoryId).toLowerCase() : "";
    const description = transaction.description.toLowerCase();
    
    if (transaction.isIncome) return <Building className="h-5 w-5" />;
    if (categoryName.includes("food") || categoryName.includes("groceries") || description.includes("food") || description.includes("grocery")) {
      return <ShoppingCart className="h-5 w-5" />;
    }
    if (categoryName.includes("entertainment") || description.includes("netflix") || description.includes("movie")) {
      return <Film className="h-5 w-5" />;
    }
    if (categoryName.includes("dining") || description.includes("restaurant") || description.includes("cafe")) {
      return <Utensils className="h-5 w-5" />;
    }
    if (categoryName.includes("transport") || description.includes("gas") || description.includes("uber")) {
      return <Car className="h-5 w-5" />;
    }
    
    return <Gift className="h-5 w-5" />;
  };

  // Get category badge color
  const getCategoryBadgeColor = (categoryId: string | null) => {
    if (!categoryId) return "bg-gray-100 text-gray-800";
    
    const categoryName = getCategoryName(categoryId).toLowerCase();
    
    if (categoryName.includes("food") || categoryName.includes("groceries")) {
      return "bg-green-100 text-green-800";
    }
    if (categoryName.includes("entertainment")) {
      return "bg-purple-100 text-purple-800";
    }
    if (categoryName.includes("dining")) {
      return "bg-orange-100 text-orange-800";
    }
    if (categoryName.includes("transport")) {
      return "bg-blue-100 text-blue-800";
    }
    if (categoryName.includes("income")) {
      return "bg-green-100 text-green-800";
    }
    
    return "bg-gray-100 text-gray-800";
  };

  return (
    <Card className={`bg-white rounded-lg shadow ${className}`}>
      <CardHeader className="flex flex-row justify-between items-center pb-3">
        <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
        <Button 
          variant="link" 
          className="text-primary text-sm p-0 h-auto"
          onClick={() => navigate("/transactions")}
        >
          View All
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((_, index) => (
              <div key={index} className="flex items-center py-3">
                <Skeleton className="h-10 w-10 rounded-full mr-3" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-1/3 mb-1" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : transactions && transactions.length > 0 ? (
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Merchant</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {transactions.map(transaction => (
                    <tr key={transaction._id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 flex-shrink-0 bg-neutral-100 rounded-full flex items-center justify-center mr-3 text-neutral-500">
                            {getTransactionIcon(transaction)}
                          </div>
                          <span className="text-sm font-medium text-neutral-900">{transaction.description}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getCategoryBadgeColor(transaction.categoryId)}`}>
                          {getCategoryName(transaction.categoryId)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-500">
                        {format(new Date(transaction.date), "MMM dd, yyyy")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-right">
                        <span className={transaction.isIncome ? "text-green-600" : "text-red-600"}>
                          {transaction.isIncome ? "+" : "-"}
                          ${Math.abs(transaction.amount).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-neutral-500 mb-4">No transactions yet</p>
            <Button onClick={() => navigate("/transactions")}>
              Add Your First Transaction
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
