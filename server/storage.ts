import session from "express-session";
import { 
  User, InsertUser, 
  Group, InsertGroup, 
  GroupMember, InsertGroupMember,
  Expense, InsertExpense,
  ExpenseParticipant, InsertExpenseParticipant,
  Payment, InsertPayment,
  ActivityLogEntry, InsertActivityLogEntry,
  GroupInvite, InsertGroupInvite,
  users, groups, groupMembers, expenses, expenseParticipants, payments, activityLog, groupInvites
} from "@shared/schema";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, desc, asc, inArray, or } from "drizzle-orm";

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
  
  // Group invite operations
  createGroupInvite(inviteData: InsertGroupInvite): Promise<GroupInvite>;
  getGroupInvite(inviteCode: string): Promise<GroupInvite | undefined>;
  getGroupInviteById(id: number): Promise<GroupInvite | undefined>;
  getGroupInvitesByGroupId(groupId: number): Promise<GroupInvite[]>;
  deactivateGroupInvite(inviteId: number): Promise<boolean>;
  
  // Expense operations
  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpensesByGroupId(groupId: number): Promise<Expense[]>;
  getExpenseById(id: number): Promise<Expense | undefined>;
  updateExpense(expenseId: number, updates: Partial<Expense>): Promise<Expense>;
  deleteExpense(expenseId: number): Promise<boolean>;
  addExpenseParticipant(participant: InsertExpenseParticipant): Promise<ExpenseParticipant>;
  getExpenseParticipants(expenseId: number): Promise<ExpenseParticipant[]>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByGroupId(groupId: number): Promise<Payment[]>;
  getPaymentById(id: number): Promise<Payment | undefined>;
  updatePayment(paymentId: number, updates: Partial<Payment>): Promise<Payment>;
  deletePayment(paymentId: number): Promise<boolean>;
  
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
  
  // Helper method to generate a unique invite code
  private generateInviteCode(length = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars.charAt(randomIndex);
    }
    return result;
  }
  
  async createGroupInvite(inviteData: InsertGroupInvite): Promise<GroupInvite> {
    const inviteCode = this.generateInviteCode();
    const result = await db.insert(groupInvites).values({
      ...inviteData,
      inviteCode
    }).returning();
    return result[0];
  }
  
  async getGroupInvite(inviteCode: string): Promise<GroupInvite | undefined> {
    const result = await db
      .select()
      .from(groupInvites)
      .where(eq(groupInvites.inviteCode, inviteCode));
    return result[0];
  }
  
  async getGroupInviteById(id: number): Promise<GroupInvite | undefined> {
    const result = await db
      .select()
      .from(groupInvites)
      .where(eq(groupInvites.id, id));
    return result[0];
  }
  
  async getGroupInvitesByGroupId(groupId: number): Promise<GroupInvite[]> {
    const result = await db
      .select()
      .from(groupInvites)
      .where(eq(groupInvites.groupId, groupId));
    return result;
  }
  
  async deactivateGroupInvite(inviteId: number): Promise<boolean> {
    const result = await db
      .update(groupInvites)
      .set({ isActive: false })
      .where(eq(groupInvites.id, inviteId))
      .returning();
    return result.length > 0;
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
  
  async updateExpense(expenseId: number, updates: Partial<Expense>): Promise<Expense> {
    console.log(`Starting expense update for expense ID: ${expenseId}`);
    console.log(`Update data:`, updates);
    
    try {
      // Remove fields that should not be updated
      const { id, createdAt, updatedAt, ...validUpdates } = updates as any;
      
      // Convert totalAmount to string if it's a number to match DB schema
      if (typeof validUpdates.totalAmount === 'number') {
        validUpdates.totalAmount = validUpdates.totalAmount.toString();
      }
      
      // Convert date string to Date object if it's a string
      if (validUpdates.date && typeof validUpdates.date === 'string') {
        validUpdates.date = new Date(validUpdates.date);
      }
      
      console.log(`Sanitized update data:`, validUpdates);
      
      const result = await db
        .update(expenses)
        .set(validUpdates)
        .where(eq(expenses.id, expenseId))
        .returning();
      
      console.log(`Update successful, returning:`, result[0]);
      return result[0];
    } catch (error) {
      console.error(`Error in updateExpense: ${error}`);
      throw error;
    }
  }
  
  async deleteExpense(expenseId: number): Promise<boolean> {
    console.log(`Starting expense deletion process for expense ID: ${expenseId}`);
    
    try {
      // 1. First, delete the activity logs that reference this expense
      console.log(`Deleting activity logs for expense ID: ${expenseId}`);
      await db
        .delete(activityLog)
        .where(eq(activityLog.expenseId, expenseId));
      
      // 2. Delete all expense participants
      console.log(`Deleting expense participants for expense ID: ${expenseId}`);
      await db
        .delete(expenseParticipants)
        .where(eq(expenseParticipants.expenseId, expenseId));
      
      // 3. Finally delete the expense itself
      console.log(`Deleting expense with ID: ${expenseId}`);
      const result = await db
        .delete(expenses)
        .where(eq(expenses.id, expenseId))
        .returning();
      
      console.log(`Expense deletion complete. Results: ${JSON.stringify(result)}`);
      return result.length > 0;
    } catch (error) {
      console.error(`Error in deleteExpense: ${error}`);
      throw error;
    }
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
  
  async getPaymentById(id: number): Promise<Payment | undefined> {
    const result = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id));
    
    return result[0];
  }
  
  async updatePayment(paymentId: number, updates: Partial<Payment>): Promise<Payment> {
    console.log(`Starting payment update for payment ID: ${paymentId}`);
    console.log(`Update data:`, updates);
    
    try {
      // Remove fields that should not be updated
      const { id, createdAt, updatedAt, ...validUpdates } = updates as any;
      
      // Convert amount to string if it's a number to match DB schema
      if (typeof validUpdates.amount === 'number') {
        validUpdates.amount = validUpdates.amount.toString();
      }
      
      // Convert date string to Date object if it's a string
      if (validUpdates.date && typeof validUpdates.date === 'string') {
        validUpdates.date = new Date(validUpdates.date);
      }
      
      console.log(`Sanitized update data:`, validUpdates);
      
      const result = await db
        .update(payments)
        .set(validUpdates)
        .where(eq(payments.id, paymentId))
        .returning();
      
      console.log(`Update successful, returning:`, result[0]);
      return result[0];
    } catch (error) {
      console.error(`Error in updatePayment: ${error}`);
      throw error;
    }
  }
  
  async deletePayment(paymentId: number): Promise<boolean> {
    console.log(`Starting payment deletion process for payment ID: ${paymentId}`);
    
    try {
      // First, delete the activity logs that reference this payment
      console.log(`Deleting activity logs for payment ID: ${paymentId}`);
      await db
        .delete(activityLog)
        .where(eq(activityLog.paymentId, paymentId));
      
      // Then delete the payment itself
      console.log(`Deleting payment with ID: ${paymentId}`);
      const result = await db
        .delete(payments)
        .where(eq(payments.id, paymentId))
        .returning();
      
      console.log(`Payment deletion complete. Results: ${JSON.stringify(result)}`);
      return result.length > 0;
    } catch (error) {
      console.error(`Error in deletePayment: ${error}`);
      throw error;
    }
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
          ? or(
              eq(activityLog.userId, userId),
              inArray(activityLog.groupId, groupIds)
            )
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
      // If user received a payment, it reduces what they are owed (or increases what they owe)
      if (payment.paidTo === userId) {
        balance -= Number(payment.amount);
      }
      
      // If user made a payment, it increases what they are owed (or reduces what they owe)
      if (payment.paidBy === userId) {
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
          // User paid another user - that user owes the user less now
          const currentBalance = memberBalances.get(payment.paidTo) || 0;
          memberBalances.set(
            payment.paidTo, 
            currentBalance - Number(payment.amount)
          );
        } else if (payment.paidTo === userId && payment.paidBy !== userId) {
          // Another user paid user - user owes that user less now
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