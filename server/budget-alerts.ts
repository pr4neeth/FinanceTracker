import { Budget, Category, Transaction } from '@shared/schema';
import { IStorage } from './storage';
import { sendBudgetAlertEmail } from './email';

// This function checks if a budget alert should be sent after a new transaction
export async function checkBudgetAlerts(
  storage: IStorage,
  transaction: Transaction,
  userId: number
): Promise<void> {
  // Skip if there's no category (can't match to budget) or if it's income
  if (!transaction.categoryId || transaction.isIncome) {
    return;
  }

  try {
    // Get current month's date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    // Get all transactions for this user in the current month for this category
    const transactions = await storage.getTransactionsByDateRange(
      userId,
      startOfMonth,
      endOfMonth
    );
    
    // Get all budgets for this user
    const budgets = await storage.getBudgetsByUserId(userId);
    
    // Find budget for this category if it exists
    const budget = budgets.find(b => b.categoryId === transaction.categoryId);
    
    if (!budget) {
      // No budget for this category
      return;
    }
    
    // Calculate total spent in this category
    let totalSpent = 0;
    for (const tx of transactions) {
      if (tx.categoryId === transaction.categoryId && !tx.isIncome) {
        totalSpent += tx.amount;
      }
    }
    
    // Get the category name
    const category = await storage.getCategoryById(transaction.categoryId);
    if (!category) {
      console.error(`Category not found for ID: ${transaction.categoryId}`);
      return;
    }
    
    // Get user details for sending email
    const user = await storage.getUser(userId);
    if (!user || !user.email) {
      console.error(`User not found or doesn't have email: ${userId}`);
      return;
    }
    
    // Calculate percentage of budget spent
    const percentSpent = (totalSpent / budget.amount) * 100;
    
    // Get alert threshold (default to 80% if not set)
    const alertThreshold = budget.alertThreshold ?? 80;
    
    // Determine if we should send alerts
    const shouldSendThresholdAlert = 
      percentSpent >= alertThreshold && 
      percentSpent < 100 && 
      // Check if this transaction pushed it over the threshold
      (totalSpent - transaction.amount) / budget.amount * 100 < alertThreshold;
    
    const shouldSendExceededAlert = 
      percentSpent >= 100 && 
      // Check if this transaction pushed it over the budget
      (totalSpent - transaction.amount) / budget.amount * 100 < 100;
    
    // Send threshold alert if needed
    if (shouldSendThresholdAlert) {
      console.log(`Sending threshold alert for ${category.name} budget`);
      await sendBudgetAlertEmail(
        user.email,
        user.fullName || user.username,
        category.name,
        budget.amount,
        totalSpent,
        alertThreshold, // Use the safe alertThreshold value
        false // not exceeded, just threshold
      );
    }
    
    // Send exceeded alert if needed
    if (shouldSendExceededAlert) {
      console.log(`Sending exceeded alert for ${category.name} budget`);
      await sendBudgetAlertEmail(
        user.email,
        user.fullName || user.username,
        category.name,
        budget.amount,
        totalSpent,
        alertThreshold, // Use the safe alertThreshold value
        true // exceeded
      );
    }
  } catch (error) {
    console.error('Error in checkBudgetAlerts:', error);
  }
}