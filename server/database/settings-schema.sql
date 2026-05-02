-- Comprehensive settings store — SaaS-ready key/value with rich metadata.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS restaurant_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extended metadata columns (added only if missing)
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS section       VARCHAR(60);
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS value_type    VARCHAR(20)  DEFAULT 'string';
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS description   TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS is_public     BOOLEAN      DEFAULT false;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS updated_by    VARCHAR(100);
-- Multi-tenant column (defaulted to 1 for single-tenant mode; ready for SaaS)
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS tenant_id     INTEGER      DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_settings_section  ON restaurant_settings(section);
CREATE INDEX IF NOT EXISTS idx_settings_tenant   ON restaurant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settings_public   ON restaurant_settings(is_public) WHERE is_public = true;

-- Operating hours per weekday (0 = Sunday, 6 = Saturday)
CREATE TABLE IF NOT EXISTS operating_hours (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1,
    weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    is_open BOOLEAN DEFAULT true,
    open_time TIME DEFAULT '09:00',
    close_time TIME DEFAULT '22:00',
    break_start TIME,
    break_end TIME,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, weekday)
);

-- Seed default rows for 7 weekdays if missing
INSERT INTO operating_hours (weekday, is_open, open_time, close_time)
SELECT gs, true, '09:00'::time, '22:00'::time
FROM generate_series(0, 6) gs
ON CONFLICT (tenant_id, weekday) DO NOTHING;

-- Delivery zones with polygon-less simple distance bands
CREATE TABLE IF NOT EXISTS delivery_zones_config (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1,
    name VARCHAR(120) NOT NULL,
    max_distance_km DECIMAL(6, 2) NOT NULL,
    fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    min_order_amount DECIMAL(10, 2) DEFAULT 0,
    estimated_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment methods configuration
CREATE TABLE IF NOT EXISTS payment_methods_config (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1,
    method_key VARCHAR(40) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    surcharge_percent DECIMAL(5, 2) DEFAULT 0,
    icon VARCHAR(60),
    sort_order INTEGER DEFAULT 0,
    config_json JSONB,
    UNIQUE (tenant_id, method_key)
);

INSERT INTO payment_methods_config (method_key, display_name, is_enabled, icon, sort_order) VALUES
    ('cash',    'Cash',        true, '💵', 1),
    ('phonepe', 'PhonePe / eSewa / Khalti', true, '📱', 2),
    ('card',    'Credit / Debit card', true, '💳', 3)
ON CONFLICT (tenant_id, method_key) DO NOTHING;

-- Tenant profile (single row for now, but multi-row ready)
CREATE TABLE IF NOT EXISTS tenant_profile (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER UNIQUE DEFAULT 1,
    plan VARCHAR(40) DEFAULT 'standard',
    subscription_status VARCHAR(40) DEFAULT 'active',
    trial_ends_at DATE,
    billing_email VARCHAR(200),
    features_json JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tenant_profile (tenant_id, plan, subscription_status) VALUES (1, 'standard', 'active')
ON CONFLICT (tenant_id) DO NOTHING;
