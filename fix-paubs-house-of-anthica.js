/**
 * Data correction script to remove all references to "Paubs" from Group "House of Anthica"
 * 
 * This script directly uses the database connection to execute SQL queries,
 * rather than going through the ORM layer.
 */

// Import directly from node_modules
import pg from 'pg';
const { Pool } = pg;

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Log script start
console.log('\n====== STARTING HOUSE OF ANTHICA DATA CORRECTION ======');
console.log('Purpose: Remove all references to "Paubs" (user ID 7) from House of Anthica groups');
console.log('Timestamp:', new Date().toISOString());
console.log('====================================================\n');

// Main function to execute all data corrections
async function runCorrection() {
  const client = await pool.connect();
  
  try {
    // Start a transaction for atomicity
    await client.query('BEGIN');
    
    // Constants for the script
    const PAUBS_USER_ID = 7;
    const PAUBS_USERNAME = 'Paubs';
    const GROUP_IDS = [2, 3]; // Both "House of Anthica" groups
    
    console.log(`Target user: ${PAUBS_USERNAME} (ID: ${PAUBS_USER_ID})`);
    console.log(`Target groups: ${GROUP_IDS.join(', ')}`);
    
    // 1. Capture the current balances before changes (for verification)
    console.log('\n1. Capturing current balances before changes...');
    
    const beforeBalancesResult = await client.query(`
      SELECT ub.user_id, u.username, ub.group_id, g.name as group_name, ub.balance_amount
      FROM user_balances ub
      JOIN users u ON ub.user_id = u.id
      JOIN groups g ON ub.group_id = g.id
      WHERE ub.group_id = ANY($1)
    `, [GROUP_IDS]);
    
    // Map balances by group and user for later comparison
    const beforeBalances = {};
    for (const balance of beforeBalancesResult.rows) {
      const groupId = balance.group_id;
      const userId = balance.user_id;
      
      if (!beforeBalances[groupId]) {
        beforeBalances[groupId] = {};
      }
      
      beforeBalances[groupId][userId] = {
        username: balance.username,
        groupName: balance.group_name,
        balance: parseFloat(balance.balance_amount)
      };
    }
    
    console.log('Current balances by group:');
    for (const groupId of Object.keys(beforeBalances)) {
      console.log(`Group ${groupId} (${beforeBalances[groupId][Object.keys(beforeBalances[groupId])[0]]?.groupName}):`);
      
      for (const userId of Object.keys(beforeBalances[groupId])) {
        const { username, balance } = beforeBalances[groupId][userId];
        console.log(`  - ${username} (ID: ${userId}): $${balance}`);
      }
    }
    
    // 2. Check if Paubs exists in these groups
    console.log('\n2. Checking for Paubs in these groups...');
    
    const membershipResult = await client.query(`
      SELECT gm.id, gm.group_id, g.name as group_name, gm.archived 
      FROM group_members gm
      JOIN groups g ON gm.group_id = g.id
      WHERE gm.user_id = $1 AND gm.group_id = ANY($2)
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    if (membershipResult.rows.length === 0) {
      console.log(`✓ No memberships found for ${PAUBS_USERNAME} in House of Anthica groups`);
    } else {
      console.log(`Found ${membershipResult.rows.length} memberships for ${PAUBS_USERNAME}:`);
      membershipResult.rows.forEach(row => {
        console.log(`  - Group ${row.group_id} (${row.group_name}), Archived: ${row.archived}`);
      });
    }
    
    // 3. Check for Paubs in expense participants
    console.log('\n3. Checking for Paubs in expense participants...');
    
    const expenseParticipantsResult = await client.query(`
      SELECT ep.id, ep.expense_id, e.title, e.group_id, g.name as group_name, ep.amount_owed
      FROM expense_participants ep
      JOIN expenses e ON ep.expense_id = e.id
      JOIN groups g ON e.group_id = g.id
      WHERE ep.user_id = $1 AND e.group_id = ANY($2)
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    if (expenseParticipantsResult.rows.length === 0) {
      console.log(`✓ No expense participants found for ${PAUBS_USERNAME}`);
    } else {
      console.log(`Found ${expenseParticipantsResult.rows.length} expense participants for ${PAUBS_USERNAME}:`);
      for (const row of expenseParticipantsResult.rows) {
        console.log(`  - Expense ${row.expense_id} (${row.title}) in Group ${row.group_id} (${row.group_name}): $${row.amount_owed}`);
      }
    }
    
    // 4. Check for expenses paid by Paubs
    console.log('\n4. Checking for expenses paid by Paubs...');
    
    const expensesResult = await client.query(`
      SELECT e.id, e.title, e.group_id, g.name as group_name, e.total_amount
      FROM expenses e
      JOIN groups g ON e.group_id = g.id
      WHERE e.paid_by = $1 AND e.group_id = ANY($2)
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    if (expensesResult.rows.length === 0) {
      console.log(`✓ No expenses paid by ${PAUBS_USERNAME}`);
    } else {
      console.log(`Found ${expensesResult.rows.length} expenses paid by ${PAUBS_USERNAME}:`);
      for (const row of expensesResult.rows) {
        console.log(`  - Expense ${row.id} (${row.title}) in Group ${row.group_id} (${row.group_name}): $${row.total_amount}`);
      }
    }
    
    // 5. Check for payments involving Paubs
    console.log('\n5. Checking for payments involving Paubs...');
    
    const paymentsResult = await client.query(`
      SELECT p.id, p.group_id, g.name as group_name, 
             u1.username as paid_by_username, u2.username as paid_to_username,
             p.amount
      FROM payments p
      JOIN groups g ON p.group_id = g.id
      JOIN users u1 ON p.paid_by = u1.id
      JOIN users u2 ON p.paid_to = u2.id
      WHERE (p.paid_by = $1 OR p.paid_to = $1) AND p.group_id = ANY($2)
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    if (paymentsResult.rows.length === 0) {
      console.log(`✓ No payments involving ${PAUBS_USERNAME}`);
    } else {
      console.log(`Found ${paymentsResult.rows.length} payments involving ${PAUBS_USERNAME}:`);
      for (const row of paymentsResult.rows) {
        console.log(`  - Payment ${row.id} in Group ${row.group_id} (${row.group_name}): ${row.paid_by_username} paid $${row.amount} to ${row.paid_to_username}`);
      }
    }
    
    // 6. Check for balances involving Paubs
    console.log('\n6. Checking for balances involving Paubs...');
    
    const balancesResult = await client.query(`
      SELECT ub.id, ub.group_id, g.name as group_name, ub.balance_amount
      FROM user_balances ub
      JOIN groups g ON ub.group_id = g.id
      WHERE ub.user_id = $1 AND ub.group_id = ANY($2)
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    if (balancesResult.rows.length === 0) {
      console.log(`✓ No balances found for ${PAUBS_USERNAME}`);
    } else {
      console.log(`Found ${balancesResult.rows.length} balances for ${PAUBS_USERNAME}:`);
      for (const row of balancesResult.rows) {
        console.log(`  - Balance in Group ${row.group_id} (${row.group_name}): $${row.balance_amount}`);
      }
    }
    
    // 7. Check for balances between users involving Paubs
    console.log('\n7. Checking for balances between users involving Paubs...');
    
    const balancesBetweenResult = await client.query(`
      SELECT ubb.id, ubb.group_id, g.name as group_name, 
             u1.username as from_username, u2.username as to_username,
             ubb.balance_amount
      FROM user_balances_between_users ubb
      JOIN groups g ON ubb.group_id = g.id
      JOIN users u1 ON ubb.from_user_id = u1.id
      JOIN users u2 ON ubb.to_user_id = u2.id
      WHERE (ubb.from_user_id = $1 OR ubb.to_user_id = $1) AND ubb.group_id = ANY($2)
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    if (balancesBetweenResult.rows.length === 0) {
      console.log(`✓ No balances between users involving ${PAUBS_USERNAME}`);
    } else {
      console.log(`Found ${balancesBetweenResult.rows.length} balances between users involving ${PAUBS_USERNAME}:`);
      for (const row of balancesBetweenResult.rows) {
        console.log(`  - Balance in Group ${row.group_id} (${row.group_name}): ${row.from_username} owes ${row.to_username} $${row.balance_amount}`);
      }
    }
    
    // 8. Check for activity logs involving Paubs
    console.log('\n8. Checking for activity logs involving Paubs...');
    
    const activityResult = await client.query(`
      SELECT COUNT(*) as count
      FROM activity_log
      WHERE user_id = $1 AND group_id = ANY($2)
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    console.log(`Found ${activityResult.rows[0].count} activity logs involving ${PAUBS_USERNAME}`);
    
    // 9. Now, perform the actual data deletion
    console.log('\n9. DELETING DATA FOR PAUBS...');
    
    // a. Delete expense participants
    let result = await client.query(`
      DELETE FROM expense_participants 
      WHERE user_id = $1 AND expense_id IN (
        SELECT id FROM expenses WHERE group_id = ANY($2)
      )
      RETURNING id
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    console.log(`Deleted ${result.rowCount} expense participants`);
    
    // b. Delete expenses paid by Paubs
    result = await client.query(`
      DELETE FROM expenses
      WHERE paid_by = $1 AND group_id = ANY($2)
      RETURNING id
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    console.log(`Deleted ${result.rowCount} expenses`);
    
    // c. Delete payments involving Paubs
    result = await client.query(`
      DELETE FROM payments
      WHERE (paid_by = $1 OR paid_to = $1) AND group_id = ANY($2)
      RETURNING id
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    console.log(`Deleted ${result.rowCount} payments`);
    
    // d. Delete balances for Paubs
    result = await client.query(`
      DELETE FROM user_balances
      WHERE user_id = $1 AND group_id = ANY($2)
      RETURNING id
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    console.log(`Deleted ${result.rowCount} user balances`);
    
    // e. Delete balances between users involving Paubs
    result = await client.query(`
      DELETE FROM user_balances_between_users
      WHERE (from_user_id = $1 OR to_user_id = $1) AND group_id = ANY($2)
      RETURNING id
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    console.log(`Deleted ${result.rowCount} balances between users`);
    
    // f. Delete group memberships
    result = await client.query(`
      DELETE FROM group_members
      WHERE user_id = $1 AND group_id = ANY($2)
      RETURNING id
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    console.log(`Deleted ${result.rowCount} group memberships`);
    
    // g. Add an activity log entry to record this action
    for (const groupId of GROUP_IDS) {
      await client.query(`
        INSERT INTO activity_log (
          group_id, user_id, action_type, metadata
        ) VALUES (
          $1, 1, 'data_correction', $2
        )
      `, [
        groupId, 
        JSON.stringify({
          description: `Removed all data for user ${PAUBS_USERNAME} (ID: ${PAUBS_USER_ID}) from group`,
          timestamp: new Date().toISOString()
        })
      ]);
    }
    
    console.log(`Added ${GROUP_IDS.length} activity log entries`);
    
    // 10. Recalculate balances for all affected groups
    console.log('\n10. RECALCULATING BALANCES...');
    
    // We can't directly call storage.updateAllBalancesInGroup, so we need to trigger a refresh via the API
    // For now, let's just log that this should be done
    console.log('Balance recalculation should be done manually by calling the following API endpoints:');
    for (const groupId of GROUP_IDS) {
      console.log(`  - POST /api/groups/${groupId}/refresh-balances`);
    }
    
    // 11. Verify all data has been removed
    console.log('\n11. VERIFYING PAUBS IS FULLY REMOVED...');
    
    let allClean = true;
    
    // Check membership
    result = await client.query(`
      SELECT COUNT(*) as count FROM group_members
      WHERE user_id = $1 AND group_id = ANY($2)
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    if (result.rows[0].count === '0') {
      console.log('✓ No memberships remain');
    } else {
      console.log(`❌ Still found ${result.rows[0].count} memberships`);
      allClean = false;
    }
    
    // Check balances
    result = await client.query(`
      SELECT COUNT(*) as count FROM user_balances
      WHERE user_id = $1 AND group_id = ANY($2)
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    if (result.rows[0].count === '0') {
      console.log('✓ No balances remain');
    } else {
      console.log(`❌ Still found ${result.rows[0].count} balances`);
      allClean = false;
    }
    
    // Check balances between users
    result = await client.query(`
      SELECT COUNT(*) as count FROM user_balances_between_users
      WHERE (from_user_id = $1 OR to_user_id = $1) AND group_id = ANY($2)
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    if (result.rows[0].count === '0') {
      console.log('✓ No balances between users remain');
    } else {
      console.log(`❌ Still found ${result.rows[0].count} balances between users`);
      allClean = false;
    }
    
    // Check expenses and expense participants
    result = await client.query(`
      SELECT COUNT(*) as count FROM expenses
      WHERE paid_by = $1 AND group_id = ANY($2)
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    if (result.rows[0].count === '0') {
      console.log('✓ No expenses remain');
    } else {
      console.log(`❌ Still found ${result.rows[0].count} expenses`);
      allClean = false;
    }
    
    result = await client.query(`
      SELECT COUNT(*) as count FROM expense_participants
      WHERE user_id = $1 AND expense_id IN (
        SELECT id FROM expenses WHERE group_id = ANY($2)
      )
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    if (result.rows[0].count === '0') {
      console.log('✓ No expense participants remain');
    } else {
      console.log(`❌ Still found ${result.rows[0].count} expense participants`);
      allClean = false;
    }
    
    // Check payments
    result = await client.query(`
      SELECT COUNT(*) as count FROM payments
      WHERE (paid_by = $1 OR paid_to = $1) AND group_id = ANY($2)
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    if (result.rows[0].count === '0') {
      console.log('✓ No payments remain');
    } else {
      console.log(`❌ Still found ${result.rows[0].count} payments`);
      allClean = false;
    }
    
    // 12. Commit the transaction if all is well
    if (allClean) {
      await client.query('COMMIT');
      console.log('\n✅ Transaction committed successfully! All references to Paubs have been removed.');
    } else {
      await client.query('ROLLBACK');
      console.log('\n❌ Transaction rolled back due to incomplete data removal!');
      throw new Error('Failed to completely remove Paubs from House of Anthica groups');
    }
    
    // 13. Verify other users' balances are unchanged
    console.log('\n12. VERIFYING OTHER USERS\' BALANCES...');
    
    const afterBalancesResult = await client.query(`
      SELECT ub.user_id, u.username, ub.group_id, g.name as group_name, ub.balance_amount
      FROM user_balances ub
      JOIN users u ON ub.user_id = u.id
      JOIN groups g ON ub.group_id = g.id
      WHERE ub.group_id = ANY($1) AND ub.user_id != $2
    `, [GROUP_IDS, PAUBS_USER_ID]);
    
    console.log('Current balances after changes:');
    
    for (const balance of afterBalancesResult.rows) {
      const groupId = balance.group_id;
      const userId = balance.user_id;
      const username = balance.username;
      const currentBalance = parseFloat(balance.balance_amount);
      
      const previousBalance = beforeBalances[groupId]?.[userId]?.balance || 0;
      const balanceChanged = Math.abs(previousBalance - currentBalance) > 0.01;
      
      console.log(`Group ${groupId} (${balance.group_name}), User ${username} (ID: ${userId}):`);
      console.log(`  Before: $${previousBalance}, After: $${currentBalance}, ${balanceChanged ? '❌ CHANGED' : '✓ UNCHANGED'}`);
    }
    
    console.log('\n====== DATA CORRECTION COMPLETED SUCCESSFULLY ======');
    console.log('Next steps:');
    console.log('1. Call the balance recalculation API endpoints');
    console.log('2. Verify all user balances are correct in the application');
    console.log('====================================================');
    
    return { success: true };
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('\n❌ ERROR DURING DATA CORRECTION:', error);
    console.log('Transaction rolled back');
    return { success: false, error: error.message };
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the correction
runCorrection()
  .then(result => {
    if (result.success) {
      console.log('\nScript completed successfully!');
    } else {
      console.error('\nScript failed:', result.error);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => {
    // Close the pool and exit
    pool.end();
  });