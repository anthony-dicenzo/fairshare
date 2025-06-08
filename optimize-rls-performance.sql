-- RLS Performance Optimization: Critical Database Indexes and Policies
-- Execute these queries to improve Row Level Security performance

-- 1. Strategic indexes for RLS-enabled tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_group_created 
ON expenses(group_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expense_participants_user_amount 
ON expense_participants(user_id, amount_owed);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_members_user_group 
ON group_members(user_id, group_id, role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_balances_user_group 
ON balances(user_id, group_id);

-- 2. Optimized RLS function for group access checks
CREATE OR REPLACE FUNCTION user_can_access_group(group_id_param int)
RETURNS boolean AS $$
DECLARE
  user_id_val int;
BEGIN
  -- Get current user ID from RLS context
  user_id_val := current_setting('app.current_user_id', true)::int;
  
  -- Return early if no user context
  IF user_id_val IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is member of the group
  RETURN EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = group_id_param 
    AND user_id = user_id_val
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Create materialized view for frequently accessed group member data
CREATE MATERIALIZED VIEW IF NOT EXISTS group_access_cache AS
SELECT 
  gm.user_id,
  gm.group_id,
  g.name as group_name,
  gm.role,
  gm.created_at
FROM group_members gm
JOIN groups g ON g.id = gm.group_id;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_access_cache_user_group 
ON group_access_cache(user_id, group_id);

-- Function to refresh cache
CREATE OR REPLACE FUNCTION refresh_group_access_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY group_access_cache;
END;
$$ LANGUAGE plpgsql;

-- 4. Optimize expense queries with better RLS policies
DROP POLICY IF EXISTS expenses_policy ON expenses;
CREATE POLICY expenses_policy ON expenses
FOR ALL TO authenticated
USING (user_can_access_group(group_id))
WITH CHECK (user_can_access_group(group_id));

-- 5. Add partial indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_recent 
ON expenses(group_id, created_at DESC, id)
WHERE created_at > (CURRENT_DATE - INTERVAL '30 days');

-- 6. Optimize balance calculation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_balances_calculation 
ON balances(group_id, user_id, balance)
WHERE balance != 0;

-- 7. Performance monitoring view
CREATE VIEW IF NOT EXISTS rls_performance_stats AS
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  n_tup_ins,
  n_tup_upd,
  n_tup_del
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND tablename IN ('expenses', 'expense_participants', 'group_members', 'balances');

-- 8. Enable better query planning for RLS
SET enable_partitionwise_join = on;
SET enable_partitionwise_aggregate = on;
SET work_mem = '256MB';  -- Increase for complex queries
SET random_page_cost = 1.1;  -- Optimize for SSDs

-- 9. Create function for batch balance updates
CREATE OR REPLACE FUNCTION update_group_balances_batch(group_ids int[])
RETURNS void AS $$
DECLARE
  group_id_val int;
BEGIN
  FOREACH group_id_val IN ARRAY group_ids
  LOOP
    -- Update balances for this group efficiently
    WITH expense_totals AS (
      SELECT 
        ep.user_id,
        SUM(ep.amount_owed) as total_owed,
        SUM(CASE WHEN e.paid_by = ep.user_id THEN e.total_amount - ep.amount_owed ELSE 0 END) as total_paid
      FROM expense_participants ep
      JOIN expenses e ON e.id = ep.expense_id
      WHERE e.group_id = group_id_val
      GROUP BY ep.user_id
    )
    UPDATE balances 
    SET balance = COALESCE(et.total_paid, 0) - COALESCE(et.total_owed, 0),
        updated_at = CURRENT_TIMESTAMP
    FROM expense_totals et
    WHERE balances.user_id = et.user_id 
    AND balances.group_id = group_id_val;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 10. Schedule automatic cache refresh (run every 5 minutes)
-- Note: This would typically be handled by a cron job or application scheduler
SELECT cron.schedule('refresh-group-cache', '*/5 * * * *', 'SELECT refresh_group_access_cache();');

COMMIT;