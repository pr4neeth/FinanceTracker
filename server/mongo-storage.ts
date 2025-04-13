import { Types } from 'mongoose';
import { connection } from './mongodb';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import {
  User, Category, PlaidItem, Account, Transaction, Budget, Bill, FinancialGoal, AiInsight,
  UserDocument, CategoryDocument, PlaidItemDocument, AccountDocument, TransactionDocument, 
  BudgetDocument, BillDocument, FinancialGoalDocument, AiInsightDocument,
  InsertUser, InsertCategory, InsertPlaidItem, InsertAccount, InsertTransaction,
  InsertBudget, InsertBill, InsertGoal, InsertAiInsight
} from './models';

export interface IStorage {
  // User methods
  getUser(id: string): Promise<UserDocument | null>;
  getUserByUsername(username: string): Promise<UserDocument | null>;
  createUser(user: InsertUser): Promise<UserDocument>;
  getAllUsers(): Promise<UserDocument[]>;
  
  // Category methods
  createCategory(category: InsertCategory): Promise<CategoryDocument>;
  getCategoriesByUserId(userId: string): Promise<CategoryDocument[]>;
  getAllCategories(): Promise<CategoryDocument[]>;
  getCategoryById(id: string): Promise<CategoryDocument | null>;
  updateCategory(id: string, data: Partial<InsertCategory>): Promise<CategoryDocument | null>;
  deleteCategory(id: string): Promise<boolean>;
  
  // Plaid methods
  createPlaidItem(plaidItem: InsertPlaidItem): Promise<PlaidItemDocument>;
  getPlaidItemsByUserId(userId: string): Promise<PlaidItemDocument[]>;
  getPlaidItemById(id: string): Promise<PlaidItemDocument | null>;
  getPlaidItemByItemId(itemId: string): Promise<PlaidItemDocument | null>;
  deletePlaidItem(id: string): Promise<boolean>;
  
  // Account methods
  createAccount(account: InsertAccount): Promise<AccountDocument>;
  getAccountsByUserId(userId: string): Promise<AccountDocument[]>;
  getAccountsByPlaidItemId(plaidItemId: string): Promise<AccountDocument[]>;
  getAccountById(id: string): Promise<AccountDocument | null>;
  getAccountByPlaidAccountId(plaidAccountId: string): Promise<AccountDocument | null>;
  updateAccount(id: string, data: Partial<InsertAccount>): Promise<AccountDocument | null>;
  deleteAccount(id: string): Promise<boolean>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<TransactionDocument>;
  getTransactionsByUserId(userId: string, limit?: number): Promise<TransactionDocument[]>;
  getTransactionsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<TransactionDocument[]>;
  getTransactionById(id: string): Promise<TransactionDocument | null>;
  updateTransaction(id: string, data: Partial<InsertTransaction>): Promise<TransactionDocument | null>;
  deleteTransaction(id: string): Promise<boolean>;
  
  // Budget methods
  createBudget(budget: InsertBudget): Promise<BudgetDocument>;
  getBudgetsByUserId(userId: string): Promise<BudgetDocument[]>;
  getBudgetById(id: string): Promise<BudgetDocument | null>;
  updateBudget(id: string, data: Partial<InsertBudget>): Promise<BudgetDocument | null>;
  deleteBudget(id: string): Promise<boolean>;
  
  // Bill methods
  createBill(bill: InsertBill): Promise<BillDocument>;
  getBillsByUserId(userId: string): Promise<BillDocument[]>;
  getUpcomingBills(userId: string, days: number): Promise<BillDocument[]>;
  getBillById(id: string): Promise<BillDocument | null>;
  updateBill(id: string, data: Partial<InsertBill>): Promise<BillDocument | null>;
  deleteBill(id: string): Promise<boolean>;
  
  // Financial Goals methods
  createGoal(goal: InsertGoal): Promise<FinancialGoalDocument>;
  getGoalsByUserId(userId: string): Promise<FinancialGoalDocument[]>;
  getGoalById(id: string): Promise<FinancialGoalDocument | null>;
  updateGoal(id: string, data: Partial<InsertGoal>): Promise<FinancialGoalDocument | null>;
  deleteGoal(id: string): Promise<boolean>;
  
  // AI Insights methods
  createAiInsight(insight: InsertAiInsight): Promise<AiInsightDocument>;
  getAiInsightsByUserId(userId: string, limit?: number): Promise<AiInsightDocument[]>;
  getUnreadAiInsights(userId: string): Promise<AiInsightDocument[]>;
  markAiInsightAsRead(id: string): Promise<AiInsightDocument | null>;
  
  // Analytics methods
  getMonthlySummary(userId: string, year: number, month: number): Promise<{
    income: number;
    expenses: number;
    savings: number;
    categorizedExpenses: Array<{ category: CategoryDocument; amount: number }>;
  }>;
  getYearlySummary(userId: string, year: number): Promise<{
    income: number;
    expenses: number;
    savings: number;
    monthlyBreakdown: Array<{ month: number; income: number; expenses: number }>;
  }>;
  
  // Session store
  sessionStore: session.Store;
}

export class MongoStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = MongoStore.create({
      client: connection.getClient(),
      ttl: 7 * 24 * 60 * 60, // 7 days
      autoRemove: 'native'
    });
  }
  
  // User methods
  async getUser(id: string): Promise<UserDocument | null> {
    try {
      return await User.findById(id);
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }
  
  async getUserByUsername(username: string): Promise<UserDocument | null> {
    try {
      return await User.findOne({ username });
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }
  
  async createUser(user: InsertUser): Promise<UserDocument> {
    try {
      const newUser = new User(user);
      return await newUser.save();
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  // Category methods
  async createCategory(category: InsertCategory): Promise<CategoryDocument> {
    try {
      const newCategory = new Category(category);
      return await newCategory.save();
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }
  
  async getCategoriesByUserId(userId: string): Promise<CategoryDocument[]> {
    try {
      return await Category.find({ userId: new Types.ObjectId(userId) });
    } catch (error) {
      console.error('Error getting categories by user ID:', error);
      return [];
    }
  }
  
  async getAllCategories(): Promise<CategoryDocument[]> {
    try {
      return await Category.find({});
    } catch (error) {
      console.error('Error getting all categories:', error);
      return [];
    }
  }
  
  async getCategoryById(id: string): Promise<CategoryDocument | null> {
    try {
      return await Category.findById(id);
    } catch (error) {
      console.error('Error getting category by ID:', error);
      return null;
    }
  }
  
  async updateCategory(id: string, data: Partial<InsertCategory>): Promise<CategoryDocument | null> {
    try {
      return await Category.findByIdAndUpdate(id, data, { new: true });
    } catch (error) {
      console.error('Error updating category:', error);
      return null;
    }
  }
  
  async deleteCategory(id: string): Promise<boolean> {
    try {
      const result = await Category.deleteOne({ _id: id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }
  
  // Plaid methods
  async createPlaidItem(plaidItem: InsertPlaidItem): Promise<PlaidItemDocument> {
    try {
      const newPlaidItem = new PlaidItem(plaidItem);
      return await newPlaidItem.save();
    } catch (error) {
      console.error('Error creating Plaid item:', error);
      throw error;
    }
  }
  
  async getPlaidItemsByUserId(userId: string): Promise<PlaidItemDocument[]> {
    try {
      return await PlaidItem.find({ userId: new Types.ObjectId(userId) });
    } catch (error) {
      console.error('Error getting Plaid items by user ID:', error);
      return [];
    }
  }
  
  async getPlaidItemById(id: string): Promise<PlaidItemDocument | null> {
    try {
      return await PlaidItem.findById(id);
    } catch (error) {
      console.error('Error getting Plaid item by ID:', error);
      return null;
    }
  }
  
  async getPlaidItemByItemId(itemId: string): Promise<PlaidItemDocument | null> {
    try {
      return await PlaidItem.findOne({ itemId });
    } catch (error) {
      console.error('Error getting Plaid item by item ID:', error);
      return null;
    }
  }
  
  async deletePlaidItem(id: string): Promise<boolean> {
    try {
      const result = await PlaidItem.deleteOne({ _id: id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting Plaid item:', error);
      return false;
    }
  }
  
  async updatePlaidItem(id: string, data: Partial<InsertPlaidItem>): Promise<PlaidItemDocument | null> {
    try {
      return await PlaidItem.findByIdAndUpdate(id, data, { new: true });
    } catch (error) {
      console.error('Error updating Plaid item:', error);
      return null;
    }
  }
  
  // Account methods
  async createAccount(account: InsertAccount): Promise<AccountDocument> {
    try {
      const newAccount = new Account(account);
      return await newAccount.save();
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }
  
  async getAccountsByUserId(userId: string): Promise<AccountDocument[]> {
    try {
      return await Account.find({ userId: new Types.ObjectId(userId) });
    } catch (error) {
      console.error('Error getting accounts by user ID:', error);
      return [];
    }
  }
  
  async getAccountsByPlaidItemId(plaidItemId: string): Promise<AccountDocument[]> {
    try {
      return await Account.find({ plaidItemId: new Types.ObjectId(plaidItemId) });
    } catch (error) {
      console.error('Error getting accounts by Plaid item ID:', error);
      return [];
    }
  }
  
  async getAccountById(id: string): Promise<AccountDocument | null> {
    try {
      return await Account.findById(id);
    } catch (error) {
      console.error('Error getting account by ID:', error);
      return null;
    }
  }
  
  async getAccountByPlaidAccountId(plaidAccountId: string): Promise<AccountDocument | null> {
    try {
      return await Account.findOne({ plaidAccountId });
    } catch (error) {
      console.error('Error getting account by Plaid account ID:', error);
      return null;
    }
  }
  
  async updateAccount(id: string, data: Partial<InsertAccount>): Promise<AccountDocument | null> {
    try {
      return await Account.findByIdAndUpdate(id, data, { new: true });
    } catch (error) {
      console.error('Error updating account:', error);
      return null;
    }
  }
  
  async deleteAccount(id: string): Promise<boolean> {
    try {
      const result = await Account.deleteOne({ _id: id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting account:', error);
      return false;
    }
  }
  
  // Transaction methods
  async createTransaction(transaction: InsertTransaction): Promise<TransactionDocument> {
    try {
      const newTransaction = new Transaction(transaction);
      return await newTransaction.save();
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }
  
  async getTransactionsByUserId(userId: string, limit: number = 50): Promise<TransactionDocument[]> {
    try {
      // Remove populate for now to debug the raw categoryId
      const transactions = await Transaction.find({ userId: new Types.ObjectId(userId) })
        .sort({ date: -1 })
        .limit(limit);
        
      console.log("MongoDB - First transaction categoryId (raw):", 
        transactions.length > 0 ? 
          { type: typeof transactions[0].categoryId, value: transactions[0].categoryId } : 
          'No transactions found');
      
      return transactions;
    } catch (error) {
      console.error('Error getting transactions by user ID:', error);
      return [];
    }
  }
  
  async getTransactionsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<TransactionDocument[]> {
    try {
      return await Transaction.find({
        userId: new Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      })
        .sort({ date: -1 })
        .populate('categoryId')
        .populate('accountId');
    } catch (error) {
      console.error('Error getting transactions by date range:', error);
      return [];
    }
  }
  
  async getTransactionById(id: string): Promise<TransactionDocument | null> {
    try {
      return await Transaction.findById(id)
        .populate('categoryId')
        .populate('accountId');
    } catch (error) {
      console.error('Error getting transaction by ID:', error);
      return null;
    }
  }
  
  async updateTransaction(id: string, data: Partial<InsertTransaction>): Promise<TransactionDocument | null> {
    try {
      return await Transaction.findByIdAndUpdate(id, data, { new: true });
    } catch (error) {
      console.error('Error updating transaction:', error);
      return null;
    }
  }
  
  async deleteTransaction(id: string): Promise<boolean> {
    try {
      const result = await Transaction.deleteOne({ _id: id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  }
  
  // Budget methods
  async createBudget(budget: InsertBudget): Promise<BudgetDocument> {
    try {
      const newBudget = new Budget(budget);
      return await newBudget.save();
    } catch (error) {
      console.error('Error creating budget:', error);
      throw error;
    }
  }
  
  async getBudgetsByUserId(userId: string): Promise<BudgetDocument[]> {
    try {
      return await Budget.find({ userId: new Types.ObjectId(userId) })
        .populate('categoryId');
    } catch (error) {
      console.error('Error getting budgets by user ID:', error);
      return [];
    }
  }
  
  async getBudgetById(id: string): Promise<BudgetDocument | null> {
    try {
      return await Budget.findById(id)
        .populate('categoryId');
    } catch (error) {
      console.error('Error getting budget by ID:', error);
      return null;
    }
  }
  
  async updateBudget(id: string, data: Partial<InsertBudget>): Promise<BudgetDocument | null> {
    try {
      return await Budget.findByIdAndUpdate(id, data, { new: true });
    } catch (error) {
      console.error('Error updating budget:', error);
      return null;
    }
  }
  
  async deleteBudget(id: string): Promise<boolean> {
    try {
      const result = await Budget.deleteOne({ _id: id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting budget:', error);
      return false;
    }
  }
  
  // Bill methods
  async createBill(bill: InsertBill): Promise<BillDocument> {
    try {
      const newBill = new Bill(bill);
      return await newBill.save();
    } catch (error) {
      console.error('Error creating bill:', error);
      throw error;
    }
  }
  
  async getBillsByUserId(userId: string): Promise<BillDocument[]> {
    try {
      return await Bill.find({ userId: new Types.ObjectId(userId) })
        .populate('categoryId');
    } catch (error) {
      console.error('Error getting bills by user ID:', error);
      return [];
    }
  }
  
  async getUpcomingBills(userId: string, days: number): Promise<BillDocument[]> {
    try {
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + days);
      
      return await Bill.find({
        userId: new Types.ObjectId(userId),
        dueDate: { $gte: today, $lte: endDate },
        isPaid: false
      })
        .sort({ dueDate: 1 })
        .populate('categoryId');
    } catch (error) {
      console.error('Error getting upcoming bills:', error);
      return [];
    }
  }
  
  async getBillById(id: string): Promise<BillDocument | null> {
    try {
      return await Bill.findById(id)
        .populate('categoryId');
    } catch (error) {
      console.error('Error getting bill by ID:', error);
      return null;
    }
  }
  
  async updateBill(id: string, data: Partial<InsertBill>): Promise<BillDocument | null> {
    try {
      return await Bill.findByIdAndUpdate(id, data, { new: true });
    } catch (error) {
      console.error('Error updating bill:', error);
      return null;
    }
  }
  
  async deleteBill(id: string): Promise<boolean> {
    try {
      const result = await Bill.deleteOne({ _id: id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting bill:', error);
      return false;
    }
  }
  
  // Financial Goals methods
  async createGoal(goal: InsertGoal): Promise<FinancialGoalDocument> {
    try {
      const newGoal = new FinancialGoal(goal);
      return await newGoal.save();
    } catch (error) {
      console.error('Error creating financial goal:', error);
      throw error;
    }
  }
  
  async getGoalsByUserId(userId: string): Promise<FinancialGoalDocument[]> {
    try {
      return await FinancialGoal.find({ userId: new Types.ObjectId(userId) });
    } catch (error) {
      console.error('Error getting financial goals by user ID:', error);
      return [];
    }
  }
  
  async getGoalById(id: string): Promise<FinancialGoalDocument | null> {
    try {
      return await FinancialGoal.findById(id);
    } catch (error) {
      console.error('Error getting financial goal by ID:', error);
      return null;
    }
  }
  
  async updateGoal(id: string, data: Partial<InsertGoal>): Promise<FinancialGoalDocument | null> {
    try {
      return await FinancialGoal.findByIdAndUpdate(id, data, { new: true });
    } catch (error) {
      console.error('Error updating financial goal:', error);
      return null;
    }
  }
  
  async deleteGoal(id: string): Promise<boolean> {
    try {
      const result = await FinancialGoal.deleteOne({ _id: id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting financial goal:', error);
      return false;
    }
  }
  
  // AI Insights methods
  async createAiInsight(insight: InsertAiInsight): Promise<AiInsightDocument> {
    try {
      const newInsight = new AiInsight(insight);
      return await newInsight.save();
    } catch (error) {
      console.error('Error creating AI insight:', error);
      throw error;
    }
  }
  
  async getAiInsightsByUserId(userId: string, limit: number = 10): Promise<AiInsightDocument[]> {
    try {
      return await AiInsight.find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error getting AI insights by user ID:', error);
      return [];
    }
  }
  
  async getAiInsightById(id: string): Promise<AiInsightDocument | null> {
    try {
      return await AiInsight.findById(id);
    } catch (error) {
      console.error('Error getting AI insight by ID:', error);
      return null;
    }
  }
  
  async getUnreadAiInsights(userId: string): Promise<AiInsightDocument[]> {
    try {
      return await AiInsight.find({
        userId: new Types.ObjectId(userId),
        isRead: false
      })
        .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting unread AI insights:', error);
      return [];
    }
  }
  
  async markAiInsightAsRead(id: string): Promise<AiInsightDocument | null> {
    try {
      return await AiInsight.findByIdAndUpdate(id, { isRead: true }, { new: true });
    } catch (error) {
      console.error('Error marking AI insight as read:', error);
      return null;
    }
  }
  
  // Analytics methods
  async getMonthlySummary(userId: string, year: number, month: number): Promise<{
    income: number;
    expenses: number;
    savings: number;
    categorizedExpenses: Array<{ category: CategoryDocument; amount: number }>;
  }> {
    try {
      // Define the date range for the specified month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      // Get all transactions for the user in the specified date range
      const transactions = await this.getTransactionsByDateRange(userId, startDate, endDate);
      
      // Calculate income and expenses
      let income = 0;
      let expenses = 0;
      const categoryExpenses: Record<string, number> = {};
      
      for (const transaction of transactions) {
        if (transaction.isIncome) {
          income += transaction.amount;
        } else {
          expenses += transaction.amount;
          
          // Track expenses by category
          if (transaction.categoryId) {
            const categoryId = transaction.categoryId._id.toString();
            categoryExpenses[categoryId] = (categoryExpenses[categoryId] || 0) + transaction.amount;
          }
        }
      }
      
      // Get all categories
      const categories = await this.getCategoriesByUserId(userId);
      const categoryMap = new Map(categories.map(c => [c._id.toString(), c]));
      
      // Format categorized expenses
      const categorizedExpenses = Object.entries(categoryExpenses).map(([categoryId, amount]) => ({
        category: categoryMap.get(categoryId) as CategoryDocument,
        amount
      })).filter(item => item.category); // Filter out any null categories
      
      return {
        income,
        expenses,
        savings: income - expenses,
        categorizedExpenses
      };
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      return {
        income: 0,
        expenses: 0,
        savings: 0,
        categorizedExpenses: []
      };
    }
  }
  
  async getYearlySummary(userId: string, year: number): Promise<{
    income: number;
    expenses: number;
    savings: number;
    monthlyBreakdown: Array<{ month: number; income: number; expenses: number }>;
  }> {
    try {
      // Define the date range for the specified year
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      
      // Get all transactions for the user in the year
      const transactions = await this.getTransactionsByDateRange(userId, startDate, endDate);
      
      // Initialize monthly breakdown
      const monthlyData: Array<{ month: number; income: number; expenses: number }> = [];
      for (let i = 1; i <= 12; i++) {
        monthlyData.push({ month: i, income: 0, expenses: 0 });
      }
      
      // Calculate income, expenses, and monthly breakdown
      let totalIncome = 0;
      let totalExpenses = 0;
      
      for (const transaction of transactions) {
        const month = new Date(transaction.date).getMonth() + 1;
        if (transaction.isIncome) {
          totalIncome += transaction.amount;
          monthlyData[month - 1].income += transaction.amount;
        } else {
          totalExpenses += transaction.amount;
          monthlyData[month - 1].expenses += transaction.amount;
        }
      }
      
      return {
        income: totalIncome,
        expenses: totalExpenses,
        savings: totalIncome - totalExpenses,
        monthlyBreakdown: monthlyData
      };
    } catch (error) {
      console.error('Error getting yearly summary:', error);
      return {
        income: 0,
        expenses: 0,
        savings: 0,
        monthlyBreakdown: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          income: 0,
          expenses: 0
        }))
      };
    }
  }
}

export const storage = new MongoStorage();