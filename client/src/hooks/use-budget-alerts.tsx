import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { BudgetAlert } from '@/components/UI/BudgetAlertBanner';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';

interface BudgetAlertsContextType {
  alerts: BudgetAlert[];
  addBudgetAlert: (
    categoryName: string,
    budgetAmount: number,
    spentAmount: number,
    isExceeded: boolean
  ) => void;
  dismissAlert: (id: string) => void;
  clearAllAlerts: () => void;
}

const defaultContext: BudgetAlertsContextType = {
  alerts: [],
  addBudgetAlert: () => {},
  dismissAlert: () => {},
  clearAllAlerts: () => {}
};

const BudgetAlertsContext = createContext<BudgetAlertsContextType>(defaultContext);

interface BudgetAlertsProviderProps {
  children: ReactNode;
}

export function BudgetAlertsProvider({ children }: BudgetAlertsProviderProps) {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const { toast } = useToast();

  // Load alerts from localStorage on mount
  useEffect(() => {
    try {
      const savedAlerts = localStorage.getItem('budgetAlerts');
      if (savedAlerts) {
        const parsedAlerts = JSON.parse(savedAlerts) as BudgetAlert[];
        // Convert string dates back to Date objects
        const alertsWithDates = parsedAlerts.map(alert => ({
          ...alert,
          timestamp: new Date(alert.timestamp)
        }));
        setAlerts(alertsWithDates);
      }
    } catch (error) {
      console.error('Error loading budget alerts from localStorage:', error);
    }
  }, []);

  // Save alerts to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('budgetAlerts', JSON.stringify(alerts));
    } catch (error) {
      console.error('Error saving budget alerts to localStorage:', error);
    }
  }, [alerts]);

  const addBudgetAlert = (
    categoryName: string,
    budgetAmount: number,
    spentAmount: number,
    isExceeded: boolean
  ) => {
    const percentSpent = Math.round((spentAmount / budgetAmount) * 100);
    
    const newAlert: BudgetAlert = {
      id: uuidv4(),
      categoryName,
      budgetAmount,
      spentAmount,
      percentSpent,
      isExceeded,
      timestamp: new Date()
    };
    
    setAlerts(prevAlerts => [...prevAlerts, newAlert]);
    
    // Also show toast notification
    toast({
      title: isExceeded 
        ? `Budget Exceeded: ${categoryName}` 
        : `Budget Alert: ${categoryName}`,
      description: isExceeded
        ? `Your budget of $${budgetAmount.toFixed(2)} has been exceeded.`
        : `You've used ${percentSpent}% of your budget.`,
      variant: isExceeded ? "destructive" : "default",
    });
  };

  const dismissAlert = (id: string) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  return (
    <BudgetAlertsContext.Provider
      value={{ alerts, addBudgetAlert, dismissAlert, clearAllAlerts }}
    >
      {children}
    </BudgetAlertsContext.Provider>
  );
}

export function useBudgetAlerts() {
  const context = useContext(BudgetAlertsContext);
  if (!context) {
    throw new Error('useBudgetAlerts must be used within a BudgetAlertsProvider');
  }
  return context;
}