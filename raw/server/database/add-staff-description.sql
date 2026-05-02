-- Migration: Add description column to staff table
-- This migration adds a description field to store additional information about staff members

-- Add description column if it doesn't exist
ALTER TABLE staff ADD COLUMN IF NOT EXISTS description TEXT;

-- Add a comment to the column
COMMENT ON COLUMN staff.description IS 'Brief description or notes about the staff member';
