import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Filter, ShoppingCart, Film, Utensils, Car, Briefcase, Home, CreditCard, Gift } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PlaidTransactionsProps {
  accountId: string;
  className?: string;
}

const getCategoryIcon = (category?: string) => {
  if (!category) return <Gift className="h-5 w-5" />;
  
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes("food") || categoryLower.includes("groceries")) return <ShoppingCart className="h-5 w-5" />;
  if (categoryLower.includes("dining") || categoryLower.includes("restaurant")) return <Utensils className="h-5 w-5" />;
  if (categoryLower.includes("entertainment") || categoryLower.includes("movie")) return <Film className="h-5 w-5" />;
  if (categoryLower.includes("transport") || categoryLower.includes("gas") || categoryLower.includes("uber")) return <Car className="h-5 w-5" />;
  if (categoryLower.includes("income") || categoryLower.includes("salary")) return <Briefcase className="h-5 w-5" />;
  if (categoryLower.includes("housing") || categoryLower.includes("rent") || categoryLower.includes("mortgage")) return <Home className="h-5 w-5" />;
  if (categoryLower.includes("subscription") || categoryLower.includes("bill")) return <CreditCard className="h-5 w-5" />;
  
  return <Gift className="h-5 w-5" />;
};

const getCategoryBadgeColor = (category?: string) => {
  if (!category) return "bg-gray-100 text-gray-800";
  
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes("food") || categoryLower.includes("groceries")) return "bg-green-100 text-green-800";
  if (categoryLower.includes("dining") || categoryLower.includes("restaurant")) return "bg-orange-100 text-orange-800";
  if (categoryLower.includes("entertainment") || categoryLower.includes("movie")) return "bg-purple-100 text-purple-800";
  if (categoryLower.includes("transport") || categoryLower.includes("gas")) return "bg-blue-100 text-blue-800";
  if (categoryLower.includes("income") || categoryLower.includes("salary")) return "bg-green-100 text-green-800";
  if (categoryLower.includes("housing") || categoryLower.includes("rent")) return "bg-yellow-100 text-yellow-800";
  if (categoryLower.includes("shopping")) return "bg-blue-100 text-blue-800";
  
  return "bg-gray-100 text-gray-800";
};

const PlaidTransactions: React.FC<PlaidTransactionsProps> = ({ accountId, className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  // Fetch account transactions from Plaid
  const { data: transactions, isLoading } = useQuery({
    queryKey: [`/api/plaid/accounts/${accountId}/transactions`],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/plaid/accounts/${accountId}/transactions`);
        return response.json();
      } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }
    },
  });

  // Filter transactions based on search query and date
  const filterTransactions = () => {
    if (!transactions) return [];
    
    return transactions.filter(transaction => {
      // Filter by search query
      const matchesSearch = searchQuery === "" || 
        transaction.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by date
      let matchesDate = true;
      if (dateFilter !== "all") {
        const currentDate = new Date();
        const transactionDate = new Date(transaction.date);
        
        if (dateFilter === "thisMonth") {
          matchesDate = transactionDate.getMonth() === currentDate.getMonth() && 
                       transactionDate.getFullYear() === currentDate.getFullYear();
        } else if (dateFilter === "lastMonth") {
          const lastMonth = new Date(currentDate);
          lastMonth.setMonth(currentDate.getMonth() - 1);
          matchesDate = transactionDate.getMonth() === lastMonth.getMonth() && 
                       transactionDate.getFullYear() === lastMonth.getFullYear();
        } else if (dateFilter === "last30Days") {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(currentDate.getDate() - 30);
          matchesDate = transactionDate >= thirtyDaysAgo;
        }
      }
      
      return matchesSearch && matchesDate;
    });
  };
  
  const filteredTransactions = filterTransactions();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle>Account Transactions</CardTitle>
        <CardDescription>
          Showing {filteredTransactions.length} of {transactions?.length || 0} transactions from your bank
        </CardDescription>
        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search transactions..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="last30Days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction, index) => {
                  const primaryCategory = transaction.category?.[0];
                  const isIncome = transaction.amount < 0; // Plaid uses negative amounts for income
                  return (
                    <TableRow key={`${transaction.transaction_id || index}`}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center mr-3 text-neutral-500">
                            {getCategoryIcon(primaryCategory)}
                          </div>
                          <span className="font-medium">{transaction.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {primaryCategory ? (
                          <span className={`px-2 py-1 text-xs rounded-full ${getCategoryBadgeColor(primaryCategory)}`}>
                            {primaryCategory}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            Uncategorized
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-500">
                        {format(new Date(transaction.date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className={`text-sm font-medium text-right ${isIncome ? "text-green-600" : "text-red-600"}`}>
                        {isIncome ? "+" : "-"}{formatCurrency(Math.abs(transaction.amount))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-500">
            {transactions?.length > 0 
              ? "No transactions found matching your filters."
              : "No transactions available for this account. Try syncing your account."}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlaidTransactions;