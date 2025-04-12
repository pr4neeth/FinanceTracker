import { 
  users, 
  type User, 
  type InsertUser, 
  budgets, 
  type Budget, 
  type InsertBudget,
  categories, 
  type Category, 
  type InsertCategory,
  transactions, 
  type Transaction, 
  type InsertTransaction,
  accounts, 
  type Account, 
  type InsertAccount,
  bills, 
  type Bill, 
  type InsertBill,
  financialGoals, 
  type FinancialGoal, 
  type InsertGoal,
  aiInsights, 
  type AiInsight, 
  type InsertAiInsight
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Category methods
  createCategory(category: InsertCategory): Promise<Category>;
  getCategoriesByUserId(userId: number): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  // Account methods
  createAccount(account: InsertAccount): Promise<Account>;
  getAccountsByUserId(userId: number): Promise<Account[]>;
  getAccountById(id: number): Promise<Account | undefined>;
  updateAccount(id: number, data: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<boolean>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUserId(userId: number, limit?: number): Promise<Transaction[]>;
  getTransactionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]>;
  getTransactionById(id: number): Promise<Transaction | undefined>;
  updateTransaction(id: number, data: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  
  // Budget methods
  createBudget(budget: InsertBudget): Promise<Budget>;
  getBudgetsByUserId(userId: number): Promise<Budget[]>;
  getBudgetById(id: number): Promise<Budget | undefined>;
  updateBudget(id: number, data: Partial<InsertBudget>): Promise<Budget | undefined>;
  deleteBudget(id: number): Promise<boolean>;
  
  // Bill methods
  createBill(bill: InsertBill): Promise<Bill>;
  getBillsByUserId(userId: number): Promise<Bill[]>;
  getUpcomingBills(userId: number, days: number): Promise<Bill[]>;
  getBillById(id: number): Promise<Bill | undefined>;
  updateBill(id: number, data: Partial<InsertBill>): Promise<Bill | undefined>;
  deleteBill(id: number): Promise<boolean>;
  
  // Financial Goals methods
  createGoal(goal: InsertGoal): Promise<FinancialGoal>;
  getGoalsByUserId(userId: number): Promise<FinancialGoal[]>;
  getGoalById(id: number): Promise<FinancialGoal | undefined>;
  updateGoal(id: number, data: Partial<InsertGoal>): Promise<FinancialGoal | undefined>;
  deleteGoal(id: number): Promise<boolean>;
  
  // AI Insights methods
  createAiInsight(insight: InsertAiInsight): Promise<AiInsight>;
  getAiInsightsByUserId(userId: number, limit?: number): Promise<AiInsight[]>;
  getUnreadAiInsights(userId: number): Promise<AiInsight[]>;
  markAiInsightAsRead(id: number): Promise<AiInsight | undefined>;
  
  // Analytics methods
  getMonthlySummary(userId: number, year: number, month: number): Promise<{
    income: number;
    expenses: number;
    savings: number;
    categorizedExpenses: Array<{ category: Category; amount: number }>;
  }>;
  getYearlySummary(userId: number, year: number): Promise<{
    income: number;
    expenses: number;
    savings: number;
    monthlyBreakdown: Array<{ month: number; income: number; expenses: number }>;
  }>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Category methods
  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }
  
  async getCategoriesByUserId(userId: number): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId));
  }
  
  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    return category;
  }
  
  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db
      .update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    const result = await db
      .delete(categories)
      .where(eq(categories.id, id));
    return true;
  }
  
  // Account methods
  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db
      .insert(accounts)
      .values(account)
      .returning();
    return newAccount;
  }
  
  async getAccountsByUserId(userId: number): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId));
  }
  
  async getAccountById(id: number): Promise<Account | undefined> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id));
    return account;
  }
  
  async updateAccount(id: number, data: Partial<InsertAccount>): Promise<Account | undefined> {
    const [updated] = await db
      .update(accounts)
      .set(data)
      .where(eq(accounts.id, id))
      .returning();
    return updated;
  }
  
  async deleteAccount(id: number): Promise<boolean> {
    const result = await db
      .delete(accounts)
      .where(eq(accounts.id, id));
    return true;
  }
  
  // Transaction methods
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }
  
  async getTransactionsByUserId(userId: number, limit: number = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date))
      .limit(limit);
  }
  
  async getTransactionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      )
      .orderBy(desc(transactions.date));
  }
  
  async getTransactionById(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return transaction;
  }
  
  async updateTransaction(id: number, data: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const [updated] = await db
      .update(transactions)
      .set(data)
      .where(eq(transactions.id, id))
      .returning();
    return updated;
  }
  
  async deleteTransaction(id: number): Promise<boolean> {
    const result = await db
      .delete(transactions)
      .where(eq(transactions.id, id));
    return true;
  }
  
  // Budget methods
  async createBudget(budget: InsertBudget): Promise<Budget> {
    const [newBudget] = await db
      .insert(budgets)
      .values(budget)
      .returning();
    return newBudget;
  }
  
  async getBudgetsByUserId(userId: number): Promise<Budget[]> {
    return await db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId));
  }
  
  async getBudgetById(id: number): Promise<Budget | undefined> {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(eq(budgets.id, id));
    return budget;
  }
  
  async updateBudget(id: number, data: Partial<InsertBudget>): Promise<Budget | undefined> {
    const [updated] = await db
      .update(budgets)
      .set(data)
      .where(eq(budgets.id, id))
      .returning();
    return updated;
  }
  
  async deleteBudget(id: number): Promise<boolean> {
    const result = await db
      .delete(budgets)
      .where(eq(budgets.id, id));
    return true;
  }
  
  // Bill methods
  async createBill(bill: InsertBill): Promise<Bill> {
    const [newBill] = await db
      .insert(bills)
      .values(bill)
      .returning();
    return newBill;
  }
  
  async getBillsByUserId(userId: number): Promise<Bill[]> {
    return await db
      .select()
      .from(bills)
      .where(eq(bills.userId, userId));
  }
  
  async getUpcomingBills(userId: number, days: number): Promise<Bill[]> {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);
    
    return await db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.userId, userId),
          eq(bills.isPaid, false),
          gte(bills.dueDate, today),
          lte(bills.dueDate, futureDate)
        )
      )
      .orderBy(bills.dueDate);
  }
  
  async getBillById(id: number): Promise<Bill | undefined> {
    const [bill] = await db
      .select()
      .from(bills)
      .where(eq(bills.id, id));
    return bill;
  }
  
  async updateBill(id: number, data: Partial<InsertBill>): Promise<Bill | undefined> {
    const [updated] = await db
      .update(bills)
      .set(data)
      .where(eq(bills.id, id))
      .returning();
    return updated;
  }
  
  async deleteBill(id: number): Promise<boolean> {
    const result = await db
      .delete(bills)
      .where(eq(bills.id, id));
    return true;
  }
  
  // Financial Goals methods
  async createGoal(goal: InsertGoal): Promise<FinancialGoal> {
    const [newGoal] = await db
      .insert(financialGoals)
      .values(goal)
      .returning();
    return newGoal;
  }
  
  async getGoalsByUserId(userId: number): Promise<FinancialGoal[]> {
    return await db
      .select()
      .from(financialGoals)
      .where(eq(financialGoals.userId, userId));
  }
  
  async getGoalById(id: number): Promise<FinancialGoal | undefined> {
    const [goal] = await db
      .select()
      .from(financialGoals)
      .where(eq(financialGoals.id, id));
    return goal;
  }
  
  async updateGoal(id: number, data: Partial<InsertGoal>): Promise<FinancialGoal | undefined> {
    const [updated] = await db
      .update(financialGoals)
      .set(data)
      .where(eq(financialGoals.id, id))
      .returning();
    return updated;
  }
  
  async deleteGoal(id: number): Promise<boolean> {
    const result = await db
      .delete(financialGoals)
      .where(eq(financialGoals.id, id));
    return true;
  }
  
  // AI Insights methods
  async createAiInsight(insight: InsertAiInsight): Promise<AiInsight> {
    const [newInsight] = await db
      .insert(aiInsights)
      .values(insight)
      .returning();
    return newInsight;
  }
  
  async getAiInsightsByUserId(userId: number, limit: number = 10): Promise<AiInsight[]> {
    return await db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.userId, userId))
      .orderBy(desc(aiInsights.createdAt))
      .limit(limit);
  }
  
  async getUnreadAiInsights(userId: number): Promise<AiInsight[]> {
    return await db
      .select()
      .from(aiInsights)
      .where(
        and(
          eq(aiInsights.userId, userId),
          eq(aiInsights.isRead, false)
        )
      )
      .orderBy(desc(aiInsights.createdAt));
  }
  
  async markAiInsightAsRead(id: number): Promise<AiInsight | undefined> {
    const [updated] = await db
      .update(aiInsights)
      .set({ isRead: true })
      .where(eq(aiInsights.id, id))
      .returning();
    return updated;
  }
  
  // Analytics methods
  async getMonthlySummary(userId: number, year: number, month: number): Promise<{
    income: number;
    expenses: number;
    savings: number;
    categorizedExpenses: Array<{ category: Category; amount: number }>;
  }> {
    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // Get monthly transactions
    const monthlyTransactions = await this.getTransactionsByDateRange(userId, startDate, endDate);
    
    // Calculate income and expenses
    const income = monthlyTransactions
      .filter(t => t.isIncome)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expenses = monthlyTransactions
      .filter(t => !t.isIncome)
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Get categorized expenses
    const expensesByCategory = new Map<number, number>();
    
    for (const transaction of monthlyTransactions) {
      if (!transaction.isIncome && transaction.categoryId) {
        const current = expensesByCategory.get(transaction.categoryId) || 0;
        expensesByCategory.set(transaction.categoryId, current + transaction.amount);
      }
    }
    
    const categorizedExpenses = await Promise.all(
      Array.from(expensesByCategory.entries()).map(async ([categoryId, amount]) => {
        const category = await this.getCategoryById(categoryId);
        return { category, amount };
      })
    );
    
    // Filter out any null categories
    const validCategorizedExpenses = categorizedExpenses.filter(
      item => item.category !== undefined
    ) as Array<{ category: Category; amount: number }>;
    
    return {
      income,
      expenses,
      savings: income - expenses,
      categorizedExpenses: validCategorizedExpenses,
    };
  }
  
  async getYearlySummary(userId: number, year: number): Promise<{
    income: number;
    expenses: number;
    savings: number;
    monthlyBreakdown: Array<{ month: number; income: number; expenses: number }>;
  }> {
    // Create date range for the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    // Get yearly transactions
    const yearlyTransactions = await this.getTransactionsByDateRange(userId, startDate, endDate);
    
    // Calculate total income and expenses
    const income = yearlyTransactions
      .filter(t => t.isIncome)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expenses = yearlyTransactions
      .filter(t => !t.isIncome)
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate monthly breakdown
    const monthlyBreakdown = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthDate = new Date(year, month - 1, 1);
      const monthName = monthDate.toLocaleString('default', { month: 'long' });
      
      const monthTransactions = yearlyTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === month - 1;
      });
      
      const monthIncome = monthTransactions
        .filter(t => t.isIncome)
        .reduce((sum, t) => sum + t.amount, 0);
        
      const monthExpenses = monthTransactions
        .filter(t => !t.isIncome)
        .reduce((sum, t) => sum + t.amount, 0);
      
      monthlyBreakdown.push({
        month,
        income: monthIncome,
        expenses: monthExpenses,
      });
    }
    
    return {
      income,
      expenses,
      savings: income - expenses,
      monthlyBreakdown,
    };
  }
}

export const storage = new DatabaseStorage();
