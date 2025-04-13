import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CalendarCheck,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface BillReminder {
  _id: string;
  name: string;
  amount: number;
  dueDate: string;
  reminderDays: number;
  isPaid: boolean;
}

const BillReminders = () => {
  const [show, setShow] = useState(true);
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Fetch upcoming bills (due in the next 14 days)
  const { data: upcomingBills, isLoading } = useQuery({
    queryKey: ["/api/bills/upcoming"],
    queryFn: async () => {
      const response = await fetch("/api/bills/upcoming?days=14");
      if (!response.ok) throw new Error("Failed to fetch upcoming bills");
      return await response.json();
    }
  });
  
  // Mutation to mark a bill as paid
  const markAsPaidMutation = useMutation({
    mutationFn: async (billId: string) => {
      const response = await apiRequest("PATCH", `/api/bills/${billId}`, { isPaid: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills/upcoming"] });
      toast({
        title: "Bill marked as paid",
        description: "The bill has been marked as paid successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to mark bill as paid",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Group bills by due date proximity (today, this week, next week)
  const groupedBills = upcomingBills?.reduce((acc: any, bill: BillReminder) => {
    const dueDate = new Date(bill.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(today);
    tomorrowEnd.setDate(today.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    if (dueDate <= tomorrowEnd) {
      acc.today.push(bill);
    } else if (dueDate <= weekEnd) {
      acc.thisWeek.push(bill);
    } else {
      acc.later.push(bill);
    }
    return acc;
  }, { today: [], thisWeek: [], later: [] });

  // Show a toast notification when there are bills due today
  useEffect(() => {
    if (groupedBills?.today?.length > 0) {
      toast({
        title: "Bills due today!",
        description: `You have ${groupedBills.today.length} bill${groupedBills.today.length > 1 ? 's' : ''} due today.`,
        variant: "destructive",
      });
    }
  }, [groupedBills?.today]);

  // If no upcoming bills or reminders closed, don't show anything
  if (!show || isLoading || !upcomingBills || upcomingBills.length === 0) {
    return null;
  }

  const goToBillsPage = () => {
    setLocation("/bills");
  };

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50">
      <CardHeader className="pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-amber-800 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Bill Reminders
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setShow(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {groupedBills?.today?.length > 0 && (
            <div>
              <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Due Today
              </h4>
              <div className="space-y-2">
                {groupedBills.today.map((bill: BillReminder) => (
                  <div
                    key={bill._id}
                    className="bg-white rounded-lg p-3 flex items-center justify-between border border-amber-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-8 bg-red-500 rounded-full"></div>
                      <div>
                        <h5 className="font-medium">{bill.name}</h5>
                        <p className="text-sm text-neutral-500">
                          Due: {format(new Date(bill.dueDate), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        ${bill.amount.toFixed(2)}
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="ml-2 bg-white hover:bg-green-50 border-green-200 text-green-700"
                        disabled={markAsPaidMutation.isPending}
                        onClick={() => markAsPaidMutation.mutate(bill._id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Paid
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {groupedBills?.thisWeek?.length > 0 && (
            <div>
              <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Due This Week
              </h4>
              <div className="space-y-2">
                {groupedBills.thisWeek.map((bill: BillReminder) => (
                  <div
                    key={bill._id}
                    className="bg-white rounded-lg p-3 flex items-center justify-between border border-amber-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-8 bg-amber-500 rounded-full"></div>
                      <div>
                        <h5 className="font-medium">{bill.name}</h5>
                        <p className="text-sm text-neutral-500">
                          Due: {format(new Date(bill.dueDate), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        ${bill.amount.toFixed(2)}
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="ml-2 bg-white hover:bg-green-50 border-green-200 text-green-700"
                        disabled={markAsPaidMutation.isPending}
                        onClick={() => markAsPaidMutation.mutate(bill._id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Paid
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {groupedBills?.later?.length > 0 && (
            <div>
              <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" /> Coming Up
              </h4>
              <div className="space-y-2">
                {groupedBills.later.map((bill: BillReminder) => (
                  <div
                    key={bill._id}
                    className="bg-white rounded-lg p-3 flex items-center justify-between border border-amber-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-8 bg-green-500 rounded-full"></div>
                      <div>
                        <h5 className="font-medium">{bill.name}</h5>
                        <p className="text-sm text-neutral-500">
                          Due: {format(new Date(bill.dueDate), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        ${bill.amount.toFixed(2)}
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="ml-2 bg-white hover:bg-green-50 border-green-200 text-green-700"
                        disabled={markAsPaidMutation.isPending}
                        onClick={() => markAsPaidMutation.mutate(bill._id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Paid
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="my-2 bg-amber-200" />
          
          <Button
            variant="outline"
            className="w-full bg-white border-amber-200 hover:bg-amber-100 text-amber-800"
            onClick={goToBillsPage}
          >
            Manage all bills <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BillReminders;