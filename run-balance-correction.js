#!/usr/bin/env node

/**
 * Balance Correction Runner
 * 
 * This script executes the one-time balance correction to fix issues with 
 * deleted members and balances in the House of Anthica groups.
 * 
 * Run this script using: node run-balance-correction.js
 */

import { correctBalances } from './balance-correction-script.js';

async function main() {
  console.log("==================================================");
  console.log("  FAIRSHARE - ONE-TIME BALANCE CORRECTION SCRIPT  ");
  console.log("==================================================");
  console.log("This script will:");
  console.log("1. Remove any remaining references to Paubs in House of Anthica groups");
  console.log("2. Fix any balance calculations affected by deleted members");
  console.log("3. Update the balance cache tables");
  console.log("4. Log all corrections in the activity log");
  console.log("==================================================");
  
  try {
    await correctBalances();
    console.log("\n✅ Balance correction completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during balance correction:", error);
    process.exit(1);
  }
}

main().catch(console.error);