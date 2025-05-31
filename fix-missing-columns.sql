-- Fix missing columns in Supabase database
-- These columns were not properly migrated from the original Neon database

-- Add metadata column to activity_log table
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS metadata TEXT;

-- Add invite_code column to group_invites table
ALTER TABLE group_invites ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Update any existing group_invites to have invite codes
UPDATE group_invites 
SET invite_code = 'invite-' || id || '-' || group_id 
WHERE invite_code IS NULL;

-- Add index for better performance on invite_code lookups
CREATE INDEX IF NOT EXISTS idx_group_invites_invite_code ON group_invites(invite_code);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activity_log' AND column_name = 'metadata';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'group_invites' AND column_name = 'invite_code';