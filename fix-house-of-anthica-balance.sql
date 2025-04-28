-- Fix incorrect balance in the "House of Anthica" group

-- First, check the current balances
SELECT * FROM user_balances WHERE group_id = 2;

-- Update user with ID 2 (adicenzo) to have the correct balance of -1834.32
UPDATE user_balances 
SET balance_amount = '-1834.32' 
WHERE user_id = 2 AND group_id = 2;

-- Update user with ID 10 (Jes) to have the opposite balance (equal and opposite)
UPDATE user_balances 
SET balance_amount = '1834.32' 
WHERE user_id = 10 AND group_id = 2;

-- Verify the updated balances
SELECT * FROM user_balances WHERE group_id = 2;

-- Also check the user_balances_between_users table to ensure it's consistent
SELECT * FROM user_balances_between_users WHERE group_id = 2;

-- Update the direct balances between users if needed
UPDATE user_balances_between_users 
SET amount = '1834.32' 
WHERE group_id = 2 AND from_user_id = 2 AND to_user_id = 10;

UPDATE user_balances_between_users 
SET amount = '1834.32' 
WHERE group_id = 2 AND from_user_id = 10 AND to_user_id = 2;

-- Verify the updated direct balances
SELECT * FROM user_balances_between_users WHERE group_id = 2;