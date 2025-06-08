# Row Level Security (RLS) Implementation Guide

## Overview
This document outlines the complete Row Level Security implementation for the FairShare expense-sharing application. RLS provides database-level security ensuring users can only access data they're authorized to see.

## Implementation Status

### 1. RLS Enabled Tables
All core application tables now have Row Level Security enabled:

- ✅ `users` - User account information
- ✅ `groups` - Expense sharing groups  
- ✅ `group_members` - Group membership records
- ✅ `group_invites` - Group invitation records
- ✅ `expenses` - Expense records
- ✅ `expense_participants` - Expense participant details
- ✅ `payments` - Payment records
- ✅ `activity_log` - Activity tracking
- ✅ `user_balances_in_group` - User balance summaries
- ✅ `user_balances_between_users` - Inter-user balance tracking
- ✅ `session` - Session management

### 2. Authentication Context Function
Created `get_current_user_id()` function that retrieves the authenticated user ID from session context:

```sql
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(current_setting('app.current_user_id', true)::integer, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. RLS Policies Implemented

#### Users Table
- `select_own_user`: Users can only view their own user record
- `update_own_user`: Users can only update their own user record

#### Groups Table  
- `select_group_for_member`: Users can only view groups they're members of

#### Group Members Table
- `select_own_group_membership`: Users can view their own memberships
- `select_group_members_for_member`: Users can view other members in groups they belong to

#### Group Invites Table
- `select_invites_for_member`: Users can view invites for groups they're members of or created

#### Expenses Table
- `select_expenses_for_member`: Users can only view expenses in groups they're members of

#### Expense Participants Table
- `select_expense_participants_for_member`: Users can view participants for expenses in their groups

#### Payments Table
- `select_payments_for_member`: Users can view payments in groups they're members of

#### Activity Log Table
- `select_activity_for_member`: Users can view activity for groups they're members of

#### Balance Tables
- `select_balances_in_group_for_member`: Users can view balances for groups they're members of
- `select_between_users_for_member`: Users can view their own balance relationships

#### Session Table
- `select_own_session`: Users can only access their own session data

## Integration with Application

### 1. Middleware Integration
Added `setRLSUserContext` middleware that automatically sets the user context for every authenticated request:

```typescript
// Applied to all API routes
app.use('/api/', setRLSUserContext);
```

### 2. Database Context Setting
The `setRLSContext(userId)` function sets the current user ID in the database session:

```typescript
export async function setRLSContext(userId: number) {
  if (!db) return;
  
  try {
    await db.execute(`SET app.current_user_id = '${userId}'`);
  } catch (error) {
    console.error('Failed to set RLS context:', error);
  }
}
```

### 3. Authentication Methods Supported
The RLS system works with multiple authentication methods:
- Session-based authentication (primary)
- Header-based authentication (X-User-Id)
- Backup session authentication

## Security Benefits

### 1. Database-Level Protection
- Even if application logic fails, database enforces access controls
- Prevents data leakage through SQL injection or application bugs
- Ensures multi-tenant data isolation

### 2. Granular Access Control
- Users only see groups they're members of
- Expense data is restricted to group members
- Personal information is protected at the row level

### 3. Audit and Compliance
- Clear separation of data access by user context
- Traceable access patterns through RLS policies
- Meets data privacy requirements

## Testing and Verification

### Test Script
Run `node test-rls-policies.js` to verify:
- RLS is enabled on all tables
- All policies are created and active
- User context function works correctly
- Policy enforcement is functional

### Manual Testing
1. Set user context: `SET app.current_user_id = '1'`
2. Query restricted tables to verify access controls
3. Switch user context and verify different access patterns

## Monitoring and Maintenance

### 1. Policy Updates
When adding new tables:
1. Enable RLS: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
2. Create appropriate policies based on data access patterns
3. Test policies with multiple user contexts

### 2. Performance Considerations
- RLS policies add WHERE clauses to queries
- Monitor query performance with EXPLAIN ANALYZE
- Consider indexes on frequently filtered columns (user_id, group_id)

### 3. Debugging RLS Issues
- Check current user context: `SELECT get_current_user_id()`
- Verify policy conditions match query patterns
- Use `EXPLAIN` to see policy enforcement in query plans

## Migration and Rollback

### Enabling RLS (Applied)
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ... (repeated for all tables)
```

### Disabling RLS (Emergency Rollback)
```sql
-- Disable RLS if needed for emergency access
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)
```

## Best Practices

1. **Always test policies** with multiple user contexts before deploying
2. **Monitor performance** impact of RLS policies on queries
3. **Keep policies simple** to maintain and debug
4. **Document policy logic** for future developers
5. **Regular security audits** of RLS policy effectiveness

## Conclusion

The RLS implementation provides comprehensive database-level security for FairShare, ensuring users can only access data they're authorized to see. The integration with the existing authentication system is seamless and provides multiple layers of security protection.