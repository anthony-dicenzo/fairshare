/**
 * Transactional Balance Service
 * 
 * Handles all balance updates within database transactions.
 * Each expense/payment operation updates the balance summary table 
 * in the same transaction as the source change.
 */

import { db } from './db.js';
import { userBalances, expenseParticipants, expenses } from '../shared/schema.js';
import { eq, and, sql } from 'drizzle-orm';

export interface BalanceChange {
  userId: number;
  groupId: number;
  amountChange: string; // Decimal string for precision
}

export interface ExpenseBalanceData {
  expenseId: number;
  groupId: number;
  paidBy: number;
  totalAmount: string;
  participants: Array<{
    userId: number;
    amountOwed: string;
  }>;
}

export interface PaymentBalanceData {
  groupId: number;
  paidBy: number;
  paidTo: number;
  amount: string;
}

/**
 * Calculate balance changes for a new expense
 */
export function calculateExpenseBalanceChanges(data: ExpenseBalanceData): BalanceChange[] {
  const changes: BalanceChange[] = [];
  const { groupId, paidBy, participants } = data;

  // Calculate what each participant owes
  for (const participant of participants) {
    const userId = participant.userId;
    const amountOwed = parseFloat(participant.amountOwed);

    if (userId === paidBy) {
      // Payer gets credit for what others owe them, minus their own portion
      const creditFromOthers = participants
        .filter(p => p.userId !== paidBy)
        .reduce((sum, p) => sum + parseFloat(p.amountOwed), 0);
      
      const netChange = creditFromOthers - amountOwed;
      changes.push({
        userId,
        groupId,
        amountChange: netChange.toFixed(2)
      });
    } else {
      // Non-payer owes their portion (negative balance)
      changes.push({
        userId,
        groupId,
        amountChange: (-amountOwed).toFixed(2)
      });
    }
  }

  return changes;
}

/**
 * Calculate balance changes for a payment
 */
export function calculatePaymentBalanceChanges(data: PaymentBalanceData): BalanceChange[] {
  const { groupId, paidBy, paidTo, amount } = data;
  const amountNum = parseFloat(amount);

  return [
    {
      userId: paidBy,
      groupId,
      amountChange: (-amountNum).toFixed(2) // Payer loses money
    },
    {
      userId: paidTo,
      groupId,
      amountChange: amountNum.toFixed(2) // Recipient gains money
    }
  ];
}

/**
 * Apply balance changes within a transaction
 */
export async function applyBalanceChanges(
  changes: BalanceChange[], 
  transaction: any = db
): Promise<void> {
  if (!transaction) {
    throw new Error('Database transaction required');
  }

  for (const change of changes) {
    const { userId, groupId, amountChange } = change;
    
    // Skip zero changes for efficiency
    if (parseFloat(amountChange) === 0) continue;

    // Use proper upsert pattern for balance updates
    const existingBalance = await transaction
      .select()
      .from(userBalances)
      .where(and(eq(userBalances.userId, userId), eq(userBalances.groupId, groupId)))
      .limit(1);

    if (existingBalance.length > 0) {
      // Update existing balance
      const currentBalance = parseFloat(existingBalance[0].balanceAmount);
      const newBalance = (currentBalance + parseFloat(amountChange)).toFixed(2);
      
      await transaction
        .update(userBalances)
        .set({ 
          balanceAmount: newBalance,
          lastUpdated: new Date()
        })
        .where(and(eq(userBalances.userId, userId), eq(userBalances.groupId, groupId)));
    } else {
      // Insert new balance record
      await transaction
        .insert(userBalances)
        .values({
          userId,
          groupId,
          balanceAmount: amountChange,
          lastUpdated: new Date()
        });
    }
  }
}

/**
 * Reverse balance changes for expense deletion
 */
export function reverseExpenseBalanceChanges(data: ExpenseBalanceData): BalanceChange[] {
  const forwardChanges = calculateExpenseBalanceChanges(data);
  
  // Reverse all changes by negating amounts
  return forwardChanges.map(change => ({
    ...change,
    amountChange: (-parseFloat(change.amountChange)).toFixed(2)
  }));
}

/**
 * Reverse balance changes for payment deletion
 */
export function reversePaymentBalanceChanges(data: PaymentBalanceData): BalanceChange[] {
  const forwardChanges = calculatePaymentBalanceChanges(data);
  
  // Reverse all changes by negating amounts
  return forwardChanges.map(change => ({
    ...change,
    amountChange: (-parseFloat(change.amountChange)).toFixed(2)
  }));
}

/**
 * Get current balance for a user in a group
 */
export async function getUserGroupBalance(userId: number, groupId: number): Promise<string> {
  if (!db) {
    throw new Error('Database not available');
  }

  const result = await db
    .select({ balance: userBalances.balanceAmount })
    .from(userBalances)
    .where(and(
      eq(userBalances.userId, userId),
      eq(userBalances.groupId, groupId)
    ))
    .limit(1);

  return result[0]?.balance || "0";
}

/**
 * Initialize balance entry for a new group member
 */
export async function initializeUserGroupBalance(
  userId: number, 
  groupId: number,
  transaction = db
): Promise<void> {
  if (!transaction) {
    throw new Error('Database transaction required');
  }

  await transaction
    .insert(userBalances)
    .values({
      userId,
      groupId,
      balanceAmount: "0"
    })
    .onConflictDoNothing();
}