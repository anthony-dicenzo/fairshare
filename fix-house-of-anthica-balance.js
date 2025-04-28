// Fix incorrect balance in the "House of Anthica" group
import { storage } from './server/storage';

async function fixHouseOfAnthicaBalance() {
  const GROUP_ID = 2; // House of Anthica group ID
  
  console.log(`Starting balance fix for House of Anthica (Group ID: ${GROUP_ID})`);
  
  try {
    // Get current group details
    const group = await storage.getGroup(GROUP_ID);
    if (!group) {
      console.error("Group not found");
      return;
    }
    
    console.log(`Found group: ${group.name}`);
    
    // Get current balances
    const currentBalances = await storage.getCachedGroupBalances(GROUP_ID);
    console.log("Current cached balances:");
    for (const balance of currentBalances) {
      console.log(`- User ${balance.user.name} (${balance.userId}): $${balance.balance}`);
    }
    
    // Get all expenses in the group to recalculate
    const expenses = await storage.getExpensesByGroupId(GROUP_ID);
    console.log(`Found ${expenses.length} expenses in group`);
    
    // Get all payments in the group
    const payments = await storage.getPaymentsByGroupId(GROUP_ID);
    console.log(`Found ${payments.length} payments in group`);
    
    // Force a complete recalculation of all balances in the group
    console.log("Forcing balance recalculation...");
    await storage.updateAllBalancesInGroup(GROUP_ID);
    
    // Get updated balances
    const updatedBalances = await storage.getCachedGroupBalances(GROUP_ID);
    console.log("\nUpdated cached balances:");
    for (const balance of updatedBalances) {
      console.log(`- User ${balance.user.name} (${balance.userId}): $${balance.balance}`);
    }
    
    console.log("\nBalance update completed!");
  } catch (error) {
    console.error("Error fixing balances:", error);
  }
}

fixHouseOfAnthicaBalance().catch(console.error);