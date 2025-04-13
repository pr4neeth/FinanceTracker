import { Express, Request, Response, NextFunction } from "express";
import { Server } from "http";
import { storage } from "./mongo-storage";
import { setupAuth, requireAuth } from "./mongo-auth";
import multer from "multer";
import { WebSocketServer } from "ws";
import path from "path";
import fs from "fs";
import {
  checkBudgetAlerts,
  sendBudgetAlertEmail,
} from "./budget-alerts";
import {
  analyzeReceipt,
  generateFinancialAdvice,
  predictExpenses,
  suggestSavings,
  categorizeTransaction,
} from "./openai";
import { z } from "zod";
import { Types } from 'mongoose';

// Multer configuration for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// Custom middleware to validate request body against a Zod schema
const validateBody = (schema: z.ZodType<any, any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedBody = schema.parse(req.body);
      (req as any).validatedBody = validatedBody;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.format(),
        });
      }
      next(error);
    }
  };
};

// Helper to convert string IDs to ObjectIds
const toObjectId = (id: string) => new Types.ObjectId(id);

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Categories routes
  app.get("/api/categories", async (req, res, next) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/categories", requireAuth, async (req, res, next) => {
    try {
      const categoryData = {
        ...req.body,
        userId: req.user._id
      };
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/categories/:id", async (req, res, next) => {
    try {
      const category = await storage.getCategoryById(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (!req.user || category.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(category);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/categories/:id", async (req, res, next) => {
    try {
      const category = await storage.getCategoryById(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (!req.user || category.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedCategory = await storage.updateCategory(req.params.id, req.body);
      res.json(updatedCategory);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/categories/:id", async (req, res, next) => {
    try {
      const category = await storage.getCategoryById(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (!req.user || category.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteCategory(req.params.id);
      if (success) {
        res.status(204).end();
      } else {
        res.status(500).json({ message: "Failed to delete category" });
      }
    } catch (error) {
      next(error);
    }
  });

  // Account routes
  app.get("/api/accounts", requireAuth, async (req, res, next) => {
    try {
      const accounts = await storage.getAccountsByUserId(req.user._id.toString());
      res.json(accounts);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/accounts", requireAuth, async (req, res, next) => {
    try {
      const accountData = {
        ...req.body,
        userId: req.user._id
      };
      const account = await storage.createAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/accounts/:id", async (req, res, next) => {
    try {
      const account = await storage.getAccountById(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      if (!req.user || account.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(account);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/accounts/:id", async (req, res, next) => {
    try {
      const account = await storage.getAccountById(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      if (!req.user || account.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedAccount = await storage.updateAccount(req.params.id, req.body);
      res.json(updatedAccount);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/accounts/:id", async (req, res, next) => {
    try {
      const account = await storage.getAccountById(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      if (!req.user || account.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteAccount(req.params.id);
      if (success) {
        res.status(204).end();
      } else {
        res.status(500).json({ message: "Failed to delete account" });
      }
    } catch (error) {
      next(error);
    }
  });

  // Transaction routes
  app.get("/api/transactions", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const transactions = await storage.getTransactionsByUserId(req.user._id.toString(), limit);
      res.json(transactions);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/transactions", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Prepare transaction data
      let transactionData = {
        ...req.body,
        date: new Date(req.body.date),
        userId: req.user._id
      };
      
      // Convert categoryId and accountId to ObjectId if present
      if (transactionData.categoryId) {
        transactionData.categoryId = new Types.ObjectId(transactionData.categoryId);
      }
      
      if (transactionData.accountId) {
        transactionData.accountId = new Types.ObjectId(transactionData.accountId);
      }
      
      const transaction = await storage.createTransaction(transactionData);
      
      // Check budget alerts after transaction creation
      if (transaction.categoryId && !transaction.isIncome) {
        const allTransactions = await storage.getTransactionsByUserId(req.user._id.toString());
        try {
          const alerts = await checkBudgetAlerts(storage, transaction);
          if (alerts && alerts.length > 0) {
            // Attempt to send email alerts
            for (const alert of alerts) {
              if (req.user.email) {
                await sendBudgetAlertEmail({
                  to: req.user.email,
                  categoryName: alert.categoryName,
                  budgetAmount: alert.amount,
                  spentAmount: alert.spent,
                  isExceeded: alert.isExceeded,
                });
              }
            }
            res.status(201).json({
              transaction,
              alerts
            });
            return;
          }
        } catch (err) {
          console.error("Error checking budget alerts:", err);
          // Continue and return the transaction even if alert check fails
        }
      }
      
      res.status(201).json({ transaction });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/transactions/by-date", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }
      
      const transactions = await storage.getTransactionsByDateRange(
        req.user._id.toString(),
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(transactions);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/transactions/:id", async (req, res, next) => {
    try {
      const transaction = await storage.getTransactionById(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (!req.user || transaction.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(transaction);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/transactions/:id", async (req, res, next) => {
    try {
      const transaction = await storage.getTransactionById(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (!req.user || transaction.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Prepare update data
      let updateData = { ...req.body };
      
      // Convert categoryId and accountId to ObjectId if present
      if (updateData.categoryId) {
        updateData.categoryId = new Types.ObjectId(updateData.categoryId);
      }
      
      if (updateData.accountId) {
        updateData.accountId = new Types.ObjectId(updateData.accountId);
      }
      
      // Convert date if present
      if (updateData.date) {
        updateData.date = new Date(updateData.date);
      }
      
      const updatedTransaction = await storage.updateTransaction(req.params.id, updateData);
      res.json(updatedTransaction);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/transactions/:id", async (req, res, next) => {
    try {
      const transaction = await storage.getTransactionById(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (!req.user || transaction.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteTransaction(req.params.id);
      if (success) {
        res.status(204).end();
      } else {
        res.status(500).json({ message: "Failed to delete transaction" });
      }
    } catch (error) {
      next(error);
    }
  });

  // Budget routes
  app.get("/api/budgets", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const budgets = await storage.getBudgetsByUserId(req.user._id.toString());
      res.json(budgets);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/budgets", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Prepare budget data
      const budgetData = {
        ...req.body,
        userId: req.user._id,
        categoryId: new Types.ObjectId(req.body.categoryId),
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate || req.body.startDate)
      };
      
      const budget = await storage.createBudget(budgetData);
      res.status(201).json(budget);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/budgets/:id", async (req, res, next) => {
    try {
      const budget = await storage.getBudgetById(req.params.id);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      if (!req.user || budget.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(budget);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/budgets/:id", async (req, res, next) => {
    try {
      const budget = await storage.getBudgetById(req.params.id);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      if (!req.user || budget.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Prepare update data
      let updateData = { ...req.body };
      
      // Convert categoryId to ObjectId if present
      if (updateData.categoryId) {
        updateData.categoryId = new Types.ObjectId(updateData.categoryId);
      }
      
      // Convert dates if present
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
      }
      
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate);
      }
      
      const updatedBudget = await storage.updateBudget(req.params.id, updateData);
      res.json(updatedBudget);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/budgets/:id", async (req, res, next) => {
    try {
      const budget = await storage.getBudgetById(req.params.id);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      if (!req.user || budget.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteBudget(req.params.id);
      if (success) {
        res.status(204).end();
      } else {
        res.status(500).json({ message: "Failed to delete budget" });
      }
    } catch (error) {
      next(error);
    }
  });

  // Budget spending and alerts
  app.get("/api/budgets/spending", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const budgets = await storage.getBudgetsByUserId(req.user._id.toString());
      const transactions = await storage.getTransactionsByUserId(req.user._id.toString());
      
      // Calculate spending per category
      const categorySpending = new Map<string, number>();
      
      for (const transaction of transactions) {
        if (transaction.categoryId && !transaction.isIncome) {
          const categoryId = transaction.categoryId.toString();
          const currentAmount = categorySpending.get(categoryId) || 0;
          categorySpending.set(categoryId, currentAmount + transaction.amount);
        }
      }
      
      // Format the result
      const result = Array.from(categorySpending.entries()).map(([categoryId, spent]) => ({
        categoryId,
        spent
      }));
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/budgets/alerts", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const budgets = await storage.getBudgetsByUserId(req.user._id.toString());
      const transactions = await storage.getTransactionsByUserId(req.user._id.toString());
      const categories = await storage.getCategoriesByUserId(req.user._id.toString());
      
      // Map for quick category lookups
      const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name]));
      
      // Calculate spending per category
      const categorySpending = new Map<string, number>();
      
      for (const transaction of transactions) {
        if (transaction.categoryId && !transaction.isIncome) {
          const categoryId = transaction.categoryId.toString();
          const currentAmount = categorySpending.get(categoryId) || 0;
          categorySpending.set(categoryId, currentAmount + transaction.amount);
        }
      }
      
      // Check each budget for alerts
      const alerts = [];
      
      for (const budget of budgets) {
        const categoryId = budget.categoryId.toString();
        const spent = categorySpending.get(categoryId) || 0;
        const percentSpent = Math.round((spent / budget.amount) * 100);
        
        // Check if we should alert based on threshold or exceeding
        const isExceeded = spent > budget.amount;
        const isApproaching = percentSpent >= budget.alertThreshold && !isExceeded;
        
        if (isExceeded || isApproaching) {
          alerts.push({
            categoryId,
            categoryName: categoryMap.get(categoryId) || `Category ${categoryId}`,
            amount: budget.amount,
            spent,
            percentSpent,
            isExceeded
          });
        }
      }
      
      res.json(alerts);
    } catch (error) {
      next(error);
    }
  });

  // Bill routes
  app.get("/api/bills", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const bills = await storage.getBillsByUserId(req.user._id.toString());
      res.json(bills);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/bills", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Prepare bill data
      let billData = {
        ...req.body,
        userId: req.user._id,
        dueDate: new Date(req.body.dueDate)
      };
      
      // Convert categoryId to ObjectId if present
      if (billData.categoryId) {
        billData.categoryId = new Types.ObjectId(billData.categoryId);
      }
      
      const bill = await storage.createBill(billData);
      res.status(201).json(bill);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/bills/upcoming", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const bills = await storage.getUpcomingBills(req.user._id.toString(), days);
      
      res.json(bills);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/bills/:id", async (req, res, next) => {
    try {
      const bill = await storage.getBillById(req.params.id);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      
      if (!req.user || bill.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(bill);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/bills/:id", async (req, res, next) => {
    try {
      const bill = await storage.getBillById(req.params.id);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      
      if (!req.user || bill.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Prepare update data
      let updateData = { ...req.body };
      
      // Convert categoryId to ObjectId if present
      if (updateData.categoryId) {
        updateData.categoryId = new Types.ObjectId(updateData.categoryId);
      }
      
      // Convert due date if present
      if (updateData.dueDate) {
        updateData.dueDate = new Date(updateData.dueDate);
      }
      
      const updatedBill = await storage.updateBill(req.params.id, updateData);
      res.json(updatedBill);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/bills/:id", async (req, res, next) => {
    try {
      const bill = await storage.getBillById(req.params.id);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      
      if (!req.user || bill.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteBill(req.params.id);
      if (success) {
        res.status(204).end();
      } else {
        res.status(500).json({ message: "Failed to delete bill" });
      }
    } catch (error) {
      next(error);
    }
  });

  // Financial Goals routes
  app.get("/api/goals", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const goals = await storage.getGoalsByUserId(req.user._id.toString());
      res.json(goals);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/goals", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Prepare goal data
      const goalData = {
        ...req.body,
        userId: req.user._id,
        targetDate: new Date(req.body.targetDate)
      };
      
      const goal = await storage.createGoal(goalData);
      res.status(201).json(goal);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/goals/:id", async (req, res, next) => {
    try {
      const goal = await storage.getGoalById(req.params.id);
      if (!goal) {
        return res.status(404).json({ message: "Financial goal not found" });
      }
      
      if (!req.user || goal.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(goal);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/goals/:id", async (req, res, next) => {
    try {
      const goal = await storage.getGoalById(req.params.id);
      if (!goal) {
        return res.status(404).json({ message: "Financial goal not found" });
      }
      
      if (!req.user || goal.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Prepare update data
      let updateData = { ...req.body };
      
      // Convert target date if present
      if (updateData.targetDate) {
        updateData.targetDate = new Date(updateData.targetDate);
      }
      
      const updatedGoal = await storage.updateGoal(req.params.id, updateData);
      res.json(updatedGoal);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/goals/:id", async (req, res, next) => {
    try {
      const goal = await storage.getGoalById(req.params.id);
      if (!goal) {
        return res.status(404).json({ message: "Financial goal not found" });
      }
      
      if (!req.user || goal.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteGoal(req.params.id);
      if (success) {
        res.status(204).end();
      } else {
        res.status(500).json({ message: "Failed to delete financial goal" });
      }
    } catch (error) {
      next(error);
    }
  });

  // AI Insights routes
  app.get("/api/insights", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const insights = await storage.getAiInsightsByUserId(req.user._id.toString(), limit);
      res.json(insights);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/insights/unread", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const insights = await storage.getUnreadAiInsights(req.user._id.toString());
      res.json(insights);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/insights/mark-read/:id", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const insight = await storage.getAiInsightById(req.params.id);
      if (!insight) {
        return res.status(404).json({ message: "Insight not found" });
      }
      
      if (insight.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedInsight = await storage.markAiInsightAsRead(req.params.id);
      res.json(updatedInsight);
    } catch (error) {
      next(error);
    }
  });

  // Analytics routes
  app.get("/api/analytics/monthly-summary", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
      
      const summary = await storage.getMonthlySummary(req.user._id.toString(), year, month);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/analytics/yearly-summary", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      
      const summary = await storage.getYearlySummary(req.user._id.toString(), year);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  // AI routes
  app.post("/api/ai/analyze-receipt", upload.single("receiptImage"), async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if a file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: "No receipt image uploaded" });
      }
      
      // Read the uploaded file
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = imageBuffer.toString("base64");
      
      try {
        const analysisResult = await analyzeReceipt(base64Image);
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json(analysisResult);
      } catch (aiError: any) {
        // Handle AI service errors gracefully
        console.error("OpenAI error analyzing receipt:", aiError);
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        if (aiError.message?.includes("quota")) {
          return res.status(429).json({
            message: "AI service quota exceeded. Try again later.",
            error: "QUOTA_EXCEEDED"
          });
        }
        
        return res.status(500).json({
          message: "Failed to analyze receipt with AI",
          error: "AI_SERVICE_ERROR"
        });
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ai/financial-advice", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get user's financial data
      const monthlyTransactions = await storage.getTransactionsByUserId(req.user._id.toString(), 100);
      const goals = await storage.getGoalsByUserId(req.user._id.toString());
      const budgets = await storage.getBudgetsByUserId(req.user._id.toString());
      
      // Calculate income and expenses
      let income = 0;
      const expenses: Record<string, number> = {};
      const categories = await storage.getCategoriesByUserId(req.user._id.toString());
      const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name]));
      
      for (const transaction of monthlyTransactions) {
        if (transaction.isIncome) {
          income += transaction.amount;
        } else {
          if (transaction.categoryId) {
            const categoryId = transaction.categoryId.toString();
            const categoryName = categoryMap.get(categoryId) || `Category ${categoryId}`;
            expenses[categoryName] = (expenses[categoryName] || 0) + transaction.amount;
          } else {
            expenses["Uncategorized"] = (expenses["Uncategorized"] || 0) + transaction.amount;
          }
        }
      }
      
      // Format goals data
      const goalsData = goals.map(g => ({
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount
      }));
      
      // Get AI advice
      try {
        const advice = await generateFinancialAdvice({
          income,
          expenses,
          savings: income - Object.values(expenses).reduce((sum, val) => sum + val, 0),
          goals: goalsData
        });
        
        // Create an AI insight from the advice
        const insightData = {
          title: "Monthly Financial Advice",
          content: advice,
          insightType: "advice",
          severity: "info",
          isRead: false,
          userId: req.user._id
        };
        
        await storage.createAiInsight(insightData);
        
        res.json({ advice });
      } catch (aiError: any) {
        // Handle AI service errors gracefully
        console.error("OpenAI error generating financial advice:", aiError);
        
        if (aiError.message?.includes("quota")) {
          return res.status(429).json({
            message: "AI service quota exceeded. Try again later.",
            error: "QUOTA_EXCEEDED"
          });
        }
        
        return res.status(500).json({
          message: "Failed to generate financial advice with AI",
          error: "AI_SERVICE_ERROR"
        });
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ai/predict-expenses", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get user's transaction history
      const transactions = await storage.getTransactionsByUserId(req.user._id.toString(), 100);
      const categories = await storage.getCategoriesByUserId(req.user._id.toString());
      
      // Prepare data for prediction
      const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name]));
      const categoryExpenses: Record<string, number[]> = {};
      
      // Group transactions by month and category
      for (const transaction of transactions) {
        if (!transaction.isIncome && transaction.categoryId) {
          const categoryId = transaction.categoryId.toString();
          const categoryName = categoryMap.get(categoryId) || `Category ${categoryId}`;
          
          if (!categoryExpenses[categoryName]) {
            categoryExpenses[categoryName] = [];
          }
          
          categoryExpenses[categoryName].push(transaction.amount);
        }
      }
      
      try {
        const predictions = await predictExpenses(categoryExpenses);
        res.json({ predictions });
      } catch (aiError: any) {
        // Handle AI service errors gracefully
        console.error("OpenAI error predicting expenses:", aiError);
        
        if (aiError.message?.includes("quota")) {
          return res.status(429).json({
            message: "AI service quota exceeded. Try again later.",
            error: "QUOTA_EXCEEDED"
          });
        }
        
        return res.status(500).json({
          message: "Failed to predict expenses with AI",
          error: "AI_SERVICE_ERROR"
        });
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ai/saving-suggestions", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get user's financial data
      const transactions = await storage.getTransactionsByUserId(req.user._id.toString(), 100);
      const categories = await storage.getCategoriesByUserId(req.user._id.toString());
      const goals = await storage.getGoalsByUserId(req.user._id.toString());
      
      // Calculate expenses by category
      const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name]));
      const categoryExpenses: Record<string, number> = {};
      let income = 0;
      
      for (const transaction of transactions) {
        if (transaction.isIncome) {
          income += transaction.amount;
        } else if (transaction.categoryId) {
          const categoryId = transaction.categoryId.toString();
          const categoryName = categoryMap.get(categoryId) || `Category ${categoryId}`;
          categoryExpenses[categoryName] = (categoryExpenses[categoryName] || 0) + transaction.amount;
        } else {
          categoryExpenses["Uncategorized"] = (categoryExpenses["Uncategorized"] || 0) + transaction.amount;
        }
      }
      
      try {
        const suggestions = await suggestSavings(categoryExpenses, income);
        res.json({ suggestions });
      } catch (aiError: any) {
        // Handle AI service errors gracefully
        console.error("OpenAI error suggesting savings:", aiError);
        
        if (aiError.message?.includes("quota")) {
          return res.status(429).json({
            message: "AI service quota exceeded. Try again later.",
            error: "QUOTA_EXCEEDED"
          });
        }
        
        return res.status(500).json({
          message: "Failed to generate saving suggestions with AI",
          error: "AI_SERVICE_ERROR"
        });
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ai/categorize-transaction", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { description, amount } = req.body;
      if (!description) {
        return res.status(400).json({ message: "Transaction description is required" });
      }
      
      const categories = await storage.getCategoriesByUserId(req.user._id.toString());
      const categoryNames = categories.map(c => c.name);
      
      try {
        const suggestedCategory = await categorizeTransaction(description, amount, categoryNames);
        
        // Find the matching category from our list
        const matchedCategory = categories.find(c => 
          c.name.toLowerCase() === suggestedCategory.toLowerCase()
        );
        
        res.json({
          suggestedCategory,
          categoryId: matchedCategory ? matchedCategory._id : null
        });
      } catch (aiError: any) {
        // Handle AI service errors gracefully
        console.error("OpenAI error categorizing transaction:", aiError);
        
        if (aiError.message?.includes("quota")) {
          return res.status(429).json({
            message: "AI service quota exceeded. Try again later.",
            error: "QUOTA_EXCEEDED"
          });
        }
        
        return res.status(500).json({
          message: "Failed to categorize transaction with AI",
          error: "AI_SERVICE_ERROR"
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Set up WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    ws.on('message', (message) => {
      console.log('Received message:', message.toString());
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  return httpServer;
}