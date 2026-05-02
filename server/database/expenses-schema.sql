-- Expenses tracking for P&L reporting
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(60) NOT NULL,
    description TEXT,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    vendor VARCHAR(200),
    payment_method VARCHAR(30),
    reference_number VARCHAR(100),
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Categories reference (for filtering / suggestions)
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(60) UNIQUE NOT NULL,
    kind VARCHAR(20) NOT NULL DEFAULT 'operating'
        CHECK (kind IN ('cogs', 'operating', 'payroll', 'utilities', 'rent', 'marketing', 'tax', 'other')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO expense_categories (name, kind) VALUES
    ('Ingredients / raw materials', 'cogs'),
    ('Packaging',                   'cogs'),
    ('Beverages (stock)',           'cogs'),
    ('Staff salary',                'payroll'),
    ('Staff meals',                 'payroll'),
    ('Rent',                        'rent'),
    ('Electricity',                 'utilities'),
    ('Water',                       'utilities'),
    ('Internet / phone',            'utilities'),
    ('Gas (cooking)',               'utilities'),
    ('Cleaning supplies',           'operating'),
    ('Repairs & maintenance',       'operating'),
    ('Equipment',                   'operating'),
    ('Transport / fuel',            'operating'),
    ('Marketing / ads',             'marketing'),
    ('Licenses & taxes',            'tax'),
    ('Bank charges',                'other'),
    ('Miscellaneous',               'other')
ON CONFLICT (name) DO NOTHING;
