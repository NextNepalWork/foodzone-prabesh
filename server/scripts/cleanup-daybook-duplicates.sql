-- Cleanup script for duplicate daybook entries
-- This removes duplicate payment entries, keeping only one per order

-- First, let's see what duplicates exist
SELECT 
    order_id,
    transaction_type,
    COUNT(*) as entry_count,
    STRING_AGG(description, ' | ') as descriptions,
    STRING_AGG(id::text, ', ') as ids
FROM daybook_transactions
WHERE order_id IS NOT NULL
  AND transaction_type IN ('cash_payment', 'card_payment', 'online_payment', 
                           'esewa_payment', 'khalti_payment', 'fonepay_payment')
GROUP BY order_id, transaction_type
HAVING COUNT(*) > 1
ORDER BY order_id;

-- Delete duplicates, keeping only the FIRST entry for each order_id + transaction_type
-- (The first entry is typically from the order status update, which has the cleaner description)
DELETE FROM daybook_transactions
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY order_id, transaction_type 
                ORDER BY created_at ASC
            ) as rn
        FROM daybook_transactions
        WHERE order_id IS NOT NULL
          AND transaction_type IN ('cash_payment', 'card_payment', 'online_payment',
                                   'esewa_payment', 'khalti_payment', 'fonepay_payment')
    ) t
    WHERE rn > 1
);

-- Verify cleanup - this should return 0 rows
SELECT 
    order_id,
    transaction_type,
    COUNT(*) as entry_count
FROM daybook_transactions
WHERE order_id IS NOT NULL
  AND transaction_type IN ('cash_payment', 'card_payment', 'online_payment',
                           'esewa_payment', 'khalti_payment', 'fonepay_payment')
GROUP BY order_id, transaction_type
HAVING COUNT(*) > 1;
