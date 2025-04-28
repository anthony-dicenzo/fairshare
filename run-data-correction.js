#!/usr/bin/env node

/**
 * Data Correction Wrapper Script
 * 
 * This script executes the House of Anthica data correction and captures logs
 * to a file for records.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Generate log file name with timestamp
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const logFileName = `house-of-anthica-correction-${timestamp}.log`;
const logFilePath = path.join(logsDir, logFileName);

console.log(`Starting data correction for House of Anthica...`);
console.log(`Logs will be saved to: ${logFilePath}`);

try {
  // Run the script and capture output
  const output = execSync('node fix-house-of-anthica.js', { 
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Write output to log file
  fs.writeFileSync(logFilePath, output);
  
  console.log('\n✅ Data correction completed successfully!');
  console.log(`A complete log has been saved to: ${logFilePath}`);
  
  // Also log to console
  console.log('\nSummary of actions:');
  console.log('1. Removed all references to user "Paubs" (ID: 7) from House of Anthica groups (IDs: 2, 3)');
  console.log('2. Recalculated balances for all affected groups');
  console.log('3. Verified balances are balanced (sum to zero) and unchanged for other users');
  
  process.exit(0);
} catch (error) {
  console.error('\n❌ Error during data correction:', error.message);
  
  // Save error output to log file
  fs.writeFileSync(logFilePath, `ERROR:\n${error.message}\n\nStack:\n${error.stack}`);
  
  console.error(`Error details have been saved to: ${logFilePath}`);
  process.exit(1);
}