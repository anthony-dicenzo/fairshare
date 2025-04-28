/**
 * Balance Correction Script
 * 
 * Purpose: This one-time script addresses balance issues where members were deleted
 * prior to implementing safety measures that prevent deleting members with non-zero balances.
 * 
 * Specifically, this script:
 * 1. Ensures all references to Paubs (user ID 7) are removed from House of Anthica groups
 * 2. Corrects any lingering balance issues between Anthony users and other members
 * 3. Updates the cached balance tables to reflect the correct values
 * 4. Logs all corrections in the activity log for audit purposes
 */

import { db, pool } from './server/db.js';
import { eq, and, or, inArray } from 'drizzle-orm';
import {
  payments,
  expenses,
  expenseParticipants,
  activityLog,
  userBalances,
  userBalancesBetweenUsers
} from './shared/schema.js';
import { storage } from './server/storage.js';

const PAUBS_USER_ID = 7;
const ANTHONY_USER_IDS = [2, 3]; // adicenzo and test2
const HOUSE_OF_ANTHICA_GROUP_IDS = [2, 3];
const TEST_USER_ID = 1; // Using test user as the actor for logging corrections

/**
 * Main function to run the balance correction
 */
async function correctBalances() {
  console.log("🚀 Starting balance correction script...");
  
  try {
    // Step 1: Find and remove any remaining payments involving Paubs
    await removePaymentsInvolvingPaubs();
    
    // Step 2: Find and remove any remaining expenses paid by Paubs
    await removeExpensesPaidByPaubs();
    
    // Step 3: Find and remove any remaining expense participants involving Paubs
    await removeExpenseParticipantsInvolvingPaubs();
    
    // Step 4: Clean up any incorrect balance records involving Paubs
    await cleanupBalanceRecords();
    
    // Step 5: Recalculate all balances for the affected groups
    await recalculateGroupBalances();
    
    // Step 6: Log a summary of corrections made
    await logDataCorrection();
    
    console.log("✅ Balance correction completed successfully!");
    
  } catch (error) {
    console.error("❌ Error during balance correction:", error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

/**
 * Removes payments involving Paubs or between Anthony and other users in House of Anthica
 */
async function removePaymentsInvolvingPaubs() {
  console.log("\n🔍 Checking for payments involving Paubs...");
  
  // Find payments involving Paubs in House of Anthica groups
  const paymentsToRemove = await db
    .select()
    .from(payments)
    .where(
      and(
        inArray(payments.groupId, HOUSE_OF_ANTHICA_GROUP_IDS),
        or(
          eq(payments.paidBy, PAUBS_USER_ID),
          eq(payments.paidTo, PAUBS_USER_ID)
        )
      )
    );
  
  console.log(`Found ${paymentsToRemove.length} payments involving Paubs`);
  
  // Delete each payment and log the action
  for (const payment of paymentsToRemove) {
    console.log(`Removing payment #${payment.id}: $${payment.amount} from user ${payment.paidBy} to user ${payment.paidTo}`);
    
    // Delete the payment
    await db
      .delete(payments)
      .where(eq(payments.id, payment.id));
    
    // Log the deletion in activity log
    await db.insert(activityLog).values({
      groupId: payment.groupId,
      userId: TEST_USER_ID,
      actionType: 'data_correction',
      metadata: JSON.stringify({
        description: `Removed payment #${payment.id} ($${payment.amount}) from user ${payment.paidBy} to user ${payment.paidTo}`,
        timestamp: new Date().toISOString(),
        correctionType: 'balance_fix'
      })
    });
  }
}

/**
 * Removes expenses paid by Paubs in House of Anthica
 */
async function removeExpensesPaidByPaubs() {
  console.log("\n🔍 Checking for expenses paid by Paubs...");
  
  // Find expenses paid by Paubs in House of Anthica groups
  const expensesToRemove = await db
    .select()
    .from(expenses)
    .where(
      and(
        inArray(expenses.groupId, HOUSE_OF_ANTHICA_GROUP_IDS),
        eq(expenses.paidBy, PAUBS_USER_ID)
      )
    );
  
  console.log(`Found ${expensesToRemove.length} expenses paid by Paubs`);
  
  // Delete each expense and its participants
  for (const expense of expensesToRemove) {
    console.log(`Removing expense #${expense.id}: ${expense.title} ($${expense.totalAmount})`);
    
    // First, delete all participants of this expense
    await db
      .delete(expenseParticipants)
      .where(eq(expenseParticipants.expenseId, expense.id));
    
    // Then, delete the expense itself
    await db
      .delete(expenses)
      .where(eq(expenses.id, expense.id));
    
    // Log the deletion in activity log
    await db.insert(activityLog).values({
      groupId: expense.groupId,
      userId: TEST_USER_ID,
      actionType: 'data_correction',
      metadata: JSON.stringify({
        description: `Removed expense #${expense.id} (${expense.title}) for $${expense.totalAmount}`,
        timestamp: new Date().toISOString(),
        correctionType: 'balance_fix'
      })
    });
  }
}

/**
 * Removes expense participants that involve Paubs
 */
async function removeExpenseParticipantsInvolvingPaubs() {
  console.log("\n🔍 Checking for expense participants involving Paubs...");
  
  // Get all expenses from House of Anthica groups
  const groupExpenses = await db
    .select()
    .from(expenses)
    .where(inArray(expenses.groupId, HOUSE_OF_ANTHICA_GROUP_IDS));
  
  const expenseIds = groupExpenses.map(e => e.id);
  
  // Find participants that are Paubs
  const participantsToRemove = await db
    .select()
    .from(expenseParticipants)
    .where(
      and(
        inArray(expenseParticipants.expenseId, expenseIds),
        eq(expenseParticipants.userId, PAUBS_USER_ID)
      )
    );
  
  console.log(`Found ${participantsToRemove.length} expense participants involving Paubs`);
  
  // Delete each participant
  for (const participant of participantsToRemove) {
    console.log(`Removing participant record: User ${participant.userId} owes $${participant.amountOwed} for expense #${participant.expenseId}`);
    
    await db
      .delete(expenseParticipants)
      .where(eq(expenseParticipants.id, participant.id));
    
    // Find the associated expense to get group ID for logging
    const expense = groupExpenses.find(e => e.id === participant.expenseId);
    
    if (expense) {
      // Log the deletion in activity log
      await db.insert(activityLog).values({
        groupId: expense.groupId,
        userId: TEST_USER_ID,
        actionType: 'data_correction',
        metadata: JSON.stringify({
          description: `Removed participant record for user ${participant.userId} from expense #${participant.expenseId}`,
          timestamp: new Date().toISOString(),
          correctionType: 'balance_fix'
        })
      });
    }
  }
}

/**
 * Cleans up any incorrect balance records in the cache tables
 */
async function cleanupBalanceRecords() {
  console.log("\n🔍 Checking for balance records involving Paubs...");
  
  // Check user_balances table
  const balancesToRemove = await db
    .select()
    .from(userBalances)
    .where(
      and(
        inArray(userBalances.groupId, HOUSE_OF_ANTHICA_GROUP_IDS),
        eq(userBalances.userId, PAUBS_USER_ID)
      )
    );
  
  console.log(`Found ${balancesToRemove.length} user balance records for Paubs`);
  
  // Delete each balance record
  for (const balance of balancesToRemove) {
    console.log(`Removing balance record: User ${balance.userId} has balance $${balance.balanceAmount} in group ${balance.groupId}`);
    
    await db
      .delete(userBalances)
      .where(eq(userBalances.id, balance.id));
    
    // Log the deletion
    await db.insert(activityLog).values({
      groupId: balance.groupId,
      userId: TEST_USER_ID, 
      actionType: 'data_correction',
      metadata: JSON.stringify({
        description: `Removed balance record for user ${balance.userId} in group ${balance.groupId}`,
        timestamp: new Date().toISOString(),
        correctionType: 'balance_fix'
      })
    });
  }
  
  // Check user_balances_between_users table
  const userToUserBalancesToRemove = await db
    .select()
    .from(userBalancesBetweenUsers)
    .where(
      and(
        inArray(userBalancesBetweenUsers.groupId, HOUSE_OF_ANTHICA_GROUP_IDS),
        or(
          eq(userBalancesBetweenUsers.fromUserId, PAUBS_USER_ID),
          eq(userBalancesBetweenUsers.toUserId, PAUBS_USER_ID)
        )
      )
    );
  
  console.log(`Found ${userToUserBalancesToRemove.length} user-to-user balance records involving Paubs`);
  
  // Delete each user-to-user balance record
  for (const balance of userToUserBalancesToRemove) {
    console.log(`Removing user-to-user balance record: User ${balance.fromUserId} to User ${balance.toUserId} in group ${balance.groupId}`);
    
    await db
      .delete(userBalancesBetweenUsers)
      .where(eq(userBalancesBetweenUsers.id, balance.id));
    
    // Log the deletion
    await db.insert(activityLog).values({
      groupId: balance.groupId,
      userId: TEST_USER_ID,
      actionType: 'data_correction',
      metadata: JSON.stringify({
        description: `Removed user-to-user balance record between users ${balance.fromUserId} and ${balance.toUserId} in group ${balance.groupId}`,
        timestamp: new Date().toISOString(),
        correctionType: 'balance_fix'
      })
    });
  }
}

/**
 * Recalculates all balances for the affected groups
 */
async function recalculateGroupBalances() {
  console.log("\n🔄 Recalculating balances for all affected groups...");
  
  for (const groupId of HOUSE_OF_ANTHICA_GROUP_IDS) {
    console.log(`Recalculating balances for group ${groupId}...`);
    
    const result = await storage.updateAllBalancesInGroup(groupId);
    
    if (result) {
      console.log(`✅ Successfully recalculated balances for group ${groupId}`);
    } else {
      console.error(`❌ Failed to recalculate balances for group ${groupId}`);
    }
  }
}

/**
 * Logs a final summary of the data correction
 */
async function logDataCorrection() {
  console.log("\n📝 Logging final correction summary...");
  
  // Log a summary for each affected group
  for (const groupId of HOUSE_OF_ANTHICA_GROUP_IDS) {
    await db.insert(activityLog).values({
      groupId,
      userId: TEST_USER_ID,
      actionType: 'data_correction',
      metadata: JSON.stringify({
        description: "Balance correction completed: fixed issues with deleted members and payments",
        timestamp: new Date().toISOString(),
        correctionType: 'balance_fix',
        affectedUsers: [...ANTHONY_USER_IDS, PAUBS_USER_ID]
      })
    });
    
    console.log(`✅ Logged correction summary for group ${groupId}`);
  }
}

// Run the correction script when this file is executed directly
if (process.argv[1] === import.meta.url) {
  correctBalances().catch(console.error);
}

export { correctBalances };