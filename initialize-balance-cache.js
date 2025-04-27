// This script initializes the balance cache for all groups
import { db, pool } from './server/db.js';
import { storage } from './server/storage.js';
import { groups } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function initializeBalanceCache() {
  console.log('Starting balance cache initialization...');
  
  try {
    // Get all groups
    const allGroups = await db.select().from(groups);
    console.log(`Found ${allGroups.length} groups to process`);
    
    // For each group, update all balances
    for (const group of allGroups) {
      console.log(`Updating balances for group ${group.id} (${group.name})...`);
      
      try {
        await storage.updateAllBalancesInGroup(group.id);
        console.log(`✓ Successfully updated balances for group ${group.id}`);
      } catch (error) {
        console.error(`✗ Error updating balances for group ${group.id}:`, error);
      }
    }
    
    console.log('Balance cache initialization complete!');
  } catch (error) {
    console.error('Error initializing balance cache:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the initialization
initializeBalanceCache();