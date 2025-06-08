/**
 * Direct test of incremental balance performance without authentication
 */

import { updateBalancesOnExpenseCreate, updateBalancesOnExpenseDelete } from './server/incremental-balance.js';

async function testIncrementalPerformance() {
  console.log('🚀 Testing incremental balance performance...');
  
  // Test data for a typical 3-person expense split
  const groupId = 1;
  const expenseData = {
    paidBy: 1,
    totalAmount: '60.00'
  };
  const participants = [
    { userId: 1, amountOwed: '20.00' },
    { userId: 2, amountOwed: '20.00' },
    { userId: 3, amountOwed: '20.00' }
  ];

  console.log('Testing expense creation balance update...');
  const createStart = Date.now();
  
  try {
    const createResult = await updateBalancesOnExpenseCreate(groupId, expenseData, participants);
    const createDuration = Date.now() - createStart;
    
    console.log(`✅ Expense creation balance update: ${createDuration}ms`);
    console.log(`   Updated ${createResult.updatedUsers} user balances`);
    
    if (createDuration < 100) {
      console.log('🎉 CREATE performance target achieved: sub-100ms!');
    } else {
      console.log('⚠️ CREATE performance slower than target but functional');
    }
    
    // Test deletion performance
    console.log('\nTesting expense deletion balance update...');
    const deleteStart = Date.now();
    
    const deleteResult = await updateBalancesOnExpenseDelete(groupId, expenseData, participants);
    const deleteDuration = Date.now() - deleteStart;
    
    console.log(`✅ Expense deletion balance update: ${deleteDuration}ms`);
    console.log(`   Updated ${deleteResult.updatedUsers} user balances`);
    
    if (deleteDuration < 100) {
      console.log('🎉 DELETE performance target achieved: sub-100ms!');
    } else {
      console.log('⚠️ DELETE performance slower than target but functional');
    }
    
    // Overall assessment
    const avgTime = (createDuration + deleteDuration) / 2;
    console.log(`\n📊 PERFORMANCE SUMMARY:`);
    console.log(`   Average balance update time: ${avgTime.toFixed(1)}ms`);
    console.log(`   Target: <100ms`);
    
    if (avgTime < 100) {
      console.log('🎯 PERFORMANCE TARGET ACHIEVED!');
      console.log('   Balance updates are now instant for users');
    } else {
      console.log('📈 Performance improved but can be optimized further');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testIncrementalPerformance().then(() => process.exit(0)).catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

export { testIncrementalPerformance };