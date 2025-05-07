#!/usr/bin/env node
// This script updates all balance caches across the system
// Run it to reset and rebuild all balance calculations if you encounter issues

import 'dotenv/config';
import { db } from './shared/db.js';
import { storage } from './server/storage.js';
import { groups } from './shared/schema.js';

async function updateAllBalancesInSystem() {
  console.log("🔄 Starting system-wide balance cache update");
  
  try {
    // Get all groups in the system
    const allGroups = await db.select().from(groups);
    console.log(`Found ${allGroups.length} groups to process`);
    
    // Process each group
    let successCount = 0;
    let errorCount = 0;
    
    for (const group of allGroups) {
      console.log(`⚙️ Processing group ${group.id} (${group.name})...`);
      
      try {
        // Update all balances in this group
        const success = await storage.updateAllBalancesInGroup(group.id);
        
        if (success) {
          console.log(`✅ Successfully updated balances for group ${group.id}`);
          successCount++;
        } else {
          console.error(`❌ Failed to update balances for group ${group.id}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing group ${group.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`🏁 Balance cache update complete!`);
    console.log(`📊 Summary: ${successCount} groups successfully processed, ${errorCount} errors`);
  } catch (error) {
    console.error("❌ Critical error during balance update:", error);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the update function
updateAllBalancesInSystem();