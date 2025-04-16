import { IStorage } from './mongo-storage';
import { TransactionDocument } from './models';
import { sendBudgetAlertEmail as sendEmail } from './email';
import { getAllCategories, findCategoryById } from './config/categories';

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
      console.log("Budget alert check: Skipping - transaction is income or has no category");
      return null;
    }

    const categoryId = transaction.categoryId.toString();
    const userId = transaction.userId.toString();

    console.log(`Budget alert check: Processing transaction with categoryId ${categoryId}`);

    // Get all user's budgets
    const budgets = await storage.getBudgetsByUserId(userId);
    
    // Get all user's transactions for the current month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    
    const transactions = await storage.getTransactionsByDateRange(
      userId, 
      startOfMonth, 
      endOfMonth
    );
    
    // Use config-based categories instead of DB categories
    const categories = getAllCategories();
    
    // Debug logs
    console.log("Budget alert check: Number of transactions:", transactions.length);
    console.log("Budget alert check: Number of budgets:", budgets.length);
    console.log("Budget alert check: Transaction category:", categoryId);
    console.log("Budget alert check: Budgets:", budgets.map(b => ({ 
      id: b._id.toString(), 
      categoryId: b.categoryId.toString(),
      amount: b.amount,
      threshold: b.alertThreshold
    })));

    // Find the budget for this category
    const budget = budgets.find(b => b.categoryId.toString() === categoryId);
    if (!budget) {
      console.log(`Budget alert check: No budget found for category ${categoryId}`);
      return null;
    }
    console.log(`Budget alert check: Found budget with amount ${budget.amount} and threshold ${budget.alertThreshold}`);

    // Calculate spending for the category
    const categorySpending = new Map<string, number>();
    
    for (const t of transactions) {
      if (t.categoryId && !t.isIncome) {
        const cId = t.categoryId.toString();
        const currentAmount = categorySpending.get(cId) || 0;
        const newAmount = currentAmount + t.amount;
        categorySpending.set(cId, newAmount);
        console.log(`Budget alert check: Adding transaction amount ${t.amount} to category ${cId}, new total: ${newAmount}`);
      }
    }
    
    console.log("Budget alert check: Calculated spending:", Array.from(categorySpending.entries()));

    // Find the category name from config
    const category = findCategoryById(categoryId);
    const categoryName = category ? category.name : `Category ${categoryId}`;
    console.log(`Budget alert check: Category name: ${categoryName}`);

    // Calculate spending and check for alerts
    const spent = categorySpending.get(categoryId) || 0;
    const percentSpent = Math.round((spent / budget.amount) * 100);
    console.log(`Budget alert check: Spent ${spent} of ${budget.amount} (${percentSpent}%)`);
    
    const alerts: BudgetAlert[] = [];
    
    // Check if we've exceeded the budget
    if (spent > budget.amount) {
      console.log(`Budget alert check: Budget EXCEEDED for ${categoryName}`);
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
      console.log(`Budget alert check: Budget threshold REACHED for ${categoryName} (${percentSpent}% of ${budget.alertThreshold}%)`);
      alerts.push({
        categoryId,
        categoryName,
        amount: budget.amount,
        spent,
        percentSpent,
        isExceeded: false
      });
    } else {
      console.log(`Budget alert check: No alert needed. Spent: ${percentSpent}%, Threshold: ${budget.alertThreshold}%`);
    }

    return alerts.length > 0 ? alerts : null;
  } catch (error) {
    console.error("Budget alert check: Error checking budget alerts:", error);
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
  
  try {
    console.log(`Sending budget alert email to ${to} for ${categoryName}`);
    
    // Using the correct interface from email.ts
    return await sendEmail({
      to,
      from: "praneeth.paladugu2@gmail.com", // This needs to be a verified sender in SendGrid
      subject,
      text,
      html
    });
  } catch (error) {
    console.error("Error sending budget alert email:", error);
    return false;
  }
}