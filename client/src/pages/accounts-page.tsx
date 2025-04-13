import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Loader2, Plus, CreditCard, Wallet, Building, Trash2, PencilLine } from "lucide-react";

import Sidebar from "@/components/Layout/Sidebar";
import MobileNavigation from "@/components/Layout/MobileNavigation";
import PlaidLinkComponent from "@/components/PlaidLinkComponent";
import LinkedAccountsList from "@/components/LinkedAccountsList";

// Account form schema
const accountFormSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.string().min(1, "Account type is required"),
  balance: z.string().transform((val) => parseFloat(val)),
  currency: z.string().default("USD"),
  description: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export default function AccountsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  // Account types
  const accountTypes = [
    { value: "checking", label: "Checking" },
    { value: "savings", label: "Savings" },
    { value: "credit", label: "Credit Card" },
    { value: "investment", label: "Investment" },
    { value: "cash", label: "Cash" },
    { value: "other", label: "Other" },
  ];

  // Currency options (showing only a few common ones)
  const currencies = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" },
    { value: "JPY", label: "JPY - Japanese Yen" },
    { value: "CAD", label: "CAD - Canadian Dollar" },
    { value: "AUD", label: "AUD - Australian Dollar" },
  ];

  // Fetch accounts
  const {
    data: accounts,
    isLoading: accountsLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const response = await fetch("/api/accounts", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch accounts");
      return await response.json();
    },
  });

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (data: AccountFormValues) => {
      const res = await apiRequest("POST", "/api/accounts", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({
        title: "Account created successfully",
        description: "Your new account has been added.",
      });
      setAccountFormOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update account mutation
  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AccountFormValues }) => {
      const res = await apiRequest("PATCH", `/api/accounts/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({
        title: "Account updated",
        description: "Your account has been updated successfully.",
      });
      setAccountFormOpen(false);
      setEditingAccount(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/accounts/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({
        title: "Account deleted",
        description: "The account has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize account form
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: "",
      type: "checking",
      balance: "0",
      currency: "USD",
      description: "",
    },
  });

  function openMobileMenu() {
    setMobileMenuOpen(true);
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function openAccountForm() {
    form.reset({
      name: "",
      type: "checking",
      balance: "0",
      currency: "USD",
      description: "",
    });
    setEditingAccount(null);
    setAccountFormOpen(true);
  }

  function closeAccountForm() {
    setAccountFormOpen(false);
    setEditingAccount(null);
    form.reset();
  }

  function editAccount(account: any) {
    setEditingAccount(account);
    form.reset({
      name: account.name,
      type: account.type,
      balance: account.balance.toString(),
      currency: account.currency || "USD",
      description: account.description || "",
    });
    setAccountFormOpen(true);
  }

  function confirmDeleteAccount(account: any) {
    // This could be expanded to use a confirmation dialog
    if (window.confirm(`Are you sure you want to delete the account "${account.name}"?`)) {
      deleteAccountMutation.mutate(account._id);
    }
  }

  function onSubmit(data: AccountFormValues) {
    if (editingAccount) {
      updateAccountMutation.mutate({
        id: editingAccount._id,
        data,
      });
    } else {
      createAccountMutation.mutate(data);
    }
  }

  function getAccountIcon(type: string) {
    switch (type) {
      case "checking":
        return <Building className="h-5 w-5" />;
      case "savings":
        return <Building className="h-5 w-5" />;
      case "credit":
        return <CreditCard className="h-5 w-5" />;
      case "cash":
        return <Wallet className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  }

  function formatCurrency(amount: number, currency = "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <Sidebar activePage="accounts" className="hidden md:block" />

        <main className="flex-1 p-8">
          <div className="container mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your financial accounts
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="md:hidden"
                  variant="outline"
                  size="icon"
                  onClick={openMobileMenu}
                >
                  <span className="sr-only">Open menu</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </Button>
              </div>
            </div>

            <Card className="mb-8">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Your Accounts</CardTitle>
                    <CardDescription>
                      View and manage all your financial accounts
                    </CardDescription>
                  </div>
                  <Button onClick={openAccountForm} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Account
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {accountsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : isError ? (
                  <div className="flex justify-center py-8 text-center text-muted-foreground">
                    <p>Unable to load accounts. Please try again later.</p>
                  </div>
                ) : accounts && accounts.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {accounts.map((account: any) => (
                      <Card key={account._id} className="relative">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-full ${account.type === 'credit' ? 'bg-rose-100 text-rose-500' : 'bg-blue-100 text-blue-500'}`}>
                                {getAccountIcon(account.type)}
                              </div>
                              <CardTitle className="text-lg">
                                {account.name}
                              </CardTitle>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => editAccount(account)}
                              >
                                <PencilLine className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirmDeleteAccount(account)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <CardDescription>
                            {accountTypes.find(t => t.value === account.type)?.label}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="mt-2">
                            <p className={`text-xl font-semibold ${account.type === 'credit' && account.balance < 0 ? 'text-destructive' : 'text-primary'}`}>
                              {formatCurrency(account.balance, account.currency)}
                            </p>
                            {account.description && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {account.description}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="bg-muted p-4 rounded-full mb-4">
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">No accounts yet</h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      Add your bank accounts, credit cards, and other financial accounts to track your finances more effectively.
                    </p>
                    <Button onClick={openAccountForm} className="gap-2">
                      <Plus className="h-4 w-4" /> Add Your First Account
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <MobileNavigation activePage="accounts" />

      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={closeMobileMenu}>
          <div className="fixed right-0 top-0 bottom-0 w-4/5 max-w-xs bg-white shadow-lg overflow-y-auto z-50" onClick={(e) => e.stopPropagation()}>
            <Sidebar isMobile={true} onClose={closeMobileMenu} activePage="accounts" />
          </div>
        </div>
      )}

      {/* Account Form Dialog */}
      <Dialog open={accountFormOpen} onOpenChange={closeAccountForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Account" : "Add New Account"}
            </DialogTitle>
            <DialogDescription>
              {editingAccount
                ? "Update your account information below"
                : "Enter your account details below to add it to your profile"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Chase Checking" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accountTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Balance</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter negative value for credit card debt
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Add notes about this account"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeAccountForm}
                  disabled={createAccountMutation.isPending || updateAccountMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createAccountMutation.isPending || updateAccountMutation.isPending}
                >
                  {createAccountMutation.isPending || updateAccountMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingAccount ? "Updating..." : "Adding..."}
                    </>
                  ) : (
                    <>{editingAccount ? "Update Account" : "Add Account"}</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}