/**
 * Incremental balance updates - only modify the specific balance changes
 * instead of recalculating everything from scratch
 */

import { db } from './db.js';
import { userBalances } from '../shared/schema.js';
import { eq, sql } from 'drizzle-orm';

/**
 * Update balances incrementally when an expense is created
 */
async function updateBalancesOnExpenseCreate(groupId, expenseData, participants) {
  const startTime = Date.now();
  console.log(`Incremental balance update: expense created in group ${groupId}`);

  try {
    const paidBy = expenseData.paidBy;
    const totalAmount = parseFloat(expenseData.totalAmount);

    // Calculate balance changes for each participant
    const balanceChanges = new Map();

    // Person who paid gets credit for what others owe
    let payerCredit = 0;
    
    for (const participant of participants) {
      const userId = participant.userId;
      const amountOwed = parseFloat(participant.amountOwed);

      if (userId === paidBy) {
        // Payer owes their own portion but gets credit for others
        payerCredit -= amountOwed; // They owe their portion
      } else {
        // Others owe money to the payer
        balanceChanges.set(userId, -(amountOwed)); // They owe this amount
        payerCredit += amountOwed; // Payer gets credit
      }
    }

    // Set the payer's balance change
    balanceChanges.set(paidBy, payerCredit);

    // Apply incremental updates
    const updatePromises = Array.from(balanceChanges.entries()).map(async ([userId, change]) => {
      if (Math.abs(change) < 0.01) return; // Skip negligible changes

      await db.execute(sql`
        INSERT INTO user_balances (group_id, user_id, balance_amount, last_updated)
        VALUES (${groupId}, ${userId}, ${change.toString()}, CURRENT_TIMESTAMP)
        ON CONFLICT (group_id, user_id)
        DO UPDATE SET 
          balance_amount = (COALESCE(user_balances.balance_amount::decimal, 0) + ${change})::text,
          last_updated = CURRENT_TIMESTAMP
      `);
    });

    await Promise.all(updatePromises);

    const duration = Date.now() - startTime;
    console.log(`Incremental balance update completed in ${duration}ms`);
    return { success: true, duration, updatedUsers: balanceChanges.size };

  } catch (error) {
    console.error(`Incremental balance update failed:`, error);
    throw error;
  }
}

/**
 * Update balances incrementally when an expense is deleted
 */
async function updateBalancesOnExpenseDelete(groupId, expenseData, participants) {
  const startTime = Date.now();
  console.log(`Incremental balance update: expense deleted in group ${groupId}`);

  try {
    const paidBy = expenseData.paidBy;
    
    // Calculate reverse balance changes (opposite of create)
    const balanceChanges = new Map();
    let payerCredit = 0;
    
    for (const participant of participants) {
      const userId = participant.userId;
      const amountOwed = parseFloat(participant.amountOwed);

      if (userId === paidBy) {
        payerCredit += amountOwed; // Reverse: they no longer owe their portion
      } else {
        balanceChanges.set(userId, amountOwed); // Reverse: they no longer owe this amount
        payerCredit -= amountOwed; // Reverse: payer loses credit
      }
    }

    balanceChanges.set(paidBy, payerCredit);

    // Apply incremental updates
    const updatePromises = Array.from(balanceChanges.entries()).map(async ([userId, change]) => {
      if (Math.abs(change) < 0.01) return;

      await db.execute(sql`
        INSERT INTO user_balances (group_id, user_id, balance_amount, last_updated)
        VALUES (${groupId}, ${userId}, ${change.toString()}, CURRENT_TIMESTAMP)
        ON CONFLICT (group_id, user_id)
        DO UPDATE SET 
          balance_amount = (COALESCE(user_balances.balance_amount::decimal, 0) + ${change})::text,
          last_updated = CURRENT_TIMESTAMP
      `);
    });

    await Promise.all(updatePromises);

    const duration = Date.now() - startTime;
    console.log(`Incremental balance update completed in ${duration}ms`);
    return { success: true, duration, updatedUsers: balanceChanges.size };

  } catch (error) {
    console.error(`Incremental balance update failed:`, error);
    throw error;
  }
}

export { 
  updateBalancesOnExpenseCreate, 
  updateBalancesOnExpenseDelete 
};