#!/usr/bin/env node

/**
 * Balance Correction Runner
 * 
 * This script executes the one-time balance correction to fix issues with 
 * deleted members and balances in the House of Anthica groups.
 * 
 * Run this script using: node run-balance-correction.js [--group-id=2,3] [--user-id=7] [--dry-run]
 * 
 * Options:
 *   --group-id  - Comma-separated list of group IDs to correct (default: 2,3 - House of Anthica groups)
 *   --user-id   - User ID to remove references to (default: 7 - Paubs)
 *   --dry-run   - Run without making changes (only logs what would be changed)
 */

import { correctBalances } from './balance-correction-script.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    groupIds: [2, 3], // Default to House of Anthica groups
    userId: 7,        // Default to Paubs
    dryRun: false     // Default to making actual changes
  };
  
  for (const arg of args) {
    if (arg.startsWith('--group-id=')) {
      const groupIdsStr = arg.split('=')[1];
      options.groupIds = groupIdsStr.split(',').map(id => parseInt(id.trim()));
    } else if (arg.startsWith('--user-id=')) {
      options.userId = parseInt(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }
  
  return options;
}

async function main() {
  const options = parseArgs();
  
  console.log("==================================================");
  console.log("  FAIRSHARE - ONE-TIME BALANCE CORRECTION SCRIPT  ");
  console.log("==================================================");
  console.log("This script will:");
  console.log(`1. Remove references to user ID ${options.userId} in groups: ${options.groupIds.join(', ')}`);
  console.log("2. Fix any balance calculations affected by deleted members");
  console.log("3. Update the balance cache tables");
  console.log("4. Log all corrections in the activity log");
  
  if (options.dryRun) {
    console.log("\n⚠️ DRY RUN MODE: No changes will be made to the database");
  }
  
  console.log("==================================================");
  
  try {
    await correctBalances(options.groupIds, options.userId, options.dryRun);
    
    if (options.dryRun) {
      console.log("\n✅ Dry run completed. Review the logs above to see what changes would be made.");
    } else {
      console.log("\n✅ Balance correction completed successfully!");
    }
  } catch (error) {
    console.error("\n❌ Error during balance correction:", error);
    process.exit(1);
  }
}

main().catch(console.error);