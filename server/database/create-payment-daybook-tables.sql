-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'phonepe', 'card', 'esewa', 'khalti', 'fonepay', 'online')),
    amount DECIMAL(10,2) NOT NULL,
    invoice_number VARCHAR(100),
    amount_received DECIMAL(10,2),
    change_given DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration: broaden payment_method CHECK on existing installs.
DO $$
DECLARE
    con_name TEXT;
BEGIN
    FOR con_name IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'payments'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%payment_method%'
    LOOP
        EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', con_name);
    END LOOP;
END $$;

ALTER TABLE payments
    ADD CONSTRAINT payments_payment_method_check
    CHECK (payment_method IN ('cash', 'phonepe', 'card', 'esewa', 'khalti', 'fonepay', 'online'));

-- Create daybook_transactions table
CREATE TABLE IF NOT EXISTS daybook_transactions (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('opening_balance', 'closing_balance', 'cash_payment', 'card_payment', 'online_payment', 'cash_returned', 'expense')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    order_id INTEGER REFERENCES orders(id),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add payment_status column to orders table if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_daybook_date ON daybook_transactions(DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_daybook_type ON daybook_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
