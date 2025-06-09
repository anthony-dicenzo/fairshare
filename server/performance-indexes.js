/**
 * Performance optimization indexes for sub-100ms query performance
 */
import { db } from './db.js';
import { sql } from 'drizzle-orm';

export async function createPerformanceIndexes() {
  console.log('Creating performance-optimized database indexes...');
  
  try {
    // Covering index for expense lookups by group
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_expenses_gid_created
        ON expenses (group_id, created_at DESC)
    `);

    // Partial index for active group members only
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_group_members_active
        ON group_members (group_id, user_id)
        WHERE archived = false
    `);

    // Index for user balance lookups in the materialized view
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_dashboard_balances_user_expense
        ON dashboard_balances (user_id, last_expense_at DESC NULLS LAST)
    `);

    // Index for user_balances table performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_balances_user_group
        ON user_balances (user_id, group_id)
    `);

    // Compound index for group membership lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_group_members_user_archived
        ON group_members (user_id, archived)
    `);

    console.log('✅ Performance indexes created successfully');
  } catch (error) {
    console.error('Error creating performance indexes:', error);
  }
}

export async function refreshDashboardView() {
  try {
    console.log('Refreshing dashboard_balances materialized view...');
    await db.execute(sql`REFRESH MATERIALIZED VIEW dashboard_balances`);
    console.log('✅ Dashboard materialized view refreshed');
  } catch (error) {
    console.error('Error refreshing materialized view:', error);
  }
}