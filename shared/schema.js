import { relations, sql } from 'drizzle-orm';
import { boolean, integer, pgTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table
export const users = pgTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Groups table
export const groups = pgTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Group members table
export const groupMembers = pgTable('group_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id').notNull().references(() => groups.id),
  userId: integer('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 20 }).default('member').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  archived: boolean('archived').default(false).notNull(),
  metadata: text('metadata')
}, (table) => {
  return {
    uniqGroupUser: primaryKey({ columns: [table.groupId, table.userId] })
  };
});

// Group invites table
export const groupInvites = pgTable('group_invites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id').notNull().references(() => groups.id),
  inviteCode: varchar('invite_code', { length: 20 }).notNull().unique(),
  createdBy: integer('created_by').notNull().references(() => users.id),
  email: varchar('email', { length: 255 }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at')
});

// Expenses table
export const expenses = pgTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id').notNull().references(() => groups.id),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  totalAmount: varchar('total_amount').notNull(),
  paidBy: integer('paid_by').notNull().references(() => users.id),
  date: timestamp('date').defaultNow().notNull(),
  category: varchar('category', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Expense participants table
export const expenseParticipants = pgTable('expense_participants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  expenseId: integer('expense_id').notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  amountOwed: varchar('amount_owed').notNull(),
  paid: boolean('paid').default(false).notNull()
});

// Payments table
export const payments = pgTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id').notNull().references(() => groups.id),
  paidBy: integer('paid_by').notNull().references(() => users.id),
  paidTo: integer('paid_to').notNull().references(() => users.id),
  amount: varchar('amount').notNull(),
  date: timestamp('date').defaultNow().notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Activity log table
export const activityLog = pgTable('activity_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  groupId: integer('group_id').references(() => groups.id),
  expenseId: integer('expense_id').references(() => expenses.id),
  paymentId: integer('payment_id').references(() => payments.id),
  actionType: varchar('action_type', { length: 50 }).notNull(),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// User balance cache table
export const userBalances = pgTable('user_balances', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  groupId: integer('group_id').notNull().references(() => groups.id),
  balanceAmount: varchar('balance_amount').notNull(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull()
}, (table) => {
  return {
    uniqUserGroup: primaryKey({ columns: [table.userId, table.groupId] })
  };
});

// User-to-user balance cache table
export const userBalancesBetweenUsers = pgTable('user_balances_between_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id').notNull().references(() => groups.id),
  fromUserId: integer('from_user_id').notNull().references(() => users.id),
  toUserId: integer('to_user_id').notNull().references(() => users.id),
  amount: varchar('amount').notNull(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull()
}, (table) => {
  return {
    uniqFromToGroup: primaryKey({ columns: [table.fromUserId, table.toUserId, table.groupId] })
  };
});

// Relation definitions
export const usersRelations = relations(users, ({ many }) => ({
  groupMembers: many(groupMembers),
  expenses: many(expenses),
  paymentsMade: many(payments, { relationName: 'paidBy' }),
  paymentsReceived: many(payments, { relationName: 'paidTo' }),
  expenseParticipants: many(expenseParticipants)
}));

export const groupsRelations = relations(groups, ({ many, one }) => ({
  members: many(groupMembers),
  expenses: many(expenses),
  payments: many(payments),
  creator: one(users, {
    fields: [groups.createdBy],
    references: [users.id]
  })
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id]
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id]
  })
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, {
    fields: [expenses.groupId],
    references: [groups.id]
  }),
  paidByUser: one(users, {
    fields: [expenses.paidBy],
    references: [users.id]
  }),
  participants: many(expenseParticipants)
}));

export const expenseParticipantsRelations = relations(expenseParticipants, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseParticipants.expenseId],
    references: [expenses.id]
  }),
  user: one(users, {
    fields: [expenseParticipants.userId],
    references: [users.id]
  })
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  group: one(groups, {
    fields: [payments.groupId],
    references: [groups.id]
  }),
  paidByUser: one(users, {
    fields: [payments.paidBy],
    references: [users.id],
    relationName: 'paidBy'
  }),
  paidToUser: one(users, {
    fields: [payments.paidTo],
    references: [users.id],
    relationName: 'paidTo'
  })
}));

export const groupInvitesRelations = relations(groupInvites, ({ one }) => ({
  group: one(groups, {
    fields: [groupInvites.groupId],
    references: [groups.id]
  }),
  createdByUser: one(users, {
    fields: [groupInvites.createdBy],
    references: [users.id]
  })
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id]
  }),
  group: one(groups, {
    fields: [activityLog.groupId],
    references: [groups.id]
  }),
  expense: one(expenses, {
    fields: [activityLog.expenseId],
    references: [expenses.id]
  }),
  payment: one(payments, {
    fields: [activityLog.paymentId],
    references: [payments.id]
  })
}));

export const userBalancesRelations = relations(userBalances, ({ one }) => ({
  user: one(users, {
    fields: [userBalances.userId],
    references: [users.id]
  }),
  group: one(groups, {
    fields: [userBalances.groupId],
    references: [groups.id]
  })
}));

export const userBalancesBetweenUsersRelations = relations(userBalancesBetweenUsers, ({ one }) => ({
  group: one(groups, {
    fields: [userBalancesBetweenUsers.groupId],
    references: [groups.id]
  }),
  fromUser: one(users, {
    fields: [userBalancesBetweenUsers.fromUserId],
    references: [users.id]
  }),
  toUser: one(users, {
    fields: [userBalancesBetweenUsers.toUserId],
    references: [users.id]
  })
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGroupSchema = createInsertSchema(groups).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({ id: true, joinedAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExpenseParticipantSchema = createInsertSchema(expenseParticipants).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLog).omit({ id: true, createdAt: true });
export const insertGroupInviteSchema = createInsertSchema(groupInvites).omit({ id: true, createdAt: true });
export const insertUserBalanceSchema = createInsertSchema(userBalances).omit({ id: true, lastUpdated: true });
export const insertUserBalanceBetweenUsersSchema = createInsertSchema(userBalancesBetweenUsers).omit({ id: true, lastUpdated: true });