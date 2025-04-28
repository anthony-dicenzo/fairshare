import { db } from './db.js';
import { and, desc, eq, inArray, or } from 'drizzle-orm';
import {
  users,
  groups,
  groupMembers,
  expenses,
  expenseParticipants,
  payments,
  activityLog,
  groupInvites,
  userBalances,
  userBalancesBetweenUsers
} from '../shared/schema.js';

class DatabaseStorage {
  async checkUserHasOutstandingBalances(groupId, userId) {
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
  
  async getUserBalancesBetweenUsers(groupId, userId) {
    try {
      // Get this user's balances with other users
      const directBalances = await db
        .select({
          otherUserId: userBalancesBetweenUsers.toUserId,
          amount: userBalancesBetweenUsers.amount
        })
        .from(userBalancesBetweenUsers)
        .where(
          and(
            eq(userBalancesBetweenUsers.groupId, groupId),
            eq(userBalancesBetweenUsers.fromUserId, userId)
          )
        );
  
      // Get reverse balances (where this user is the "to" user)
      const reverseBalances = await db
        .select({
          otherUserId: userBalancesBetweenUsers.fromUserId,
          amount: userBalancesBetweenUsers.amount
        })
        .from(userBalancesBetweenUsers)
        .where(
          and(
            eq(userBalancesBetweenUsers.groupId, groupId),
            eq(userBalancesBetweenUsers.toUserId, userId)
          )
        );
  
      // Combine and format the results
      const directBalancesWithUsers = await Promise.all(
        directBalances.map(async (balance) => {
          const otherUser = await this.getUser(balance.otherUserId);
          return {
            otherUserId: balance.otherUserId,
            otherUser,
            amount: parseFloat(balance.amount),
            direction: 'owes'
          };
        })
      );
  
      const reverseBalancesWithUsers = await Promise.all(
        reverseBalances.map(async (balance) => {
          const otherUser = await this.getUser(balance.otherUserId);
          return {
            otherUserId: balance.otherUserId,
            otherUser,
            amount: parseFloat(balance.amount),
            direction: 'owed'
          };
        })
      );
  
      return [...directBalancesWithUsers, ...reverseBalancesWithUsers];
    } catch (error) {
      console.error(`Error in getUserBalancesBetweenUsers: ${error}`);
      throw error;
    }
  }

  async updateAllBalancesInGroup(groupId) {
    console.log(`Starting recalculation of all balances in group ${groupId}`);
    
    try {
      // Get all non-archived members in the group
      const groupMembers = await this.getGroupMembers(groupId);
      
      // Calculate and update balances for each member
      for (const member of groupMembers) {
        await this.recalculateUserBalanceInGroup(member.userId, groupId);
      }
      
      // Update the user-to-user balances
      await this.updateUserBalancesBetweenUsers(groupId);
      
      console.log(`✅ Successfully updated balances for group ${groupId}`);
      return true;
    } catch (error) {
      console.error(`Error updating balances in group ${groupId}: ${error}`);
      return false;
    }
  }
  
  async recalculateUserBalanceInGroup(userId, groupId) {
    console.log(`Calculating balance for user ${userId} in group ${groupId}`);
    
    try {
      // Reset the user's balance
      let userBalance = 0;
      
      // Get all expenses in the group
      const groupExpenses = await db
        .select()
        .from(expenses)
        .where(eq(expenses.groupId, groupId))
        .orderBy(desc(expenses.createdAt));
      
      console.log(`Found ${groupExpenses.length} expenses in group ${groupId}`);
      
      // Get all payments in the group
      const groupPayments = await db
        .select()
        .from(payments)
        .where(eq(payments.groupId, groupId))
        .orderBy(desc(payments.createdAt));
      
      console.log(`Found ${groupPayments.length} payments in group ${groupId}`);
      
      // Process expenses
      for (const expense of groupExpenses) {
        // Get the participants for this expense
        const participants = await db
          .select()
          .from(expenseParticipants)
          .where(eq(expenseParticipants.expenseId, expense.id));
        
        console.log(`Expense #${expense.id} (${expense.title}) - ${participants.length} participants:`);
        for (const p of participants) {
          console.log(`  User ${p.userId}: $${p.amountOwed}`);
        }
        
        // Handle case where user paid for the expense
        if (expense.paidBy === userId) {
          // Calculate how much others owe this user for the expense
          const othersOwe = participants.reduce((sum, p) => {
            if (p.userId !== userId) {
              return sum + parseFloat(p.amountOwed);
            }
            return sum;
          }, 0);
          
          console.log(`Processing expense #${expense.id} (${expense.title}) - Paid by: ${expense.paidBy}`);
          console.log(`  ${userId} paid for expense - others owe: $${othersOwe}`);
          
          userBalance += othersOwe;
          console.log(`  Balance updated: $${userBalance}`);
        } 
        // Handle case where user owes for an expense someone else paid
        else {
          // Find what this user owes for this expense
          const participantRecord = participants.find(p => p.userId === userId);
          if (participantRecord) {
            const amountOwed = parseFloat(participantRecord.amountOwed);
            
            console.log(`Processing expense #${expense.id} (${expense.title}) - Paid by: ${expense.paidBy}`);
            console.log(`  ${userId} owes: $${amountOwed} for expense paid by ${expense.paidBy}`);
            
            userBalance -= amountOwed;
            console.log(`  Balance updated: $${userBalance}`);
          }
        }
      }
      
      // Process payments
      for (const payment of groupPayments) {
        if (payment.paidBy === userId) {
          // User made a payment
          console.log(`Processing payment #${payment.id} - $${payment.amount} from ${payment.paidBy} to ${payment.paidTo}`);
          console.log(`  ${userId} made payment: +$${payment.amount}`);
          
          userBalance -= parseFloat(payment.amount);
          console.log(`  Balance updated: $${userBalance}`);
        } 
        else if (payment.paidTo === userId) {
          // User received a payment
          console.log(`Processing payment #${payment.id} - $${payment.amount} from ${payment.paidBy} to ${payment.paidTo}`);
          console.log(`  ${userId} received payment: -$${payment.amount}`);
          
          userBalance += parseFloat(payment.amount);
          console.log(`  Balance updated: $${userBalance}`);
        }
      }
      
      console.log(`Final balance for user ${userId}: $${userBalance}`);
      
      // Update the database with the calculated balance
      // First check if a balance record exists
      const existingBalance = await db
        .select()
        .from(userBalances)
        .where(
          and(
            eq(userBalances.userId, userId),
            eq(userBalances.groupId, groupId)
          )
        );
      
      if (existingBalance.length > 0) {
        // Update existing record
        await db
          .update(userBalances)
          .set({ 
            balanceAmount: userBalance.toString(),
            lastUpdated: new Date()
          })
          .where(eq(userBalances.id, existingBalance[0].id));
      } else {
        // Create new record
        await db
          .insert(userBalances)
          .values({
            userId,
            groupId,
            balanceAmount: userBalance.toString(),
            lastUpdated: new Date()
          });
      }
      
      console.log(`Updated balance for user ${userId} in group ${groupId}: ${userBalance}`);
      return userBalance;
      
    } catch (error) {
      console.error(`Error calculating balance for user ${userId} in group ${groupId}: ${error}`);
      throw error;
    }
  }
  
  async updateUserBalancesBetweenUsers(groupId) {
    try {
      // Get all members in the group
      const members = await this.getGroupMembers(groupId);
      
      // For each pair of users, calculate their direct balance
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const userA = members[i].userId;
          const userB = members[j].userId;
          
          // Calculate how much userA owes userB
          const balance = await this.calculateDirectBalance(groupId, userA, userB);
          
          // Store/update the balance records
          if (balance !== 0) {
            // If userA owes userB (balance is positive)
            if (balance > 0) {
              await this.storeUserToUserBalance(groupId, userA, userB, balance);
            } 
            // If userB owes userA (balance is negative)
            else {
              await this.storeUserToUserBalance(groupId, userB, userA, -balance);
            }
          } else {
            // No balance between them, delete any existing records
            await this.clearUserToUserBalance(groupId, userA, userB);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating user-to-user balances for group ${groupId}: ${error}`);
      throw error;
    }
  }
  
  async calculateDirectBalance(groupId, fromUserId, toUserId) {
    try {
      let balance = 0;
      
      // Get expenses paid by toUserId where fromUserId is a participant
      const expensesToUser = await db
        .select({
          id: expenses.id,
          title: expenses.title,
          totalAmount: expenses.totalAmount,
          paidBy: expenses.paidBy
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.groupId, groupId),
            eq(expenses.paidBy, toUserId)
          )
        );
      
      for (const expense of expensesToUser) {
        // Get what fromUserId owes for this expense
        const participant = await db
          .select()
          .from(expenseParticipants)
          .where(
            and(
              eq(expenseParticipants.expenseId, expense.id),
              eq(expenseParticipants.userId, fromUserId)
            )
          );
        
        if (participant.length > 0) {
          balance += parseFloat(participant[0].amountOwed);
        }
      }
      
      // Get expenses paid by fromUserId where toUserId is a participant
      const expensesFromUser = await db
        .select({
          id: expenses.id,
          title: expenses.title,
          totalAmount: expenses.totalAmount,
          paidBy: expenses.paidBy
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.groupId, groupId),
            eq(expenses.paidBy, fromUserId)
          )
        );
      
      for (const expense of expensesFromUser) {
        // Get what toUserId owes for this expense
        const participant = await db
          .select()
          .from(expenseParticipants)
          .where(
            and(
              eq(expenseParticipants.expenseId, expense.id),
              eq(expenseParticipants.userId, toUserId)
            )
          );
        
        if (participant.length > 0) {
          balance -= parseFloat(participant[0].amountOwed);
        }
      }
      
      // Get payments directly between users
      const paymentsFromTo = await db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.groupId, groupId),
            eq(payments.paidBy, fromUserId),
            eq(payments.paidTo, toUserId)
          )
        );
      
      for (const payment of paymentsFromTo) {
        balance -= parseFloat(payment.amount);
      }
      
      const paymentsToFrom = await db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.groupId, groupId),
            eq(payments.paidBy, toUserId),
            eq(payments.paidTo, fromUserId)
          )
        );
      
      for (const payment of paymentsToFrom) {
        balance += parseFloat(payment.amount);
      }
      
      return balance;
    } catch (error) {
      console.error(`Error calculating direct balance between users ${fromUserId} and ${toUserId} in group ${groupId}: ${error}`);
      throw error;
    }
  }
  
  async storeUserToUserBalance(groupId, fromUserId, toUserId, amount) {
    try {
      // Check if record already exists
      const existingBalance = await db
        .select()
        .from(userBalancesBetweenUsers)
        .where(
          and(
            eq(userBalancesBetweenUsers.groupId, groupId),
            eq(userBalancesBetweenUsers.fromUserId, fromUserId),
            eq(userBalancesBetweenUsers.toUserId, toUserId)
          )
        );
      
      if (existingBalance.length > 0) {
        // Update existing record
        await db
          .update(userBalancesBetweenUsers)
          .set({
            amount: amount.toString(),
            lastUpdated: new Date()
          })
          .where(eq(userBalancesBetweenUsers.id, existingBalance[0].id));
      } else {
        // Create new record
        await db
          .insert(userBalancesBetweenUsers)
          .values({
            groupId,
            fromUserId,
            toUserId,
            amount: amount.toString(),
            lastUpdated: new Date()
          });
      }
      
      // Delete any record in the opposite direction (shouldn't exist, but to be safe)
      await this.clearUserToUserBalanceDirection(groupId, toUserId, fromUserId);
      
      return true;
    } catch (error) {
      console.error(`Error storing balance between users ${fromUserId} and ${toUserId} in group ${groupId}: ${error}`);
      throw error;
    }
  }
  
  async clearUserToUserBalance(groupId, userA, userB) {
    try {
      // Delete in both directions
      await this.clearUserToUserBalanceDirection(groupId, userA, userB);
      await this.clearUserToUserBalanceDirection(groupId, userB, userA);
      return true;
    } catch (error) {
      console.error(`Error clearing balance between users ${userA} and ${userB} in group ${groupId}: ${error}`);
      throw error;
    }
  }
  
  async clearUserToUserBalanceDirection(groupId, fromUserId, toUserId) {
    try {
      await db
        .delete(userBalancesBetweenUsers)
        .where(
          and(
            eq(userBalancesBetweenUsers.groupId, groupId),
            eq(userBalancesBetweenUsers.fromUserId, fromUserId),
            eq(userBalancesBetweenUsers.toUserId, toUserId)
          )
        );
      return true;
    } catch (error) {
      console.error(`Error clearing balance direction from ${fromUserId} to ${toUserId} in group ${groupId}: ${error}`);
      throw error;
    }
  }
  
  async getGroupMembers(groupId, includeArchived = false) {
    try {
      // Base query to get members
      let query = db
        .select({
          id: groupMembers.id,
          groupId: groupMembers.groupId,
          userId: groupMembers.userId,
          role: groupMembers.role,
          joinedAt: groupMembers.joinedAt,
          archived: groupMembers.archived,
          user: users
        })
        .from(groupMembers)
        .innerJoin(users, eq(groupMembers.userId, users.id))
        .where(eq(groupMembers.groupId, groupId));
        
      // Add filter for archived status if needed
      if (!includeArchived) {
        query = query.where(eq(groupMembers.archived, false));
      }
      
      const result = await query;
      
      return result;
    } catch (error) {
      console.error(`Error fetching group members for group ${groupId}: ${error}`);
      throw error;
    }
  }
  
  async getUser(id) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    
    return result[0];
  }
}

export const storage = new DatabaseStorage();