import { useState } from "react";
import Header from "@/components/Layout/Header";
import Sidebar from "@/components/Layout/Sidebar";
import MobileNavigation from "@/components/Layout/MobileNavigation";
import ReceiptScannerModal from "@/components/Modals/ReceiptScannerModal";
import TransactionFormModal from "@/components/Modals/TransactionFormModal";
import AddTransactionMenu from "@/components/Modals/AddTransactionMenu";
import { useAuth } from "@/hooks/use-simple-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2, Search, Filter, ShoppingCart, Film, Utensils, Car, Briefcase, Home, CreditCard, Gift, Plus } from "lucide-react";

const getCategoryIcon = (category) => {
  const name = category?.name?.toLowerCase() || "";
  
  if (name.includes("food") || name.includes("groceries")) return <ShoppingCart className="h-5 w-5" />;
  if (name.includes("dining") || name.includes("restaurant")) return <Utensils className="h-5 w-5" />;
  if (name.includes("entertainment") || name.includes("movie")) return <Film className="h-5 w-5" />;
  if (name.includes("transport") || name.includes("gas") || name.includes("uber")) return <Car className="h-5 w-5" />;
  if (name.includes("income") || name.includes("salary")) return <Briefcase className="h-5 w-5" />;
  if (name.includes("housing") || name.includes("rent") || name.includes("mortgage")) return <Home className="h-5 w-5" />;
  if (name.includes("subscription") || name.includes("bill")) return <CreditCard className="h-5 w-5" />;
  
  return <Gift className="h-5 w-5" />;
};

const getCategoryBadgeColor = (category) => {
  const name = category?.name?.toLowerCase() || "";
  
  if (name.includes("food") || name.includes("groceries")) return "bg-green-100 text-green-800";
  if (name.includes("dining") || name.includes("restaurant")) return "bg-orange-100 text-orange-800";
  if (name.includes("entertainment") || name.includes("movie")) return "bg-purple-100 text-purple-800";
  if (name.includes("transport") || name.includes("gas")) return "bg-blue-100 text-blue-800";
  if (name.includes("income") || name.includes("salary")) return "bg-green-100 text-green-800";
  if (name.includes("housing") || name.includes("rent")) return "bg-yellow-100 text-yellow-800";
  if (name.includes("shopping")) return "bg-blue-100 text-blue-800";
  
  return "bg-gray-100 text-gray-800";
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [receiptScannerOpen, setReceiptScannerOpen] = useState(false);
  const [addTransactionMenuOpen, setAddTransactionMenuOpen] = useState(false);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const toggleAddTransactionMenu = () => setAddTransactionMenuOpen(!addTransactionMenuOpen);
  const closeAddTransactionMenu = () => setAddTransactionMenuOpen(false);

  const openReceiptScanner = () => {
    setReceiptScannerOpen(true);
    setAddTransactionMenuOpen(false);
  };
  
  const openManualTransactionForm = () => {
    setTransactionFormOpen(true);
    setAddTransactionMenuOpen(false);
  };
  
  const closeReceiptScanner = () => setReceiptScannerOpen(false);
  const closeTransactionForm = () => setTransactionFormOpen(false);
  
  // Fetch transactions
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["/api/transactions"],
    queryFn: async () => {
      const response = await fetch("/api/transactions?limit=50");
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return await response.json();
    }
  });
  
  // Fetch categories for filter
  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return await response.json();
    }
  });

  // Filter transactions based on search query, category, and date
  const filterTransactions = () => {
    if (!transactions) return [];
    
    return transactions.filter(transaction => {
      // Filter by search query
      const matchesSearch = searchQuery === "" || 
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by category
      const matchesCategory = categoryFilter === "all" || 
        transaction.categoryId === parseInt(categoryFilter);
      
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
        } else if (dateFilter === "thisYear") {
          matchesDate = transactionDate.getFullYear() === currentDate.getFullYear();
        }
      }
      
      return matchesSearch && matchesCategory && matchesDate;
    });
  };
  
  const filteredTransactions = filterTransactions();

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Header 
        toggleMobileMenu={toggleMobileMenu} 
        username={user?.fullName || user?.username || "User"}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage="transactions" />
        
        <main className="flex-1 overflow-y-auto p-4 bg-neutral-50">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900">Transactions</h1>
            <p className="text-neutral-600">
              View and manage your financial transactions
            </p>
          </div>
          
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>Transaction Filters</CardTitle>
              <CardDescription>Filter transactions by various criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
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
                <div className="w-full md:w-48">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories?.map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-48">
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                      <SelectItem value="lastMonth">Last Month</SelectItem>
                      <SelectItem value="thisYear">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" className="gap-2 w-full md:w-auto">
                  <Filter className="h-4 w-4" /> More Filters
                </Button>
                <Button onClick={toggleAddTransactionMenu} className="gap-2 w-full md:w-auto">
                  <Plus className="h-4 w-4" /> Add Transaction
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>
                Showing {filteredTransactions.length} of {transactions?.length || 0} transactions
              </CardDescription>
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
                      {filteredTransactions.map(transaction => {
                        const category = categories?.find(c => c.id === transaction.categoryId);
                        return (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center mr-3 text-neutral-500">
                                  {getCategoryIcon(category)}
                                </div>
                                <span className="font-medium">{transaction.description}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {category ? (
                                <span className={`px-2 py-1 text-xs rounded-full ${getCategoryBadgeColor(category)}`}>
                                  {category.name}
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
                            <TableCell className={`text-sm font-medium text-right ${transaction.isIncome ? "text-green-600" : "text-red-600"}`}>
                              {transaction.isIncome ? "+" : "-"}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(transaction.amount))}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  No transactions found matching your filters.
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      
      <MobileNavigation activePage="transactions" />
      
      <div className="fixed right-6 bottom-20 md:bottom-6">
        <AddTransactionMenu 
          isOpen={addTransactionMenuOpen}
          onToggle={toggleAddTransactionMenu}
          onClose={closeAddTransactionMenu}
          onScanReceipt={openReceiptScanner}
          onAddManually={openManualTransactionForm}
        />
      </div>
      
      <ReceiptScannerModal 
        isOpen={receiptScannerOpen} 
        onClose={closeReceiptScanner} 
      />
      
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={closeMobileMenu}>
          <div className="fixed right-0 top-0 bottom-0 w-4/5 max-w-xs bg-white shadow-lg overflow-y-auto z-50" onClick={(e) => e.stopPropagation()}>
            <Sidebar isMobile={true} onClose={closeMobileMenu} activePage="transactions" />
          </div>
        </div>
      )}
    </div>
  );
}
