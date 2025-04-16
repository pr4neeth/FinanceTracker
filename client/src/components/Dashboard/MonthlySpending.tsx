import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Chart imports
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthlySpendingProps {
  className?: string;
  year: number;
  month: number;
}

interface CategoryData {
  name: string;
  amount: number;
  categoryId: string | null;
  exceedsBudget: boolean;
}

interface MonthData {
  name: string;
  month: number;
  expenses: number;
  income: number;
  exceedsBudget: boolean;
}

interface Budget {
  _id: string;
  categoryId: string;
  amount: number;
  alertThreshold: number;
}

interface Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
}

interface CategorizedExpense {
  category: {
    _id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  amount: number;
}

// Define chart colors for different categories
const CATEGORY_COLORS: Record<string, string> = {
  "Housing": "#0E76FD",
  "Food & Dining": "#22C55E",
  "Transportation": "#EAB308",
  "Entertainment": "#8B5CF6",
  "Shopping": "#EC4899",
  "Utilities": "#14B8A6",
  "Health": "#F97316",
  "Education": "#06B6D4",
  "Travel": "#8B5CF6",
  "Income": "#22C55E",
  "Total": "#64748B",
  "Uncategorized": "#94A3B8"
};

// Get a color for a category or a default color
const getCategoryColor = (category: string): string => {
  const key = Object.keys(CATEGORY_COLORS).find(k => 
    category.toLowerCase().includes(k.toLowerCase())
  );
  return key ? CATEGORY_COLORS[key] : "#64748B";
};

export default function MonthlySpending({ className, year, month }: MonthlySpendingProps) {
  const [timeRange, setTimeRange] = useState("30days");
  const [viewMode, setViewMode] = useState("category"); // "category" or "total"
  const [chartData, setChartData] = useState<MonthData[]>([]);
  const [categoryChartData, setCategoryChartData] = useState<CategoryData[]>([]);
  
  // Fetch yearly summary for overview data
  const { data: yearlyData, isLoading: yearlyLoading } = useQuery({
    queryKey: ["/api/analytics/yearly-summary", year],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/yearly-summary?year=${year}`);
      if (!response.ok) throw new Error("Failed to fetch yearly summary");
      return await response.json();
    }
  });
  
  // Fetch budgets for budget comparison
  const { data: budgets, isLoading: budgetsLoading } = useQuery<Budget[]>({
    queryKey: ["/api/budgets"],
    queryFn: async () => {
      const response = await fetch("/api/budgets");
      if (!response.ok) throw new Error("Failed to fetch budgets");
      return await response.json();
    }
  });
  
  // Fetch categories for names and colors
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return await response.json();
    }
  });
  
  // Fetch categorized spending data directly from new endpoint
  const { data: categorizedData, isLoading: categorizedLoading } = useQuery({
    queryKey: ["/api/analytics/categorized-spending", year, month],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/categorized-spending?year=${year}&month=${month}`);
      if (!response.ok) throw new Error("Failed to fetch categorized spending");
      return await response.json();
    }
  });
  
  // Fetch monthly summary for current month's data
  const { data: currentMonthData, isLoading: monthlyLoading } = useQuery({
    queryKey: ["/api/analytics/monthly-summary", year, month],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/monthly-summary?year=${year}&month=${month}`);
      if (!response.ok) throw new Error("Failed to fetch monthly summary");
      return await response.json();
    }
  });

  // Helper function to check if a category exceeds budget
  const isCategoryOverBudget = (categoryId: string | null, amount: number): boolean => {
    if (!budgets || !categoryId) return false;
    
    const budget = budgets.find(b => b.categoryId === categoryId);
    if (!budget) return false;
    
    return amount > budget.amount;
  };
  
  // Helper function to get category name
  const getCategoryName = (categoryId: string | null): string => {
    if (!categories || !categoryId) return "Uncategorized";
    const category = categories.find(c => c._id === categoryId);
    return category ? category.name : "Uncategorized";
  };
  
  // Prepare category chart data when categorized spending data is loaded
  useEffect(() => {
    if (categorizedData && categorizedData.categorizedExpenses) {
      console.log("Categorized expenses loaded:", categorizedData.categorizedExpenses);
      
      // Transform category data for the current month
      const catData = categorizedData.categorizedExpenses.map((item: CategorizedExpense) => {
        const categoryId = item.category._id;
        const categoryName = item.category.name;
        const amount = item.amount;
        const exceedsBudget = isCategoryOverBudget(categoryId, amount);
        
        return {
          name: categoryName,
          amount: amount,
          categoryId: categoryId,
          exceedsBudget
        };
      });
      
      // Sort by amount descending
      catData.sort((a: CategoryData, b: CategoryData) => b.amount - a.amount);
      
      // Set the category chart data
      setCategoryChartData(catData);
    } else if (currentMonthData && currentMonthData.expenses > 0) {
      // Fallback: If there's no categorized data but we have total expenses
      console.log("Using fallback with total expenses:", currentMonthData.expenses);
      
      // Create a single bar for total expenses
      setCategoryChartData([
        {
          name: "Total Expenses",
          amount: currentMonthData.expenses,
          categoryId: null,
          exceedsBudget: false
        }
      ]);
    }
  }, [categorizedData, currentMonthData, budgets]);

  // Prepare overview chart data when yearly data is loaded
  useEffect(() => {
    if (yearlyData && yearlyData.monthlyBreakdown) {
      // Transform data into chart format
      const transformedData = yearlyData.monthlyBreakdown.map((item: any) => {
        const date = new Date(year, item.month - 1, 1);
        const monthName = date.toLocaleString('default', { month: 'short' });
        
        // Calculate total budget for the month (sum of all category budgets)
        let totalBudget = 0;
        if (budgets) {
          budgets.forEach((budget: Budget) => {
            totalBudget += budget.amount;
          });
        }
        
        // If no budget is set, use average spending as a fallback
        if (totalBudget === 0) {
          totalBudget = yearlyData.expenses / 12 * 1.1; // Add 10% buffer
        }
        
        const exceedsBudget = item.expenses > totalBudget;
        
        return {
          name: monthName,
          month: item.month,
          expenses: item.expenses,
          income: item.income,
          exceedsBudget
        };
      });
      
      // Filter data based on selected time range
      let filteredData = transformedData;
      
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth(); // JavaScript months are 0-indexed (0-11)
      
      // Create mapping between month name and its data
      const monthDataMap = new Map();
      transformedData.forEach((item: MonthData) => {
        monthDataMap.set(item.name.toLowerCase(), item);
      });
      
      if (timeRange === "30days") {
        // Get the current month (up to 1 month total)
        const months = [];
        for (let i = 0; i >= 0; i--) {
          const monthDate = new Date(currentDate.getFullYear(), currentMonth - i, 1);
          const monthName = monthDate.toLocaleString('default', { month: 'short' }).toLowerCase();
          if (monthDataMap.has(monthName)) {
            months.push(monthDataMap.get(monthName));
          }
        }
        filteredData = months;
      } else if (timeRange === "90days") {
        // Get the current month and previous 2 months (up to 3 months total)
        const months = [];
        for (let i = 2; i >= 0; i--) {
          const monthDate = new Date(currentDate.getFullYear(), currentMonth - i, 1);
          const monthName = monthDate.toLocaleString('default', { month: 'short' }).toLowerCase();
          if (monthDataMap.has(monthName)) {
            months.push(monthDataMap.get(monthName));
          }
        }
        filteredData = months;
      } else if (timeRange === "6months") {
        // Get the current month and previous 5 months (up to 6 months total)
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = new Date(currentDate.getFullYear(), currentMonth - i, 1);
          const monthName = monthDate.toLocaleString('default', { month: 'short' }).toLowerCase();
          if (monthDataMap.has(monthName)) {
            months.push(monthDataMap.get(monthName));
          }
        }
        filteredData = months;
      }
      
      // Sort by month for chronological display
      filteredData.sort((a: MonthData, b: MonthData) => a.month - b.month);
      
      setChartData(filteredData);
    }
  }, [yearlyData, timeRange, year, budgets]);

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
  };

  const isLoading = yearlyLoading || budgetsLoading || categoriesLoading || 
                    monthlyLoading || categorizedLoading;

  return (
    <Card className={`bg-white rounded-lg shadow ${className}`}>
      <CardHeader className="flex flex-row justify-between items-center pb-2">
        <CardTitle className="text-base font-semibold">Monthly Spending</CardTitle>
        <div className="flex items-center gap-2">
          <Tabs defaultValue="category" className="mr-2">
            <TabsList className="h-8">
              <TabsTrigger 
                value="category" 
                className="text-xs px-3 py-1"
                onClick={() => setViewMode("category")}
              >
                By Category
              </TabsTrigger>
              <TabsTrigger 
                value="total" 
                className="text-xs px-3 py-1"
                onClick={() => setViewMode("total")}
              >
                Total
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[120px] text-sm h-8">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">This month</SelectItem>
              <SelectItem value="90days">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="12months">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[250px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : viewMode === "category" && categoryChartData && categoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryChartData}
                layout="vertical"
                margin={{ top: 5, right: 5, left: 60, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis 
                  type="number"
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip 
                  formatter={(value) => [`$${value}`, 'Amount']}
                  contentStyle={{ 
                    borderRadius: '0.375rem', 
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' 
                  }}
                />
                <Legend 
                  iconType="circle"
                  wrapperStyle={{ paddingTop: 10 }}
                />
                <Bar 
                  dataKey="amount" 
                  name="Category Spending"
                  fill={(data: CategoryData) => {
                    // Return red for bars that exceed budget
                    return data.exceedsBudget ? "#EF4444" : getCategoryColor(data.name);
                  }}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${value}`}
                  width={50}
                />
                <Tooltip 
                  formatter={(value, name) => [`$${value}`, name === "expenses" ? "Expenses" : "Income"]}
                  contentStyle={{ 
                    borderRadius: '0.375rem', 
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' 
                  }}
                />
                <Legend 
                  iconType="circle"
                  wrapperStyle={{ paddingTop: 10 }}
                />
                <Bar 
                  dataKey="expenses" 
                  name="Monthly Expenses"
                  fill={(data: MonthData) => {
                    // Return red for bars that exceed budget
                    return data.exceedsBudget ? "#EF4444" : "#0E76FD";
                  }}
                  radius={[4, 4, 0, 0]}
                  barSize={15}
                />
                <Bar 
                  dataKey="income" 
                  name="Monthly Income"
                  fill="#22C55E"
                  radius={[4, 4, 0, 0]}
                  barSize={15}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-neutral-500">No spending data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
