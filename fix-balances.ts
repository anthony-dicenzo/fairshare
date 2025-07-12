/**
 * Fix balances by removing Test User Account balance entry and recalculating
 */

import { db } from './server/db';
import { storage } from './server/storage';
import { users, userBalances } from './shared/schema';
import { eq, and } from 'drizzle-orm';

async function fixBalances() {
  console.log('🔧 Fixing balances after Test User Account removal...\n');
  
  try {
    // Find the Test User Account
    const testUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'test@test.com'))
      .limit(1);
    
    if (testUser.length === 0) {
      console.log('❌ Test User Account not found');
      return;
    }
    
    const testUserData = testUser[0];
    console.log(`✅ Found Test User Account: ID ${testUserData.id}, Name: ${testUserData.name}`);
    
    // Remove Test User's balance entries from all groups
    console.log('🗑️ Removing Test User balance entries...');
    const deletedBalances = await db
      .delete(userBalances)
      .where(eq(userBalances.userId, testUserData.id))
      .returning();
    
    console.log(`✅ Removed ${deletedBalances.length} balance entries for Test User Account`);
    
    // Recalculate balances for House of Anthica (group 1)
    console.log('🔄 Recalculating balances for House of Anthica...');
    await storage.updateAllBalancesInGroup(1);
    console.log('✅ Balance recalculation completed');
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const remainingBalances = await db
      .select({
        userId: userBalances.userId,
        balance: userBalances.balanceAmount,
        user: users
      })
      .from(userBalances)
      .innerJoin(users, eq(userBalances.userId, users.id))
      .where(eq(userBalances.groupId, 1));
    
    console.log('\n📊 CORRECTED BALANCES:');
    console.log('====================');
    for (const balance of remainingBalances) {
      console.log(`${balance.user.name}: $${parseFloat(balance.balance).toFixed(2)}`);
    }
    
    // Verify balances sum to zero
    const totalBalance = remainingBalances.reduce((sum, b) => sum + parseFloat(b.balance), 0);
    console.log(`\n💰 Balance sum: $${totalBalance.toFixed(2)} ${Math.abs(totalBalance) < 0.01 ? '✅' : '❌'}`);
    
    // Check for Test User in balances
    const testUserInBalances = remainingBalances.find(b => b.user.email === 'test@test.com');
    if (testUserInBalances) {
      console.log('❌ ERROR: Test User Account still found in balances!');
    } else {
      console.log('✅ Test User Account successfully removed from all balances');
    }
    
    if (Math.abs(totalBalance) < 0.01 && !testUserInBalances) {
      console.log('\n🎉 BALANCE FIX SUCCESSFUL: All balances are now correct!');
    } else {
      console.log('\n⚠️ BALANCE FIX INCOMPLETE: Issues remain');
    }
    
  } catch (error) {
    console.error('❌ Error fixing balances:', error);
    throw error;
  }
}

// Run the fix
fixBalances()
  .then(() => {
    console.log('\n✅ Balance fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Balance fix failed:', error);
    process.exit(1);
  });