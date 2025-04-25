import { 
  User, InsertUser, Group, InsertGroup, GroupMember, InsertGroupMember, 
  Expense, InsertExpense, ExpenseParticipant, InsertExpenseParticipant,
  Payment, InsertPayment, ActivityLogEntry, InsertActivityLogEntry
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private groups: Map<number, Group>;
  private groupMembers: Map<number, GroupMember>;
  private expenses: Map<number, Expense>;
  private expenseParticipants: Map<number, ExpenseParticipant>;
  private payments: Map<number, Payment>;
  private activities: Map<number, ActivityLogEntry>;
  
  sessionStore: session.SessionStore;
  
  private userIdCounter: number = 1;
  private groupIdCounter: number = 1;
  private groupMemberIdCounter: number = 1;
  private expenseIdCounter: number = 1;
  private expenseParticipantIdCounter: number = 1;
  private paymentIdCounter: number = 1;
  private activityIdCounter: number = 1;

  constructor() {
    this.users = new Map();
    this.groups = new Map();
    this.groupMembers = new Map();
    this.expenses = new Map();
    this.expenseParticipants = new Map();
    this.payments = new Map();
    this.activities = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...userData, 
      id, 
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }

  // Group operations
  async createGroup(groupData: InsertGroup): Promise<Group> {
    const id = this.groupIdCounter++;
    const now = new Date();
    const group: Group = {
      ...groupData,
      id,
      createdAt: now
    };
    this.groups.set(id, group);
    
    // Add the creator as a member automatically
    await this.addUserToGroup({
      groupId: id,
      userId: groupData.createdBy
    });
    
    return group;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async getGroupsByUserId(userId: number): Promise<Group[]> {
    const memberEntries = Array.from(this.groupMembers.values())
      .filter(member => member.userId === userId);
      
    return memberEntries.map(entry => 
      this.groups.get(entry.groupId)!
    ).filter(group => group !== undefined);
  }

  async addUserToGroup(memberData: InsertGroupMember): Promise<GroupMember> {
    const id = this.groupMemberIdCounter++;
    const now = new Date();
    const member: GroupMember = {
      ...memberData,
      id,
      joinedAt: now
    };
    this.groupMembers.set(id, member);
    return member;
  }

  async getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]> {
    const members = Array.from(this.groupMembers.values())
      .filter(member => member.groupId === groupId);
      
    return members.map(member => ({
      ...member,
      user: this.users.get(member.userId)!
    }));
  }

  // Expense operations
  async createExpense(expenseData: InsertExpense): Promise<Expense> {
    const id = this.expenseIdCounter++;
    const now = new Date();
    const expense: Expense = {
      ...expenseData,
      id,
      date: expenseData.date || now,
      createdAt: now
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async getExpensesByGroupId(groupId: number): Promise<Expense[]> {
    return Array.from(this.expenses.values())
      .filter(expense => expense.groupId === groupId);
  }

  async getExpenseById(id: number): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async addExpenseParticipant(participantData: InsertExpenseParticipant): Promise<ExpenseParticipant> {
    const id = this.expenseParticipantIdCounter++;
    const participant: ExpenseParticipant = {
      ...participantData,
      id
    };
    this.expenseParticipants.set(id, participant);
    return participant;
  }

  async getExpenseParticipants(expenseId: number): Promise<ExpenseParticipant[]> {
    return Array.from(this.expenseParticipants.values())
      .filter(participant => participant.expenseId === expenseId);
  }

  // Payment operations
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const id = this.paymentIdCounter++;
    const now = new Date();
    const payment: Payment = {
      ...paymentData,
      id,
      date: paymentData.date || now,
      createdAt: now
    };
    this.payments.set(id, payment);
    return payment;
  }

  async getPaymentsByGroupId(groupId: number): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.groupId === groupId);
  }

  // Activity operations
  async logActivity(activityData: InsertActivityLogEntry): Promise<ActivityLogEntry> {
    const id = this.activityIdCounter++;
    const now = new Date();
    const activity: ActivityLogEntry = {
      ...activityData,
      id,
      createdAt: now
    };
    this.activities.set(id, activity);
    return activity;
  }

  async getActivityByUserId(userId: number, limit: number = 20): Promise<(ActivityLogEntry & {
    user: User;
    group?: Group;
    expense?: Expense;
    payment?: Payment;
  })[]> {
    // Get activities where this user is involved
    const userActivities = Array.from(this.activities.values())
      .filter(activity => {
        // Direct involvement
        if (activity.userId === userId) return true;
        
        // Check if user is participant in the referenced expense
        if (activity.actionType === 'add_expense' && activity.referenceId) {
          const expenseId = activity.referenceId;
          const participants = Array.from(this.expenseParticipants.values())
            .filter(p => p.expenseId === expenseId && p.userId === userId);
          return participants.length > 0;
        }
        
        // Check if user is part of a payment
        if (activity.actionType === 'record_payment' && activity.referenceId) {
          const paymentId = activity.referenceId;
          const payment = this.payments.get(paymentId);
          return payment && (payment.paidBy === userId || payment.paidTo === userId);
        }
        
        return false;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
      
    return userActivities.map(activity => {
      const enriched: any = {
        ...activity,
        user: this.users.get(activity.userId)!
      };
      
      if (activity.groupId) {
        enriched.group = this.groups.get(activity.groupId);
      }
      
      if (activity.actionType === 'add_expense' && activity.referenceId) {
        enriched.expense = this.expenses.get(activity.referenceId);
      }
      
      if (activity.actionType === 'record_payment' && activity.referenceId) {
        enriched.payment = this.payments.get(activity.referenceId);
      }
      
      return enriched;
    });
  }

  async getActivityByGroupId(groupId: number, limit: number = 20): Promise<(ActivityLogEntry & {
    user: User;
    group?: Group;
    expense?: Expense;
    payment?: Payment;
  })[]> {
    const groupActivities = Array.from(this.activities.values())
      .filter(activity => activity.groupId === groupId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
      
    return groupActivities.map(activity => {
      const enriched: any = {
        ...activity,
        user: this.users.get(activity.userId)!,
        group: this.groups.get(activity.groupId!)!
      };
      
      if (activity.actionType === 'add_expense' && activity.referenceId) {
        enriched.expense = this.expenses.get(activity.referenceId);
      }
      
      if (activity.actionType === 'record_payment' && activity.referenceId) {
        enriched.payment = this.payments.get(activity.referenceId);
      }
      
      return enriched;
    });
  }
  
  // Balance calculations
  async getUserBalanceInGroup(userId: number, groupId: number): Promise<number> {
    let balance = 0;
    
    // Add expenses paid by this user
    const paidExpenses = Array.from(this.expenses.values())
      .filter(expense => expense.groupId === groupId && expense.paidBy === userId);
      
    for (const expense of paidExpenses) {
      // Get all participants except the payer
      const participants = await this.getExpenseParticipants(expense.id);
      const otherParticipantsAmount = participants
        .filter(p => p.userId !== userId)
        .reduce((sum, p) => sum + Number(p.amountOwed), 0);
      
      balance += Number(otherParticipantsAmount);
    }
    
    // Subtract expenses where this user owes
    const allExpenses = await this.getExpensesByGroupId(groupId);
    for (const expense of allExpenses) {
      if (expense.paidBy === userId) continue; // Skip expenses paid by this user
      
      const participants = await this.getExpenseParticipants(expense.id);
      const userParticipant = participants.find(p => p.userId === userId);
      
      if (userParticipant) {
        balance -= Number(userParticipant.amountOwed);
      }
    }
    
    // Add payments received by this user
    const paymentsReceived = Array.from(this.payments.values())
      .filter(payment => payment.groupId === groupId && payment.paidTo === userId);
      
    for (const payment of paymentsReceived) {
      balance += Number(payment.amount);
    }
    
    // Subtract payments made by this user
    const paymentsMade = Array.from(this.payments.values())
      .filter(payment => payment.groupId === groupId && payment.paidBy === userId);
      
    for (const payment of paymentsMade) {
      balance -= Number(payment.amount);
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
    const userGroups = await this.getGroupsByUserId(userId);
    let totalOwed = 0;
    let totalOwes = 0;
    
    // Track individual balances
    const balancesByUser: Record<number, number> = {};
    
    for (const group of userGroups) {
      // Calculate what others owe this user in this group
      const expensesPaidByUser = Array.from(this.expenses.values())
        .filter(expense => expense.groupId === group.id && expense.paidBy === userId);
        
      for (const expense of expensesPaidByUser) {
        const participants = await this.getExpenseParticipants(expense.id);
        for (const participant of participants) {
          if (participant.userId === userId) continue; // Skip self
          
          const amount = Number(participant.amountOwed);
          totalOwed += amount;
          
          // Add to individual balance
          if (!balancesByUser[participant.userId]) {
            balancesByUser[participant.userId] = 0;
          }
          balancesByUser[participant.userId] += amount;
        }
      }
      
      // Calculate what this user owes to others in this group
      const expensesNotPaidByUser = Array.from(this.expenses.values())
        .filter(expense => expense.groupId === group.id && expense.paidBy !== userId);
        
      for (const expense of expensesNotPaidByUser) {
        const participants = await this.getExpenseParticipants(expense.id);
        const userParticipant = participants.find(p => p.userId === userId);
        
        if (userParticipant) {
          const amount = Number(userParticipant.amountOwed);
          totalOwes += amount;
          
          // Subtract from individual balance
          if (!balancesByUser[expense.paidBy]) {
            balancesByUser[expense.paidBy] = 0;
          }
          balancesByUser[expense.paidBy] -= amount;
        }
      }
      
      // Add payments received
      const paymentsReceived = Array.from(this.payments.values())
        .filter(payment => payment.groupId === group.id && payment.paidTo === userId);
        
      for (const payment of paymentsReceived) {
        const amount = Number(payment.amount);
        totalOwed -= amount; // Reduce amount owed as it's been paid
        
        // Update individual balance
        if (!balancesByUser[payment.paidBy]) {
          balancesByUser[payment.paidBy] = 0;
        }
        balancesByUser[payment.paidBy] -= amount;
      }
      
      // Add payments made
      const paymentsMade = Array.from(this.payments.values())
        .filter(payment => payment.groupId === group.id && payment.paidBy === userId);
        
      for (const payment of paymentsMade) {
        const amount = Number(payment.amount);
        totalOwes -= amount; // Reduce amount to pay as it's been paid
        
        // Update individual balance
        if (!balancesByUser[payment.paidTo]) {
          balancesByUser[payment.paidTo] = 0;
        }
        balancesByUser[payment.paidTo] += amount;
      }
    }
    
    // Format the result with user details
    const owedByUsers: { user: User; amount: number }[] = [];
    const owesToUsers: { user: User; amount: number }[] = [];
    
    for (const [userIdStr, balance] of Object.entries(balancesByUser)) {
      const otherUserId = parseInt(userIdStr);
      const otherUser = await this.getUser(otherUserId);
      
      if (!otherUser) continue;
      
      if (balance > 0) {
        owedByUsers.push({ user: otherUser, amount: balance });
      } else if (balance < 0) {
        owesToUsers.push({ user: otherUser, amount: -balance });
      }
    }
    
    // Sort by amount (highest first)
    owedByUsers.sort((a, b) => b.amount - a.amount);
    owesToUsers.sort((a, b) => b.amount - a.amount);
    
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
    const members = await this.getGroupMembers(groupId);
    const balances: {
      userId: number;
      user: User;
      balance: number;
    }[] = [];
    
    for (const member of members) {
      const balance = await this.getUserBalanceInGroup(member.userId, groupId);
      balances.push({
        userId: member.userId,
        user: member.user,
        balance
      });
    }
    
    return balances.sort((a, b) => b.balance - a.balance);
  }
}

export const storage = new MemStorage();
