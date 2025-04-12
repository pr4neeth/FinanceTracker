import { useState } from "react";
import Header from "@/components/Layout/Header";
import Sidebar from "@/components/Layout/Sidebar";
import MobileNavigation from "@/components/Layout/MobileNavigation";
import { useAuth } from "@/hooks/use-auth";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { format, isAfter, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Calendar as CalendarIcon, 
  Edit, 
  Trash2, 
  PlusCircle, 
  Loader2, 
  AlertCircle, 
  CalendarCheck, 
  Check
} from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, { message: "Please enter a name" }),
  amount: z.string().min(1, { message: "Please enter an amount" }).transform(v => parseFloat(v)),
  dueDate: z.date(),
  frequency: z.string().min(1, { message: "Please select a frequency" }),
  categoryId: z.string().optional(),
  isPaid: z.boolean().default(false),
  autoPayEnabled: z.boolean().default(false),
  reminderDays: z.string().transform(v => parseInt(v))
});

export default function BillsPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      amount: "",
      dueDate: new Date(),
      frequency: "monthly",
      categoryId: "",
      isPaid: false,
      autoPayEnabled: false,
      reminderDays: "3"
    }
  });

  // Fetch bills
  const { data: bills, isLoading: billsLoading } = useQuery({
    queryKey: ["/api/bills"],
    queryFn: async () => {
      const response = await fetch("/api/bills");
      if (!response.ok) throw new Error("Failed to fetch bills");
      return await response.json();
    }
  });

  // Fetch upcoming bills
  const { data: upcomingBills, isLoading: upcomingLoading } = useQuery({
    queryKey: ["/api/bills/upcoming"],
    queryFn: async () => {
      const response = await fetch("/api/bills/upcoming?days=14");
      if (!response.ok) throw new Error("Failed to fetch upcoming bills");
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

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: async (data) => {
      return await apiRequest("POST", "/api/bills", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/upcoming"] });
      setIsDialogOpen(false);
      form.reset();
    }
  });

  // Update bill mutation
  const updateBillMutation = useMutation({
    mutationFn: async (data) => {
      return await apiRequest("PUT", `/api/bills/${selectedBill.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/upcoming"] });
      setIsDialogOpen(false);
      setSelectedBill(null);
    }
  });

  // Delete bill mutation
  const deleteBillMutation = useMutation({
    mutationFn: async (id) => {
      return await apiRequest("DELETE", `/api/bills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/upcoming"] });
      setSelectedBill(null);
    }
  });

  // Mark bill as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (bill) => {
      return await apiRequest("PUT", `/api/bills/${bill.id}`, { 
        ...bill, 
        isPaid: true 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/upcoming"] });
    }
  });

  const onSubmit = (data) => {
    // If categoryId is an empty string, convert to undefined
    const processedData = {
      ...data,
      categoryId: data.categoryId ? parseInt(data.categoryId) : undefined
    };

    if (selectedBill) {
      updateBillMutation.mutate(processedData);
    } else {
      createBillMutation.mutate(processedData);
    }
  };

  const editBill = (bill) => {
    setSelectedBill(bill);
    form.reset({
      name: bill.name,
      amount: bill.amount.toString(),
      dueDate: new Date(bill.dueDate),
      frequency: bill.frequency,
      categoryId: bill.categoryId ? bill.categoryId.toString() : "",
      isPaid: bill.isPaid,
      autoPayEnabled: bill.autoPayEnabled,
      reminderDays: bill.reminderDays.toString()
    });
    setIsDialogOpen(true);
  };

  const openNewBillDialog = () => {
    setSelectedBill(null);
    form.reset({
      name: "",
      amount: "",
      dueDate: new Date(),
      frequency: "monthly",
      categoryId: "",
      isPaid: false,
      autoPayEnabled: false,
      reminderDays: "3"
    });
    setIsDialogOpen(true);
  };

  const getCategoryName = (categoryId) => {
    if (!categories) return null;
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : null;
  };

  const isOverdue = (dueDate) => {
    return isAfter(new Date(), new Date(dueDate));
  };

  const isDueSoon = (dueDate) => {
    const today = new Date();
    const threshold = addDays(today, 3); // Next 3 days
    const dueDateObj = new Date(dueDate);
    return isAfter(dueDateObj, today) && isAfter(threshold, dueDateObj);
  };

  // Filter bills based on active tab
  const filteredBills = bills?.filter(bill => {
    if (activeTab === "upcoming") return !bill.isPaid;
    if (activeTab === "paid") return bill.isPaid;
    if (activeTab === "autopay") return bill.autoPayEnabled;
    return true; // all tab
  });

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Header 
        toggleMobileMenu={toggleMobileMenu} 
        username={user?.fullName || user?.username || "User"}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage="bills" />
        
        <main className="flex-1 overflow-y-auto p-4 bg-neutral-50">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Bills & Subscriptions</h1>
              <p className="text-neutral-600">
                Track your recurring bills and never miss a payment
              </p>
            </div>
            <Button onClick={openNewBillDialog} className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> Add Bill
            </Button>
          </div>
          
          {upcomingLoading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : upcomingBills && upcomingBills.length > 0 ? (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Upcoming Bills
                </CardTitle>
                <CardDescription>
                  Bills due in the next 14 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingBills.map(bill => (
                    <div key={bill.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full ${
                          isOverdue(bill.dueDate) ? "bg-red-500" : 
                          isDueSoon(bill.dueDate) ? "bg-amber-500" : 
                          "bg-green-500"
                        }`} />
                        <div>
                          <h4 className="font-medium">{bill.name}</h4>
                          <p className="text-sm text-neutral-500">
                            Due: {format(new Date(bill.dueDate), "MMM dd, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-medium">${bill.amount.toFixed(2)}</p>
                          {bill.autoPayEnabled && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              Auto-pay
                            </span>
                          )}
                        </div>
                        <Button
                          variant="outline" 
                          size="sm"
                          className="gap-1"
                          onClick={() => markAsPaidMutation.mutate(bill)}
                          disabled={markAsPaidMutation.isPending}
                        >
                          <Check className="h-4 w-4" /> Mark Paid
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
          
          <Card>
            <CardHeader>
              <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="paid">Paid</TabsTrigger>
                  <TabsTrigger value="autopay">Auto-Pay</TabsTrigger>
                  <TabsTrigger value="all">All Bills</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {billsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredBills && filteredBills.length > 0 ? (
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Frequency
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                      {filteredBills.map(bill => (
                        <tr key={bill.id} className="hover:bg-neutral-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
                                <CalendarCheck className="h-5 w-5" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-neutral-900">
                                  {bill.name}
                                </div>
                                {bill.categoryId && (
                                  <div className="text-xs text-neutral-500">
                                    {getCategoryName(bill.categoryId)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-neutral-900">
                              ${bill.amount.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-neutral-500">
                              {format(new Date(bill.dueDate), "MMM dd, yyyy")}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-neutral-500">
                              {bill.frequency.charAt(0).toUpperCase() + bill.frequency.slice(1)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {bill.isPaid ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                Paid
                              </span>
                            ) : isOverdue(bill.dueDate) ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                                Overdue
                              </span>
                            ) : isDueSoon(bill.dueDate) ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">
                                Due Soon
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                Upcoming
                              </span>
                            )}
                            {bill.autoPayEnabled && (
                              <span className="ml-1 px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                                Auto-pay
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => editBill(bill)} className="h-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 text-red-500">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Bill</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this bill? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteBillMutation.mutate(bill.id)}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              {!bill.isPaid && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8"
                                  onClick={() => markAsPaidMutation.mutate(bill)}
                                  disabled={markAsPaidMutation.isPending}
                                >
                                  <Check className="h-4 w-4 mr-1" /> Mark Paid
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <CalendarCheck className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Bills Found</h3>
                  <p className="text-neutral-500 mb-4">
                    {activeTab === "upcoming" ? "You don't have any upcoming bills." : 
                     activeTab === "paid" ? "You don't have any paid bills yet." :
                     activeTab === "autopay" ? "You don't have any bills with auto-pay enabled." :
                     "You haven't added any bills yet."}
                  </p>
                  <Button onClick={openNewBillDialog}>Add Your First Bill</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      
      <MobileNavigation activePage="bills" />
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedBill ? "Edit Bill" : "Add New Bill"}</DialogTitle>
            <DialogDescription>
              {selectedBill 
                ? "Update your bill details below" 
                : "Add a new bill or subscription to track"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Electricity Bill" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
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
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
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
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="once">One-time</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (Optional)</FormLabel>
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
                        <SelectItem value="">None</SelectItem>
                        {categories?.map(category => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reminderDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reminder Days</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="30"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Days before due date to remind you
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="autoPayEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Auto-Pay</FormLabel>
                          <FormDescription className="text-xs">
                            Automatically mark as paid
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isPaid"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Already Paid</FormLabel>
                          <FormDescription className="text-xs">
                            Mark this bill as already paid
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createBillMutation.isPending || updateBillMutation.isPending}
                >
                  {(createBillMutation.isPending || updateBillMutation.isPending) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {selectedBill ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    selectedBill ? "Update Bill" : "Create Bill"
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
            <Sidebar isMobile={true} onClose={closeMobileMenu} activePage="bills" />
          </div>
        </div>
      )}
    </div>
  );
}
