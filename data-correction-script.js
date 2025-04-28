const { db } = require('./server/db');
const { eq, and, or, inArray, like } = require('drizzle-orm');
const { 
  users, 
  groups, 
  groupMembers, 
  expenses, 
  expenseParticipants, 
  payments, 
  activityLog, 
  userBalances, 
  userBalancesBetweenUsers
} = require('./shared/schema');

/**
 * Data Correction Script
 * Purpose: Remove all references to "Paubs" from Group "House of Anthica"
 * 
 * Key requirements:
 * 1. Remove Paubs from the group without affecting other members' balances
 * 2. Keep the balances for other users unchanged
 * 3. Maintain data integrity and consistency
 */
async function fixPaubsBalanceIssues() {
  console.log('Starting data correction script for "House of Anthica" group...');
  
  try {
    // 1. Get Paubs' user ID and the Group ID for "House of Anthica"
    const paubsId = 7; // Known from our queries
    const paubsUsername = 'Paubs';
    const groupIds = [2, 3]; // Both "House of Anthica" groups - check both to be thorough
    
    console.log(`Targeting user ID ${paubsId} (${paubsUsername}) in groups:`, groupIds);
    
    // First, let's capture the current balances of all users in the groups
    // This will help us verify that other users' balances aren't affected
    const previousBalances = {};
    
    for (const groupId of groupIds) {
      // Get current balances before changes
      const currentBalances = await db.select({
        userId: userBalances.userId,
        balance: userBalances.balanceAmount
      })
      .from(userBalances)
      .where(and(
        eq(userBalances.groupId, groupId),
        or(
          eq(userBalances.userId, paubsId).not() // Not Paubs
        )
      ));
      
      previousBalances[groupId] = {};
      currentBalances.forEach(b => {
        previousBalances[groupId][b.userId] = parseFloat(b.balance);
      });
      
      console.log(`Captured current balances for group ${groupId}:`, 
        Object.entries(previousBalances[groupId])
          .map(([userId, balance]) => `User ${userId}: $${balance}`)
          .join(', ')
      );
    }
    
    // Begin transaction for atomicity
    await db.transaction(async (tx) => {
      console.log('Started database transaction');
      
      // 2. Check activity logs involving Paubs for audit
      const activityLogs = await tx.select()
        .from(activityLog)
        .where(and(
          or(
            eq(activityLog.userId, paubsId),
            like(activityLog.metadata, `%${paubsId}%`),
            like(activityLog.metadata, `%${paubsUsername}%`)
          ),
          inArray(activityLog.groupId, groupIds)
        ));
      
      console.log(`Found ${activityLogs.length} activity logs involving ${paubsUsername}`);
      
      // 3. Remove any expense participants involving Paubs
      const deletedExpParticipants = await tx.delete(expenseParticipants)
        .where(and(
          eq(expenseParticipants.userId, paubsId),
          inArray(expenseParticipants.expenseId, 
            tx.select({ id: expenses.id })
              .from(expenses)
              .where(inArray(expenses.groupId, groupIds))
          )
        ))
        .returning();
      
      console.log(`Deleted ${deletedExpParticipants.length} expense participants`);
      
      // 4. Identify expenses where Paubs is the payer
      const paubsExpenses = await tx.select()
        .from(expenses)
        .where(and(
          eq(expenses.paidBy, paubsId),
          inArray(expenses.groupId, groupIds)
        ));
      
      console.log(`Found ${paubsExpenses.length} expenses paid by ${paubsUsername}`);
      
      // Remove expenses where Paubs is the payer 
      if (paubsExpenses.length > 0) {
        const expenseIds = paubsExpenses.map(e => e.id);
        
        // Delete related expense participants first
        await tx.delete(expenseParticipants)
          .where(inArray(expenseParticipants.expenseId, expenseIds));
        
        // Then delete the expenses
        const deletedExpenses = await tx.delete(expenses)
          .where(inArray(expenses.id, expenseIds))
          .returning();
        
        console.log(`Deleted ${deletedExpenses.length} expenses`);
      }
      
      // 5. Remove payments where Paubs is payer or recipient
      const deletedPayments = await tx.delete(payments)
        .where(and(
          or(
            eq(payments.paidBy, paubsId),
            eq(payments.paidTo, paubsId)
          ),
          inArray(payments.groupId, groupIds)
        ))
        .returning();
      
      console.log(`Deleted ${deletedPayments.length} payments`);
      
      // 6. Remove user balances involving Paubs
      const deletedBalances = await tx.delete(userBalances)
        .where(and(
          eq(userBalances.userId, paubsId),
          inArray(userBalances.groupId, groupIds)
        ))
        .returning();
      
      console.log(`Deleted ${deletedBalances.length} user balances`);
      
      // 7. Remove user balances between users involving Paubs
      const deletedBalancesBetween = await tx.delete(userBalancesBetweenUsers)
        .where(and(
          or(
            eq(userBalancesBetweenUsers.fromUserId, paubsId),
            eq(userBalancesBetweenUsers.toUserId, paubsId)
          ),
          inArray(userBalancesBetweenUsers.groupId, groupIds)
        ))
        .returning();
      
      console.log(`Deleted ${deletedBalancesBetween.length} user balances between users`);
      
      // 8. Check for group memberships and remove them
      const membershipRecords = await tx.select()
        .from(groupMembers)
        .where(and(
          eq(groupMembers.userId, paubsId),
          inArray(groupMembers.groupId, groupIds)
        ));
      
      console.log(`Found ${membershipRecords.length} group membership records for ${paubsUsername}`);
      
      // Ensure Paubs is fully removed (including archived status)
      const deletedMemberships = await tx.delete(groupMembers)
        .where(and(
          eq(groupMembers.userId, paubsId),
          inArray(groupMembers.groupId, groupIds)
        ))
        .returning();
      
      console.log(`Deleted ${deletedMemberships.length} group memberships`);
      
      // 9. Optional: Add an activity log entry about this data correction
      for (const groupId of groupIds) {
        await tx.insert(activityLog)
          .values({
            groupId,
            userId: 1, // Assuming admin/system user ID 1
            actionType: 'data_correction',
            metadata: JSON.stringify({
              description: `Removed all data for user ${paubsUsername} (ID: ${paubsId}) from group`,
              timestamp: new Date().toISOString()
            })
          });
      }
      
      console.log('Added activity log entries for data correction');
      
      // Log success
      console.log('Transaction committed successfully.');
    });
    
    // After transaction, verify balances to ensure they're unchanged for other users
    console.log('\nVerifying balances after data correction...');
    
    for (const groupId of groupIds) {
      // Get current balances after changes
      const currentBalances = await db.select({
        userId: userBalances.userId,
        balance: userBalances.balanceAmount
      })
      .from(userBalances)
      .where(and(
        eq(userBalances.groupId, groupId),
        or(
          eq(userBalances.userId, paubsId).not() // Not Paubs
        )
      ));
      
      // Compare with previous balances
      console.log(`\nVerifying group ${groupId} balances:`);
      let allBalancesMatch = true;
      
      for (const { userId, balance } of currentBalances) {
        const previousBalance = previousBalances[groupId][userId] || 0;
        const currentBalance = parseFloat(balance);
        const matches = Math.abs(previousBalance - currentBalance) < 0.01; // Allow for small floating point differences
        
        console.log(`User ${userId}: Previous $${previousBalance} → Current $${currentBalance} (${matches ? 'Match ✓' : 'Different ✗'})`);
        
        if (!matches) {
          allBalancesMatch = false;
        }
      }
      
      if (allBalancesMatch) {
        console.log(`✅ All balances for group ${groupId} preserved correctly`);
      } else {
        console.log(`⚠️ Some balances for group ${groupId} have changed - may need manual review`);
      }
    }
    
    console.log('\nData correction completed successfully.');
    console.log('Warning: You should manually verify that all group balances are correct after this script runs.');
    
    return { success: true, message: 'Successfully removed all references to Paubs from House of Anthica groups' };
  } catch (error) {
    console.error('Error in data correction script:', error);
    return { success: false, error: error.message };
  }
}

// Export the function so it can be called from another script
module.exports = { fixPaubsBalanceIssues };

// If this script is run directly, execute the function
if (require.main === module) {
  fixPaubsBalanceIssues()
    .then(result => {
      console.log('Script execution result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Uncaught error:', err);
      process.exit(1);
    });
}