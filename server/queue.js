import Queue from 'bull';
import { db } from './db.js';
import { expenses, expenseParticipants, groupMembers } from '../shared/schema.js';
import { eq, sql, and } from 'drizzle-orm';
import { setCachedBalances, invalidateBalanceCache } from './cache.js';

// Initialize Redis-backed job queue
const balanceQueue = new Queue('balance calculation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// Background balance calculation worker
balanceQueue.process('updateGroupBalances', async (job) => {
  const { groupId } = job.data;
  
  try {
    console.log(`🔄 Background balance calculation for group ${groupId}`);
    
    // Use optimized query with new indexes
    const balanceData = await db.execute(sql`
      WITH expense_calculations AS (
        SELECT 
          ep.user_id,
          SUM(ep.amount_owed) as total_owed,
          SUM(CASE WHEN e.paid_by = ep.user_id THEN e.total_amount - ep.amount_owed ELSE 0 END) as total_paid
        FROM expense_participants ep
        JOIN expenses e ON e.id = ep.expense_id
        WHERE e.group_id = ${groupId}
        GROUP BY ep.user_id
      ),
      group_user_list AS (
        SELECT user_id FROM group_members WHERE group_id = ${groupId}
      )
      SELECT 
        gul.user_id,
        COALESCE(ec.total_paid, 0) - COALESCE(ec.total_owed, 0) as balance
      FROM group_user_list gul
      LEFT JOIN expense_calculations ec ON ec.user_id = gul.user_id
    `);
    
    // Cache the calculated balances
    const balances = balanceData.rows.map(row => ({
      userId: row.user_id,
      balance: row.balance.toString(),
      groupId: groupId
    }));
    
    await setCachedBalances(groupId, balances, 600); // 10-minute cache
    
    console.log(`✅ Background balance calculation complete for group ${groupId}`);
    
    return { groupId, balancesUpdated: balances.length };
    
  } catch (error) {
    console.error(`❌ Balance calculation failed for group ${groupId}:`, error);
    throw error;
  }
});

// Queue management functions
export async function scheduleBalanceUpdate(groupId, delay = 1000) {
  try {
    // Remove any existing jobs for this group to prevent duplicates
    try {
      await balanceQueue.clean(0, 'waiting');
    } catch (cleanError) {
      console.warn('Queue clean failed, continuing with balance update:', cleanError.message);
    }
    
    // Schedule new balance calculation
    await balanceQueue.add('updateGroupBalances', { groupId }, {
      delay,
      attempts: 3,
      backoff: 'exponential',
      jobId: `balance-${groupId}`, // Unique ID to prevent duplicates
    });
    
    console.log(`📋 Scheduled balance update for group ${groupId} (delay: ${delay}ms)`);
  } catch (error) {
    console.error('Failed to schedule balance update:', error);
    // Fallback: attempt direct balance update
    try {
      console.log(`🔄 Attempting direct balance update for group ${groupId}`);
      const { storage } = await import('./storage.js');
      await storage.updateAllBalancesInGroup(groupId);
      console.log(`✅ Direct balance update completed for group ${groupId}`);
    } catch (fallbackError) {
      console.error('Direct balance update also failed:', fallbackError);
    }
  }
}

export async function getQueueStats() {
  const waiting = await balanceQueue.getWaiting();
  const active = await balanceQueue.getActive();
  const completed = await balanceQueue.getCompleted();
  const failed = await balanceQueue.getFailed();
  
  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
  };
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await balanceQueue.close();
});

export default balanceQueue;