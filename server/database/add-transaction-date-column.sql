-- Add transaction_date column to daybook_transactions table
-- This column is used to track the business date of transactions

-- Add the column if it doesn't exist
ALTER TABLE daybook_transactions 
ADD COLUMN IF NOT EXISTS transaction_date DATE DEFAULT CURRENT_DATE;

-- Populate transaction_date from existing date column if it exists
UPDATE daybook_transactions 
SET transaction_date = date 
WHERE transaction_date IS NULL AND date IS NOT NULL;

-- Populate transaction_date from created_at if date is null
UPDATE daybook_transactions 
SET transaction_date = DATE(created_at) 
WHERE transaction_date IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_daybook_transaction_date ON daybook_transactions(transaction_date);

-- Add category column if it doesn't exist (used for expense categorization)
ALTER TABLE daybook_transactions 
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Update transaction_type constraint to include new types
ALTER TABLE daybook_transactions 
DROP CONSTRAINT IF EXISTS daybook_transactions_transaction_type_check;

ALTER TABLE daybook_transactions 
ADD CONSTRAINT daybook_transactions_transaction_type_check 
CHECK (transaction_type IN (
  'opening_balance', 
  'closing_balance', 
  'cash_payment', 
  'card_payment', 
  'online_payment', 
  'cash_returned', 
  'expense',
  'cash_handover',
  'day_reopened'
));
