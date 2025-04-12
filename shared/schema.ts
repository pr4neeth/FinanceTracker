import { pgTable, text, serial, integer, boolean, date, timestamp, doublePrecision, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Categories schema
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
});

// Accounts schema (bank accounts)
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // checking, savings, credit, etc.
  balance: doublePrecision("balance").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  userId: integer("user_id").notNull().references(() => users.id),
  institutionName: text("institution_name"),
  accountNumber: text("account_number"),
  isLinked: boolean("is_linked").default(false),
});

// Transactions schema
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  date: date("date").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  accountId: integer("account_id").references(() => accounts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  isIncome: boolean("is_income").default(false),
  notes: text("notes"),
  receiptImageUrl: text("receipt_image_url"),
});

// Budgets schema
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: doublePrecision("amount").notNull(),
  period: text("period").notNull(), // monthly, weekly, yearly
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  alertThreshold: integer("alert_threshold").default(80), // percentage at which to alert
});

// Bills schema
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: doublePrecision("amount").notNull(),
  dueDate: date("due_date").notNull(),
  frequency: text("frequency").notNull(), // monthly, weekly, yearly, once
  categoryId: integer("category_id").references(() => categories.id),
  userId: integer("user_id").notNull().references(() => users.id),
  isPaid: boolean("is_paid").default(false),
  autoPayEnabled: boolean("auto_pay_enabled").default(false),
  reminderDays: integer("reminder_days").default(3), // days before due to remind
});

// Financial Goals schema
export const financialGoals = pgTable("financial_goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  targetAmount: doublePrecision("target_amount").notNull(),
  currentAmount: doublePrecision("current_amount").default(0),
  startDate: date("start_date").notNull(),
  targetDate: date("target_date"),
  userId: integer("user_id").notNull().references(() => users.id),
  category: text("category").notNull(), // savings, debt_repayment, purchase, etc.
  isCompleted: boolean("is_completed").default(false),
});

// AI Insights schema
export const aiInsights = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // spending_pattern, saving_opportunity, alert, prediction
  title: text("title").notNull(),
  description: text("description").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  isRead: boolean("is_read").default(false),
  relatedEntityType: text("related_entity_type"), // transaction, category, bill, etc.
  relatedEntityId: integer("related_entity_id"),
  actionUrl: text("action_url"),
  actionLabel: text("action_label"),
  severity: text("severity").default("info"), // info, warning, danger
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  icon: true,
  color: true,
  userId: true,
});

export const insertAccountSchema = createInsertSchema(accounts).pick({
  name: true,
  type: true,
  balance: true,
  currency: true,
  userId: true,
  institutionName: true,
  accountNumber: true,
  isLinked: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  description: true,
  amount: true,
  date: true,
  categoryId: true,
  accountId: true,
  // userId is handled by the server via authentication
  isIncome: true,
  notes: true,
  receiptImageUrl: true,
});

export const insertBudgetSchema = createInsertSchema(budgets).pick({
  categoryId: true,
  userId: true,
  amount: true,
  period: true,
  startDate: true,
  endDate: true,
  alertThreshold: true,
});

// Client-side insert schema without userId for form validation
export const clientBudgetSchema = insertBudgetSchema.omit({ userId: true });

export const insertBillSchema = createInsertSchema(bills).pick({
  name: true,
  amount: true,
  dueDate: true,
  frequency: true,
  categoryId: true,
  userId: true,
  isPaid: true,
  autoPayEnabled: true,
  reminderDays: true,
});

export const insertGoalSchema = createInsertSchema(financialGoals).pick({
  name: true,
  targetAmount: true,
  currentAmount: true,
  startDate: true,
  targetDate: true,
  userId: true,
  category: true,
  isCompleted: true,
});

export const insertAiInsightSchema = createInsertSchema(aiInsights).pick({
  type: true,
  title: true,
  description: true,
  userId: true,
  relatedEntityType: true,
  relatedEntityId: true,
  actionUrl: true,
  actionLabel: true,
  severity: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type FinancialGoal = typeof financialGoals.$inferSelect;

export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;
export type AiInsight = typeof aiInsights.$inferSelect;

// Receipt processing schema
export const receiptSchema = z.object({
  image: z.string(),
});

// Financial advice request schema
export const financialAdviceRequestSchema = z.object({
  topic: z.enum(['budgeting', 'saving', 'investing', 'debt', 'creditScore', 'general']),
  question: z.string().optional(),
});
