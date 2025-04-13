import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

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

export default function MonthlySpending({ className, year, month }: MonthlySpendingProps) {
  const [timeRange, setTimeRange] = useState("30days");
  const [chartData, setChartData] = useState([]);
  
  // Fetch yearly summary for chart data
  const { data: yearlyData, isLoading } = useQuery({
    queryKey: ["/api/analytics/yearly-summary", year],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/yearly-summary?year=${year}`);
      if (!response.ok) throw new Error("Failed to fetch yearly summary");
      return await response.json();
    }
  });

  // Prepare chart data when year summary is loaded
  useEffect(() => {
    if (yearlyData && yearlyData.monthlyBreakdown) {
      // Transform data into chart format
      const transformedData = yearlyData.monthlyBreakdown.map(item => {
        const date = new Date(year, item.month - 1, 1);
        const monthName = date.toLocaleString('default', { month: 'short' });
        
        // If expenses exceed the average by 15%, mark as exceeding budget
        const average = yearlyData.expenses / 12;
        const exceedsBudget = item.expenses > average * 1.15;
        
        return {
          name: monthName,
          expenses: item.expenses,
          exceedsBudget
        };
      });
      
      // Filter data based on selected time range
      let filteredData = transformedData;
      
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth(); // JavaScript months are 0-indexed (0-11)
      
      // Create mapping between month name and its data
      const monthDataMap = new Map();
      transformedData.forEach(item => {
        monthDataMap.set(item.name.toLowerCase(), item);
      });
      
      if (timeRange === "30days") {
        // Get the current month and previous month (up to 2 months total)
        const months = [];
        for (let i = 0; i < 2; i++) {
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
        for (let i = 0; i < 3; i++) {
          const monthDate = new Date(currentDate.getFullYear(), currentMonth - i, 1);
          const monthName = monthDate.toLocaleString('default', { month: 'short' }).toLowerCase();
          if (monthDataMap.has(monthName)) {
            months.push(monthDataMap.get(monthName));
          }
        }
        filteredData = months;
      }
      
      setChartData(filteredData);
    }
  }, [yearlyData, timeRange, year]);

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
  };

  return (
    <Card className={`bg-white rounded-lg shadow ${className}`}>
      <CardHeader className="flex flex-row justify-between items-center pb-4">
        <CardTitle className="text-base font-semibold">Monthly Spending</CardTitle>
        <Select value={timeRange} onValueChange={handleTimeRangeChange}>
          <SelectTrigger className="w-[150px] text-sm h-8">
            <SelectValue placeholder="Select a timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
            <SelectItem value="12months">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[250px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 5,
                  left: 5,
                  bottom: 20,
                }}
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
                  formatter={(value) => [`$${value}`, 'Expenses']}
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
                  fill={(data) => {
                    // Return red for bars that exceed budget
                    return data.exceedsBudget ? "#EF4444" : "#0E76FD";
                  }}
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-neutral-500">No spending data available</p>
            </div>
          )}
        </div>
        
        <div className="mt-4 text-sm text-neutral-500 flex justify-center gap-6">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
            <span>Exceeds budget</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-primary mr-2"></span>
            <span>Within budget</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
