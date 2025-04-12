import React from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export interface BudgetAlert {
  id: string;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  percentSpent: number;
  isExceeded: boolean;
  timestamp: Date;
}

interface BudgetAlertBannerProps {
  alert: BudgetAlert;
  onDismiss: (id: string) => void;
}

export function BudgetAlertBanner({ alert, onDismiss }: BudgetAlertBannerProps) {
  const { id, categoryName, budgetAmount, spentAmount, percentSpent, isExceeded } = alert;
  
  const Icon = isExceeded ? AlertCircle : AlertTriangle;
  const color = isExceeded ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground";
  const title = isExceeded 
    ? `Budget Exceeded: ${categoryName}` 
    : `Budget Alert: ${categoryName}`;
  const message = isExceeded
    ? `Your budget of $${budgetAmount.toFixed(2)} for ${categoryName} has been exceeded.`
    : `You've used ${percentSpent}% of your budget for ${categoryName}.`;

  return (
    <Alert className={`mb-4 border ${isExceeded ? 'border-destructive' : 'border-warning'} relative`}>
      <Icon className={`h-4 w-4 ${isExceeded ? 'text-destructive' : 'text-warning'}`} />
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute right-2 top-2" 
        onClick={() => onDismiss(id)}
      >
        <XCircle className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </Button>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <div className="mt-2">
          <p>{message}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>Budget: ${budgetAmount.toFixed(2)}</div>
            <div>Spent: ${spentAmount.toFixed(2)}</div>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface BudgetAlertContainerProps {
  alerts: BudgetAlert[];
  onDismiss: (id: string) => void;
}

export function BudgetAlertContainer({ alerts, onDismiss }: BudgetAlertContainerProps) {
  console.log("BudgetAlertContainer rendering with", alerts.length, "alerts");
  
  if (alerts.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 w-80 z-50 space-y-2 max-h-[80vh] overflow-y-auto">
      {alerts.map(alert => (
        <BudgetAlertBanner 
          key={alert.id} 
          alert={alert} 
          onDismiss={onDismiss} 
        />
      ))}
      {/* Debugging indicator */}
      <div className="bg-primary text-primary-foreground p-2 rounded text-xs">
        {alerts.length} alert(s) active
      </div>
    </div>
  );
}