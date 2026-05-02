-- Migration to support encrypted table IDs
-- This changes table_id from INTEGER to VARCHAR to support both numeric and encrypted table codes

BEGIN;

-- Update orders table to support VARCHAR table_id
ALTER TABLE orders ALTER COLUMN table_id TYPE VARCHAR(100);

-- Update table_sessions table to support VARCHAR table_id  
ALTER TABLE table_sessions DROP CONSTRAINT IF EXISTS table_sessions_table_id_check;
ALTER TABLE table_sessions ALTER COLUMN table_id TYPE VARCHAR(100);

-- Update indexes
DROP INDEX IF EXISTS idx_orders_table_id;
CREATE INDEX idx_orders_table_id ON orders(table_id);

DROP INDEX IF EXISTS idx_table_sessions_table_id;
CREATE INDEX idx_table_sessions_table_id ON table_sessions(table_id);

COMMIT;
