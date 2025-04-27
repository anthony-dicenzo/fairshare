-- Script to initialize the balance cache tables
-- This ensures the cache is populated with initial values for existing expenses and payments

-- First, delete any existing cached balance data to prevent duplicates
TRUNCATE TABLE user_balances;
TRUNCATE TABLE user_balances_between_users;

-- Now, generate balance data for each group and user
-- We'll need to perform this action after schema changes for better performance

-- Insert a placeholder value for each user in each group they're a member of
-- Later, the application will update these with the correct calculated balances
INSERT INTO user_balances (user_id, group_id, balance_amount, last_updated)
SELECT 
    gm.user_id, 
    gm.group_id, 
    '0', -- Initial balance is 0
    NOW() -- Current timestamp
FROM 
    group_members gm
ON CONFLICT (user_id, group_id) DO NOTHING;

-- Create placeholder entries for user-to-user balances
-- This creates entries for each pair of users in each group
INSERT INTO user_balances_between_users (group_id, from_user_id, to_user_id, balance_amount, last_updated)
SELECT 
    a.group_id,
    a.user_id AS from_user_id,
    b.user_id AS to_user_id,
    '0', -- Initial balance is 0
    NOW() -- Current timestamp
FROM 
    group_members a
JOIN 
    group_members b ON a.group_id = b.group_id AND a.user_id != b.user_id
WHERE 
    a.user_id < b.user_id -- This ensures we only create one entry per pair (undirected)
ON CONFLICT (group_id, from_user_id, to_user_id) DO NOTHING;

-- The application will update these balances when expenses/payments change