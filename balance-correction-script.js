/**
 * Balance Correction Script
 * 
 * Purpose: This one-time script addresses balance issues where members were deleted
 * prior to implementing safety measures that prevent deleting members with non-zero balances.
 * 
 * Specifically, this script:
 * 1. Ensures all references to specified user are removed from specified groups
 * 2. Corrects any lingering balance issues between remaining members
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

// Default values
const DEFAULT_USER_ID = 7; // Paubs
const DEFAULT_GROUP_IDS = [2, 3]; // House of Anthica groups
const TEST_USER_ID = 1; // Using test user as the actor for logging corrections

// Global configuration set by parameters
let USER_ID = DEFAULT_USER_ID;
let GROUP_IDS = DEFAULT_GROUP_IDS;
let DRY_RUN = false;

/**
 * Main function to run the balance correction
 * 
 * @param {number[]} groupIds - List of group IDs to process (default: House of Anthica groups)
 * @param {number} userId - User ID to remove references to (default: Paubs)
 * @param {boolean} dryRun - If true, will only log what would be changed without making actual changes
 */
async function correctBalances(groupIds = DEFAULT_GROUP_IDS, userId = DEFAULT_USER_ID, dryRun = false) {
  console.log(`🚀 Starting balance correction script for user ID ${userId} in groups: ${groupIds.join(', ')}`);
  
  if (dryRun) {
    console.log("⚠️ DRY RUN MODE: Changes will be logged but not applied to database");
  }
  
  // Set the global configuration
  USER_ID = userId;
  GROUP_IDS = groupIds;
  DRY_RUN = dryRun;
  
  try {
    // Step 1: Find and remove any remaining payments involving the specified user
    await removePaymentsInvolvingUser();
    
    // Step 2: Find and remove any remaining expenses paid by the specified user
    await removeExpensesPaidByUser();
    
    // Step 3: Find and remove any remaining expense participants involving the specified user
    await removeExpenseParticipantsInvolvingUser();
    
    // Step 4: Clean up any incorrect balance records involving the specified user
    await cleanupBalanceRecords();
    
    // Step 5: Recalculate all balances for the affected groups
    await recalculateGroupBalances();
    
    // Step 6: Log a summary of corrections made
    await logDataCorrection();
    
    console.log("✅ Balance correction steps completed successfully!");
    
  } catch (error) {
    console.error("❌ Error during balance correction:", error);
    throw error;
  } finally {
    // Close the database connection
    if (!DRY_RUN) {
      await pool.end();
    }
  }
}

/**
 * Removes payments involving the specified user in the specified groups
 */
async function removePaymentsInvolvingUser() {
  console.log(`\n🔍 Checking for payments involving user ID ${USER_ID}...`);
  
  // Find payments involving the user in the specified groups
  const paymentsToRemove = await db
    .select()
    .from(payments)
    .where(
      and(
        inArray(payments.groupId, GROUP_IDS),
        or(
          eq(payments.paidBy, USER_ID),
          eq(payments.paidTo, USER_ID)
        )
      )
    );
  
  console.log(`Found ${paymentsToRemove.length} payments involving user ID ${USER_ID}`);
  
  // Delete each payment and log the action
  for (const payment of paymentsToRemove) {
    console.log(`Removing payment #${payment.id}: $${payment.amount} from user ${payment.paidBy} to user ${payment.paidTo}`);
    
    if (!DRY_RUN) {
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
    } else {
      console.log(`  [DRY RUN] Would delete payment #${payment.id}`);
    }
  }
}

/**
 * Removes expenses paid by the specified user in the specified groups
 */
async function removeExpensesPaidByUser() {
  console.log(`\n🔍 Checking for expenses paid by user ID ${USER_ID}...`);
  
  // Find expenses paid by the user in the specified groups
  const expensesToRemove = await db
    .select()
    .from(expenses)
    .where(
      and(
        inArray(expenses.groupId, GROUP_IDS),
        eq(expenses.paidBy, USER_ID)
      )
    );
  
  console.log(`Found ${expensesToRemove.length} expenses paid by user ID ${USER_ID}`);
  
  // Delete each expense and its participants
  for (const expense of expensesToRemove) {
    console.log(`Removing expense #${expense.id}: ${expense.title} ($${expense.totalAmount})`);
    
    if (!DRY_RUN) {
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
    } else {
      console.log(`  [DRY RUN] Would delete expense #${expense.id} and all its participants`);
    }
  }
}

/**
 * Removes expense participants that involve the specified user
 */
async function removeExpenseParticipantsInvolvingUser() {
  console.log(`\n🔍 Checking for expense participants involving user ID ${USER_ID}...`);
  
  // Get all expenses from the specified groups
  const groupExpenses = await db
    .select()
    .from(expenses)
    .where(inArray(expenses.groupId, GROUP_IDS));
  
  const expenseIds = groupExpenses.map(e => e.id);
  
  // Find participants matching the specified user
  const participantsToRemove = await db
    .select()
    .from(expenseParticipants)
    .where(
      and(
        inArray(expenseParticipants.expenseId, expenseIds),
        eq(expenseParticipants.userId, USER_ID)
      )
    );
  
  console.log(`Found ${participantsToRemove.length} expense participants involving user ID ${USER_ID}`);
  
  // Delete each participant
  for (const participant of participantsToRemove) {
    console.log(`Removing participant record: User ${participant.userId} owes $${participant.amountOwed} for expense #${participant.expenseId}`);
    
    if (!DRY_RUN) {
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
    } else {
      console.log(`  [DRY RUN] Would delete expense participant record for user ${participant.userId} in expense #${participant.expenseId}`);
    }
  }
}

/**
 * Cleans up any incorrect balance records in the cache tables
 */
async function cleanupBalanceRecords() {
  console.log(`\n🔍 Checking for balance records involving user ID ${USER_ID}...`);
  
  // Check user_balances table
  const balancesToRemove = await db
    .select()
    .from(userBalances)
    .where(
      and(
        inArray(userBalances.groupId, GROUP_IDS),
        eq(userBalances.userId, USER_ID)
      )
    );
  
  console.log(`Found ${balancesToRemove.length} user balance records for user ID ${USER_ID}`);
  
  // Delete each balance record
  for (const balance of balancesToRemove) {
    console.log(`Removing balance record: User ${balance.userId} has balance $${balance.balanceAmount} in group ${balance.groupId}`);
    
    if (!DRY_RUN) {
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
    } else {
      console.log(`  [DRY RUN] Would delete balance record for user ${balance.userId} in group ${balance.groupId}`);
    }
  }
  
  // Check user_balances_between_users table
  const userToUserBalancesToRemove = await db
    .select()
    .from(userBalancesBetweenUsers)
    .where(
      and(
        inArray(userBalancesBetweenUsers.groupId, GROUP_IDS),
        or(
          eq(userBalancesBetweenUsers.fromUserId, USER_ID),
          eq(userBalancesBetweenUsers.toUserId, USER_ID)
        )
      )
    );
  
  console.log(`Found ${userToUserBalancesToRemove.length} user-to-user balance records involving user ID ${USER_ID}`);
  
  // Delete each user-to-user balance record
  for (const balance of userToUserBalancesToRemove) {
    console.log(`Removing user-to-user balance record: User ${balance.fromUserId} to User ${balance.toUserId} in group ${balance.groupId}`);
    
    if (!DRY_RUN) {
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
    } else {
      console.log(`  [DRY RUN] Would delete user-to-user balance record between users ${balance.fromUserId} and ${balance.toUserId} in group ${balance.groupId}`);
    }
  }
}

/**
 * Recalculates all balances for the affected groups
 */
async function recalculateGroupBalances() {
  console.log("\n🔄 Recalculating balances for all affected groups...");
  
  for (const groupId of GROUP_IDS) {
    console.log(`Recalculating balances for group ${groupId}...`);
    
    if (!DRY_RUN) {
      const result = await storage.updateAllBalancesInGroup(groupId);
      
      if (result) {
        console.log(`✅ Successfully recalculated balances for group ${groupId}`);
      } else {
        console.error(`❌ Failed to recalculate balances for group ${groupId}`);
      }
    } else {
      console.log(`  [DRY RUN] Would recalculate all balances for group ${groupId}`);
    }
  }
}

/**
 * Logs a final summary of the data correction
 */
async function logDataCorrection() {
  console.log("\n📝 Logging final correction summary...");
  
  // Log a summary for each affected group
  for (const groupId of GROUP_IDS) {
    if (!DRY_RUN) {
      await db.insert(activityLog).values({
        groupId,
        userId: TEST_USER_ID,
        actionType: 'data_correction',
        metadata: JSON.stringify({
          description: "Balance correction completed: fixed issues with deleted members and payments",
          timestamp: new Date().toISOString(),
          correctionType: 'balance_fix',
          affectedUser: USER_ID
        })
      });
      
      console.log(`✅ Logged correction summary for group ${groupId}`);
    } else {
      console.log(`  [DRY RUN] Would log correction summary for group ${groupId}`);
    }
  }
}

// Run the correction script when this file is executed directly
if (process.argv[1] === import.meta.url) {
  correctBalances().catch(console.error);
}

export { correctBalances };