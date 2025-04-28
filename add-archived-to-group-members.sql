-- Add archived column to group_members table
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;