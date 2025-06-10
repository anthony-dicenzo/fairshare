import { pgTable, text, serial, integer, boolean, timestamp, numeric, foreignKey, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  archived: boolean("archived").default(false).notNull()
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  paidBy: integer("paid_by").notNull().references(() => users.id),
  title: text("title").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  notes: text("notes"),
  date: timestamp("date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const expenseParticipants = pgTable("expense_participants", {
  id: serial("id").primaryKey(),
  expenseId: integer("expense_id").notNull().references(() => expenses.id),
  userId: integer("user_id").notNull().references(() => users.id),
  amountOwed: numeric("amount_owed").notNull()
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  paidBy: integer("paid_by").notNull().references(() => users.id),
  paidTo: integer("paid_to").notNull().references(() => users.id),
  amount: numeric("amount").notNull(),
  note: text("note"),
  date: timestamp("date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => groups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  actionType: text("action_type").notNull(), // 'add_expense', 'record_payment', etc.
  expenseId: integer("expense_id").references(() => expenses.id),
  paymentId: integer("payment_id").references(() => payments.id),
  metadata: text("metadata"), // For additional data like removed user IDs
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const groupInvites = pgTable("group_invites", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true)
});

// New table for pre-calculated balances
export const userBalances = pgTable("user_balances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  groupId: integer("group_id").notNull().references(() => groups.id),
  balanceAmount: numeric("balance_amount").notNull().default("0"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull()
});

// New table for direct balances between users
export const userBalancesBetweenUsers = pgTable("user_balances_between_users", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  fromUserId: integer("from_user_id").notNull().references(() => users.id),
  toUserId: integer("to_user_id").notNull().references(() => users.id),
  balanceAmount: numeric("balance_amount").notNull().default("0"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull()
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  used: boolean("used").default(false).notNull()
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
  joinedAt: true,
  archived: true
});

export const insertExpenseSchema = createInsertSchema(expenses, {
  totalAmount: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? val : val.toString()
  ),
  date: z.string().transform(dateStr => {
    try {
      return new Date(dateStr);
    } catch (e) {
      return new Date(); // fallback to today if invalid date
    }
  })
}).omit({
  id: true,
  createdAt: true
});

export const insertExpenseParticipantSchema = createInsertSchema(expenseParticipants, {
  amountOwed: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? val : val.toString()
  )
}).omit({
  id: true
});

export const insertPaymentSchema = createInsertSchema(payments, {
  amount: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? val : val.toString()
  ),
  date: z.string().transform(dateStr => {
    try {
      return new Date(dateStr);
    } catch (e) {
      return new Date(); // fallback to today if invalid date
    }
  })
}).omit({
  id: true,
  createdAt: true
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true
});

export const insertGroupInviteSchema = createInsertSchema(groupInvites).omit({
  id: true,
  createdAt: true,
  inviteCode: true // Auto-generated
});

export const insertUserBalanceSchema = createInsertSchema(userBalances, {
  balanceAmount: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? val : val.toString()
  )
}).omit({
  id: true,
  lastUpdated: true
});

export const insertUserBalanceBetweenUsersSchema = createInsertSchema(userBalancesBetweenUsers, {
  balanceAmount: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? val : val.toString()
  )
}).omit({
  id: true,
  lastUpdated: true
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  used: true
});

// Login schema
export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type ExpenseParticipant = typeof expenseParticipants.$inferSelect;
export type InsertExpenseParticipant = z.infer<typeof insertExpenseParticipantSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type InsertActivityLogEntry = z.infer<typeof insertActivityLogSchema>;
export type GroupInvite = typeof groupInvites.$inferSelect;
export type InsertGroupInvite = z.infer<typeof insertGroupInviteSchema>;
export type UserBalance = typeof userBalances.$inferSelect;
export type InsertUserBalance = z.infer<typeof insertUserBalanceSchema>;
export type UserBalanceBetweenUsers = typeof userBalancesBetweenUsers.$inferSelect;
export type InsertUserBalanceBetweenUsers = z.infer<typeof insertUserBalanceBetweenUsersSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
