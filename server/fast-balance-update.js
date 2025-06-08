/**
 * High-performance balance calculation using optimized SQL queries
 * Replaces the slow iterative approach with efficient bulk operations
 */

const { db } = require('./storage');
const { balanceCache, groupMembers, expenses, expenseParticipants, payments } = require('../shared/schema');
const { eq, sql } = require('drizzle-orm');

async function updateGroupBalancesFast(groupId) {
  const startTime = Date.now();
  console.log(`Starting fast balance update for group ${groupId}`);

  try {
    // Single SQL query to calculate all balances efficiently
    const balanceQuery = sql`
      WITH expense_balances AS (
        SELECT 
          gm.user_id,
          COALESCE(SUM(
            CASE 
              WHEN e.paid_by = gm.user_id THEN 
                e.total_amount::decimal - COALESCE(ep.amount_owed::decimal, 0)
              ELSE 
                -COALESCE(ep.amount_owed::decimal, 0)
            END
          ), 0) as expense_balance
        FROM group_members gm
        LEFT JOIN expenses e ON e.group_id = gm.group_id
        LEFT JOIN expense_participants ep ON ep.expense_id = e.id AND ep.user_id = gm.user_id
        WHERE gm.group_id = ${groupId} AND gm.archived = false
        GROUP BY gm.user_id
      ),
      payment_balances AS (
        SELECT 
          gm.user_id,
          COALESCE(SUM(
            CASE 
              WHEN p.paid_to = gm.user_id THEN -p.amount::decimal
              WHEN p.paid_by = gm.user_id THEN p.amount::decimal
              ELSE 0
            END
          ), 0) as payment_balance
        FROM group_members gm
        LEFT JOIN payments p ON p.group_id = gm.group_id AND (p.paid_to = gm.user_id OR p.paid_by = gm.user_id)
        WHERE gm.group_id = ${groupId} AND gm.archived = false
        GROUP BY gm.user_id
      )
      SELECT 
        eb.user_id,
        (eb.expense_balance + COALESCE(pb.payment_balance, 0)) as final_balance
      FROM expense_balances eb
      LEFT JOIN payment_balances pb ON eb.user_id = pb.user_id
    `;

    const results = await db.execute(balanceQuery);
    
    // Batch update balance cache
    const updatePromises = results.map(async (row) => {
      const userId = row.user_id;
      const balance = parseFloat(row.final_balance) || 0;
      
      await db
        .insert(balanceCache)
        .values({
          groupId,
          userId,
          balance: balance.toString()
        })
        .onConflictDoUpdate({
          target: [balanceCache.groupId, balanceCache.userId],
          set: {
            balance: balance.toString(),
            updatedAt: sql`CURRENT_TIMESTAMP`
          }
        });
    });

    await Promise.all(updatePromises);
    
    const duration = Date.now() - startTime;
    console.log(`Fast balance update completed for group ${groupId} in ${duration}ms`);
    
    return { success: true, duration, updatedUsers: results.length };
  } catch (error) {
    console.error(`Fast balance update failed for group ${groupId}:`, error);
    throw error;
  }
}

module.exports = { updateGroupBalancesFast };