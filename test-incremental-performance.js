/**
 * Quick test to verify incremental balance performance
 */

import { updateBalancesOnExpenseCreate } from './server/incremental-balance.js';

async function testIncrementalPerformance() {
  console.log('Testing incremental balance performance...');
  
  // Mock test data
  const groupId = 1;
  const expenseData = {
    paidBy: 'user1',
    totalAmount: '60.00'
  };
  const participants = [
    { userId: 'user1', amountOwed: '20.00' },
    { userId: 'user2', amountOwed: '20.00' },
    { userId: 'user3', amountOwed: '20.00' }
  ];

  const startTime = Date.now();
  
  try {
    const result = await updateBalancesOnExpenseCreate(groupId, expenseData, participants);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Incremental update completed in ${duration}ms`);
    console.log(`Result:`, result);
    
    if (duration < 100) {
      console.log('🎉 Performance target achieved: sub-100ms!');
    } else {
      console.log('⚠️ Performance slower than target but functional');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test if called directly
if (require.main === module) {
  testIncrementalPerformance().then(() => process.exit(0));
}

module.exports = { testIncrementalPerformance };