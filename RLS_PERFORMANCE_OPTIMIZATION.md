# RLS Performance Optimization Strategy

## Current Issues
- RLS policies add 200-500ms latency to database queries
- UI feels sluggish despite optimistic updates
- Balance calculations are particularly slow with complex group structures

## Advanced Solutions to Implement

### 1. Database-Level Optimizations

#### A. Add Strategic Indexes for RLS Queries
```sql
-- Index for user-specific expense queries
CREATE INDEX CONCURRENTLY idx_expenses_user_rls ON expenses(group_id, created_at) 
WHERE group_id IN (SELECT group_id FROM group_members WHERE user_id = current_setting('app.current_user_id')::int);

-- Index for balance calculations
CREATE INDEX CONCURRENTLY idx_expense_participants_balance ON expense_participants(user_id, amount_owed);

-- Composite index for group member checks
CREATE INDEX CONCURRENTLY idx_group_members_user_group ON group_members(user_id, group_id, role);
```

#### B. Optimize RLS Policies with Function-Based Security
```sql
-- Create optimized RLS function
CREATE OR REPLACE FUNCTION user_can_access_group(group_id_param int)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = group_id_param 
    AND user_id = current_setting('app.current_user_id')::int
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update expense RLS policy to use the function
DROP POLICY IF EXISTS expenses_policy ON expenses;
CREATE POLICY expenses_policy ON expenses
FOR ALL TO authenticated
USING (user_can_access_group(group_id))
WITH CHECK (user_can_access_group(group_id));
```

### 2. Application-Level Caching

#### A. Implement Redis Caching Layer
```javascript
// server/cache.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCachedGroupData(groupId, userId) {
  const cacheKey = `group:${groupId}:user:${userId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  return null;
}

export async function setCachedGroupData(groupId, userId, data) {
  const cacheKey = `group:${groupId}:user:${userId}`;
  await redis.setex(cacheKey, 300, JSON.stringify(data)); // 5-minute cache
}
```

#### B. Background Balance Computation
```javascript
// server/workers/balanceWorker.js
export async function scheduleBalanceUpdate(groupId) {
  // Queue balance calculation for background processing
  await balanceQueue.add('updateGroupBalances', { groupId }, {
    delay: 1000, // 1-second delay
    attempts: 3,
    backoff: 'exponential'
  });
}
```

### 3. Database Connection Optimization

#### A. Connection Pooling Configuration
```javascript
// drizzle.config.ts
export default {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production',
  },
  poolConfig: {
    max: 20,        // Maximum pool size
    min: 5,         // Minimum pool size
    idle: 30000,    // Close idle connections after 30s
    acquire: 60000, // Maximum time to acquire connection
  }
};
```

### 4. Query Optimization Strategies

#### A. Batch Database Operations
```javascript
// server/services/expenseService.js
export async function createExpenseWithParticipants(expenseData, participants) {
  return await db.transaction(async (tx) => {
    // Create expense
    const [expense] = await tx.insert(expenses).values(expenseData).returning();
    
    // Batch insert participants
    if (participants.length > 0) {
      await tx.insert(expenseParticipants)
        .values(participants.map(p => ({ ...p, expenseId: expense.id })));
    }
    
    // Schedule balance update (non-blocking)
    scheduleBalanceUpdate(expenseData.groupId);
    
    return expense;
  });
}
```

#### B. Parallel Query Execution
```javascript
// server/routes/groupRoutes.js
app.get('/api/groups/:id', async (req, res) => {
  const groupId = parseInt(req.params.id);
  
  // Execute queries in parallel
  const [group, members, recentExpenses, cachedBalances] = await Promise.all([
    getGroupById(groupId),
    getGroupMembers(groupId),
    getRecentExpenses(groupId, 10), // Only load recent expenses
    getCachedGroupBalances(groupId)
  ]);
  
  res.json({ group, members, recentExpenses, balances: cachedBalances });
});
```

### 5. Frontend Performance Enhancements

#### A. Virtual Scrolling for Large Lists
```javascript
// components/expenses/ExpenseList.tsx
import { FixedSizeList as List } from 'react-window';

export function ExpenseList({ expenses }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ExpenseItem expense={expenses[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={expenses.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

#### B. Debounced Search and Filtering
```javascript
// hooks/useExpenseSearch.ts
import { useDeferredValue, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

export function useExpenseSearch(expenses, searchTerm) {
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const debouncedSearchTerm = useDebounce(deferredSearchTerm, 300);
  
  return useMemo(() => {
    if (!debouncedSearchTerm) return expenses;
    
    return expenses.filter(expense =>
      expense.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [expenses, debouncedSearchTerm]);
}
```

### 6. Monitoring and Performance Tracking

#### A. Database Query Performance Monitoring
```sql
-- Enable query logging for analysis
ALTER SYSTEM SET log_min_duration_statement = 100;
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Create performance monitoring view
CREATE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries taking more than 100ms
ORDER BY mean_time DESC;
```

## Implementation Priority

1. **Immediate (< 1 day)**:
   - Add database indexes for RLS queries
   - Implement query result caching
   - Optimize database connection pooling

2. **Short-term (< 1 week)**:
   - Background balance computation worker
   - Batch database operations
   - Frontend virtual scrolling

3. **Medium-term (< 1 month)**:
   - Redis caching layer
   - Advanced RLS policy optimization
   - Comprehensive performance monitoring

## Expected Performance Improvements

- **Database query time**: 200-500ms → 50-100ms
- **Balance calculation**: 2-4 seconds → 200-500ms
- **UI responsiveness**: Immediate with accurate background sync
- **Concurrent user capacity**: 10x improvement with caching

These optimizations should resolve the RLS performance issues while maintaining security and data integrity.