-- Daybook schema — idempotent migration.
-- Handles the case where the table was created with either the legacy
-- `date` column (create-payment-daybook-tables.sql) or the newer
-- `transaction_date` column (fix-daybook-schema.js).

-- 1) Create table if it doesn't exist (new shape)
CREATE TABLE IF NOT EXISTS daybook_transactions (
    id SERIAL PRIMARY KEY,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type VARCHAR(50) NOT NULL,
    category VARCHAR(100) DEFAULT 'other',
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    order_id INTEGER,
    payment_method VARCHAR(30),
    reference VARCHAR(100),
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2) Ensure every expected column exists (for legacy DBs)
ALTER TABLE daybook_transactions ADD COLUMN IF NOT EXISTS transaction_date DATE;
ALTER TABLE daybook_transactions ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE daybook_transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30);
ALTER TABLE daybook_transactions ADD COLUMN IF NOT EXISTS reference VARCHAR(100);
ALTER TABLE daybook_transactions ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE daybook_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3) Backfill transaction_date from legacy `date` column or created_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='daybook_transactions' AND column_name='date') THEN
        EXECUTE 'UPDATE daybook_transactions SET transaction_date = COALESCE(transaction_date, date, DATE(created_at)) WHERE transaction_date IS NULL';
    ELSE
        UPDATE daybook_transactions SET transaction_date = DATE(created_at) WHERE transaction_date IS NULL;
    END IF;
END $$;

-- 4) Enforce NOT NULL / default on transaction_date
ALTER TABLE daybook_transactions ALTER COLUMN transaction_date SET DEFAULT CURRENT_DATE;
DO $$
BEGIN
    BEGIN
        ALTER TABLE daybook_transactions ALTER COLUMN transaction_date SET NOT NULL;
    EXCEPTION WHEN others THEN
        -- ignore if already not-null or rows still missing (shouldn't happen after backfill)
        NULL;
    END;
END $$;

-- 5) Drop the legacy narrow CHECK constraint and add a broader one
DO $$
DECLARE
    con_name TEXT;
BEGIN
    FOR con_name IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'daybook_transactions'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%transaction_type%'
    LOOP
        EXECUTE format('ALTER TABLE daybook_transactions DROP CONSTRAINT %I', con_name);
    END LOOP;
END $$;

ALTER TABLE daybook_transactions
    ADD CONSTRAINT daybook_transactions_type_check CHECK (transaction_type IN (
        'opening_balance',
        'closing_balance',
        'cash_payment',
        'card_payment',
        'online_payment',
        'esewa_payment',
        'khalti_payment',
        'fonepay_payment',
        'cash_handover',
        'cash_returned',
        'expense',
        'cash_in',
        'adjustment',
        'day_reopened'
    ));

-- 6) Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_daybook_transaction_date ON daybook_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_daybook_type              ON daybook_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_daybook_created_at        ON daybook_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_daybook_order_id          ON daybook_transactions(order_id);

-- 7) Unique guards: at most one opening_balance and one closing_balance per day
CREATE UNIQUE INDEX IF NOT EXISTS uq_daybook_opening_per_day
    ON daybook_transactions(transaction_date)
    WHERE transaction_type = 'opening_balance';

CREATE UNIQUE INDEX IF NOT EXISTS uq_daybook_closing_per_day
    ON daybook_transactions(transaction_date)
    WHERE transaction_type = 'closing_balance';

-- 7b) Broaden payments.payment_method CHECK to allow QR payment methods.
-- Only runs if the payments table already exists.
DO $$
DECLARE
    con_name TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        FOR con_name IN
            SELECT conname FROM pg_constraint
            WHERE conrelid = 'payments'::regclass
              AND contype = 'c'
              AND pg_get_constraintdef(oid) ILIKE '%payment_method%'
        LOOP
            EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', con_name);
        END LOOP;

        ALTER TABLE payments
            ADD CONSTRAINT payments_payment_method_check
            CHECK (payment_method IN ('cash', 'phonepe', 'card', 'esewa', 'khalti', 'fonepay', 'online'));
    END IF;
END $$;

-- 8) Prevent duplicate payment entries for the same order.
-- Any sales-category transaction (cash/card/online/esewa/khalti/fonepay payment)
-- must be unique per order_id. Inserts must use ON CONFLICT DO NOTHING.
CREATE UNIQUE INDEX IF NOT EXISTS uq_daybook_one_payment_per_order
    ON daybook_transactions(order_id)
    WHERE order_id IS NOT NULL
      AND transaction_type IN (
          'cash_payment','card_payment','online_payment',
          'esewa_payment','khalti_payment','fonepay_payment'
      );
