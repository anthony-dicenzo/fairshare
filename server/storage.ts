import session from "express-session";
import { 
  User, InsertUser, 
  Group, InsertGroup, 
  GroupMember, InsertGroupMember,
  Expense, InsertExpense,
  ExpenseParticipant, InsertExpenseParticipant,
  Payment, InsertPayment,
  ActivityLogEntry, InsertActivityLogEntry,
  users, groups, groupMembers, expenses, expenseParticipants, payments, activityLog
} from "@shared/schema";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, desc, asc, inArray } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Group operations
  createGroup(group: InsertGroup): Promise<Group>;
  getGroup(id: number): Promise<Group | undefined>;
  getGroupsByUserId(userId: number): Promise<Group[]>;
  addUserToGroup(member: InsertGroupMember): Promise<GroupMember>;
  getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]>;
  
  // Expense operations
  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpensesByGroupId(groupId: number): Promise<Expense[]>;
  getExpenseById(id: number): Promise<Expense | undefined>;
  addExpenseParticipant(participant: InsertExpenseParticipant): Promise<ExpenseParticipant>;
  getExpenseParticipants(expenseId: number): Promise<ExpenseParticipant[]>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByGroupId(groupId: number): Promise<Payment[]>;
  
  // Activity operations
  logActivity(activity: InsertActivityLogEntry): Promise<ActivityLogEntry>;
  getActivityByUserId(userId: number, limit?: number): Promise<(ActivityLogEntry & { 
    user: User, 
    group?: Group, 
    expense?: Expense, 
    payment?: Payment 
  })[]>;
  getActivityByGroupId(groupId: number, limit?: number): Promise<(ActivityLogEntry & { 
    user: User, 
    group?: Group, 
    expense?: Expense, 
    payment?: Payment 
  })[]>;
  
  // Balance calculations
  getUserBalanceInGroup(userId: number, groupId: number): Promise<number>;
  getUserTotalBalance(userId: number): Promise<{
    totalOwed: number;
    totalOwes: number;
    netBalance: number;
    owedByUsers: { user: User; amount: number }[];
    owesToUsers: { user: User; amount: number }[];
  }>;
  getGroupBalances(groupId: number): Promise<{
    userId: number;
    user: User;
    balance: number;
  }[]>;
  
  // Session store
  sessionStore: any; // Using 'any' for the session store type
}

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using any to avoid SessionStore type issues
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true
    });
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  }
  
  async createGroup(groupData: InsertGroup): Promise<Group> {
    const result = await db.insert(groups).values(groupData).returning();
    const group = result[0];
    
    // Automatically add the creator as a member
    await this.addUserToGroup({
      groupId: group.id,
      userId: groupData.createdBy,
      role: 'admin'
    });
    
    return group;
  }
  
  async getGroup(id: number): Promise<Group | undefined> {
    const result = await db.select().from(groups).where(eq(groups.id, id));
    return result[0];
  }
  
  async getGroupsByUserId(userId: number): Promise<Group[]> {
    const result = await db
      .select({
        group: groups
      })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId))
      .innerJoin(groups, eq(groupMembers.groupId, groups.id));
    
    return result.map(r => r.group);
  }
  
  async addUserToGroup(memberData: InsertGroupMember): Promise<GroupMember> {
    const result = await db.insert(groupMembers).values(memberData).returning();
    return result[0];
  }
  
  async getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]> {
    const result = await db
      .select({
        member: groupMembers,
        user: users
      })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId))
      .innerJoin(users, eq(groupMembers.userId, users.id));
    
    return result.map(r => ({
      ...r.member,
      user: r.user
    }));
  }
  
  async createExpense(expenseData: InsertExpense): Promise<Expense> {
    const result = await db.insert(expenses).values(expenseData).returning();
    return result[0];
  }
  
  async getExpensesByGroupId(groupId: number): Promise<Expense[]> {
    const result = await db
      .select()
      .from(expenses)
      .where(eq(expenses.groupId, groupId))
      .orderBy(desc(expenses.createdAt));
    
    return result;
  }
  
  async getExpenseById(id: number): Promise<Expense | undefined> {
    const result = await db.select().from(expenses).where(eq(expenses.id, id));
    return result[0];
  }
  
  async addExpenseParticipant(participantData: InsertExpenseParticipant): Promise<ExpenseParticipant> {
    const result = await db.insert(expenseParticipants).values(participantData).returning();
    return result[0];
  }
  
  async getExpenseParticipants(expenseId: number): Promise<ExpenseParticipant[]> {
    const result = await db
      .select()
      .from(expenseParticipants)
      .where(eq(expenseParticipants.expenseId, expenseId));
    
    return result;
  }
  
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments).values(paymentData).returning();
    return result[0];
  }
  
  async getPaymentsByGroupId(groupId: number): Promise<Payment[]> {
    const result = await db
      .select()
      .from(payments)
      .where(eq(payments.groupId, groupId))
      .orderBy(desc(payments.createdAt));
    
    return result;
  }
  
  async logActivity(activityData: InsertActivityLogEntry): Promise<ActivityLogEntry> {
    const result = await db.insert(activityLog).values(activityData).returning();
    return result[0];
  }
  
  async getActivityByUserId(userId: number, limit: number = 20): Promise<(ActivityLogEntry & {
    user: User;
    group?: Group;
    expense?: Expense;
    payment?: Payment;
  })[]> {
    // Get all groups the user is a member of
    const userGroups = await this.getGroupsByUserId(userId);
    const groupIds = userGroups.map(g => g.id);
    
    // Get activities where user is actor or in user's groups
    const activities = await db
      .select({
        activity: activityLog,
        user: users
      })
      .from(activityLog)
      .where(
        groupIds.length > 0 
          ? eq(activityLog.userId, userId) || inArray(activityLog.groupId, groupIds)
          : eq(activityLog.userId, userId)
      )
      .innerJoin(users, eq(activityLog.userId, users.id))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
    
    // Enrich with group, expense, payment data
    const enrichedActivities = await Promise.all(activities.map(async (a) => {
      const enriched: any = {
        ...a.activity,
        user: a.user
      };
      
      if (a.activity.groupId) {
        const group = await this.getGroup(a.activity.groupId);
        if (group) enriched.group = group;
      }
      
      if (a.activity.expenseId) {
        const expense = await this.getExpenseById(a.activity.expenseId);
        if (expense) enriched.expense = expense;
      }
      
      if (a.activity.paymentId) {
        const payment = await db
          .select()
          .from(payments)
          .where(eq(payments.id, a.activity.paymentId))
          .then(res => res[0]);
        
        if (payment) enriched.payment = payment;
      }
      
      return enriched;
    }));
    
    return enrichedActivities;
  }
  
  async getActivityByGroupId(groupId: number, limit: number = 20): Promise<(ActivityLogEntry & {
    user: User;
    group?: Group;
    expense?: Expense;
    payment?: Payment;
  })[]> {
    const activities = await db
      .select({
        activity: activityLog,
        user: users
      })
      .from(activityLog)
      .where(eq(activityLog.groupId, groupId))
      .innerJoin(users, eq(activityLog.userId, users.id))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
    
    // Enrich with group, expense, payment data
    const enrichedActivities = await Promise.all(activities.map(async (a) => {
      const enriched: any = {
        ...a.activity,
        user: a.user
      };
      
      if (a.activity.groupId) {
        const group = await this.getGroup(a.activity.groupId);
        if (group) enriched.group = group;
      }
      
      if (a.activity.expenseId) {
        const expense = await this.getExpenseById(a.activity.expenseId);
        if (expense) enriched.expense = expense;
      }
      
      if (a.activity.paymentId) {
        const payment = await db
          .select()
          .from(payments)
          .where(eq(payments.id, a.activity.paymentId))
          .then(res => res[0]);
        
        if (payment) enriched.payment = payment;
      }
      
      return enriched;
    }));
    
    return enrichedActivities;
  }
  
  async getUserBalanceInGroup(userId: number, groupId: number): Promise<number> {
    // Get all expenses in the group
    const expenses = await this.getExpensesByGroupId(groupId);
    
    // Get all expense participants
    const expenseParticipants: ExpenseParticipant[] = [];
    for (const expense of expenses) {
      const participants = await this.getExpenseParticipants(expense.id);
      expenseParticipants.push(...participants);
    }
    
    // Get all payments in the group
    const payments = await this.getPaymentsByGroupId(groupId);
    
    let balance = 0;
    
    // Calculate the balance from expenses
    for (const expense of expenses) {
      // If user paid for the expense, add the amount they are owed by others
      if (expense.paidBy === userId) {
        const userParticipants = expenseParticipants.filter(
          p => p.expenseId === expense.id && p.userId !== userId
        );
        const totalOthersOwe = userParticipants.reduce(
          (sum, p) => sum + Number(p.amountOwed), 0
        );
        balance += totalOthersOwe;
      }
      
      // If user is a participant, subtract the amount they owe
      const userParticipant = expenseParticipants.find(
        p => p.expenseId === expense.id && p.userId === userId
      );
      if (userParticipant && expense.paidBy !== userId) {
        balance -= Number(userParticipant.amountOwed);
      }
    }
    
    // Calculate the balance from payments
    for (const payment of payments) {
      // If user made the payment, subtract the amount
      if (payment.paidBy === userId) {
        balance -= Number(payment.amount);
      }
      
      // If user received the payment, add the amount
      if (payment.paidTo === userId) {
        balance += Number(payment.amount);
      }
    }
    
    return balance;
  }
  
  async getUserTotalBalance(userId: number): Promise<{
    totalOwed: number;
    totalOwes: number;
    netBalance: number;
    owedByUsers: { user: User; amount: number }[];
    owesToUsers: { user: User; amount: number }[];
  }> {
    // Get all groups user is a member of
    const groups = await this.getGroupsByUserId(userId);
    
    let totalOwed = 0;
    let totalOwes = 0;
    const owedByUsers: { user: User; amount: number }[] = [];
    const owesToUsers: { user: User; amount: number }[] = [];
    
    // Calculate balances for each group
    for (const group of groups) {
      // Get all expenses in the group
      const expenses = await this.getExpensesByGroupId(group.id);
      
      // Get all expense participants
      const expenseParticipants: ExpenseParticipant[] = [];
      for (const expense of expenses) {
        const participants = await this.getExpenseParticipants(expense.id);
        expenseParticipants.push(...participants);
      }
      
      // Get all payments in the group
      const payments = await this.getPaymentsByGroupId(group.id);
      
      // Get all members in the group
      const members = await this.getGroupMembers(group.id);
      
      // Track balances with each member
      const memberBalances = new Map<number, number>();
      
      // Initialize balance for each member
      for (const member of members) {
        if (member.userId !== userId) {
          memberBalances.set(member.userId, 0);
        }
      }
      
      // Calculate balances from expenses
      for (const expense of expenses) {
        if (expense.paidBy === userId) {
          // User paid for the expense, others owe user
          const participants = expenseParticipants.filter(
            p => p.expenseId === expense.id && p.userId !== userId
          );
          
          for (const participant of participants) {
            const currentBalance = memberBalances.get(participant.userId) || 0;
            memberBalances.set(
              participant.userId, 
              currentBalance + Number(participant.amountOwed)
            );
          }
        } else {
          // Another user paid, check if user owes them
          const userParticipant = expenseParticipants.find(
            p => p.expenseId === expense.id && p.userId === userId
          );
          
          if (userParticipant) {
            const currentBalance = memberBalances.get(expense.paidBy) || 0;
            memberBalances.set(
              expense.paidBy, 
              currentBalance - Number(userParticipant.amountOwed)
            );
          }
        }
      }
      
      // Calculate balances from payments
      for (const payment of payments) {
        if (payment.paidBy === userId && payment.paidTo !== userId) {
          // User paid another user
          const currentBalance = memberBalances.get(payment.paidTo) || 0;
          memberBalances.set(
            payment.paidTo, 
            currentBalance - Number(payment.amount)
          );
        } else if (payment.paidTo === userId && payment.paidBy !== userId) {
          // Another user paid user
          const currentBalance = memberBalances.get(payment.paidBy) || 0;
          memberBalances.set(
            payment.paidBy, 
            currentBalance + Number(payment.amount)
          );
        }
      }
      
      // Aggregate the balances
      memberBalances.forEach((balance, memberId) => {
        const member = members.find(m => m.userId === memberId);
        if (member) {
          if (balance > 0) {
            // This user owes the current user
            totalOwed += balance;
            owedByUsers.push({
              user: member.user,
              amount: balance
            });
          } else if (balance < 0) {
            // The current user owes this user
            totalOwes += Math.abs(balance);
            owesToUsers.push({
              user: member.user,
              amount: Math.abs(balance)
            });
          }
        }
      });
    }
    
    return {
      totalOwed,
      totalOwes,
      netBalance: totalOwed - totalOwes,
      owedByUsers,
      owesToUsers
    };
  }
  
  async getGroupBalances(groupId: number): Promise<{
    userId: number;
    user: User;
    balance: number;
  }[]> {
    // Get all members in the group
    const members = await this.getGroupMembers(groupId);
    
    // Calculate balance for each member
    const balances = [];
    for (const member of members) {
      const balance = await this.getUserBalanceInGroup(member.userId, groupId);
      balances.push({
        userId: member.userId,
        user: member.user,
        balance
      });
    }
    
    return balances;
  }
}

export const storage = new DatabaseStorage();