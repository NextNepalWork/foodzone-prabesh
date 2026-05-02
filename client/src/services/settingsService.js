import { fetchApi } from './apiService';

class SettingsService {
  constructor() {
    this.settings = {};
    this.loaded = false;
    this.loading = false;
    this.listeners = new Set();
  }

  // Load settings from API
  async loadSettings() {
    if (this.loading) return this.settings;
    
    try {
      this.loading = true;
      // Use public endpoint for customer-facing settings
      const response = await fetchApi.get('/api/settings/public');
      
      if (response && typeof response === 'object') {
        this.settings = response;
        this.loaded = true;
        this.notifyListeners();
      }
      
      return this.settings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Return default settings if API fails
      this.settings = this.getDefaultSettings();
      return this.settings;
    } finally {
      this.loading = false;
    }
  }

  // Get default settings as fallback
  getDefaultSettings() {
    return {
      // Business settings
      'business.name': 'Food Zone',
      'business.phone': '+977-1-4567890',
      'business.address_line1': 'Kathmandu',
      'business.city': 'Kathmandu',
      'business.country': 'Nepal',
      
      // Tables
      'tables.table_count': 25,
      
      // Orders
      'ordering.auto_accept_orders': false,
      'ordering.order_prep_buffer_min': 15,
      'ordering.min_order_delivery': 200,
      
      // Tax & Service
      'tax.vat_percent': 13,
      'tax.service_charge_percent': 10,
      'tax.vat_inclusive': true,
      
      // Delivery
      'delivery.base_fee': 100,
      'delivery.estimated_min': 35,
      
      // Notifications
      'notify.sound_enabled': true,
      'notify.sound_volume': 70,
      'notify.low_stock_alerts': true,
      
      // Display
      'locale.currency_symbol': 'Rs.',
      'locale.language': 'en',
      
      // Customer app
      'customer.welcome_banner': 'Welcome! Tap an item to order.',
      'customer.show_prep_time': true,
    };
  }

  // Get a specific setting value
  get(key, defaultValue = null) {
    if (!this.loaded) {
      // Return default value if settings not loaded yet
      const defaults = this.getDefaultSettings();
      return defaults[key] !== undefined ? defaults[key] : defaultValue;
    }
    
    return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
  }

  // Get table count specifically
  getTableCount() {
    return parseInt(this.get('tables.table_count', 25));
  }

  // Get restaurant info
  getRestaurantInfo() {
    return {
      name: this.get('business.name', 'Food Zone'),
      phone: this.get('business.phone', '+977-1-4567890'),
      address: this.get('business.address_line1', 'Kathmandu') + ', ' + this.get('business.city', 'Kathmandu') + ', ' + this.get('business.country', 'Nepal'),
      email: this.get('business.email', ''),
      website: this.get('business.website', ''),
      tagline: this.get('business.tagline', 'Quality food, served fresh')
    };
  }

  // Get order settings
  getOrderSettings() {
    return {
      autoAccept: this.get('ordering.auto_accept_orders', false),
      preparationTime: parseInt(this.get('ordering.order_prep_buffer_min', 15)),
      minOrderDelivery: parseFloat(this.get('ordering.min_order_delivery', 200)),
      allowSpecialRequests: this.get('ordering.allow_special_requests', true),
      requireCustomerPhone: this.get('ordering.require_customer_phone', true)
    };
  }

  // Get payment settings
  getPaymentSettings() {
    return {
      taxRate: parseFloat(this.get('tax.vat_percent', 13)),
      serviceChargeRate: parseFloat(this.get('tax.service_charge_percent', 10)),
      taxInclusive: this.get('tax.vat_inclusive', true),
      currencySymbol: this.get('locale.currency_symbol', 'Rs.'),
      currencyCode: this.get('locale.currency_code', 'NPR')
    };
  }

  // Get notification settings
  getNotificationSettings() {
    return {
      soundEnabled: this.get('notify.sound_enabled', true),
      soundVolume: parseInt(this.get('notify.sound_volume', 70)),
      tableCallSound: this.get('notify.table_call_sound', true),
      browserPush: this.get('notify.browser_push', true),
      emailOnOrder: this.get('notify.email_on_order', false),
      emailAddress: this.get('notify.email_address', ''),
      slackWebhook: this.get('notify.slack_webhook', ''),
      lowStockAlerts: this.get('notify.low_stock_alerts', true)
    };
  }

  // Get display settings
  getDisplaySettings() {
    return {
      currencySymbol: this.get('locale.currency_symbol', 'Rs.'),
      currencyCode: this.get('locale.currency_code', 'NPR'),
      currencyPosition: this.get('locale.currency_position', 'prefix'),
      timezone: this.get('locale.timezone', 'Asia/Kathmandu'),
      dateFormat: this.get('locale.date_format', 'YYYY-MM-DD'),
      timeFormat: this.get('locale.time_format', '12h'),
      language: this.get('locale.language', 'en')
    };
  }

  // Get delivery settings
  getDeliverySettings() {
    return {
      enabled: this.get('ordering.delivery_enabled', true),
      baseFee: parseFloat(this.get('delivery.base_fee', 100)),
      perKmFee: parseFloat(this.get('delivery.per_km_fee', 20)),
      baseZoneKm: parseFloat(this.get('delivery.base_zone_km', 3)),
      maxDistanceKm: parseFloat(this.get('delivery.max_distance_km', 10)),
      freeDeliveryThreshold: parseFloat(this.get('delivery.free_delivery_threshold', 2000)),
      estimatedMin: parseInt(this.get('delivery.estimated_min', 35)),
      driverContactSharing: this.get('delivery.driver_contact_sharing', true)
    };
  }

  // Get hours settings
  getHoursSettings() {
    return {
      temporarilyClosed: this.get('hours.temporarily_closed', false),
      closedReason: this.get('hours.closed_reason', 'We are closed right now'),
      acceptPreOrders: this.get('hours.accept_pre_orders', true),
      holidayNote: this.get('hours.holiday_note', ''),
      lastOrderBuffer: parseInt(this.get('hours.last_order_buffer', 30))
    };
  }

  // Get happy hour settings
  getHappyHourSettings() {
    return {
      enabled: this.get('happyhour.enabled', true),
      startTime: this.get('happyhour.start_time', '15:00'),
      endTime: this.get('happyhour.end_time', '18:00'),
      discountPercent: parseFloat(this.get('happyhour.discount_percent', 15)),
      days: this.get('happyhour.days', [1,2,3,4,5]),
      bannerText: this.get('happyhour.banner_text', 'Happy Hour! Save on selected items'),
      appliesTo: this.get('happyhour.applies_to', 'flagged')
    };
  }

  // Get print/receipt settings
  getPrintSettings() {
    return {
      autoPrint: this.get('print.auto_print', true),
      copiesKitchen: parseInt(this.get('print.copies_kitchen', 1)),
      copiesCustomer: parseInt(this.get('print.copies_customer', 1)),
      paperWidthMm: this.get('print.paper_width_mm', '80'),
      showLogo: this.get('print.show_logo', true),
      showQr: this.get('print.show_qr', false),
      header: this.get('print.header', 'Thank you for visiting!'),
      footer: this.get('print.footer', 'Visit us again 🙏'),
      showVat: this.get('print.show_vat', true),
      showItemImage: this.get('print.show_item_image', false)
    };
  }

  // Get security settings
  getSecuritySettings() {
    return {
      staffAutoLogoutMin: parseInt(this.get('security.staff_auto_logout_min', 60)),
      requirePinVoid: this.get('security.require_pin_void', true),
      requirePinDiscount: this.get('security.require_pin_discount', true),
      managerPin: this.get('security.manager_pin', ''),
      twoFactor: this.get('security.two_factor', false),
      lockOnInactivity: this.get('security.lock_on_inactivity', true),
      allowedIps: this.get('security.allowed_ips', '')
    };
  }

  // Get customer app settings
  getCustomerAppSettings() {
    return {
      welcomeBanner: this.get('customer.welcome_banner', 'Welcome! Tap an item to order.'),
      welcomeBannerUrl: this.get('customer.welcome_banner_url', ''),
      allowReviews: this.get('customer.allow_reviews', true),
      reviewsModeration: this.get('customer.reviews_moderation', true),
      showOrderHistory: this.get('customer.show_order_history', true),
      menuSort: this.get('customer.menu_sort', 'category'),
      showPrepTime: this.get('customer.show_prep_time', true),
      showRunningTotal: this.get('customer.show_running_total', true)
    };
  }

  // Get table settings
  getTableSettings() {
    return {
      tableCount: parseInt(this.get('tables.table_count', 25)),
      requirePinClear: this.get('tables.require_pin_clear', false),
      sessionTimeoutMin: parseInt(this.get('tables.session_timeout_min', 120)),
      qrBranding: this.get('tables.qr_branding', true),
      allowCombineBills: this.get('tables.allow_combine_bills', true)
    };
  }

  // Get integrations settings
  getIntegrationsSettings() {
    return {
      googleAnalytics: this.get('integrations.google_analytics', ''),
      facebookPixel: this.get('integrations.facebook_pixel', ''),
      webhookOrderPaid: this.get('integrations.webhook_order_paid', ''),
      smsProvider: this.get('integrations.sms_provider', 'none'),
      smsApiKey: this.get('integrations.sms_api_key', ''),
      whatsappEnabled: this.get('integrations.whatsapp_enabled', false),
      whatsappNumber: this.get('integrations.whatsapp_number', '')
    };
  }

  // Get timeout and performance settings
  getTimeoutSettings() {
    return {
      apiTimeoutMs: parseInt(this.get('api.timeout_ms', 30000)),
      apiColdStartTimeoutMs: parseInt(this.get('api.timeout_cold_start_ms', 60000)),
      apiRetryDelayMs: parseInt(this.get('api.retry_delay_ms', 1000)),
      notificationDurationMs: parseInt(this.get('ui.notification_duration_ms', 5000)),
      toastDurationMs: parseInt(this.get('ui.toast_duration_ms', 3000)),
      locationErrorClearMs: parseInt(this.get('ui.location_error_clear_ms', 3000)),
      formResetDelayMs: parseInt(this.get('ui.form_reset_delay_ms', 3000)),
      callRejectionDelayMs: parseInt(this.get('ui.call_rejection_delay_ms', 3000)),
      callBusyDelayMs: parseInt(this.get('ui.call_busy_delay_ms', 3500)),
      callEndedDelayMs: parseInt(this.get('ui.call_ended_delay_ms', 2000)),
      buttonResetDelayMs: parseInt(this.get('ui.button_reset_delay_ms', 3000)),
      debounceDelayMs: parseInt(this.get('ui.debounce_delay_ms', 300)),
      printDelayMs: parseInt(this.get('ui.print_delay_ms', 250)),
      cacheCleanupIntervalMs: parseInt(this.get('cache.cleanup_interval_ms', 300000)),
      happyHourIntervalMs: parseInt(this.get('refresh.happy_hour_interval_ms', 60000)),
      analyticsIntervalMs: parseInt(this.get('refresh.analytics_interval_ms', 30000)),
      tableStatusIntervalMs: parseInt(this.get('refresh.table_status_interval_ms', 30000)),
      timeDisplayIntervalMs: parseInt(this.get('refresh.time_display_interval_ms', 30000)),
      geolocationTimeoutMs: parseInt(this.get('geolocation.timeout_ms', 15000)),
      geolocationMaxAgeMs: parseInt(this.get('geolocation.max_age_ms', 300000)),
      audioBeepIntervalMs: parseInt(this.get('audio.beep_interval_ms', 200)),
      ringtoneRepeatMs: parseInt(this.get('audio.ringtone_repeat_ms', 1000)),
      ringingToneIntervalMs: parseInt(this.get('audio.ringing_tone_interval_ms', 1500)),
      swRetrySyncDelayMs: parseInt(this.get('sw.retry_sync_delay_ms', 60000)),
      swHeartbeatIntervalMs: parseInt(this.get('sw.heartbeat_interval_ms', 30000)),
      swKeepAliveIntervalMs: parseInt(this.get('sw.keep_alive_interval_ms', 30000))
    };
  }

  // Update a setting
  async updateSetting(key, value) {
    try {
      await fetchApi.put('/api/settings', { [key]: value });
      this.settings[key] = value;
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Failed to update setting:', error);
      return false;
    }
  }

  // Update multiple settings
  async updateSettings(updates) {
    try {
      await fetchApi.put('/api/settings', updates);
      Object.assign(this.settings, updates);
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Failed to update settings:', error);
      return false;
    }
  }

  // Subscribe to settings changes
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners of changes
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.settings);
      } catch (error) {
        console.error('Settings listener error:', error);
      }
    });
  }

  // Check if settings are loaded
  isLoaded() {
    return this.loaded;
  }

  // Force reload settings
  async reload() {
    this.loaded = false;
    this.loading = false;
    return this.loadSettings();
  }
}

// Create singleton instance
const settingsService = new SettingsService();

// DO NOT auto-load settings on import - it causes circular dependency issues
// Settings will be loaded on first use by components via useSettings hook

export default settingsService;