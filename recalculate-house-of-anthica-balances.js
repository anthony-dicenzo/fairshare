/**
 * Script to recalculate balances for House of Anthica groups
 * 
 * This script directly updates balances in the database using similar logic
 * to what's in storage.updateAllBalancesInGroup
 */

import pg from 'pg';
const { Pool } = pg;

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Log script start
console.log('\n====== RECALCULATING HOUSE OF ANTHICA BALANCES ======');
console.log('Purpose: Recalculate balances for House of Anthica groups (IDs 2 and 3)');
console.log('Timestamp:', new Date().toISOString());
console.log('====================================================\n');

// Main function to recalculate balances
async function recalculateBalances() {
  const client = await pool.connect();
  
  try {
    const GROUP_IDS = [2, 3]; // Both "House of Anthica" groups
    
    for (const groupId of GROUP_IDS) {
      console.log(`\n==== Processing Group ID ${groupId} ====`);
      
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
      
      console.log(`Found ${membersResult.rows.length} active members:`);
      for (const member of membersResult.rows) {
        console.log(`  - ${member.name} (${member.username}), ID: ${member.user_id}`);
      }
      
      // Get current balances for reference
      const currentBalancesResult = await client.query(`
        SELECT ub.user_id, u.username, ub.balance_amount
        FROM user_balances ub
        JOIN users u ON ub.user_id = u.id
        WHERE ub.group_id = $1
      `, [groupId]);
      
      console.log('\nCurrent balances:');
      const currentBalances = {};
      for (const balance of currentBalancesResult.rows) {
        currentBalances[balance.user_id] = parseFloat(balance.balance_amount);
        console.log(`  - ${balance.username} (ID: ${balance.user_id}): $${balance.balance_amount}`);
      }
      
      // Start recalculation for each user
      console.log('\nRecalculating balances...');
      
      // Process one user at a time
      for (const member of membersResult.rows) {
        const userId = member.user_id;
        
        // 1. Get all expenses in the group
        const expensesResult = await client.query(`
          SELECT e.id, e.title, e.paid_by, e.total_amount
          FROM expenses e
          WHERE e.group_id = $1
        `, [groupId]);
        
        console.log(`Found ${expensesResult.rows.length} expenses in group ${groupId}`);
        
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
        
        console.log(`Found ${paymentsResult.rows.length} payments in group ${groupId}`);
        
        // 4. Calculate balance for this user
        let userBalance = 0;
        
        // Process expenses
        for (const expense of expensesResult.rows) {
          const expenseId = expense.id;
          const paidBy = expense.paid_by;
          const participants = participantsResult.rows.filter(p => p.expense_id === expenseId);
          
          console.log(`Processing expense #${expenseId} (${expense.title}) - Paid by: ${paidBy}`);
          
          // If the user paid for this expense
          if (paidBy === userId) {
            // Calculate how much others owe to this user
            const amountOthersOwe = participants
              .filter(p => p.user_id !== userId)
              .reduce((sum, p) => sum + parseFloat(p.amount_owed), 0);
            
            userBalance += amountOthersOwe;
            console.log(`  ${member.username} paid for expense - others owe: $${amountOthersOwe}`);
          } 
          // If the user is a participant but didn't pay
          else {
            const userParticipant = participants.find(p => p.user_id === userId);
            if (userParticipant) {
              userBalance -= parseFloat(userParticipant.amount_owed);
              console.log(`  ${member.username} owes: $${userParticipant.amount_owed} for expense paid by ${paidBy}`);
            }
          }
          
          console.log(`  Balance updated: $${userBalance}`);
        }
        
        // Process payments
        for (const payment of paymentsResult.rows) {
          console.log(`Processing payment #${payment.id} - $${payment.amount} from ${payment.paid_by} to ${payment.paid_to}`);
          
          // If the user made the payment
          if (payment.paid_by === userId) {
            userBalance += parseFloat(payment.amount);
            console.log(`  ${member.username} made payment: +$${payment.amount}`);
          }
          // If the user received the payment
          else if (payment.paid_to === userId) {
            userBalance -= parseFloat(payment.amount);
            console.log(`  ${member.username} received payment: -$${payment.amount}`);
          }
          
          console.log(`  Balance updated: $${userBalance}`);
        }
        
        console.log(`Final balance for user ${member.username}: $${userBalance}`);
        
        // 5. Update or insert the balance in the database
        const updateResult = await client.query(`
          INSERT INTO user_balances (user_id, group_id, balance_amount, last_updated)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (user_id, group_id) 
          DO UPDATE SET balance_amount = $3, last_updated = NOW()
          RETURNING *
        `, [userId, groupId, userBalance]);
        
        console.log(`Updated balance for user ${member.username} in group ${groupId}: ${updateResult.rows[0].balance_amount}`);
      }
      
      // Get updated balances
      const updatedBalancesResult = await client.query(`
        SELECT ub.user_id, u.username, ub.balance_amount
        FROM user_balances ub
        JOIN users u ON ub.user_id = u.id
        WHERE ub.group_id = $1
      `, [groupId]);
      
      console.log('\nUpdated balances:');
      let totalBalance = 0;
      for (const balance of updatedBalancesResult.rows) {
        const balanceAmount = parseFloat(balance.balance_amount);
        totalBalance += balanceAmount;
        console.log(`  - ${balance.username} (ID: ${balance.user_id}): $${balanceAmount}`);
      }
      
      console.log(`\nTotal balance for group: $${totalBalance.toFixed(2)}`);
      
      // Check if total balance is (approximately) zero
      if (Math.abs(totalBalance) < 0.01) {
        console.log('✅ Group is properly balanced (sum ≈ 0)');
      } else {
        console.log('⚠️ Group balances do not sum to zero - possible data inconsistency');
      }
      
      console.log(`\n==== Finished processing Group ${groupName} ====`);
    }
    
    console.log('\n====== BALANCE RECALCULATION COMPLETED ======');
    return { success: true };
  } catch (error) {
    console.error('ERROR DURING BALANCE RECALCULATION:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

// Run the recalculation
recalculateBalances()
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