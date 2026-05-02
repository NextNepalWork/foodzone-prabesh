-- Migration: Add Happy Hour Setting
-- Description: Adds happy_hour_enabled setting to restaurant_settings table
-- Date: 2024

-- Insert happy hour enabled setting (default to true)
INSERT INTO restaurant_settings (setting_key, setting_value, description)
VALUES ('happy_hour_enabled', 'true', 'Enable or disable happy hour feature (11 AM - 2 PM, Sunday to Friday)')
ON CONFLICT (setting_key) DO NOTHING;

-- Verify the setting was added
SELECT setting_key, setting_value, description 
FROM restaurant_settings 
WHERE setting_key = 'happy_hour_enabled';
