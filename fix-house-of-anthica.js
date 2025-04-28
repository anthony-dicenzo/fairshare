/**
 * Master script to fix House of Anthica balance issues
 * 
 * This script:
 * 1. Removes all references to "Paubs" from Group "House of Anthica" (group IDs 2 and 3)
 * 2. Recalculates balances for all affected groups
 * 3. Verifies balances are correct
 */

const { fixPaubsBalanceIssues } = require('./data-correction-script');
const { recalculateBalances } = require('./recalculate-balances');
const { db } = require('./server/db');
const { eq, and, or, inArray } = require('drizzle-orm');
const { users, groups, groupMembers, userBalances } = require('./shared/schema');

async function runCorrections() {
  console.log('\n====== FIX HOUSE OF ANTHICA BALANCE ISSUES ======');
  console.log('Starting correction process...');
  
  try {
    // Step 1: Fix Paubs balance issues
    console.log('\n1. REMOVING REFERENCES TO PAUBS:');
    console.log('----------------------------------');
    const fixResult = await fixPaubsBalanceIssues();
    
    if (!fixResult.success) {
      console.error('❌ Error during data correction:', fixResult.error);
      return { success: false, error: fixResult.error };
    }
    
    console.log('✅ Successfully removed Paubs references');
    
    // Step 2: Recalculate balances
    console.log('\n2. RECALCULATING BALANCES:');
    console.log('---------------------------');
    const recalcResult = await recalculateBalances();
    
    if (!recalcResult.success) {
      console.error('❌ Error during balance recalculation:', recalcResult.error);
      return { success: false, error: recalcResult.error };
    }
    
    console.log('✅ Successfully recalculated balances');
    
    // Step 3: Verify final state
    console.log('\n3. FINAL VERIFICATION:');
    console.log('----------------------');
    
    const groupIds = [2, 3]; // Both "House of Anthica" groups
    const paubsId = 7;
    
    // Verify Paubs is completely removed
    console.log('\nVerifying Paubs has been completely removed:');
    
    const remainingMemberships = await db.select()
      .from(groupMembers)
      .where(and(
        eq(groupMembers.userId, paubsId),
        inArray(groupMembers.groupId, groupIds)
      ));
    
    if (remainingMemberships.length === 0) {
      console.log('✅ No group memberships found for Paubs');
    } else {
      console.log(`⚠️ Found ${remainingMemberships.length} remaining group memberships for Paubs`);
    }
    
    const remainingBalances = await db.select()
      .from(userBalances)
      .where(and(
        eq(userBalances.userId, paubsId),
        inArray(userBalances.groupId, groupIds)
      ));
    
    if (remainingBalances.length === 0) {
      console.log('✅ No balances found for Paubs');
    } else {
      console.log(`⚠️ Found ${remainingBalances.length} remaining balance records for Paubs`);
    }
    
    // Verify group balances sum to zero
    console.log('\nVerifying group balances sum to zero:');
    
    for (const groupId of groupIds) {
      const groupBalances = await db.select({
        userId: userBalances.userId,
        username: users.username,
        balance: userBalances.balanceAmount
      })
      .from(userBalances)
      .innerJoin(users, eq(users.id, userBalances.userId))
      .where(eq(userBalances.groupId, groupId));
      
      const groupInfo = await db.select()
        .from(groups)
        .where(eq(groups.id, groupId))
        .limit(1);
      
      const groupName = groupInfo.length > 0 ? groupInfo[0].name : `Unknown (ID: ${groupId})`;
      
      // Calculate sum of balances
      const totalBalance = groupBalances.reduce((sum, b) => sum + parseFloat(b.balance), 0);
      const isBalanced = Math.abs(totalBalance) < 0.01;
      
      console.log(`\nGroup: ${groupName} (ID: ${groupId})`);
      console.log(`Members with balances: ${groupBalances.length}`);
      groupBalances.forEach(b => {
        console.log(`- ${b.username}: $${b.balance}`);
      });
      console.log(`Sum of balances: $${totalBalance.toFixed(2)}`);
      
      if (isBalanced) {
        console.log('✅ Group is properly balanced (sum ≈ 0)');
      } else {
        console.log('⚠️ Group is NOT balanced (sum ≠ 0)');
      }
    }
    
    console.log('\n====== CORRECTION PROCESS COMPLETED ======');
    return { 
      success: true, 
      message: 'Successfully fixed House of Anthica balance issues',
      paubsRemoved: remainingMemberships.length === 0 && remainingBalances.length === 0
    };
  } catch (error) {
    console.error('Unexpected error during correction process:', error);
    return { success: false, error: error.message };
  }
}

// Run the master correction script if called directly
if (require.main === module) {
  runCorrections()
    .then(result => {
      console.log('\nFinal result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runCorrections };