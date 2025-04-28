/**
 * Master script to fix House of Anthica balance issues
 * 
 * This script:
 * 1. Removes all references to "Paubs" from Group "House of Anthica" (group IDs 2 and 3)
 * 2. Recalculates balances for all affected groups
 * 3. Verifies balances are correct
 */

import pg from 'pg';
const { Pool } = pg;

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runCorrections() {
  console.log('\n====== FIX HOUSE OF ANTHICA BALANCE ISSUES ======');
  console.log('Starting correction process...');
  
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Constants
    const PAUBS_USER_ID = 7;
    const PAUBS_USERNAME = 'Paubs';
    const GROUP_IDS = [2, 3]; // Both "House of Anthica" groups
    
    // Step 1: Fix Paubs balance issues
    console.log('\n1. REMOVING REFERENCES TO PAUBS:');
    console.log('----------------------------------');
    
    // 1a. Capture current balances before changes
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
    
    // 1b. Remove all references to Paubs
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
    
    console.log('✅ Successfully removed Paubs references');
    
    // Step 2: Recalculate balances
    console.log('\n2. RECALCULATING BALANCES:');
    console.log('---------------------------');
    
    for (const groupId of GROUP_IDS) {
      console.log(`\nProcessing Group ID ${groupId}...`);
      
      // Get group info
      const groupResult = await client.query(`
        SELECT id, name FROM groups WHERE id = $1
      `, [groupId]);
      
      if (groupResult.rows.length === 0) {
        console.log(`Group ${groupId} not found, skipping...`);
        continue;
      }
      
      const groupName = groupResult.rows[0].name;
      console.log(`Group: ${groupName} (ID: ${groupId})`);
      
      // Get active members
      const membersResult = await client.query(`
        SELECT gm.user_id, u.username, u.name 
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = $1 AND gm.archived = false
      `, [groupId]);
      
      if (membersResult.rows.length === 0) {
        console.log(`No active members found for group ${groupId}, skipping...`);
        continue;
      }
      
      // Process one user at a time
      for (const member of membersResult.rows) {
        const userId = member.user_id;
        
        // 1. Get all expenses in the group
        const expensesResult = await client.query(`
          SELECT e.id, e.title, e.paid_by, e.total_amount
          FROM expenses e
          WHERE e.group_id = $1
        `, [groupId]);
        
        // 2. Get all expense participants
        const expenseIds = expensesResult.rows.map(e => e.id);
        
        let participantsResult = { rows: [] };
        if (expenseIds.length > 0) {
          participantsResult = await client.query(`
            SELECT ep.expense_id, ep.user_id, ep.amount_owed
            FROM expense_participants ep
            WHERE ep.expense_id = ANY($1)
          `, [expenseIds]);
        }
        
        // 3. Get all payments in the group
        const paymentsResult = await client.query(`
          SELECT p.id, p.paid_by, p.paid_to, p.amount
          FROM payments p
          WHERE p.group_id = $1
        `, [groupId]);
        
        // 4. Calculate balance for this user
        let userBalance = 0;
        
        // Process expenses
        for (const expense of expensesResult.rows) {
          const expenseId = expense.id;
          const paidBy = expense.paid_by;
          const participants = participantsResult.rows.filter(p => p.expense_id === expenseId);
          
          // If the user paid for this expense
          if (paidBy === userId) {
            // Calculate how much others owe to this user
            const amountOthersOwe = participants
              .filter(p => p.user_id !== userId)
              .reduce((sum, p) => sum + parseFloat(p.amount_owed), 0);
            
            userBalance += amountOthersOwe;
          } 
          // If the user is a participant but didn't pay
          else {
            const userParticipant = participants.find(p => p.user_id === userId);
            if (userParticipant) {
              userBalance -= parseFloat(userParticipant.amount_owed);
            }
          }
        }
        
        // Process payments
        for (const payment of paymentsResult.rows) {
          // If the user made the payment
          if (payment.paid_by === userId) {
            userBalance += parseFloat(payment.amount);
          }
          // If the user received the payment
          else if (payment.paid_to === userId) {
            userBalance -= parseFloat(payment.amount);
          }
        }
        
        // 5. Update or insert the balance in the database
        await client.query(`
          INSERT INTO user_balances (user_id, group_id, balance_amount, last_updated)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (user_id, group_id) 
          DO UPDATE SET balance_amount = $3, last_updated = NOW()
        `, [userId, groupId, userBalance]);
        
        console.log(`Updated balance for user ${member.username} to $${userBalance}`);
      }
    }
    
    console.log('✅ Successfully recalculated balances');
    
    // Step 3: Verify final state
    console.log('\n3. FINAL VERIFICATION:');
    console.log('----------------------');
    
    // Verify Paubs is completely removed
    console.log('\nVerifying Paubs has been completely removed:');
    
    const remainingMemberships = await client.query(`
      SELECT COUNT(*) as count FROM group_members
      WHERE user_id = $1 AND group_id = ANY($2)
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    if (remainingMemberships.rows[0].count === '0') {
      console.log('✅ No group memberships found for Paubs');
    } else {
      console.log(`⚠️ Found ${remainingMemberships.rows[0].count} remaining group memberships for Paubs`);
    }
    
    const remainingBalances = await client.query(`
      SELECT COUNT(*) as count FROM user_balances
      WHERE user_id = $1 AND group_id = ANY($2)
    `, [PAUBS_USER_ID, GROUP_IDS]);
    
    if (remainingBalances.rows[0].count === '0') {
      console.log('✅ No balances found for Paubs');
    } else {
      console.log(`⚠️ Found ${remainingBalances.rows[0].count} remaining balance records for Paubs`);
    }
    
    // Verify group balances sum to zero
    console.log('\nVerifying group balances sum to zero:');
    
    for (const groupId of GROUP_IDS) {
      const groupBalances = await client.query(`
        SELECT ub.user_id, u.username, ub.balance_amount
        FROM user_balances ub
        JOIN users u ON ub.user_id = u.id
        WHERE ub.group_id = $1
      `, [groupId]);
      
      const groupInfo = await client.query(`
        SELECT name FROM groups WHERE id = $1 LIMIT 1
      `, [groupId]);
      
      const groupName = groupInfo.rows.length > 0 ? groupInfo.rows[0].name : `Unknown (ID: ${groupId})`;
      
      // Calculate sum of balances
      let totalBalance = 0;
      for (const balance of groupBalances.rows) {
        totalBalance += parseFloat(balance.balance_amount);
      }
      
      const isBalanced = Math.abs(totalBalance) < 0.01;
      
      console.log(`\nGroup: ${groupName} (ID: ${groupId})`);
      console.log(`Members with balances: ${groupBalances.rows.length}`);
      groupBalances.rows.forEach(b => {
        console.log(`- ${b.username}: $${b.balance_amount}`);
      });
      console.log(`Sum of balances: $${totalBalance.toFixed(2)}`);
      
      if (isBalanced) {
        console.log('✅ Group is properly balanced (sum ≈ 0)');
      } else {
        console.log('⚠️ Group is NOT balanced (sum ≠ 0)');
      }
    }
    
    // Verify other users' balances are unchanged or notify of any changes
    console.log('\nVerifying other users\' balances:');
    
    const afterBalancesResult = await client.query(`
      SELECT ub.user_id, u.username, ub.group_id, g.name as group_name, ub.balance_amount
      FROM user_balances ub
      JOIN users u ON ub.user_id = u.id
      JOIN groups g ON ub.group_id = g.id
      WHERE ub.group_id = ANY($1) AND ub.user_id != $2
    `, [GROUP_IDS, PAUBS_USER_ID]);
    
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
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('\n====== CORRECTION PROCESS COMPLETED ======');
    return { 
      success: true, 
      message: 'Successfully fixed House of Anthica balance issues'
    };
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Unexpected error during correction process:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

// Run the master correction script if called directly
runCorrections()
  .then(result => {
    console.log('\nFinal result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => {
    // Close the pool and exit
    pool.end();
  });