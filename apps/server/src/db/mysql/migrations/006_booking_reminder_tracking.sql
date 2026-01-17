-- Migration 006: Add reminder tracking to bookings
-- Adds reminderSentAt field to track when SMS reminders were sent

-- Add reminder tracking columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS reminder_sent_at DATETIME NULL COMMENT 'Timestamp when SMS reminder was sent',
ADD COLUMN IF NOT EXISTS client_phone VARCHAR(32) NULL COMMENT 'Client phone number for SMS reminders',
ADD INDEX IF NOT EXISTS idx_bookings_reminder (reminder_sent_at, status);

-- Add reminder tracking to documents table for CouchDB compatibility
-- The documents table already has a data JSON column that can store reminderSentAt
-- This migration just ensures the schema is documented

-- Note: For CouchDB mode, reminderSentAt is stored directly in the booking document JSON
