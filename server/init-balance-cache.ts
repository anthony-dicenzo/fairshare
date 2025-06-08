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
    // Check if database is available
    if (!db) {
      console.log('⚠️ Database not available for balance cache initialization');
      return;
    }

    // Test database connection first
    try {
      await db.select().from(groups).limit(1);
    } catch (connectionError) {
      console.log('⚠️ Database connection not ready for balance cache initialization');
      console.log('Server will continue normally, balance cache can be initialized later');
      return;
    }

    // Get all groups from the database
    const allGroups = await db.select().from(groups);
    console.log(`📊 Found ${allGroups.length} groups to process`);
    
    // For each group, update all balances
    let successCount = 0;
    let errorCount = 0;
    
    for (const group of allGroups) {
      try {
        console.log(`⚙ Updating balances for group ${group.id}`);
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
    console.log('⚠️ Balance cache initialization failed, but server will continue');
  }
}