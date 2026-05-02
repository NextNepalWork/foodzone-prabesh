-- Migration: Make customer_name and customer_phone optional
-- This allows orders and table_sessions to work without customer information

-- Update table_sessions table
ALTER TABLE table_sessions
ALTER COLUMN customer_name DROP NOT NULL,
ALTER COLUMN customer_phone DROP NOT NULL;

-- Update orders table
ALTER TABLE orders
ALTER COLUMN customer_name DROP NOT NULL,
ALTER COLUMN customer_phone DROP NOT NULL;

-- Update payment_receipts table if it exists
ALTER TABLE payment_receipts
ALTER COLUMN customer_name DROP NOT NULL,
ALTER COLUMN customer_phone DROP NOT NULL;

-- Add a helper function to get customer display name
CREATE OR REPLACE FUNCTION get_customer_display_name(
  p_customer_name VARCHAR,
  p_customer_phone VARCHAR,
  p_table_id INTEGER
) RETURNS VARCHAR AS $$
BEGIN
  IF p_customer_name IS NOT NULL AND p_customer_name != '' THEN
    RETURN p_customer_name;
  ELSIF p_customer_phone IS NOT NULL AND p_customer_phone != '' THEN
    RETURN p_customer_phone;
  ELSIF p_table_id IS NOT NULL THEN
    RETURN 'Table ' || p_table_id;
  ELSE
    RETURN 'Unknown Customer';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add a helper function to get customer identifier
CREATE OR REPLACE FUNCTION get_customer_identifier(
  p_customer_name VARCHAR,
  p_customer_phone VARCHAR,
  p_table_id INTEGER
) RETURNS VARCHAR AS $$
BEGIN
  IF p_customer_phone IS NOT NULL AND p_customer_phone != '' THEN
    RETURN p_customer_phone;
  ELSIF p_customer_name IS NOT NULL AND p_customer_name != '' THEN
    RETURN p_customer_name;
  ELSIF p_table_id IS NOT NULL THEN
    RETURN 'Table ' || p_table_id;
  ELSE
    RETURN 'Unknown';
  END IF;
END;
$$ LANGUAGE plpgsql;
