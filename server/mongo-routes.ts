import { Express, Request, Response, NextFunction } from "express";
import { Server, createServer } from "http";
import { storage } from "./mongo-storage";
import { setupAuth, requireAuth } from "./mongo-auth";
import multer from "multer";
import { WebSocketServer } from "ws";
import path from "path";
import fs from "fs";
import { checkBudgetAlerts } from "./budget-alerts";
import { sendBudgetAlertEmail } from "./email";
import { checkBillReminders, sendAllBillReminders } from "./email-reminders";
import { getAllCategories, findCategoryByName, findCategoryById, categorizeTxByDescription } from "./config/categories";
import {
  analyzeReceipt,
  generateFinancialAdvice,
  predictExpenses,
  suggestSavings,
  categorizeTransaction,
} from "./openai";
import {
  plaidClient,
  createLinkToken,
  exchangePublicToken,
  getAccounts,
  getTransactions,
  getBalances,
} from "./plaid";
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
      // Use categories from config file instead of database
      const { getAllCategories } = require('./config/categories');
      const categories = getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
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

  app.get("/api/categories/:id", requireAuth, async (req, res, next) => {
    try {
      // Import categories from config file
      const { findCategoryById } = require('./config/categories');
      const category = findCategoryById(req.params.id);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      console.error("Error fetching category by ID:", error);
      next(error);
    }
  });

  app.patch("/api/categories/:id", requireAuth, async (req, res, next) => {
    try {
      const category = await storage.getCategoryById(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.userId && category.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedCategory = await storage.updateCategory(req.params.id, req.body);
      res.json(updatedCategory);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/categories/:id", requireAuth, async (req, res, next) => {
    try {
      const category = await storage.getCategoryById(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.userId && category.userId.toString() !== req.user._id.toString()) {
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
      
      // Debug data structure
      console.log("Transactions data (first item):", transactions.length > 0 ? JSON.stringify(transactions[0], null, 2) : "No transactions");
      
      if (transactions.length > 0) {
        const sampleTransaction = transactions[0];
        console.log("Sample transaction categoryId type:", typeof sampleTransaction.categoryId);
        console.log("Sample transaction categoryId value:", sampleTransaction.categoryId);
        
        if (sampleTransaction.categoryId && typeof sampleTransaction.categoryId === 'object') {
          console.log("Sample transaction categoryId is an object with properties:", 
            Object.keys(sampleTransaction.categoryId));
        }
      }
      
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

  // Budget spending endpoint
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

  // Budget alerts endpoint
  app.get("/api/budgets/alerts", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const budgets = await storage.getBudgetsByUserId(req.user._id.toString());
      const transactions = await storage.getTransactionsByUserId(req.user._id.toString());
      
      // Use categories from config file instead of database
      const { getAllCategories } = require('./config/categories');
      const categories = getAllCategories();
      
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
        // Skip budgets with no categoryId
        if (!budget.categoryId) continue;
        
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

  // Individual budget routes with :id parameter
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

  // Plaid API endpoints
  app.post("/api/plaid/create-link-token", requireAuth, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const linkToken = await createLinkToken(req.user._id.toString());
      res.json({ link_token: linkToken });
    } catch (error) {
      console.error("Error creating link token:", error);
      res.status(500).json({ error: "Failed to create link token" });
    }
  });

  app.post("/api/plaid/set-access-token", requireAuth, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { publicToken, institutionId, institutionName } = req.body;
      
      if (!publicToken) {
        return res.status(400).json({ error: "Missing public token" });
      }
      
      // Exchange public token for access token
      const accessToken = await exchangePublicToken(publicToken);
      
      // Save PlaidItem to database
      const plaidItem = await storage.createPlaidItem({
        userId: new Types.ObjectId(req.user._id.toString()),
        accessToken: accessToken.access_token,
        itemId: accessToken.item_id,
        institutionId,
        institutionName,
      });
      
      // Get accounts associated with this item
      const accounts = await getAccounts(accessToken.access_token);
      
      // Save accounts to database
      for (const account of accounts) {
        await storage.createAccount({
          name: account.name,
          officialName: account.official_name,
          type: account.type,
          subtype: account.subtype,
          mask: account.mask,
          balance: account.balances.current || 0,
          currency: account.balances.iso_currency_code || 'USD',
          userId: new Types.ObjectId(req.user._id.toString()),
          plaidItemId: plaidItem._id,
          plaidAccountId: account.account_id,
          isPlaidConnected: true,
          description: `Imported from ${institutionName}`,
        });
      }
      
      // Fetch and store initial transactions
      try {
        const transactions = await getTransactions(accessToken.access_token);
        
        for (const transaction of transactions) {
          // Try to find a matching category
          let categoryId = null;
          const categories = await storage.getCategoriesByUserId(req.user._id.toString());
          
          if (transaction.category && transaction.category.length > 0) {
            // Try to match Plaid category to our categories
            const primaryCategory = transaction.category[0].toLowerCase();
            for (const category of categories) {
              if (category.name.toLowerCase().includes(primaryCategory)) {
                categoryId = category._id;
                break;
              }
            }
          }
          
          await storage.createTransaction({
            description: transaction.name,
            date: new Date(transaction.date),
            amount: transaction.amount,
            userId: new Types.ObjectId(req.user._id.toString()),
            categoryId,
            accountId: transaction.account_id, // This would need to be mapped to your account ID
            isIncome: transaction.amount < 0, // Assuming negative amounts are income
            notes: `Imported from ${institutionName}`,
            receiptImageUrl: "",
          });
        }
      } catch (error) {
        console.error("Error importing transactions:", error);
        // Continue even if transaction import fails
      }
      
      res.json({ success: true, message: "Account connected successfully" });
    } catch (error) {
      console.error("Error setting access token:", error);
      res.status(500).json({ error: "Failed to exchange token" });
    }
  });

  app.get("/api/plaid/accounts", requireAuth, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get all Plaid-connected accounts for the user
      const accounts = await storage.getAccountsByUserId(req.user._id.toString());
      const plaidAccounts = accounts.filter(account => account.isPlaidConnected);
      
      res.json(plaidAccounts);
    } catch (error) {
      console.error("Error fetching Plaid accounts:", error);
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });
  
  // Get total balance from all accounts - must be BEFORE the /:id route
  app.get("/api/accounts-total-balance", requireAuth, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get all accounts for the user
      const accounts = await storage.getAccountsByUserId(req.user._id.toString());
      
      let totalBalance = 0;
      
      // Sum up the balances from all accounts
      accounts.forEach(account => {
        totalBalance += account.balance || 0;
      });
      
      console.log("Total balance calculated:", totalBalance);
      res.json({ totalBalance });
    } catch (error) {
      console.error("Error calculating total balance:", error);
      res.status(500).json({ error: "Failed to calculate total balance" });
    }
  });

  app.post("/api/plaid/sync-transactions", requireAuth, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { accountId } = req.body;
      
      if (!accountId) {
        return res.status(400).json({ error: "Missing account ID" });
      }
      
      // Get the account
      const account = await storage.getAccountById(accountId);
      
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      
      if (!account.isPlaidConnected || !account.plaidItemId) {
        return res.status(400).json({ error: "Account is not connected to Plaid" });
      }
      
      // Get the Plaid item
      const plaidItem = await storage.getPlaidItemById(account.plaidItemId.toString());
      
      if (!plaidItem) {
        return res.status(404).json({ error: "Plaid item not found" });
      }
      
      // Get the latest balance
      const balances = await getBalances(plaidItem.accessToken);
      const accountBalance = balances.find(b => b.account_id === account.plaidAccountId);
      
      if (accountBalance) {
        // Update the account balance
        await storage.updateAccount(account._id.toString(), {
          balance: accountBalance.balances.current || 0
        });
      }
      
      // Get transactions for this account
      const transactions = await getTransactions(plaidItem.accessToken);
      const accountTransactions = transactions.filter(t => t.account_id === account.plaidAccountId);
      
      // Store new transactions
      const existingTransactions = await storage.getTransactionsByUserId(req.user._id.toString());
      let newTransactions = 0;
      
      for (const transaction of accountTransactions) {
        // Check if this transaction already exists
        const exists = existingTransactions.some(t => 
          t.description === transaction.name && 
          new Date(t.date).toDateString() === new Date(transaction.date).toDateString() &&
          Math.abs(t.amount - transaction.amount) < 0.001
        );
        
        if (!exists) {
          // Try to find a matching category
          let categoryId = null;
          const categories = await storage.getCategoriesByUserId(req.user._id.toString());
          
          if (transaction.category && transaction.category.length > 0) {
            // Try to match Plaid category to our categories
            const primaryCategory = transaction.category[0].toLowerCase();
            for (const category of categories) {
              if (category.name.toLowerCase().includes(primaryCategory)) {
                categoryId = category._id;
                break;
              }
            }
          }
          
          await storage.createTransaction({
            description: transaction.name,
            date: new Date(transaction.date),
            amount: transaction.amount,
            userId: new Types.ObjectId(req.user._id.toString()),
            categoryId,
            accountId: account._id,
            isIncome: transaction.amount < 0, // Assuming negative amounts are income
            notes: `Imported from ${account.name}`,
            receiptImageUrl: "",
          });
          
          newTransactions++;
        }
      }
      
      res.json({ 
        success: true, 
        message: `Synced ${newTransactions} new transactions`,
        newTransactionsCount: newTransactions
      });
    } catch (error) {
      console.error("Error syncing transactions:", error);
      res.status(500).json({ error: "Failed to sync transactions" });
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

  // Plaid API endpoints
  app.post("/api/plaid/create-link-token", requireAuth, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const linkToken = await createLinkToken(req.user._id.toString());
      res.json({ link_token: linkToken });
    } catch (error) {
      console.error("Error creating link token:", error);
      res.status(500).json({ error: "Failed to create link token" });
    }
  });

  app.post("/api/plaid/set-access-token", requireAuth, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { publicToken, institutionId, institutionName } = req.body;
      
      if (!publicToken) {
        return res.status(400).json({ error: "Missing public token" });
      }
      
      // Exchange public token for access token
      const exchangeResult = await exchangePublicToken(publicToken);
      
      // Save PlaidItem to database
      const plaidItem = await storage.createPlaidItem({
        userId: new Types.ObjectId(req.user._id.toString()),
        accessToken: exchangeResult.access_token,
        itemId: exchangeResult.item_id,
        institutionId: institutionId || "unknown",
        institutionName: institutionName || "Unknown Institution",
      });
      
      // Get accounts associated with this item
      const accounts = await getAccounts(exchangeResult.access_token);
      
      // Save accounts to database
      const savedAccounts = [];
      for (const account of accounts) {
        const newAccount = await storage.createAccount({
          name: account.name,
          officialName: account.official_name,
          type: account.type,
          subtype: account.subtype,
          mask: account.mask,
          balance: account.balances.current || 0,
          currency: account.balances.iso_currency_code || 'USD',
          userId: new Types.ObjectId(req.user._id.toString()),
          plaidItemId: plaidItem._id,
          plaidAccountId: account.account_id,
          isPlaidConnected: true,
          description: `Imported from ${institutionName}`,
        });
        savedAccounts.push(newAccount);
      }
      
      // Fetch and store initial transactions
      try {
        const transactions = await getTransactions(exchangeResult.access_token);
        
        for (const transaction of transactions) {
          // Try to find a matching category
          let categoryId = null;
          const categories = await storage.getCategoriesByUserId(req.user._id.toString());
          
          if (transaction.category && transaction.category.length > 0) {
            // Try to match Plaid category to our categories
            const primaryCategory = transaction.category[0].toLowerCase();
            for (const category of categories) {
              if (category.name.toLowerCase().includes(primaryCategory)) {
                categoryId = category._id;
                break;
              }
            }
          }
          
          await storage.createTransaction({
            description: transaction.name,
            date: new Date(transaction.date),
            amount: Math.abs(transaction.amount),
            userId: new Types.ObjectId(req.user._id.toString()),
            categoryId,
            accountId: new Types.ObjectId(savedAccounts.find(a => a.plaidAccountId === transaction.account_id)?._id?.toString() || null),
            isIncome: transaction.amount < 0, // Assuming negative amounts are income
            notes: `Imported from ${institutionName}`,
            receiptImageUrl: "",
          });
        }
      } catch (error) {
        console.error("Error importing transactions:", error);
        // Continue even if transaction import fails
      }
      
      res.json({ success: true, message: "Account connected successfully" });
    } catch (error) {
      console.error("Error setting access token:", error);
      res.status(500).json({ error: "Failed to exchange token" });
    }
  });

  // AI Insights endpoints

  app.get("/api/plaid/accounts", requireAuth, async (req, res, next) => {
    try {
      // Get Plaid items for this user
      const plaidItems = await storage.getPlaidItemsByUserId(req.user._id.toString());
      
      // Get all accounts linked to these Plaid items
      const accounts = [];
      for (const item of plaidItems) {
        const itemAccounts = await storage.getAccountsByPlaidItemId(item._id.toString());
        accounts.push(...itemAccounts);
      }
      
      res.json(accounts);
    } catch (error) {
      console.error("Error getting Plaid accounts:", error);
      res.status(500).json({ 
        error: "Failed to get Plaid accounts", 
        message: error.message 
      });
    }
  });

  // Get transactions for a specific Plaid account
  app.get('/api/plaid/accounts/:accountId/transactions', requireAuth, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { accountId } = req.params;
      
      if (!accountId) {
        return res.status(400).json({ error: "Account ID is required" });
      }
      
      // Get the account
      const account = await storage.getAccountById(accountId);
      
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      
      // Verify account belongs to user
      if (account.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      if (!account.isPlaidConnected || !account.plaidItemId) {
        return res.status(400).json({ error: "Account is not connected to Plaid" });
      }
      
      // Get the Plaid item
      const plaidItem = await storage.getPlaidItemById(account.plaidItemId.toString());
      
      if (!plaidItem) {
        return res.status(404).json({ error: "Plaid item not found" });
      }
      
      // Get transactions for the last 30 days
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      
      const transactions = await getTransactions(
        plaidItem.accessToken,
        startDate,
        endDate
      );
      
      // Filter transactions for this account only
      const accountTransactions = transactions.filter(t => t.account_id === account.plaidAccountId);
      
      res.json(accountTransactions);
    } catch (error) {
      console.error("Error getting account transactions:", error);
      res.status(500).json({ 
        error: "Failed to get account transactions", 
        message: error.message 
      });
    }
  });

  app.post("/api/plaid/sync-transactions", requireAuth, async (req, res, next) => {
    try {
      const { plaidItemId } = req.body;
      
      if (!plaidItemId) {
        return res.status(400).json({ error: "Plaid item ID is required" });
      }
      
      // Get the Plaid item
      const plaidItem = await storage.getPlaidItemById(plaidItemId);
      if (!plaidItem) {
        return res.status(404).json({ error: "Plaid item not found" });
      }
      
      // Verify that the Plaid item belongs to the user
      if (plaidItem.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      // Get transactions for the last 30 days
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      
      const plaidTransactions = await getTransactions(
        plaidItem.accessToken,
        startDate,
        endDate
      );
      
      // Get accounts for this Plaid item
      const accounts = await storage.getAccountsByPlaidItemId(plaidItemId);
      const accountMap = new Map(accounts.map(account => [account.plaidAccountId, account]));
      
      // Sync transactions
      const newTransactions = [];
      const categoriesMap = new Map();
      
      // Get all categories to check if we need to create new ones
      const existingCategories = await storage.getAllCategories();
      for (const category of existingCategories) {
        categoriesMap.set(category.name.toLowerCase(), category);
      }
      
      for (const transaction of plaidTransactions) {
        // Skip pending transactions
        if (transaction.pending) continue;
        
        // Check if account exists in our system
        const account = accountMap.get(transaction.account_id);
        if (!account) continue;
        
        // Check if we need to create a category
        let categoryId = null;
        if (transaction.category && transaction.category.length > 0) {
          const categoryName = transaction.category[0];
          if (!categoriesMap.has(categoryName.toLowerCase())) {
            // Create a new category
            const newCategory = await storage.createCategory({
              name: categoryName,
              icon: 'tag', // Default icon
              color: '#' + Math.floor(Math.random() * 16777215).toString(16), // Random color
              userId: null // Global category
            });
            categoriesMap.set(categoryName.toLowerCase(), newCategory);
          }
          categoryId = categoriesMap.get(categoryName.toLowerCase())._id;
        }
        
        // Create transaction in our system
        const newTransaction = await storage.createTransaction({
          userId: req.user._id,
          description: transaction.name,
          amount: Math.abs(transaction.amount),
          isIncome: transaction.amount < 0, // Negative amount in Plaid means money in
          date: new Date(transaction.date),
          accountId: account._id,
          categoryId,
          notes: transaction.category ? transaction.category.join(', ') : '',
          receiptImageUrl: ''
        });
        
        newTransactions.push(newTransaction);
      }
      
      // Update account balances
      for (const account of accounts) {
        try {
          const balances = await getBalances(plaidItem.accessToken);
          const plaidAccount = balances.find(a => a.account_id === account.plaidAccountId);
          
          if (plaidAccount) {
            await storage.updateAccount(account._id.toString(), {
              balance: plaidAccount.balances.available || plaidAccount.balances.current || 0
            });
          }
        } catch (error) {
          console.error(`Error updating balance for account ${account._id}:`, error);
        }
      }
      
      res.json({
        success: true,
        transactionsAdded: newTransactions.length,
        transactions: newTransactions,
        accountId: req.body.accountId
      });
    } catch (error) {
      console.error("Error syncing transactions:", error);
      res.status(500).json({ 
        error: "Failed to sync transactions", 
        message: error.message 
      });
    }
  });

  app.delete("/api/plaid/items/:id", requireAuth, async (req, res, next) => {
    try {
      const plaidItem = await storage.getPlaidItemById(req.params.id);
      if (!plaidItem) {
        return res.status(404).json({ error: "Plaid item not found" });
      }
      
      // Verify that the Plaid item belongs to the user
      if (plaidItem.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      // Delete all accounts linked to this Plaid item
      const accounts = await storage.getAccountsByPlaidItemId(req.params.id);
      for (const account of accounts) {
        await storage.deleteAccount(account._id.toString());
      }
      
      // Delete the Plaid item
      const success = await storage.deletePlaidItem(req.params.id);
      if (success) {
        res.status(204).end();
      } else {
        res.status(500).json({ error: "Failed to delete Plaid item" });
      }
    } catch (error) {
      console.error("Error deleting Plaid item:", error);
      res.status(500).json({ 
        error: "Failed to delete Plaid item", 
        message: error.message 
      });
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

  // AI expense prediction
  app.get("/api/predict-expenses", requireAuth, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get transactions for the user
      const transactions = await storage.getTransactionsByUserId(req.user._id.toString(), 100);
      
      // Get categories
      const categories = await storage.getCategoriesByUserId(req.user._id.toString());
      const categoryMap = new Map();
      categories.forEach(c => categoryMap.set(c._id.toString(), c.name));
      
      // Group transactions by category
      const categoryExpenses = new Map();
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      
      transactions.forEach(transaction => {
        if (transaction.isIncome || new Date(transaction.date) < sixMonthsAgo) return;
        
        const categoryId = transaction.categoryId ? transaction.categoryId.toString() : 'Uncategorized';
        const categoryName = categoryId !== 'Uncategorized' ? categoryMap.get(categoryId) || 'Uncategorized' : 'Uncategorized';
        
        if (!categoryExpenses.has(categoryName)) {
          categoryExpenses.set(categoryName, {
            category: categoryName,
            amounts: [],
            months: []
          });
        }
        
        const month = new Date(transaction.date).toLocaleString('default', { month: 'short' });
        const monthKey = `${month}-${new Date(transaction.date).getFullYear()}`;
        
        // Group by month
        const categoryData = categoryExpenses.get(categoryName);
        const monthIndex = categoryData.months.indexOf(monthKey);
        
        if (monthIndex === -1) {
          categoryData.months.push(monthKey);
          categoryData.amounts.push(transaction.amount);
        } else {
          categoryData.amounts[monthIndex] += transaction.amount;
        }
      });
      
      // Convert map to array
      const pastExpenses = Array.from(categoryExpenses.values());
      
      // If we have enough data, call the OpenAI API
      if (pastExpenses.length > 0) {
        try {
          const predictions = await predictExpenses(pastExpenses);
          res.json(predictions);
        } catch (aiError: any) {
          console.error("OpenAI error predicting expenses:", aiError);
          
          // Handle specific errors
          if (aiError.message?.includes("API key")) {
            return res.status(402).json({
              message: "AI service configuration error",
              error: "API_CONFIG_ERROR"
            });
          } else if (aiError.message?.includes("quota")) {
            return res.status(402).json({
              message: "AI service quota exceeded. Try again later.",
              error: "QUOTA_EXCEEDED"
            });
          }
          
          // Generate synthetic predictions as a fallback
          // Note: This would use some simple average/trend calculations instead
          return res.status(200).json([
            { 
              category: "AI Service Unavailable",
              predictedAmount: 0,
              confidence: 0
            }
          ]);
        }
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error predicting expenses:", error);
      res.status(500).json({ error: "Failed to predict expenses" });
    }
  });

  // AI savings suggestions
  app.get("/api/saving-suggestions", requireAuth, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get transactions for the user
      const transactions = await storage.getTransactionsByUserId(req.user._id.toString(), 50);
      
      // Get categories
      const categories = await storage.getCategoriesByUserId(req.user._id.toString());
      const categoryMap = new Map();
      categories.forEach(c => categoryMap.set(c._id.toString(), c.name));
      
      // Calculate monthly income
      let monthlyIncome = 0;
      const now = new Date();
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      
      transactions.forEach(transaction => {
        if (transaction.isIncome && new Date(transaction.date) >= oneMonthAgo) {
          monthlyIncome += transaction.amount;
        }
      });
      
      // Default income if none is recorded
      if (monthlyIncome === 0) {
        monthlyIncome = 5000; // Default assumption if no income is recorded
      }
      
      // Format transactions for the AI
      const formattedTransactions = transactions
        .filter(t => !t.isIncome)
        .map(transaction => {
          const categoryId = transaction.categoryId ? transaction.categoryId.toString() : 'Uncategorized';
          const categoryName = categoryId !== 'Uncategorized' ? categoryMap.get(categoryId) || 'Uncategorized' : 'Uncategorized';
          
          return {
            description: transaction.description,
            amount: transaction.amount,
            category: categoryName,
            date: new Date(transaction.date).toISOString().split('T')[0]
          };
        });
      
      // If we have enough data, call the OpenAI API
      if (formattedTransactions.length > 0) {
        try {
          const suggestions = await suggestSavings(formattedTransactions, monthlyIncome);
          res.json(suggestions);
        } catch (aiError: any) {
          console.error("OpenAI error generating savings suggestions:", aiError);
          
          // Handle specific errors
          if (aiError.message?.includes("API key")) {
            return res.status(402).json({
              message: "AI service configuration error",
              error: "API_CONFIG_ERROR"
            });
          } else if (aiError.message?.includes("quota")) {
            return res.status(402).json({
              message: "AI service quota exceeded. Try again later.",
              error: "QUOTA_EXCEEDED"
            });
          }
          
          // Return empty array as fallback with a specific status
          return res.status(200).json([
            { 
              suggestion: "AI Service temporarily unavailable. Please try again later.",
              estimatedSaving: 0,
              difficulty: "unknown"
            }
          ]);
        }
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error generating savings suggestions:", error);
      res.status(500).json({ error: "Failed to generate savings suggestions" });
    }
  });
  
  // Financial advice based on goals and spending patterns
  app.post("/api/financial-advice", requireAuth, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { topic, question } = req.body;
      
      if (!topic) {
        return res.status(400).json({ error: "Missing topic for financial advice" });
      }
      
      // Get user's financial data
      const transactions = await storage.getTransactionsByUserId(req.user._id.toString(), 100);
      const goals = await storage.getGoalsByUserId(req.user._id.toString());
      
      // Get categories
      const categories = await storage.getCategoriesByUserId(req.user._id.toString());
      const categoryMap = new Map();
      categories.forEach(c => categoryMap.set(c._id.toString(), c.name));
      
      // Calculate income, expenses by category, and total savings
      let income = 0;
      let expenses = {};
      let totalExpenses = 0;
      
      transactions.forEach(transaction => {
        if (transaction.isIncome) {
          income += transaction.amount;
        } else {
          totalExpenses += transaction.amount;
          
          const categoryId = transaction.categoryId ? transaction.categoryId.toString() : 'Uncategorized';
          const categoryName = categoryId !== 'Uncategorized' ? categoryMap.get(categoryId) || 'Uncategorized' : 'Uncategorized';
          
          if (!expenses[categoryName]) {
            expenses[categoryName] = 0;
          }
          expenses[categoryName] += transaction.amount;
        }
      });
      
      const savings = income - totalExpenses;
      
      // Format goals
      const formattedGoals = goals.map(goal => ({
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount
      }));
      
      // Generate advice
      try {
        const advice = await generateFinancialAdvice(topic, question, {
          income,
          expenses,
          savings,
          goals: formattedGoals
        });
        
        res.json({ advice });
      } catch (aiError: any) {
        console.error("OpenAI error generating financial advice:", aiError);
        
        // Handle specific errors
        if (aiError.message?.includes("API key")) {
          return res.status(402).json({
            message: "AI service configuration error",
            error: "API_CONFIG_ERROR"
          });
        } else if (aiError.message?.includes("quota")) {
          return res.status(402).json({
            message: "AI service quota exceeded. Try again later.",
            error: "QUOTA_EXCEEDED"
          });
        }
        
        // Return a general fallback response
        return res.status(200).json({ 
          advice: "Our AI advisor is temporarily unavailable. Please try again later. In the meantime, you might want to review your recent transactions and budget allocations manually."
        });
      }
    } catch (error) {
      console.error("Error generating financial advice:", error);
      res.status(500).json({ error: "Failed to generate financial advice" });
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

  // Bill reminders endpoints - for scheduled notification checks
  app.post("/api/admin/bill-reminders/check", async (req, res, next) => {
    try {
      // This endpoint should be secured in production
      // For now we'll use a simple API key check from request body
      const { apiKey } = req.body;
      if (apiKey !== process.env.ADMIN_API_KEY) {
        return res.status(403).json({ message: "Invalid API key" });
      }
      
      // Process all users' bill reminders
      await sendAllBillReminders(storage);
      res.json({ success: true, message: "Bill reminders check triggered successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Check reminders for a specific user
  app.post("/api/bill-reminders/check", requireAuth, async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      await checkBillReminders(storage, req.user._id.toString());
      res.json({ success: true, message: "Bill reminders check completed" });
    } catch (error) {
      next(error);
    }
  });

  return httpServer;
}