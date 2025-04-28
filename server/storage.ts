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
  UserBalance, InsertUserBalance,
  UserBalanceBetweenUsers, InsertUserBalanceBetweenUsers,
  users, groups, groupMembers, expenses, expenseParticipants, payments, 
  activityLog, groupInvites, userBalances, userBalancesBetweenUsers
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
  updateUser(userId: number, updates: Partial<User>): Promise<User>;
  
  // Group operations
  createGroup(group: InsertGroup): Promise<Group>;
  getGroup(id: number): Promise<Group | undefined>;
  getGroupsByUserId(userId: number): Promise<Group[]>;
  updateGroup(groupId: number, updates: Partial<Group>): Promise<Group>;
  deleteGroup(groupId: number): Promise<boolean>;
  addUserToGroup(member: InsertGroupMember): Promise<GroupMember>;
  getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]>;
  removeUserFromGroup(groupId: number, userId: number): Promise<boolean>;
  checkUserHasOutstandingBalances(groupId: number, userId: number): Promise<boolean>;
  
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
  deleteExpenseParticipants(expenseId: number): Promise<boolean>;
  
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
  
  // Balance calculations - original methods (kept for backward compatibility)
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
  
  // New cached balance operations
  getUserCachedBalance(userId: number, groupId: number): Promise<UserBalance | undefined>;
  saveUserBalance(balance: InsertUserBalance): Promise<UserBalance>;
  updateUserBalance(userId: number, groupId: number, balanceAmount: number | string): Promise<UserBalance>;
  updateAllBalancesInGroup(groupId: number): Promise<boolean>;
  getCachedGroupBalances(groupId: number): Promise<{
    userId: number;
    user: User;
    balance: number;
  }[]>;
  getUserBalancesBetweenUsers(groupId: number, userId: number): Promise<{
    otherUserId: number;
    otherUser: User;
    amount: number;
    direction: 'owes' | 'owed';
  }[]>;
  getUserCachedTotalBalance(userId: number): Promise<{
    totalOwed: number;
    totalOwes: number;
    netBalance: number;
    owedByUsers: { user: User; amount: number }[];
    owesToUsers: { user: User; amount: number }[];
  }>;
  
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

  // Helper function to ensure a user balance record exists
  private async ensureUserBalanceExists(userId: number, groupId: number): Promise<UserBalance> {
    const existingBalance = await this.getUserCachedBalance(userId, groupId);
    
    if (existingBalance) {
      return existingBalance;
    }
    
    // If it doesn't exist, create it with a balance of 0
    return await this.saveUserBalance({
      userId,
      groupId,
      balanceAmount: "0"
    });
  }
  
  // Get user balance from the cache
  async getUserCachedBalance(userId: number, groupId: number): Promise<UserBalance | undefined> {
    const result = await db
      .select()
      .from(userBalances)
      .where(
        and(
          eq(userBalances.userId, userId),
          eq(userBalances.groupId, groupId)
        )
      );
    
    return result[0];
  }
  
  // Save a new user balance
  async saveUserBalance(balance: InsertUserBalance): Promise<UserBalance> {
    // First check if this balance already exists
    const existingBalance = await this.getUserCachedBalance(balance.userId, balance.groupId);
    
    if (existingBalance) {
      // Update the existing balance
      return this.updateUserBalance(balance.userId, balance.groupId, balance.balanceAmount);
    }
    
    // Create a new balance record
    const result = await db
      .insert(userBalances)
      .values({
        ...balance,
        lastUpdated: new Date()
      })
      .returning();
    
    return result[0];
  }
  
  // Update a user's balance
  async updateUserBalance(userId: number, groupId: number, balanceAmount: number | string): Promise<UserBalance> {
    const stringBalance = typeof balanceAmount === 'number' ? balanceAmount.toString() : balanceAmount;
    
    const result = await db
      .update(userBalances)
      .set({ 
        balanceAmount: stringBalance,
        lastUpdated: new Date()
      })
      .where(
        and(
          eq(userBalances.userId, userId),
          eq(userBalances.groupId, groupId)
        )
      )
      .returning();
    
    if (result.length === 0) {
      // If no record was updated, create a new one
      return this.saveUserBalance({
        userId,
        groupId,
        balanceAmount: stringBalance
      });
    }
    
    return result[0];
  }
  
  // Update all user balances in a group
  async updateAllBalancesInGroup(groupId: number): Promise<boolean> {
    try {
      console.log(`Starting recalculation of all balances in group ${groupId}`);
      
      // Get all members in the group
      const members = await this.getGroupMembers(groupId);
      if (members.length === 0) {
        console.log(`No members found in group ${groupId}`);
        return false;
      }
      
      // Get all expenses in the group
      const expenses = await this.getExpensesByGroupId(groupId);
      
      // Get all expense participants
      const expenseParticipantsPromises = expenses.map(expense => 
        this.getExpenseParticipants(expense.id)
      );
      const expenseParticipantsArrays = await Promise.all(expenseParticipantsPromises);
      const expenseParticipants = expenseParticipantsArrays.flat();
      
      // Get all payments in the group
      const payments = await this.getPaymentsByGroupId(groupId);
      
      // Calculate balance for each member
      for (const member of members) {
        const userId = member.userId;
        
        // Calculate balance using existing method (this uses the same computation logic as before)
        const balance = await this.getUserBalanceInGroup(userId, groupId);
        
        // Update or create balance in the cache
        await this.updateUserBalance(userId, groupId, balance);
        
        console.log(`Updated balance for user ${userId} in group ${groupId}: ${balance}`);
      }
      
      // Update balances between users
      await this.updateUserBalancesBetweenUsers(groupId);
      
      return true;
    } catch (error) {
      console.error(`Error updating all balances in group ${groupId}:`, error);
      return false;
    }
  }
  
  // Get cached balances for all members in a group
  async getCachedGroupBalances(groupId: number): Promise<{
    userId: number;
    user: User;
    balance: number;
  }[]> {
    // Get all members in the group with their users
    const members = await this.getGroupMembers(groupId);
    
    // Get all cached balances
    const balances = await db
      .select()
      .from(userBalances)
      .where(eq(userBalances.groupId, groupId));
    
    // Map to required output format
    return members.map(member => {
      const cachedBalance = balances.find(b => b.userId === member.userId);
      return {
        userId: member.userId,
        user: member.user,
        balance: cachedBalance ? Number(cachedBalance.balanceAmount) : 0
      };
    });
  }
  
  // Update the user-to-user balances in a group
  private async updateUserBalancesBetweenUsers(groupId: number): Promise<void> {
    // Get all members in the group
    const members = await this.getGroupMembers(groupId);
    
    // For each pair of users, calculate how much they owe each other
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const userA = members[i].userId;
        const userB = members[j].userId;
        
        // Calculate how much userA owes userB directly
        const balanceAtoB = await this.calculateDirectBalance(groupId, userA, userB);
        
        // Update or create the balance record for A to B
        await db
          .insert(userBalancesBetweenUsers)
          .values({
            groupId,
            fromUserId: userA,
            toUserId: userB,
            balanceAmount: balanceAtoB.toString(),
            lastUpdated: new Date()
          })
          .onConflictDoUpdate({
            target: [
              userBalancesBetweenUsers.groupId,
              userBalancesBetweenUsers.fromUserId,
              userBalancesBetweenUsers.toUserId
            ],
            set: {
              balanceAmount: balanceAtoB.toString(),
              lastUpdated: new Date()
            }
          });
        
        // The inverse balance (B to A) is just the negative of A to B
        await db
          .insert(userBalancesBetweenUsers)
          .values({
            groupId,
            fromUserId: userB,
            toUserId: userA,
            balanceAmount: (-balanceAtoB).toString(),
            lastUpdated: new Date()
          })
          .onConflictDoUpdate({
            target: [
              userBalancesBetweenUsers.groupId,
              userBalancesBetweenUsers.fromUserId,
              userBalancesBetweenUsers.toUserId
            ],
            set: {
              balanceAmount: (-balanceAtoB).toString(),
              lastUpdated: new Date()
            }
          });
      }
    }
  }
  
  // Helper method to calculate how much one user directly owes another in a group
  private async calculateDirectBalance(groupId: number, fromUserId: number, toUserId: number): Promise<number> {
    // Get all expenses in the group
    const expenses = await this.getExpensesByGroupId(groupId);
    
    let balance = 0;
    
    // Calculate from expenses
    for (const expense of expenses) {
      // If toUserId paid for the expense
      if (expense.paidBy === toUserId) {
        // Get how much fromUserId owes for this expense
        const participants = await this.getExpenseParticipants(expense.id);
        const fromUserParticipant = participants.find(p => p.userId === fromUserId);
        
        if (fromUserParticipant) {
          balance += Number(fromUserParticipant.amountOwed);
        }
      }
      // If fromUserId paid for the expense
      else if (expense.paidBy === fromUserId) {
        // Get how much toUserId owes for this expense
        const participants = await this.getExpenseParticipants(expense.id);
        const toUserParticipant = participants.find(p => p.userId === toUserId);
        
        if (toUserParticipant) {
          balance -= Number(toUserParticipant.amountOwed);
        }
      }
    }
    
    // Calculate from payments
    const payments = await this.getPaymentsByGroupId(groupId);
    for (const payment of payments) {
      // If fromUserId paid toUserId
      if (payment.paidBy === fromUserId && payment.paidTo === toUserId) {
        balance -= Number(payment.amount);
      }
      // If toUserId paid fromUserId
      else if (payment.paidBy === toUserId && payment.paidTo === fromUserId) {
        balance += Number(payment.amount);
      }
    }
    
    return balance;
  }
  
  // Get balances between a user and all other users in a group
  async getUserBalancesBetweenUsers(groupId: number, userId: number): Promise<{
    otherUserId: number;
    otherUser: User;
    amount: number;
    direction: 'owes' | 'owed';
  }[]> {
    // Get all balances where this user is involved
    const balances = await db
      .select()
      .from(userBalancesBetweenUsers)
      .where(
        and(
          eq(userBalancesBetweenUsers.groupId, groupId),
          eq(userBalancesBetweenUsers.fromUserId, userId)
        )
      );
    
    // Get all users for reference
    const otherUserIds = balances.map(b => b.toUserId);
    const otherUsers = await Promise.all(
      otherUserIds.map(id => this.getUser(id))
    );
    
    // Map to the required format
    return balances.map(balance => {
      const amount = Math.abs(Number(balance.balanceAmount));
      const direction = Number(balance.balanceAmount) > 0 ? 'owes' as const : 'owed' as const;
      const otherUser = otherUsers.find(u => u?.id === balance.toUserId);
      
      return {
        otherUserId: balance.toUserId,
        otherUser: otherUser!,
        amount,
        direction
      };
    }).filter(b => b.amount > 0); // Only return non-zero balances
  }
  
  // Get a user's total balance across all groups from the cache
  async getUserCachedTotalBalance(userId: number): Promise<{
    totalOwed: number;
    totalOwes: number;
    netBalance: number;
    owedByUsers: { user: User; amount: number }[];
    owesToUsers: { user: User; amount: number }[];
  }> {
    // Get all user's balances across groups
    const balances = await db
      .select()
      .from(userBalances)
      .where(eq(userBalances.userId, userId));
    
    // Get all between-user balances
    const betweenUserBalances = await db
      .select()
      .from(userBalancesBetweenUsers)
      .where(eq(userBalancesBetweenUsers.fromUserId, userId));
    
    // Get all relevant users
    const otherUserIdsSet = new Set(betweenUserBalances.map(b => b.toUserId));
    const otherUserIds = Array.from(otherUserIdsSet);
    const otherUsers = await Promise.all(
      otherUserIds.map(id => this.getUser(id))
    );
    
    // Calculate totals
    let totalOwed = 0;
    let totalOwes = 0;
    const owedByUsers: { user: User; amount: number }[] = [];
    const owesToUsers: { user: User; amount: number }[] = [];
    
    // Process all between-user balances
    for (const balance of betweenUserBalances) {
      const otherUser = otherUsers.find(u => u?.id === balance.toUserId);
      if (!otherUser) continue;
      
      const amount = Math.abs(Number(balance.balanceAmount));
      if (amount === 0) continue;
      
      if (Number(balance.balanceAmount) > 0) {
        // User owes other user
        totalOwes += amount;
        owesToUsers.push({
          user: otherUser,
          amount
        });
      } else {
        // Other user owes this user
        totalOwed += amount;
        owedByUsers.push({
          user: otherUser,
          amount
        });
      }
    }
    
    return {
      totalOwed,
      totalOwes,
      netBalance: totalOwed - totalOwes,
      owedByUsers,
      owesToUsers
    };
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
  
  async updateUser(userId: number, updates: Partial<User>): Promise<User> {
    console.log(`Starting user update for user ID: ${userId}`);
    console.log(`Update data:`, updates);
    
    try {
      // Remove fields that should not be updated
      const { id, createdAt, ...validUpdates } = updates as any;
      
      console.log(`Sanitized update data:`, validUpdates);
      
      const result = await db
        .update(users)
        .set(validUpdates)
        .where(eq(users.id, userId))
        .returning();
      
      console.log(`User update successful, returning:`, result[0]);
      return result[0];
    } catch (error) {
      console.error(`Error in updateUser: ${error}`);
      throw error;
    }
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
  
  async updateGroup(groupId: number, updates: Partial<Group>): Promise<Group> {
    const result = await db
      .update(groups)
      .set(updates)
      .where(eq(groups.id, groupId))
      .returning();
      
    if (result.length === 0) {
      throw new Error("Group not found");
    }
    
    return result[0];
  }
  
  async deleteGroup(groupId: number): Promise<boolean> {
    try {
      // First delete all related data
      
      // Delete all expense participants for expenses in this group
      const groupExpenses = await this.getExpensesByGroupId(groupId);
      for (const expense of groupExpenses) {
        await db
          .delete(expenseParticipants)
          .where(eq(expenseParticipants.expenseId, expense.id));
      }
      
      // Delete all expenses
      await db
        .delete(expenses)
        .where(eq(expenses.groupId, groupId));
      
      // Delete all payments
      await db
        .delete(payments)
        .where(eq(payments.groupId, groupId));
      
      // Delete all activity log entries
      await db
        .delete(activityLog)
        .where(eq(activityLog.groupId, groupId));
      
      // Delete all group invites
      await db
        .delete(groupInvites)
        .where(eq(groupInvites.groupId, groupId));
      
      // Delete all user balances
      await db
        .delete(userBalances)
        .where(eq(userBalances.groupId, groupId));
      
      // Delete all balances between users
      await db
        .delete(userBalancesBetweenUsers)
        .where(eq(userBalancesBetweenUsers.groupId, groupId));
      
      // Delete all group members
      await db
        .delete(groupMembers)
        .where(eq(groupMembers.groupId, groupId));
      
      // Finally delete the group itself
      const result = await db
        .delete(groups)
        .where(eq(groups.id, groupId));
      
      return true;
    } catch (error) {
      console.error(`Error deleting group ${groupId}:`, error);
      return false;
    }
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
  
  async checkUserHasOutstandingBalances(groupId: number, userId: number): Promise<boolean> {
    try {
      console.log(`Checking outstanding balances for user ${userId} in group ${groupId}`);
      
      // Get the cached balances between this user and other group members
      const userBalances = await this.getUserBalancesBetweenUsers(groupId, userId);
      
      // Check if the user has any non-zero balances with other members
      const hasOutstandingBalances = userBalances.some(balance => 
        Math.abs(balance.amount) > 0.009 // Using a small threshold to handle floating point precision issues
      );
      
      console.log(`User ${userId} has outstanding balances in group ${groupId}: ${hasOutstandingBalances}`);
      return hasOutstandingBalances;
    } catch (error) {
      console.error(`Error checking if user has outstanding balances: ${error}`);
      throw error;
    }
  }
  
  async removeUserFromGroup(groupId: number, userId: number): Promise<boolean> {
    try {
      console.log(`Starting removal of user ${userId} from group ${groupId}`);
      
      // Check if user has any outstanding balances with group members
      const hasOutstandingBalances = await this.checkUserHasOutstandingBalances(groupId, userId);
      
      if (hasOutstandingBalances) {
        console.log(`Cannot remove user ${userId} from group ${groupId} due to outstanding balances`);
        throw new Error("User has outstanding debts with other group members. All balances must be settled before they can be removed.");
      }
      
      // First, delete any balance cache records for this user in this group
      console.log(`Removing balance cache records for user ${userId} in group ${groupId}`);
      await db
        .delete(userBalances)
        .where(and(
          eq(userBalances.userId, userId),
          eq(userBalances.groupId, groupId)
        ));
      
      // Delete user-to-user balance records involving this user
      console.log(`Removing user-to-user balance records for user ${userId} in group ${groupId}`);
      await db
        .delete(userBalancesBetweenUsers)
        .where(
          and(
            eq(userBalancesBetweenUsers.groupId, groupId),
            or(
              eq(userBalancesBetweenUsers.fromUserId, userId),
              eq(userBalancesBetweenUsers.toUserId, userId)
            )
          )
        );
      
      // Now remove the user from the group
      console.log(`Removing user ${userId} from group members for group ${groupId}`);
      const result = await db
        .delete(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, userId)
          )
        )
        .returning();
      
      console.log(`User removal complete. Results: ${JSON.stringify(result)}`);
      return result.length > 0;
    } catch (error) {
      console.error(`Error in removeUserFromGroup: ${error}`);
      throw error;
    }
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
  
  async deleteExpenseParticipants(expenseId: number): Promise<boolean> {
    try {
      await db
        .delete(expenseParticipants)
        .where(eq(expenseParticipants.expenseId, expenseId));
      return true;
    } catch (error) {
      console.error(`Error deleting expense participants for expense ${expenseId}:`, error);
      return false;
    }
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