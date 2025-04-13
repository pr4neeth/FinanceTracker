import { useState } from "react";
import Header from "@/components/Layout/Header";
import Sidebar from "@/components/Layout/Sidebar";
import MobileNavigation from "@/components/Layout/MobileNavigation";
import { useAuth } from "@/hooks/use-simple-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Edit, Trash2, PlusCircle, Loader2 } from "lucide-react";

const formSchema = z.object({
  categoryId: z.string().min(1, { message: "Please select a category" }),
  amount: z.string().min(1, { message: "Please enter an amount" }).transform(v => parseFloat(v)),
  period: z.string().min(1, { message: "Please select a period" }),
  startDate: z.date(),
  endDate: z.date().optional(),
  alertThreshold: z.string().transform(v => parseInt(v))
});

export default function BudgetsPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: "",
      amount: "",
      period: "monthly",
      startDate: new Date(),
      alertThreshold: "80"
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

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return await response.json();
    }
  });

  // Create budget mutation
  const createBudgetMutation = useMutation({
    mutationFn: async (data) => {
      return await apiRequest("POST", "/api/budgets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      setIsDialogOpen(false);
      form.reset();
    }
  });

  // Update budget mutation
  const updateBudgetMutation = useMutation({
    mutationFn: async (data) => {
      return await apiRequest("PUT", `/api/budgets/${selectedBudget._id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      setIsDialogOpen(false);
      setSelectedBudget(null);
    }
  });

  // Delete budget mutation
  const deleteBudgetMutation = useMutation({
    mutationFn: async (id) => {
      return await apiRequest("DELETE", `/api/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      setSelectedBudget(null);
    }
  });

  const onSubmit = (data) => {
    // Process data to handle "none" value for categoryId
    const processedData = {
      ...data,
      categoryId: data.categoryId && data.categoryId !== "none" ? data.categoryId : undefined
    };
    
    if (selectedBudget) {
      updateBudgetMutation.mutate(processedData);
    } else {
      createBudgetMutation.mutate(processedData);
    }
  };

  const editBudget = (budget) => {
    setSelectedBudget(budget);
    form.reset({
      categoryId: budget.categoryId ? budget.categoryId.toString() : "none",
      amount: budget.amount.toString(),
      period: budget.period,
      startDate: new Date(budget.startDate),
      endDate: budget.endDate ? new Date(budget.endDate) : undefined,
      alertThreshold: budget.alertThreshold.toString()
    });
    setIsDialogOpen(true);
  };

  const openNewBudgetDialog = () => {
    setSelectedBudget(null);
    form.reset({
      categoryId: "none",
      amount: "",
      period: "monthly",
      startDate: new Date(),
      alertThreshold: "80"
    });
    setIsDialogOpen(true);
  };

  // Fetch budget spending data
  const { data: budgetSpending, isLoading: spendingLoading } = useQuery({
    queryKey: ["/api/budgets/spending"],
    queryFn: async () => {
      const response = await fetch("/api/budgets/spending");
      if (!response.ok) throw new Error("Failed to fetch budget spending");
      return await response.json();
    }
  });

  // Function to calculate the budget progress using actual spending data
  const calculateProgress = (budget) => {
    if (!budgetSpending) return 0;
    
    // Find the spending for this budget's category
    const spending = budgetSpending.find(
      item => item.categoryId === budget.categoryId
    );
    
    if (!spending) return 0;
    
    // Calculate percentage of budget used
    return Math.round((spending.spent / budget.amount) * 100);
  };

  const getCategoryName = (categoryId) => {
    if (!categories) return "Loading...";
    const category = categories.find(c => c._id === categoryId);
    return category ? category.name : "Unknown";
  };

  const getBudgetStatusColor = (progress) => {
    if (progress >= 100) return "bg-red-500";
    if (progress >= 80) return "bg-amber-500";
    return "bg-green-500";
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Header 
        toggleMobileMenu={toggleMobileMenu} 
        username={user?.fullName || user?.username || "User"}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage="budgets" />
        
        <main className="flex-1 overflow-y-auto p-4 bg-neutral-50">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Budgets</h1>
              <p className="text-neutral-600">
                Create and manage your spending budgets
              </p>
            </div>
            <Button onClick={openNewBudgetDialog} className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> Create Budget
            </Button>
          </div>
          
          {budgetsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : budgets && budgets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgets.map(budget => {
                const progress = calculateProgress(budget);
                return (
                  <Card key={budget._id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex justify-between items-start">
                        <div>{getCategoryName(budget.categoryId)}</div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => editBudget(budget)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Budget</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this budget? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteBudgetMutation.mutate(budget._id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} budget
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-2xl font-bold">
                            ${budget.amount.toFixed(2)}
                          </span>
                          <span className={`text-sm rounded-full px-2 py-0.5 ${
                            progress >= 100 ? "bg-red-100 text-red-800" : 
                            progress >= 80 ? "bg-amber-100 text-amber-800" :
                            "bg-green-100 text-green-800"
                          }`}>
                            {progress >= 100 ? "Exceeded" : 
                             progress >= 80 ? "Close to limit" : 
                             "On track"}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Spent: ${(budget.amount * progress / 100).toFixed(2)}</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress 
                            value={progress > 100 ? 100 : progress} 
                            className="h-2" 
                            indicatorClassName={getBudgetStatusColor(progress)}
                          />
                        </div>
                        
                        <div className="text-sm text-neutral-500 pt-2">
                          Alert threshold: {budget.alertThreshold}%
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-neutral-50 text-sm text-neutral-500">
                      Start date: {format(new Date(budget.startDate), "MMM dd, yyyy")}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center p-12">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <PlusCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Budgets Found</h3>
              <p className="text-neutral-500 mb-4">
                You haven't created any budgets yet. Create a budget to track your spending.
              </p>
              <Button onClick={openNewBudgetDialog}>Create First Budget</Button>
            </Card>
          )}
        </main>
      </div>
      
      <MobileNavigation activePage="budgets" />
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedBudget ? "Edit Budget" : "Create New Budget"}</DialogTitle>
            <DialogDescription>
              {selectedBudget 
                ? "Update your budget details below" 
                : "Set up a new budget to help manage your spending"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={categoriesLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {categories?.map(category => (
                          <SelectItem key={category._id} value={category._id?.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5">$</span>
                        <Input
                          type="number"
                          placeholder="0.00"
                          className="pl-7"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Period</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a period" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="alertThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alert Threshold (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Get alerts when you reach this percentage of your budget
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createBudgetMutation.isPending || updateBudgetMutation.isPending}
                >
                  {(createBudgetMutation.isPending || updateBudgetMutation.isPending) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {selectedBudget ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    selectedBudget ? "Update Budget" : "Create Budget"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={closeMobileMenu}>
          <div className="fixed right-0 top-0 bottom-0 w-4/5 max-w-xs bg-white shadow-lg overflow-y-auto z-50" onClick={(e) => e.stopPropagation()}>
            <Sidebar isMobile={true} onClose={closeMobileMenu} activePage="budgets" />
          </div>
        </div>
      )}
    </div>
  );
}
