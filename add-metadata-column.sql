-- Add metadata column to activity_log table
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS metadata TEXT;