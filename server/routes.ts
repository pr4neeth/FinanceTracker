import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import multer from "multer";
import { analyzeReceipt, categorizeTransaction, generateFinancialAdvice, predictExpenses, suggestSavings } from "./openai";
import { financialAdviceRequestSchema, insertBillSchema, insertBudgetSchema, insertCategorySchema, insertGoalSchema, insertTransactionSchema, receiptSchema } from "@shared/schema";
import { z } from "zod";
import { ValidationError } from "zod-validation-error";

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Check if a user is authenticated
  const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Helper for validating request body against a schema
  const validateBody = (schema: z.ZodType<any, any>) => (req, res, next) => {
    try {
      console.log("Request body:", req.body);
      // Add validatedBody to the request object
      const parsed = schema.parse(req.body);
      console.log("Parsed body:", parsed);
      // @ts-ignore: Extending Express.Request
      req.validatedBody = parsed;
      next();
    } catch (error) {
      console.error("Validation error:", error);
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  };

  // ------ Category Routes ------
  app.get("/api/categories", requireAuth, async (req, res, next) => {
    try {
      const categories = await storage.getCategoriesByUserId(req.user.id);
      res.json(categories);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/categories", requireAuth, validateBody(insertCategorySchema), async (req, res, next) => {
    try {
      const category = await storage.createCategory({
        ...req.validatedBody,
        userId: req.user.id
      });
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/categories/:id", requireAuth, validateBody(insertCategorySchema.partial()), async (req, res, next) => {
    try {
      const categoryId = parseInt(req.params.id);
      const category = await storage.getCategoryById(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedCategory = await storage.updateCategory(categoryId, req.validatedBody);
      res.json(updatedCategory);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/categories/:id", requireAuth, async (req, res, next) => {
    try {
      const categoryId = parseInt(req.params.id);
      const category = await storage.getCategoryById(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteCategory(categoryId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // ------ Account Routes ------
  app.get("/api/accounts", requireAuth, async (req, res, next) => {
    try {
      const accounts = await storage.getAccountsByUserId(req.user.id);
      res.json(accounts);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/accounts", requireAuth, async (req, res, next) => {
    try {
      const account = await storage.createAccount({
        ...req.body,
        userId: req.user.id
      });
      res.status(201).json(account);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/accounts/:id", requireAuth, async (req, res, next) => {
    try {
      const accountId = parseInt(req.params.id);
      const account = await storage.getAccountById(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      if (account.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedAccount = await storage.updateAccount(accountId, req.body);
      res.json(updatedAccount);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/accounts/:id", requireAuth, async (req, res, next) => {
    try {
      const accountId = parseInt(req.params.id);
      const account = await storage.getAccountById(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      if (account.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteAccount(accountId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // ------ Transaction Routes ------
  app.get("/api/transactions", requireAuth, async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const transactions = await storage.getTransactionsByUserId(req.user.id, limit);
      res.json(transactions);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/transactions/date-range", requireAuth, async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }
      
      const transactions = await storage.getTransactionsByDateRange(
        req.user.id,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(transactions);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/transactions", requireAuth, async (req, res, next) => {
    console.log("Received transaction create request:", req.body);
    console.log("Authentication status:", req.isAuthenticated());
    console.log("Session information:", req.session);
    console.log("User information:", req.user);
    
    try {
      if (!req.isAuthenticated() || !req.user) {
        console.error("User not authenticated when creating transaction");
        return res.status(401).json({ message: "You must be logged in to add transactions" });
      }
      
      // First, manually validate the body
      const validation = insertTransactionSchema.safeParse(req.body);
      if (!validation.success) {
        console.error("Transaction validation failed:", validation.error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validation.error.errors 
        });
      }
      
      // Use the validated data for the next steps
      const validatedBody = validation.data;
      console.log("Validated data:", validatedBody);
      
      // Try to categorize with AI if no category is provided (disabled to simplify)
      let categoryId = validatedBody.categoryId;
      
      // Create the transaction - SIMPLIFIED VERSION
      const transactionData = {
        description: validatedBody.description,
        amount: validatedBody.amount,
        date: validatedBody.date,
        categoryId: categoryId,
        isIncome: validatedBody.isIncome || false,
        notes: validatedBody.notes || null,
        userId: req.user.id
      };
      
      console.log("About to create transaction with data:", transactionData);
      
      try {
        const transaction = await storage.createTransaction(transactionData);
        console.log("Transaction created successfully:", transaction);
        res.status(201).json(transaction);
      } catch (dbError) {
        console.error("Database error creating transaction:", dbError);
        res.status(500).json({ 
          message: "Database error when creating transaction", 
          error: dbError instanceof Error ? dbError.message : String(dbError) 
        });
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ 
        message: "Error creating transaction", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.put("/api/transactions/:id", requireAuth, validateBody(insertTransactionSchema.partial()), async (req, res, next) => {
    try {
      const transactionId = parseInt(req.params.id);
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedTransaction = await storage.updateTransaction(transactionId, req.validatedBody);
      res.json(updatedTransaction);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/transactions/:id", requireAuth, async (req, res, next) => {
    try {
      const transactionId = parseInt(req.params.id);
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteTransaction(transactionId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // ------ Budget Routes ------
  app.get("/api/budgets", requireAuth, async (req, res, next) => {
    try {
      const budgets = await storage.getBudgetsByUserId(req.user.id);
      res.json(budgets);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/budgets", requireAuth, validateBody(insertBudgetSchema), async (req, res, next) => {
    try {
      const budget = await storage.createBudget({
        ...req.validatedBody,
        userId: req.user.id
      });
      res.status(201).json(budget);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/budgets/:id", requireAuth, validateBody(insertBudgetSchema.partial()), async (req, res, next) => {
    try {
      const budgetId = parseInt(req.params.id);
      const budget = await storage.getBudgetById(budgetId);
      
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      if (budget.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedBudget = await storage.updateBudget(budgetId, req.validatedBody);
      res.json(updatedBudget);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/budgets/:id", requireAuth, async (req, res, next) => {
    try {
      const budgetId = parseInt(req.params.id);
      const budget = await storage.getBudgetById(budgetId);
      
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      if (budget.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteBudget(budgetId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // ------ Bill Routes ------
  app.get("/api/bills", requireAuth, async (req, res, next) => {
    try {
      const bills = await storage.getBillsByUserId(req.user.id);
      res.json(bills);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/bills/upcoming", requireAuth, async (req, res, next) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const upcomingBills = await storage.getUpcomingBills(req.user.id, days);
      res.json(upcomingBills);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/bills", requireAuth, validateBody(insertBillSchema), async (req, res, next) => {
    try {
      const bill = await storage.createBill({
        ...req.validatedBody,
        userId: req.user.id
      });
      res.status(201).json(bill);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/bills/:id", requireAuth, validateBody(insertBillSchema.partial()), async (req, res, next) => {
    try {
      const billId = parseInt(req.params.id);
      const bill = await storage.getBillById(billId);
      
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      
      if (bill.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedBill = await storage.updateBill(billId, req.validatedBody);
      res.json(updatedBill);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/bills/:id", requireAuth, async (req, res, next) => {
    try {
      const billId = parseInt(req.params.id);
      const bill = await storage.getBillById(billId);
      
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      
      if (bill.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteBill(billId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // ------ Financial Goals Routes ------
  app.get("/api/goals", requireAuth, async (req, res, next) => {
    try {
      const goals = await storage.getGoalsByUserId(req.user.id);
      res.json(goals);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/goals", requireAuth, validateBody(insertGoalSchema), async (req, res, next) => {
    try {
      const goal = await storage.createGoal({
        ...req.validatedBody,
        userId: req.user.id
      });
      res.status(201).json(goal);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/goals/:id", requireAuth, validateBody(insertGoalSchema.partial()), async (req, res, next) => {
    try {
      const goalId = parseInt(req.params.id);
      const goal = await storage.getGoalById(goalId);
      
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      if (goal.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedGoal = await storage.updateGoal(goalId, req.validatedBody);
      res.json(updatedGoal);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/goals/:id", requireAuth, async (req, res, next) => {
    try {
      const goalId = parseInt(req.params.id);
      const goal = await storage.getGoalById(goalId);
      
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      if (goal.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteGoal(goalId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // ------ AI Insights Routes ------
  app.get("/api/insights", requireAuth, async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const insights = await storage.getAiInsightsByUserId(req.user.id, limit);
      res.json(insights);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/insights/unread", requireAuth, async (req, res, next) => {
    try {
      const unreadInsights = await storage.getUnreadAiInsights(req.user.id);
      res.json(unreadInsights);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/insights/:id/read", requireAuth, async (req, res, next) => {
    try {
      const insightId = parseInt(req.params.id);
      const updatedInsight = await storage.markAiInsightAsRead(insightId);
      
      if (!updatedInsight) {
        return res.status(404).json({ message: "Insight not found" });
      }
      
      res.json(updatedInsight);
    } catch (error) {
      next(error);
    }
  });

  // ------ Analytics Routes ------
  app.get("/api/analytics/monthly-summary", requireAuth, async (req, res, next) => {
    try {
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({ message: "year and month are required" });
      }
      
      const summary = await storage.getMonthlySummary(
        req.user.id,
        parseInt(year as string),
        parseInt(month as string)
      );
      
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/analytics/yearly-summary", requireAuth, async (req, res, next) => {
    try {
      const { year } = req.query;
      
      if (!year) {
        return res.status(400).json({ message: "year is required" });
      }
      
      const summary = await storage.getYearlySummary(
        req.user.id,
        parseInt(year as string)
      );
      
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  // ------ AI Feature Routes ------
  // Receipt scanning
  app.post("/api/scan-receipt", requireAuth, upload.single("image"), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
      }
      
      // Convert file buffer to base64
      const base64Image = req.file.buffer.toString("base64");
      
      // Analyze receipt with OpenAI
      const receiptData = await analyzeReceipt(base64Image);
      
      res.json(receiptData);
    } catch (error) {
      next(error);
    }
  });

  // Financial advice
  app.post("/api/financial-advice", requireAuth, validateBody(financialAdviceRequestSchema), async (req, res, next) => {
    try {
      // Get user's financial data for more personalized advice
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      // Get user's financial summary
      const monthlySummary = await storage.getMonthlySummary(req.user.id, currentYear, currentMonth);
      
      // Get user's financial goals
      const goals = await storage.getGoalsByUserId(req.user.id);
      
      // Format data for the AI
      const userData = {
        income: monthlySummary.income,
        expenses: Object.fromEntries(
          monthlySummary.categorizedExpenses.map(item => [item.category.name, item.amount])
        ),
        savings: monthlySummary.savings,
        goals: goals.map(goal => ({
          name: goal.name,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount
        }))
      };
      
      // Generate advice
      const advice = await generateFinancialAdvice(
        req.validatedBody.topic,
        req.validatedBody.question || "",
        userData
      );
      
      res.json({ advice });
    } catch (error) {
      next(error);
    }
  });

  // Expense prediction
  app.get("/api/predict-expenses", requireAuth, async (req, res, next) => {
    try {
      // Get past 6 months of data for prediction
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
      
      const transactions = await storage.getTransactionsByDateRange(req.user.id, startDate, endDate);
      const categories = await storage.getCategoriesByUserId(req.user.id);
      
      // Organize data by category and month
      const categoryMap = new Map();
      
      for (const transaction of transactions) {
        if (!transaction.isIncome && transaction.categoryId) {
          const category = categories.find(c => c.id === transaction.categoryId);
          
          if (category) {
            if (!categoryMap.has(category.name)) {
              categoryMap.set(category.name, {
                amounts: [],
                months: []
              });
            }
            
            const date = new Date(transaction.date);
            const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
            
            const data = categoryMap.get(category.name);
            
            // Find if we already have an entry for this month
            const monthIndex = data.months.indexOf(monthYear);
            
            if (monthIndex >= 0) {
              data.amounts[monthIndex] += transaction.amount;
            } else {
              data.amounts.push(transaction.amount);
              data.months.push(monthYear);
            }
          }
        }
      }
      
      // Format data for the AI prediction
      const pastExpenses = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        amounts: data.amounts,
        months: data.months
      }));
      
      // Get predictions
      const predictions = await predictExpenses(pastExpenses);
      
      res.json(predictions);
    } catch (error) {
      next(error);
    }
  });

  // Savings suggestions
  app.get("/api/saving-suggestions", requireAuth, async (req, res, next) => {
    try {
      // Get recent transactions
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3); // Last 3 months
      
      const transactions = await storage.getTransactionsByDateRange(req.user.id, startDate, endDate);
      const categories = await storage.getCategoriesByUserId(req.user.id);
      
      // Format transactions for AI analysis
      const formattedTransactions = await Promise.all(
        transactions.map(async transaction => {
          let categoryName = "Uncategorized";
          
          if (transaction.categoryId) {
            const category = categories.find(c => c.id === transaction.categoryId);
            if (category) {
              categoryName = category.name;
            }
          }
          
          return {
            description: transaction.description,
            amount: transaction.amount,
            category: categoryName,
            date: new Date(transaction.date).toISOString().split("T")[0]
          };
        })
      );
      
      // Calculate monthly income
      const monthlyIncome = transactions
        .filter(t => t.isIncome)
        .reduce((sum, t) => sum + t.amount, 0) / 3; // Average over 3 months
      
      // Get saving suggestions
      const suggestions = await suggestSavings(formattedTransactions, monthlyIncome);
      
      res.json(suggestions);
    } catch (error) {
      next(error);
    }
  });

  // Transaction categorization
  app.post("/api/categorize-transaction", requireAuth, async (req, res, next) => {
    try {
      const { description, amount } = req.body;
      
      if (!description || amount === undefined) {
        return res.status(400).json({ message: "description and amount are required" });
      }
      
      const categorization = await categorizeTransaction(description, amount);
      res.json(categorization);
    } catch (error) {
      next(error);
    }
  });

  // DEBUG: Add endpoint to check authentication
  app.get("/api/check-auth", (req, res) => {
    if (req.isAuthenticated()) {
      const { password, ...userWithoutPassword } = req.user as any;
      res.json({
        authenticated: true,
        user: userWithoutPassword,
        session: req.session,
      });
    } else {
      res.json({
        authenticated: false,
        session: req.session,
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
