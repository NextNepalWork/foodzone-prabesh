/* =============================================================
   Comprehensive Settings API — SaaS-ready
   - Single key/value table (restaurant_settings) with rich metadata
   - A CATALOG below is the source of truth for defaults, types, and UI
   - PUT /api/settings accepts a bulk array of { key, value } pairs
   - GET /api/settings returns sections grouped, with values + metadata
   - GET /api/settings/public returns only public-flagged, flat key/value
     (safe to expose to customer-facing app)
   - /operating-hours, /delivery-zones, /payment-methods have their own
     small CRUD because they're relational.
   ============================================================= */

const express = require('express');
const router = express.Router();
const { query } = require('../database/config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/* ------------------------------------------------------------
   Settings catalogue — the single source of truth.
   Every field here becomes a row (with defaults) and appears in
   the admin UI. Add fields here to extend settings.
   ------------------------------------------------------------ */
const SECTIONS = [
  // ====== 1) Business profile ======
  {
    id: 'business',
    label: 'Business',
    icon: '🏢',
    description: 'Your brand identity, logo and legal info shown on receipts and the customer app.',
    fields: [
      { key: 'business.name',            label: 'Business name',        type: 'string',  default: 'Food Zone',      public: true, placeholder: 'e.g. Food Zone' },
      { key: 'business.legal_name',      label: 'Legal / registered name', type: 'string', default: '',             public: false },
      { key: 'business.tagline',         label: 'Tagline',              type: 'string',  default: 'Quality food, served fresh', public: true },
      { key: 'business.logo_url',        label: 'Logo',                 type: 'image',   default: '',               public: true, help: 'Square PNG, ideally 512×512.' },
      { key: 'business.favicon_url',     label: 'Favicon',              type: 'image',   default: '',               public: true, help: '32×32 PNG / SVG.' },
      { key: 'business.primary_color',   label: 'Brand color',          type: 'color',   default: '#e11d48',        public: true },
      { key: 'business.phone',           label: 'Phone',                type: 'string',  default: '',               public: true },
      { key: 'business.alt_phone',       label: 'Secondary phone',      type: 'string',  default: '',               public: true },
      { key: 'business.email',           label: 'Contact email',        type: 'string',  default: '',               public: true },
      { key: 'business.website',         label: 'Website',              type: 'string',  default: '',               public: true },
      { key: 'business.vat_pan',         label: 'VAT / PAN number',     type: 'string',  default: '',               public: false },
      { key: 'business.address_line1',   label: 'Street address',       type: 'string',  default: '',               public: true },
      { key: 'business.address_line2',   label: 'Address line 2',       type: 'string',  default: '',               public: true },
      { key: 'business.city',            label: 'City',                 type: 'string',  default: 'Kathmandu',      public: true },
      { key: 'business.country',         label: 'Country',              type: 'string',  default: 'Nepal',          public: true },
      { key: 'business.map_lat',         label: 'Map latitude',         type: 'number',  default: 27.7172,          public: true, step: 0.0001 },
      { key: 'business.map_lng',         label: 'Map longitude',        type: 'number',  default: 85.3240,          public: true, step: 0.0001 },
      { key: 'business.social_facebook', label: 'Facebook URL',         type: 'string',  default: '',               public: true },
      { key: 'business.social_instagram',label: 'Instagram URL',        type: 'string',  default: '',               public: true },
      { key: 'business.social_tiktok',   label: 'TikTok URL',           type: 'string',  default: '',               public: true },
    ],
  },

  // ====== 2) Localization ======
  {
    id: 'localization',
    label: 'Localization',
    icon: '🌏',
    description: 'Currency, timezone and formatting conventions.',
    fields: [
      { key: 'locale.currency_code',   label: 'Currency code', type: 'select', default: 'NPR', public: true,
        options: ['NPR', 'INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'JPY'] },
      { key: 'locale.currency_symbol', label: 'Currency symbol', type: 'string', default: 'Rs.', public: true },
      { key: 'locale.currency_position', label: 'Symbol position', type: 'select', default: 'prefix', public: true, options: ['prefix', 'suffix'] },
      { key: 'locale.timezone',        label: 'Timezone', type: 'select', default: 'Asia/Kathmandu', public: true,
        options: ['Asia/Kathmandu', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'UTC'] },
      { key: 'locale.date_format',     label: 'Date format', type: 'select', default: 'YYYY-MM-DD', public: true,
        options: ['YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY'] },
      { key: 'locale.time_format',     label: 'Time format', type: 'select', default: '12h',       public: true, options: ['12h', '24h'] },
      { key: 'locale.language',        label: 'Language',    type: 'select', default: 'en',        public: true,  options: ['en', 'ne', 'hi'] },
    ],
  },

  // ====== 3) Operating hours ======
  // Hours are stored in their own table; this section hosts the override + temporary-close toggle.
  {
    id: 'hours',
    label: 'Hours & Availability',
    icon: '🕒',
    description: 'When the restaurant is open, plus one-click "Close now" override.',
    fields: [
      { key: 'hours.temporarily_closed',  label: 'Temporarily closed (overrides schedule)', type: 'bool',   default: false,                         public: true },
      { key: 'hours.closed_reason',       label: 'Reason shown to customers',               type: 'string', default: 'We are closed right now',    public: true },
      { key: 'hours.accept_pre_orders',   label: 'Accept pre-orders when closed',           type: 'bool',   default: true,                          public: true },
      { key: 'hours.holiday_note',        label: 'Holiday / special notice',                type: 'text',   default: '',                            public: true },
      { key: 'hours.last_order_buffer',   label: 'Stop taking orders (minutes before close)', type: 'number', default: 30, min: 0, max: 120, unit: 'min', public: true },
    ],
    linked: { weekly: true },
  },

  // ====== 4) Ordering channels ======
  {
    id: 'ordering',
    label: 'Ordering',
    icon: '🛒',
    description: 'What ordering channels are enabled and their behaviour.',
    fields: [
      { key: 'ordering.dine_in_enabled',       label: 'Dine-in enabled',               type: 'bool', default: true,  public: true },
      { key: 'ordering.delivery_enabled',      label: 'Delivery enabled',              type: 'bool', default: true,  public: true },
      { key: 'ordering.takeaway_enabled',      label: 'Takeaway enabled',              type: 'bool', default: true,  public: true },
      { key: 'ordering.table_calls_enabled',   label: 'Customer “Call staff” button',  type: 'bool', default: true,  public: true,
        help: 'Shows a call-to-service button on the customer menu so guests can request a waiter.' },
      { key: 'ordering.allow_special_requests', label: 'Allow special instructions',   type: 'bool', default: true,  public: true },
      { key: 'ordering.min_order_dinein',      label: 'Minimum order (dine-in)',       type: 'number', default: 0,   public: true,  unit: 'Rs.' },
      { key: 'ordering.min_order_delivery',    label: 'Minimum order (delivery)',      type: 'number', default: 200, public: true,  unit: 'Rs.' },
      { key: 'ordering.auto_accept_orders',    label: 'Auto-accept incoming orders',   type: 'bool',   default: false, public: false },
      { key: 'ordering.kitchen_auto_print',    label: 'Auto-print to kitchen',         type: 'bool',   default: true,  public: false },
      { key: 'ordering.require_customer_phone', label: 'Require customer phone',       type: 'bool',   default: true,  public: true },
      { key: 'ordering.show_menu_photos',      label: 'Show photos on customer menu',  type: 'bool',   default: true,  public: true },
      { key: 'ordering.show_calories',         label: 'Show calorie info',             type: 'bool',   default: false, public: true },
      { key: 'ordering.order_prep_buffer_min', label: 'Default prep time',             type: 'number', default: 15,    public: true, min: 0, unit: 'min' },
    ],
  },

  // ====== 5) Delivery ======
  {
    id: 'delivery',
    label: 'Delivery',
    icon: '🛵',
    description: 'Delivery fees, range and zone rules.',
    fields: [
      { key: 'delivery.base_fee',              label: 'Base delivery fee',             type: 'number', default: 100, public: true, unit: 'Rs.' },
      { key: 'delivery.per_km_fee',            label: 'Fee per km (beyond base zone)', type: 'number', default: 20,  public: true, unit: 'Rs./km' },
      { key: 'delivery.base_zone_km',          label: 'Base-fee radius',               type: 'number', default: 3,   public: true, unit: 'km' },
      { key: 'delivery.max_distance_km',       label: 'Maximum delivery distance',     type: 'number', default: 10,  public: true, unit: 'km' },
      { key: 'delivery.free_delivery_threshold', label: 'Free delivery above',         type: 'number', default: 2000, public: true, unit: 'Rs.' },
      { key: 'delivery.estimated_min',         label: 'Typical delivery time',         type: 'number', default: 35,  public: true, unit: 'min' },
      { key: 'delivery.driver_contact_sharing', label: 'Share driver contact with customer', type: 'bool', default: true, public: true },
    ],
    linked: { zones: true },
  },

  // ====== 6) Tax & service ======
  {
    id: 'tax',
    label: 'Tax & Service',
    icon: '🧾',
    description: 'Taxes and charges applied to every bill.',
    fields: [
      { key: 'tax.vat_percent',           label: 'VAT / GST %',                type: 'number', default: 13, public: true, min: 0, max: 50, step: 0.5, unit: '%' },
      { key: 'tax.vat_inclusive',         label: 'Prices include VAT',         type: 'bool',   default: true, public: true, help: 'If on, VAT is not added on top.' },
      { key: 'tax.service_charge_percent',label: 'Service charge %',           type: 'number', default: 10, public: true, min: 0, max: 25, step: 0.5, unit: '%' },
      { key: 'tax.service_dine_in_only',  label: 'Service charge dine-in only',type: 'bool',   default: true, public: true },
      { key: 'tax.show_breakdown_on_receipt', label: 'Show tax breakdown on receipt', type: 'bool', default: true, public: false },
      { key: 'tax.rounding_mode',         label: 'Rounding',                   type: 'select', default: 'nearest', public: false, options: ['none', 'nearest', 'up', 'down'] },
    ],
  },

  // ====== 7) Happy hour ======
  {
    id: 'happyhour',
    label: 'Happy Hour',
    icon: '🎉',
    description: 'Scheduled discount window, automatically applied.',
    fields: [
      { key: 'happyhour.enabled',          label: 'Enable happy hour',           type: 'bool',   default: true, public: true },
      { key: 'happyhour.start_time',       label: 'Start time',                  type: 'time',   default: '15:00', public: true },
      { key: 'happyhour.end_time',         label: 'End time',                    type: 'time',   default: '18:00', public: true },
      { key: 'happyhour.discount_percent', label: 'Discount %',                  type: 'number', default: 15, min: 0, max: 70, unit: '%', public: true },
      { key: 'happyhour.days',             label: 'Active days',                 type: 'weekdays', default: [1,2,3,4,5], public: true,
        help: '0 = Sunday, 6 = Saturday' },
      { key: 'happyhour.banner_text',      label: 'Banner text',                 type: 'string', default: 'Happy Hour! Save on selected items', public: true },
      { key: 'happyhour.applies_to',       label: 'Applies to',                  type: 'select', default: 'flagged', public: false, options: ['flagged', 'all', 'categories'],
        help: '“flagged” only discounts items marked happy_hour=true.' },
    ],
  },

  // ====== 8) Receipts / printing ======
  {
    id: 'receipts',
    label: 'Receipts & Printing',
    icon: '🖨️',
    description: 'Receipt layout, print behaviour and thermal printer settings.',
    fields: [
      { key: 'print.auto_print',         label: 'Auto-print on new order',        type: 'bool',   default: true },
      { key: 'print.copies_kitchen',     label: 'Kitchen copies',                 type: 'number', default: 1, min: 0, max: 5 },
      { key: 'print.copies_customer',    label: 'Customer copies',                type: 'number', default: 1, min: 0, max: 5 },
      { key: 'print.paper_width_mm',     label: 'Paper width',                    type: 'select', default: '80', options: ['58', '80'] },
      { key: 'print.show_logo',          label: 'Show logo on receipt',           type: 'bool',   default: true },
      { key: 'print.show_qr',            label: 'Show feedback QR',               type: 'bool',   default: false },
      { key: 'print.header',             label: 'Receipt header',                 type: 'text',   default: 'Thank you for visiting!' },
      { key: 'print.footer',             label: 'Receipt footer',                 type: 'text',   default: 'Visit us again 🙏' },
      { key: 'print.show_vat',           label: 'Show VAT number on receipt',     type: 'bool',   default: true },
      { key: 'print.show_item_image',    label: 'Show item image (if supported)', type: 'bool',   default: false },
    ],
  },

  // ====== 9) Notifications ======
  {
    id: 'notifications',
    label: 'Notifications',
    icon: '🔔',
    description: 'Sounds, emails and channels for real-time alerts.',
    fields: [
      { key: 'notify.sound_enabled',     label: 'Sound on new order',       type: 'bool', default: true },
      { key: 'notify.sound_volume',      label: 'Volume',                   type: 'number', default: 70, min: 0, max: 100, unit: '%' },
      { key: 'notify.table_call_sound',  label: 'Sound on table call',      type: 'bool', default: true },
      { key: 'notify.browser_push',      label: 'Browser push notifications', type: 'bool', default: true },
      { key: 'notify.email_on_order',    label: 'Email on new order',       type: 'bool', default: false },
      { key: 'notify.email_address',     label: 'Notification email',       type: 'string', default: '' },
      { key: 'notify.slack_webhook',     label: 'Slack webhook URL',        type: 'string', default: '' },
      { key: 'notify.low_stock_alerts',  label: 'Low-stock alerts',         type: 'bool', default: true },
    ],
  },

  // ====== 10) Security & staff ======
  {
    id: 'security',
    label: 'Security & Staff',
    icon: '🔒',
    description: 'Staff access, auto-logout and sensitive action protection.',
    fields: [
      { key: 'security.staff_auto_logout_min', label: 'Staff auto-logout',          type: 'number', default: 60, min: 5, max: 240, unit: 'min' },
      { key: 'security.require_pin_void',      label: 'Require manager PIN to void orders', type: 'bool', default: true },
      { key: 'security.require_pin_discount',  label: 'Require manager PIN for custom discount', type: 'bool', default: true },
      { key: 'security.manager_pin',           label: 'Manager PIN',                type: 'password', default: '' },
      { key: 'security.two_factor',            label: 'Require 2FA for admin login',type: 'bool', default: false },
      { key: 'security.lock_on_inactivity',    label: 'Lock screen on inactivity',  type: 'bool', default: true },
      { key: 'security.allowed_ips',           label: 'Allowed admin IPs (comma separated)', type: 'text', default: '' },
    ],
  },

  // ====== 11) Customer app ======
  {
    id: 'customerapp',
    label: 'Customer App',
    icon: '📱',
    description: 'Behaviour of the table-side / online ordering customer app.',
    fields: [
      { key: 'customer.welcome_banner',      label: 'Welcome banner text',         type: 'string', default: 'Welcome! Tap an item to order.', public: true },
      { key: 'customer.welcome_banner_url',  label: 'Welcome banner image',        type: 'image',  default: '', public: true },
      { key: 'customer.allow_reviews',       label: 'Allow customer reviews',      type: 'bool',   default: true, public: true },
      { key: 'customer.reviews_moderation',  label: 'Moderate reviews before publishing', type: 'bool', default: true, public: false },
      { key: 'customer.show_order_history',  label: 'Show past orders to customer',type: 'bool',   default: true, public: true },
      { key: 'customer.menu_sort',           label: 'Menu sort order',             type: 'select', default: 'category', public: true, options: ['category', 'popularity', 'price_asc', 'price_desc'] },
      { key: 'customer.show_prep_time',      label: 'Show prep time to customer',  type: 'bool',   default: true, public: true },
      { key: 'customer.show_running_total',  label: 'Show running total on menu',  type: 'bool',   default: true, public: true },
    ],
  },

  // ====== 12) Tables ======
  {
    id: 'tables',
    label: 'Tables',
    icon: '🪑',
    description: 'Dine-in floor and QR / session behaviour.',
    fields: [
      { key: 'tables.table_count',       label: 'Number of tables',          type: 'number', default: 25, min: 1, max: 200, public: true },
      { key: 'tables.require_pin_clear', label: 'Require PIN to clear table', type: 'bool',   default: false },
      { key: 'tables.session_timeout_min', label: 'Idle session timeout',     type: 'number', default: 120, min: 15, max: 480, unit: 'min' },
      { key: 'tables.qr_branding',       label: 'Show logo on table QR',      type: 'bool',   default: true, public: true },
      { key: 'tables.allow_combine_bills', label: 'Allow combining bills',    type: 'bool',   default: true },
      // Payment QR codes
      { key: 'payment.qr.esewa.image',   label: 'eSewa QR Code',             type: 'image',  default: '', public: true },
      { key: 'payment.qr.esewa.name',    label: 'eSewa Account Name',        type: 'string', default: '', public: true },
      { key: 'payment.qr.esewa.number',  label: 'eSewa Account Number',      type: 'string', default: '', public: true },
      { key: 'payment.qr.khalti.image',  label: 'Khalti QR Code',            type: 'image',  default: '', public: true },
      { key: 'payment.qr.khalti.name',   label: 'Khalti Account Name',       type: 'string', default: '', public: true },
      { key: 'payment.qr.khalti.number', label: 'Khalti Account Number',     type: 'string', default: '', public: true },
      { key: 'payment.qr.fonepay.image', label: 'Fonepay QR Code',           type: 'image',  default: '', public: true },
      { key: 'payment.qr.fonepay.name',  label: 'Fonepay Account Name',      type: 'string', default: '', public: true },
      { key: 'payment.qr.fonepay.number',label: 'Fonepay Account Number',    type: 'string', default: '', public: true },
    ],
  },

  // ====== 13) Integrations / payments ======
  {
    id: 'integrations',
    label: 'Integrations',
    icon: '🔌',
    description: 'Analytics, webhooks and third-party hooks.',
    fields: [
      { key: 'integrations.google_analytics', label: 'Google Analytics ID', type: 'string', default: '' },
      { key: 'integrations.facebook_pixel',   label: 'Facebook Pixel ID',   type: 'string', default: '' },
      { key: 'integrations.webhook_order_paid', label: 'Webhook on order paid', type: 'string', default: '' },
      { key: 'integrations.sms_provider',     label: 'SMS provider',        type: 'select', default: 'none', options: ['none', 'twilio', 'sparrow'] },
      { key: 'integrations.sms_api_key',      label: 'SMS API key',         type: 'password', default: '' },
      { key: 'integrations.whatsapp_enabled', label: 'WhatsApp notifications', type: 'bool', default: false },
      { key: 'integrations.whatsapp_number',  label: 'WhatsApp business number', type: 'string', default: '' },
    ],
  },

  // ====== 14) SaaS / subscription ======
  {
    id: 'saas',
    label: 'Subscription',
    icon: '💠',
    description: 'Your plan and subscription info. (Read-mostly in single-tenant mode.)',
    fields: [
      { key: 'saas.workspace_name', label: 'Workspace name', type: 'string', default: 'Default workspace' },
      { key: 'saas.support_email',  label: 'Support contact', type: 'string', default: 'support@foodzone.app' },
    ],
    linked: { tenant: true },
  },

  // ====== 15) UI / Layout ======
  {
    id: 'ui',
    label: 'UI & Layout',
    icon: '🎨',
    description: 'Admin interface dimensions, spacing and upload limits.',
    fields: [
      { key: 'ui.image_upload_max_mb',    label: 'Max image upload size', type: 'number', default: 2, min: 0.5, max: 50, unit: 'MB', public: false },
      { key: 'ui.sidebar_width_px',       label: 'Sidebar width',         type: 'number', default: 256, min: 200, max: 400, unit: 'px', public: false },
      { key: 'ui.image_preview_size_px',  label: 'Image preview size',    type: 'number', default: 80, min: 40, max: 200, unit: 'px', public: false },
      { key: 'ui.header_height_px',       label: 'Header height',         type: 'number', default: 100, min: 60, max: 150, unit: 'px', public: false },
      { key: 'ui.qr_code_size_px',        label: 'QR code size',          type: 'number', default: 400, min: 200, max: 800, unit: 'px', public: false },
      { key: 'ui.receipt_max_size_kb',    label: 'Receipt image max size', type: 'number', default: 30, min: 10, max: 100, unit: 'KB', public: false },
      { key: 'ui.receipt_max_width_px',   label: 'Receipt image max width', type: 'number', default: 800, min: 400, max: 2000, unit: 'px', public: false },
      { key: 'ui.receipt_max_height_px',  label: 'Receipt image max height', type: 'number', default: 1200, min: 600, max: 3000, unit: 'px', public: false },
    ],
  },

  // ====== 16) Timeouts & Performance ======
  {
    id: 'performance',
    label: 'Timeouts & Performance',
    icon: '⚡',
    description: 'API timeouts, cache durations and refresh intervals.',
    fields: [
      { key: 'api.timeout_ms',                label: 'API request timeout',           type: 'number', default: 30000, min: 5000, max: 120000, unit: 'ms', public: false },
      { key: 'api.timeout_cold_start_ms',     label: 'Cold start timeout',            type: 'number', default: 60000, min: 30000, max: 180000, unit: 'ms', public: false },
      { key: 'api.retry_delay_ms',            label: 'Retry delay',                   type: 'number', default: 1000, min: 100, max: 10000, unit: 'ms', public: false },
      { key: 'ui.notification_duration_ms',   label: 'Notification display time',     type: 'number', default: 5000, min: 1000, max: 15000, unit: 'ms', public: false },
      { key: 'ui.toast_duration_ms',          label: 'Toast message duration',        type: 'number', default: 3000, min: 1000, max: 10000, unit: 'ms', public: false },
      { key: 'ui.location_error_clear_ms',    label: 'Location error clear delay',    type: 'number', default: 3000, min: 1000, max: 10000, unit: 'ms', public: false },
      { key: 'ui.form_reset_delay_ms',        label: 'Form reset delay',              type: 'number', default: 3000, min: 1000, max: 10000, unit: 'ms', public: false },
      { key: 'ui.call_rejection_delay_ms',    label: 'Call rejection delay',          type: 'number', default: 3000, min: 1000, max: 10000, unit: 'ms', public: false },
      { key: 'ui.call_busy_delay_ms',         label: 'Call busy delay',               type: 'number', default: 3500, min: 1000, max: 10000, unit: 'ms', public: false },
      { key: 'ui.call_ended_delay_ms',        label: 'Call ended delay',              type: 'number', default: 2000, min: 500, max: 10000, unit: 'ms', public: false },
      { key: 'ui.button_reset_delay_ms',      label: 'Button reset delay',            type: 'number', default: 3000, min: 1000, max: 10000, unit: 'ms', public: false },
      { key: 'ui.debounce_delay_ms',          label: 'Debounce delay',                type: 'number', default: 300, min: 100, max: 1000, unit: 'ms', public: false },
      { key: 'ui.print_delay_ms',             label: 'Print dialog delay',            type: 'number', default: 250, min: 100, max: 1000, unit: 'ms', public: false },
      { key: 'cache.cleanup_interval_ms',     label: 'Cache cleanup interval',        type: 'number', default: 300000, min: 60000, max: 3600000, unit: 'ms', public: false },
      { key: 'refresh.happy_hour_interval_ms', label: 'Happy hour check interval',    type: 'number', default: 60000, min: 10000, max: 600000, unit: 'ms', public: false },
      { key: 'refresh.analytics_interval_ms',  label: 'Analytics refresh interval',   type: 'number', default: 30000, min: 10000, max: 300000, unit: 'ms', public: false },
      { key: 'refresh.table_status_interval_ms', label: 'Table status refresh',       type: 'number', default: 30000, min: 5000, max: 300000, unit: 'ms', public: false },
      { key: 'refresh.time_display_interval_ms', label: 'Time display refresh',       type: 'number', default: 30000, min: 5000, max: 300000, unit: 'ms', public: false },
      { key: 'geolocation.timeout_ms',        label: 'Geolocation timeout',           type: 'number', default: 15000, min: 5000, max: 60000, unit: 'ms', public: false },
      { key: 'geolocation.max_age_ms',        label: 'Geolocation cache age',         type: 'number', default: 300000, min: 60000, max: 3600000, unit: 'ms', public: false },
      { key: 'audio.beep_interval_ms',        label: 'Audio beep interval',           type: 'number', default: 200, min: 50, max: 1000, unit: 'ms', public: false },
      { key: 'audio.ringtone_repeat_ms',      label: 'Ringtone repeat delay',         type: 'number', default: 1000, min: 500, max: 5000, unit: 'ms', public: false },
      { key: 'audio.ringing_tone_interval_ms', label: 'Ringing tone interval',        type: 'number', default: 1500, min: 500, max: 5000, unit: 'ms', public: false },
      { key: 'sw.retry_sync_delay_ms',        label: 'Service worker retry delay',    type: 'number', default: 60000, min: 10000, max: 600000, unit: 'ms', public: false },
      { key: 'sw.heartbeat_interval_ms',      label: 'Service worker heartbeat',      type: 'number', default: 30000, min: 10000, max: 300000, unit: 'ms', public: false },
      { key: 'sw.keep_alive_interval_ms',     label: 'Keep-alive interval',           type: 'number', default: 30000, min: 10000, max: 300000, unit: 'ms', public: false },
    ],
  },
];

// Flatten for quick lookup
const FIELDS = SECTIONS.flatMap(s => s.fields.map(f => ({ ...f, section: s.id })));
const FIELD_BY_KEY = new Map(FIELDS.map(f => [f.key, f]));

// ------------------------------------------------------------
// Value casting helpers
// ------------------------------------------------------------
function serialize(value, type) {
  if (value === null || value === undefined) return null;
  if (type === 'bool') return value ? 'true' : 'false';
  if (type === 'weekdays' || type === 'json') return JSON.stringify(value);
  return String(value);
}

function deserialize(raw, type, fallback) {
  if (raw === null || raw === undefined) return fallback;
  try {
    switch (type) {
      case 'bool':      return raw === 'true' || raw === true;
      case 'number':    { const n = Number(raw); return Number.isFinite(n) ? n : fallback; }
      case 'weekdays':
      case 'json':      return JSON.parse(raw);
      default:          return raw;
    }
  } catch (_) {
    return fallback;
  }
}

async function readAllValues() {
  const { rows } = await query(`SELECT setting_key, setting_value FROM restaurant_settings`);
  const byKey = new Map(rows.map(r => [r.setting_key, r.setting_value]));
  const out = {};
  for (const f of FIELDS) {
    const raw = byKey.get(f.key);
    out[f.key] = raw === undefined ? f.default : deserialize(raw, f.type, f.default);
  }
  return out;
}

async function upsertOne(key, value, user) {
  const meta = FIELD_BY_KEY.get(key);
  if (!meta) {
    // allow arbitrary keys but default to string
    const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await query(`
      INSERT INTO restaurant_settings (setting_key, setting_value, value_type, updated_by, updated_at)
      VALUES ($1, $2, 'string', $3, CURRENT_TIMESTAMP)
      ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        updated_by    = EXCLUDED.updated_by,
        updated_at    = CURRENT_TIMESTAMP
    `, [key, serialized, user || null]);
    return;
  }

  // Validate
  if (meta.type === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error(`"${meta.label}" must be a number`);
    if (meta.min !== undefined && n < meta.min) throw new Error(`"${meta.label}" cannot be less than ${meta.min}`);
    if (meta.max !== undefined && n > meta.max) throw new Error(`"${meta.label}" cannot be greater than ${meta.max}`);
  }
  if (meta.type === 'select' && Array.isArray(meta.options) && !meta.options.includes(value)) {
    throw new Error(`"${meta.label}" must be one of ${meta.options.join(', ')}`);
  }

  const serialized = serialize(value, meta.type);
  await query(`
    INSERT INTO restaurant_settings (setting_key, setting_value, value_type, section, description, is_public, updated_by, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    ON CONFLICT (setting_key) DO UPDATE SET
      setting_value = EXCLUDED.setting_value,
      value_type    = EXCLUDED.value_type,
      section       = EXCLUDED.section,
      description   = EXCLUDED.description,
      is_public     = EXCLUDED.is_public,
      updated_by    = EXCLUDED.updated_by,
      updated_at    = CURRENT_TIMESTAMP
  `, [key, serialized, meta.type, meta.section, meta.help || null, !!meta.public, user || null]);
}

// ------------------------------------------------------------
// Routes
// ------------------------------------------------------------

// Full catalog + values (admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const values = await readAllValues();
    const sections = SECTIONS.map(s => ({
      id: s.id,
      label: s.label,
      icon: s.icon,
      description: s.description,
      linked: s.linked || null,
      fields: s.fields.map(f => ({
        ...f,
        value: values[f.key],
      })),
    }));
    res.json({ sections });
  } catch (err) {
    console.error('settings GET error:', err);
    res.status(500).json({ error: 'Failed to load settings', details: err.message });
  }
});

// Public-safe view (unauthenticated) — only fields flagged public.
router.get('/public', async (req, res) => {
  try {
    const values = await readAllValues();
    const out = {};
    for (const f of FIELDS) {
      if (f.public) out[f.key] = values[f.key];
    }
    // Include structured extras
    try {
      const hours = await query(`SELECT weekday, is_open, open_time, close_time, break_start, break_end FROM operating_hours ORDER BY weekday`);
      out['hours.weekly'] = hours.rows;
    } catch (_) {}
    res.json(out);
  } catch (err) {
    console.error('settings public GET error:', err);
    res.status(500).json({ error: 'Failed to load public settings' });
  }
});

// Read a single key
router.get('/key/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const meta = FIELD_BY_KEY.get(req.params.key);
    const { rows } = await query(`SELECT setting_value FROM restaurant_settings WHERE setting_key = $1`, [req.params.key]);
    const raw = rows[0]?.setting_value;
    const value = meta ? deserialize(raw, meta.type, meta.default) : raw;
    res.json({ key: req.params.key, value, meta: meta || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Bulk update
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: 'No items to update' });

    const user = req.user?.username || req.user?.email || null;
    const errors = [];
    for (const it of items) {
      try {
        await upsertOne(it.key, it.value, user);
      } catch (e) {
        errors.push({ key: it.key, error: e.message });
      }
    }

    // Emit realtime event for important toggles
    const io = req.app.get('io');
    if (io) {
      io.emit('settingsUpdated', { keys: items.map(i => i.key) });
      const hh = items.find(i => i.key === 'happyhour.enabled');
      if (hh) io.emit('happyHourSettingsUpdated', { enabled: hh.value });
    }

    if (errors.length) return res.status(207).json({ success: true, errors });
    res.json({ success: true });
  } catch (err) {
    console.error('settings PUT error:', err);
    res.status(500).json({ error: 'Failed to save settings', details: err.message });
  }
});

// Single key update (kept for convenience)
router.put('/key/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await upsertOne(req.params.key, req.body?.value, req.user?.username || null);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reset a section to its defaults
router.post('/reset/:sectionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const section = SECTIONS.find(s => s.id === req.params.sectionId);
    if (!section) return res.status(404).json({ error: 'Unknown section' });
    for (const f of section.fields) {
      await upsertOne(f.key, f.default, req.user?.username || null);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset', details: err.message });
  }
});

/* ------------------------------------------------------------
   Operating hours (separate relational table)
   ------------------------------------------------------------ */
router.get('/operating-hours', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT weekday, is_open, open_time, close_time, break_start, break_end
      FROM operating_hours
      ORDER BY weekday
    `);
    res.json({ hours: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

router.put('/operating-hours', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.hours) ? req.body.hours : [];
    for (const h of items) {
      const weekday = Number(h.weekday);
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
      await query(`
        INSERT INTO operating_hours (weekday, is_open, open_time, close_time, break_start, break_end, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (tenant_id, weekday) DO UPDATE SET
          is_open     = EXCLUDED.is_open,
          open_time   = EXCLUDED.open_time,
          close_time  = EXCLUDED.close_time,
          break_start = EXCLUDED.break_start,
          break_end   = EXCLUDED.break_end,
          updated_at  = CURRENT_TIMESTAMP
      `, [weekday, !!h.is_open, h.open_time || '09:00', h.close_time || '22:00', h.break_start || null, h.break_end || null]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

/* ------------------------------------------------------------
   Delivery zones (separate relational table)
   ------------------------------------------------------------ */
router.get('/delivery-zones', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT id, name, max_distance_km, fee, min_order_amount, estimated_minutes, is_active, sort_order
      FROM delivery_zones_config
      ORDER BY sort_order, id
    `);
    res.json({ zones: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

router.post('/delivery-zones', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, max_distance_km, fee, min_order_amount = 0, estimated_minutes = 30, is_active = true, sort_order = 0 } = req.body || {};
    if (!name || max_distance_km === undefined || fee === undefined) {
      return res.status(400).json({ error: 'name, max_distance_km and fee are required' });
    }
    const { rows } = await query(`
      INSERT INTO delivery_zones_config (name, max_distance_km, fee, min_order_amount, estimated_minutes, is_active, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [name, max_distance_km, fee, min_order_amount, estimated_minutes, is_active, sort_order]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

router.put('/delivery-zones/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, max_distance_km, fee, min_order_amount, estimated_minutes, is_active, sort_order } = req.body || {};
    const { rows } = await query(`
      UPDATE delivery_zones_config SET
        name = COALESCE($2, name),
        max_distance_km = COALESCE($3, max_distance_km),
        fee = COALESCE($4, fee),
        min_order_amount = COALESCE($5, min_order_amount),
        estimated_minutes = COALESCE($6, estimated_minutes),
        is_active = COALESCE($7, is_active),
        sort_order = COALESCE($8, sort_order)
      WHERE id = $1 RETURNING *
    `, [req.params.id, name, max_distance_km, fee, min_order_amount, estimated_minutes, is_active, sort_order]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

router.delete('/delivery-zones/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await query(`DELETE FROM delivery_zones_config WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

/* ------------------------------------------------------------
   Payment methods
   ------------------------------------------------------------ */
router.get('/payment-methods', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT id, method_key, display_name, is_enabled, surcharge_percent, icon, sort_order
      FROM payment_methods_config
      ORDER BY sort_order, id
    `);
    res.json({ methods: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

router.put('/payment-methods/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { display_name, is_enabled, surcharge_percent, icon, sort_order } = req.body || {};
    const { rows } = await query(`
      UPDATE payment_methods_config SET
        display_name = COALESCE($2, display_name),
        is_enabled = COALESCE($3, is_enabled),
        surcharge_percent = COALESCE($4, surcharge_percent),
        icon = COALESCE($5, icon),
        sort_order = COALESCE($6, sort_order)
      WHERE id = $1 RETURNING *
    `, [req.params.id, display_name, is_enabled, surcharge_percent, icon, sort_order]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

/* ------------------------------------------------------------
   Tenant profile (SaaS)
   ------------------------------------------------------------ */
router.get('/tenant', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM tenant_profile WHERE tenant_id = 1`);
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

router.put('/tenant', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { plan, subscription_status, trial_ends_at, billing_email, features_json } = req.body || {};
    const { rows } = await query(`
      UPDATE tenant_profile SET
        plan = COALESCE($1, plan),
        subscription_status = COALESCE($2, subscription_status),
        trial_ends_at = COALESCE($3, trial_ends_at),
        billing_email = COALESCE($4, billing_email),
        features_json = COALESCE($5, features_json),
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = 1 RETURNING *
    `, [plan, subscription_status, trial_ends_at, billing_email, features_json]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

/* ------------------------------------------------------------
   Menu Photos Management
   ------------------------------------------------------------ */

// GET /api/settings/menu-photos - Get list of menu photo URLs
router.get('/menu-photos', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT setting_value FROM restaurant_settings WHERE setting_key = 'menu.photos'
    `);
    
    if (rows.length > 0 && rows[0].setting_value) {
      const photos = JSON.parse(rows[0].setting_value);
      res.json({ photos });
    } else {
      // Return default menu photos
      res.json({
        photos: [
          '/menu/1.jpg',
          '/menu/2.jpeg',
          '/menu/3.jpeg',
          '/menu/4.jpg',
          '/menu/5.jpg',
          '/menu/6.jpeg',
          '/menu/7.jpeg',
          '/menu/8.jpeg',
          '/menu/9.jpeg',
          '/menu/10.jpeg'
        ]
      });
    }
  } catch (err) {
    console.error('Error fetching menu photos:', err);
    res.status(500).json({ error: 'Failed to fetch menu photos', details: err.message });
  }
});

// POST /api/settings/menu-photos - Update menu photos list
router.post('/menu-photos', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { photos } = req.body;
    
    if (!Array.isArray(photos)) {
      return res.status(400).json({ error: 'Photos must be an array' });
    }

    const photosJson = JSON.stringify(photos);
    
    // Upsert the menu photos setting
    await query(`
      INSERT INTO restaurant_settings (setting_key, setting_value, updated_at)
      VALUES ('menu.photos', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        updated_at = CURRENT_TIMESTAMP
    `, [photosJson]);

    res.json({ success: true, photos });
  } catch (err) {
    console.error('Error updating menu photos:', err);
    res.status(500).json({ error: 'Failed to update menu photos', details: err.message });
  }
});

module.exports = router;
module.exports.SECTIONS = SECTIONS;
module.exports.FIELDS = FIELDS;
