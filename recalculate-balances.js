const { db } = require('./server/db');
const { eq } = require('drizzle-orm');
const { storage } = require('./server/storage');

/**
 * Script to recalculate balances for specified groups
 * This should be run after the data correction script
 */
async function recalculateBalances() {
  const groupIds = [2, 3]; // Both "House of Anthica" groups
  
  try {
    console.log(`Starting balance recalculation for ${groupIds.length} groups...`);
    
    for (const groupId of groupIds) {
      console.log(`Recalculating balances for group ID ${groupId}...`);
      
      try {
        // Use the storage method to update all balances in the group
        const result = await storage.updateAllBalancesInGroup(groupId);
        console.log(`Balance recalculation for group ${groupId} completed with result:`, result);
      } catch (groupError) {
        console.error(`Error recalculating balances for group ${groupId}:`, groupError);
      }
    }
    
    console.log('Balance recalculation completed.');
    return { success: true, message: 'Balance recalculation completed successfully' };
  } catch (error) {
    console.error('Error in balance recalculation:', error);
    return { success: false, error: error.message };
  }
}

// If this script is run directly, execute the function
if (require.main === module) {
  recalculateBalances()
    .then(result => {
      console.log('Script execution result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Uncaught error:', err);
      process.exit(1);
    });
}

module.exports = { recalculateBalances };