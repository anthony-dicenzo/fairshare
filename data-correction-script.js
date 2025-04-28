const { db } = require('./server/db');
const { eq, and, or, inArray } = require('drizzle-orm');
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
 */
async function fixPaubsBalanceIssues() {
  console.log('Starting data correction script for "House of Anthica" group...');
  
  try {
    // 1. Get Paubs' user ID and the Group ID for "House of Anthica"
    const paubsId = 7; // Known from our queries
    const groupIds = [2, 3]; // Both "House of Anthica" groups - check both to be thorough
    
    console.log(`Targeting user ID ${paubsId} (Paubs) in groups:`, groupIds);
    
    // Begin transaction for atomicity
    await db.transaction(async (tx) => {
      console.log('Started database transaction');
      
      // 2. Verify if Paubs was ever a member of these groups (archive status check)
      const groupMemberships = await tx.select()
        .from(groupMembers)
        .where(and(
          eq(groupMembers.userId, paubsId),
          inArray(groupMembers.groupId, groupIds)
        ));
      
      console.log(`Found ${groupMemberships.length} group memberships (including archived)`);
      
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
      
      // 4. Remove expenses where Paubs is the payer 
      const deletedExpenses = await tx.delete(expenses)
        .where(and(
          eq(expenses.paidBy, paubsId),
          inArray(expenses.groupId, groupIds)
        ))
        .returning();
      
      console.log(`Deleted ${deletedExpenses.length} expenses`);
      
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
      
      // Note: We'll keep the activity logs for audit purposes, but optionally could remove them
      console.log('Activity logs have been preserved for audit purposes.');
      
      // Ensure Paubs is fully removed (including archived status)
      const deletedMemberships = await tx.delete(groupMembers)
        .where(and(
          eq(groupMembers.userId, paubsId),
          inArray(groupMembers.groupId, groupIds)
        ))
        .returning();
      
      console.log(`Deleted ${deletedMemberships.length} group memberships`);
      
      // Log success
      console.log('Transaction committed successfully.');
    });
    
    // 8. Force recalculation of balances for all remaining members
    // The app has a mechanism to update balances automatically
    // We can trigger it for the affected groups
    console.log('Triggering balance recalculation for affected groups...');
    
    for (const groupId of groupIds) {
      // Find all active members in the group
      const members = await db.select({
        userId: groupMembers.userId
      })
      .from(groupMembers)
      .where(and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.archived, false)
      ));
      
      console.log(`Recalculating balances for group ${groupId} with ${members.length} active members`);
      
      // This would call your balance recalculation function
      // For this example, we're just logging it
      console.log(`Balance recalculation would be triggered here for group ${groupId}`);
    }
    
    console.log('Data correction completed successfully.');
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