const { db } = require('./server/db');
const { eq, and, or, inArray } = require('drizzle-orm');
const { storage } = require('./server/storage');
const { 
  users, 
  groups,
  groupMembers,
  userBalances 
} = require('./shared/schema');

/**
 * Script to recalculate balances for specified groups
 * This should be run after the data correction script
 */
async function recalculateBalances() {
  const groupIds = [2, 3]; // Both "House of Anthica" groups
  
  try {
    console.log(`\n=== BALANCE RECALCULATION FOR HOUSE OF ANTHICA GROUPS ===`);
    console.log(`Starting balance recalculation for ${groupIds.length} groups...\n`);
    
    // Track success status for each group
    const results = {
      success: true,
      groupResults: {}
    };
    
    for (const groupId of groupIds) {
      console.log(`==== Group ID ${groupId} ====`);
      
      try {
        // First get group info
        const groupInfo = await db.select()
          .from(groups)
          .where(eq(groups.id, groupId))
          .limit(1);
        
        if (groupInfo.length === 0) {
          console.log(`⚠️ Group ID ${groupId} not found`);
          results.groupResults[groupId] = { success: false, error: 'Group not found' };
          continue;
        }
        
        const group = groupInfo[0];
        console.log(`Group: ${group.name} (Created by: ${group.createdBy})`);
        
        // Get active group members
        const members = await db.select({
          userId: groupMembers.userId,
          username: users.username,
          name: users.name
        })
        .from(groupMembers)
        .innerJoin(users, eq(users.id, groupMembers.userId))
        .where(and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.archived, false)
        ));
        
        console.log(`Active members (${members.length}): ${members.map(m => m.name).join(', ')}`);
        
        // Get current balances before recalculation
        const beforeBalances = await db.select({
          userId: userBalances.userId,
          username: users.username,
          balance: userBalances.balanceAmount
        })
        .from(userBalances)
        .innerJoin(users, eq(users.id, userBalances.userId))
        .where(eq(userBalances.groupId, groupId));
        
        console.log('\nCurrent balances before recalculation:');
        beforeBalances.forEach(b => {
          console.log(`- ${b.username}: $${b.balance}`);
        });
        
        // Use the storage method to update all balances in the group
        console.log('\nRecalculating balances...');
        const result = await storage.updateAllBalancesInGroup(groupId);
        
        if (result) {
          console.log('✅ Balance recalculation successful');
          
          // Get updated balances after recalculation
          const afterBalances = await db.select({
            userId: userBalances.userId,
            username: users.username,
            balance: userBalances.balanceAmount
          })
          .from(userBalances)
          .innerJoin(users, eq(users.id, userBalances.userId))
          .where(eq(userBalances.groupId, groupId));
          
          console.log('\nUpdated balances after recalculation:');
          afterBalances.forEach(b => {
            console.log(`- ${b.username}: $${b.balance}`);
          });
          
          // Calculate total balance (should be close to zero)
          const totalBalance = afterBalances.reduce((sum, b) => sum + parseFloat(b.balance), 0);
          console.log(`\nTotal group balance: $${totalBalance.toFixed(2)}`);
          
          if (Math.abs(totalBalance) < 0.01) {
            console.log('✅ Group balances are properly balanced (sum is zero)');
          } else {
            console.log('⚠️ Group balances do not sum to zero - possible data inconsistency');
          }
          
          results.groupResults[groupId] = { 
            success: true, 
            membersCount: members.length,
            balancesCount: afterBalances.length,
            totalBalance: totalBalance
          };
        } else {
          console.log('❌ Balance recalculation failed');
          results.groupResults[groupId] = { success: false, error: 'Recalculation returned false' };
          results.success = false;
        }
      } catch (groupError) {
        console.error(`❌ Error recalculating balances for group ${groupId}:`, groupError);
        results.groupResults[groupId] = { success: false, error: groupError.message };
        results.success = false;
      }
      
      console.log('\n'); // Add spacing between groups
    }
    
    console.log('=== Balance recalculation process completed ===');
    return { 
      success: results.success, 
      message: results.success 
        ? 'Balance recalculation completed successfully for all groups' 
        : 'Balance recalculation had issues with some groups',
      details: results.groupResults
    };
  } catch (error) {
    console.error('Error in balance recalculation:', error);
    return { success: false, error: error.message };
  }
}

// If this script is run directly, execute the function
if (require.main === module) {
  recalculateBalances()
    .then(result => {
      console.log('\nScript execution result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Uncaught error:', err);
      process.exit(1);
    });
}

module.exports = { recalculateBalances };