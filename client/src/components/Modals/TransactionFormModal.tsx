import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertTransactionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-simple-auth";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Create a transaction form schema based on the insert schema
const transactionFormSchema = insertTransactionSchema.extend({
  amount: z.string().min(1, "Amount is required"),
  date: z.date({
    required_error: "Please select a date",
  }),
  categoryId: z.string(), // Allow "none" as a valid option
  notes: z.string().optional().nullable(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionFormModal({ isOpen, onClose }: TransactionFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Fetch categories with fallback defaults
  const { data: fetchedCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch categories");
      return await response.json();
    }
  });

  // Use some default categories if none are returned from the API
  const defaultCategories = [
    { id: 1, name: "Food & Groceries", icon: "shopping-cart", color: "#4CAF50" },
    { id: 2, name: "Housing", icon: "home", color: "#2196F3" },
    { id: 3, name: "Transportation", icon: "car", color: "#FFC107" },
    { id: 4, name: "Entertainment", icon: "film", color: "#9C27B0" },
    { id: 5, name: "Utilities", icon: "zap", color: "#FF5722" },
    { id: 6, name: "Income", icon: "dollar-sign", color: "#00BFA5" }
  ];
  
  // Use fetched categories if available, otherwise use defaults
  const categories = fetchedCategories?.length > 0 ? fetchedCategories : defaultCategories;

  // Define default form values
  const defaultValues: Partial<TransactionFormValues> = {
    description: "",
    amount: "",
    date: new Date(),
    categoryId: "none",
    isIncome: false,
    notes: "",
  };

  // Initialize form
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues,
  });

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormValues) => {
      try {
        // Convert values for API
        const apiData = {
          ...data,
          amount: parseFloat(data.amount as string),
          categoryId: data.categoryId === "none" ? null : parseInt(data.categoryId),
          date: data.date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
        };
        
        console.log("Submitting transaction data:", apiData);
        
        // Direct fetch with credentials instead of using apiRequest
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiData),
          credentials: "include"
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Error ${res.status}: ${errorText}`);
        }
        
        return await res.json();
      } catch (err) {
        console.error("Transaction submission error:", err);
        throw err;
      }
    },
    onSuccess: () => {
      toast({
        title: "Transaction added",
        description: "Your transaction has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      form.reset(defaultValues);
      onClose();
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error adding transaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  function onSubmit(data: TransactionFormValues) {
    // Add the current user ID to the transaction
    console.log("Form submitted with data:", data);
    console.log("Current user:", user);
    
    if (user) {
      const dataWithUserId = {
        ...data,
        userId: user.id,
      };
      console.log("Sending data to API:", dataWithUserId);
      createTransactionMutation.mutate(dataWithUserId);
    } else {
      console.error("No user found when submitting transaction");
      toast({
        title: "Authentication error",
        description: "You must be logged in to add transactions",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>
            Enter the details of your new transaction below
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Grocery shopping" {...field} />
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
                        step="0.01"
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
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
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
            </div>

            <FormField
              control={form.control}
              name="isIncome"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value || false}
                      onCheckedChange={(checked) => field.onChange(!!checked)}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>This is income</FormLabel>
                    <FormDescription>
                      Check this box if this transaction is income rather than an expense
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Add notes about this transaction" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createTransactionMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTransactionMutation.isPending}
              >
                {createTransactionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Transaction"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}