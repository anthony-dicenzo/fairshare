/**
 * Balance Cache Initialization Module
 * 
 * This module initializes the balance cache when the server starts.
 * It ensures that all user balances and user-to-user balances are properly calculated
 * and stored in the cache tables for improved performance.
 */
import { db } from './db';
import { storage } from './storage';
import { groups } from '../shared/schema';

/**
 * Initialize the balance cache for all groups
 * This is called when the server starts to ensure the cache is populated
 */
export async function initializeBalanceCache(): Promise<void> {
  console.log('🔄 Initializing balance cache...');
  
  try {
    // Get all groups from the database
    const allGroups = await db.select().from(groups);
    console.log(`📊 Found ${allGroups.length} groups to process`);
    
    // For each group, update all balances
    let successCount = 0;
    let errorCount = 0;
    
    for (const group of allGroups) {
      try {
        console.log(`⚙️ Processing group ${group.id} (${group.name})...`);
        await storage.updateAllBalancesInGroup(group.id);
        successCount++;
        console.log(`✅ Successfully updated balances for group ${group.id}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating balances for group ${group.id}:`, error);
      }
    }
    
    console.log(`🏁 Balance cache initialization complete!`);
    console.log(`📊 Summary: ${successCount} groups successfully processed, ${errorCount} errors`);
  } catch (error) {
    console.error('❌ Error initializing balance cache:', error);
  }
}