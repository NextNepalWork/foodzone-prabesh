-- Fix daybook_transactions constraints for Day Open functionality

-- Update transaction type constraint to include 'day_reopened'
ALTER TABLE daybook_transactions DROP CONSTRAINT IF EXISTS daybook_transactions_transaction_type_check;
ALTER TABLE daybook_transactions ADD CONSTRAINT daybook_transactions_transaction_type_check 
CHECK (transaction_type IN (
  'income', 'expense', 'opening_balance', 'closing_balance', 
  'cash_handover', 'cash_payment', 'card_payment', 'online_payment', 'day_reopened'
));

-- Update amount constraint to allow zero amounts (>= 0 instead of > 0)
ALTER TABLE daybook_transactions DROP CONSTRAINT IF EXISTS daybook_transactions_amount_check;
ALTER TABLE daybook_transactions ADD CONSTRAINT daybook_transactions_amount_check CHECK (amount >= 0);

-- Verify constraints
SELECT 'Constraints updated successfully!' as status;
