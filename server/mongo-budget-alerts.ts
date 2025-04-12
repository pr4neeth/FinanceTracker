import { IStorage } from './mongo-storage';
import { TransactionDocument } from './models';
import { sendBudgetAlertEmail as sendEmail } from './email';

interface BudgetAlert {
  categoryId: string;
  categoryName: string;
  amount: number;
  spent: number;
  percentSpent: number;
  isExceeded: boolean;
}

export async function checkBudgetAlerts(
  storage: IStorage,
  transaction: TransactionDocument,
): Promise<BudgetAlert[] | null> {
  try {
    // Skip if transaction is income or doesn't have a category
    if (transaction.isIncome || !transaction.categoryId) {
      return null;
    }

    const categoryId = transaction.categoryId.toString();
    const userId = transaction.userId.toString();

    // Get all user's budgets
    const budgets = await storage.getBudgetsByUserId(userId);
    
    // Get all user's transactions
    const transactions = await storage.getTransactionsByUserId(userId);
    
    // Get all user's categories
    const categories = await storage.getCategoriesByUserId(userId);
    
    // Debug logs
    console.log("Number of transactions:", transactions.length);
    console.log("Categories:", categories.map(c => ({ id: c._id, name: c.name })));
    console.log("Budgets:", budgets.map(b => ({ id: b._id, categoryId: b.categoryId })));
    console.log("Transactions:", transactions.map(t => ({ 
      amount: t.amount, 
      categoryId: t.categoryId,
    })));

    // Find the budget for this category
    const budget = budgets.find(b => b.categoryId.toString() === categoryId);
    if (!budget) {
      return null;
    }

    // Calculate spending for the category
    const categorySpending = new Map<string, number>();
    
    for (const t of transactions) {
      if (t.categoryId && !t.isIncome) {
        const cId = t.categoryId.toString();
        categorySpending.set(cId, (categorySpending.get(cId) || 0) + t.amount);
      }
    }
    
    console.log("Calculated spending:", Array.from(categorySpending.entries()).map(([categoryId, spent]) => ({
      categoryId,
      spent
    })));

    // Find the category name
    const category = categories.find(c => c._id.toString() === categoryId);
    const categoryName = category ? category.name : `Category ${categoryId}`;

    // Calculate spending and check for alerts
    const spent = categorySpending.get(categoryId) || 0;
    const percentSpent = Math.round((spent / budget.amount) * 100);
    
    const alerts: BudgetAlert[] = [];
    
    // Check if we've exceeded the budget
    if (spent > budget.amount) {
      alerts.push({
        categoryId,
        categoryName,
        amount: budget.amount,
        spent,
        percentSpent,
        isExceeded: true
      });
    }
    // Check if we're approaching the budget threshold
    else if (percentSpent >= budget.alertThreshold) {
      alerts.push({
        categoryId,
        categoryName,
        amount: budget.amount,
        spent,
        percentSpent,
        isExceeded: false
      });
    }

    return alerts.length > 0 ? alerts : null;
  } catch (error) {
    console.error("Error checking budget alerts:", error);
    return null;
  }
}

export async function sendBudgetAlertEmail(params: {
  to: string;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  isExceeded: boolean;
}): Promise<boolean> {
  const { to, categoryName, budgetAmount, spentAmount, isExceeded } = params;
  
  const percentSpent = Math.round((spentAmount / budgetAmount) * 100);
  
  const subject = isExceeded
    ? `Budget Alert: ${categoryName} budget exceeded`
    : `Budget Alert: ${categoryName} budget at ${percentSpent}%`;
  
  const text = isExceeded
    ? `Your budget of $${budgetAmount.toFixed(2)} for ${categoryName} has been exceeded. You have spent $${spentAmount.toFixed(2)}.`
    : `You have spent $${spentAmount.toFixed(2)} of your $${budgetAmount.toFixed(2)} budget for ${categoryName}. This is ${percentSpent}% of your budget.`;
  
  const html = `
    <html>
      <body>
        <h2>${subject}</h2>
        <p>${text}</p>
        <hr>
        <p>Budget: $${budgetAmount.toFixed(2)}</p>
        <p>Spent: $${spentAmount.toFixed(2)}</p>
        <p>Percentage: ${percentSpent}%</p>
      </body>
    </html>
  `;
  
  return await sendEmail({
    to,
    from: "budgetapp@example.com",
    subject,
    text,
    html
  });
}