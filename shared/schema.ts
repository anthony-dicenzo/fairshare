import { pgTable, text, serial, integer, boolean, timestamp, numeric, foreignKey } from "drizzle-orm/pg-core";
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
  joinedAt: timestamp("joined_at").defaultNow().notNull()
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
  createdAt: timestamp("created_at").defaultNow().notNull()
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
  joinedAt: true
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true
});

export const insertExpenseParticipantSchema = createInsertSchema(expenseParticipants).omit({
  id: true
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true
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
export type LoginUser = z.infer<typeof loginUserSchema>;
