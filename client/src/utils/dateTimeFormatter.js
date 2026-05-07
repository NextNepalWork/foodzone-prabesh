import settingsService from '../services/settingsService';

/**
 * Format date/time using settings from the restaurant
 * Supports multiple timezones and date/time formats
 */
class DateTimeFormatter {
  constructor() {
    this.settings = settingsService.getDisplaySettings();
  }

  // Update settings when they change
  updateSettings() {
    this.settings = settingsService.getDisplaySettings();
  }

  /**
   * Format a date to locale string with timezone
   * @param {Date|string|number} date - Date to format
   * @param {object} options - Formatting options
   * @returns {string} - Formatted date string
   */
  formatDate(date, options = {}) {
    const d = new Date(date);
    const locale = this.settings.language === 'ne' ? 'ne-NP' : 'en-US';
    
    const defaultOptions = {
      timeZone: this.settings.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options
    };

    return d.toLocaleDateString(locale, defaultOptions);
  }

  /**
   * Format time with timezone
   * @param {Date|string|number} date - Date to format
   * @param {object} options - Formatting options
   * @returns {string} - Formatted time string
   */
  formatTime(date, options = {}) {
    const d = new Date(date);
    const locale = this.settings.language === 'ne' ? 'ne-NP' : 'en-US';
    
    const hour12 = this.settings.timeFormat === '12h';
    const defaultOptions = {
      timeZone: this.settings.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12,
      ...options
    };

    console.log('🕐 formatTime called:', {
      input: date,
      parsedDate: d.toISOString(),
      timezone: this.settings.timezone,
      timeFormat: this.settings.timeFormat,
      hour12,
      locale
    });

    const result = d.toLocaleTimeString(locale, defaultOptions);
    console.log('🕐 formatTime result:', result);
    return result;
  }

  /**
   * Format date and time together
   * @param {Date|string|number} date - Date to format
   * @param {object} options - Formatting options
   * @returns {string} - Formatted date and time string
   */
  formatDateTime(date, options = {}) {
    const d = new Date(date);
    const locale = this.settings.language === 'ne' ? 'ne-NP' : 'en-US';
    
    const hour12 = this.settings.timeFormat === '12h';
    const defaultOptions = {
      timeZone: this.settings.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12,
      ...options
    };

    return d.toLocaleString(locale, defaultOptions);
  }

  /**
   * Format time with weekday and time
   * @param {Date|string|number} date - Date to format
   * @returns {string} - Formatted string like "Mon 14:30"
   */
  formatTimeWithWeekday(date) {
    const d = new Date(date);
    const locale = this.settings.language === 'ne' ? 'ne-NP' : 'en-US';
    
    const hour12 = this.settings.timeFormat === '12h';
    const options = {
      timeZone: this.settings.timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12
    };

    return d.toLocaleString(locale, options);
  }

  /**
   * Get current date in restaurant timezone
   * @returns {Date} - Current date in restaurant timezone
   */
  getCurrentDate() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: this.settings.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    
    return new Date(`${year}-${month}-${day}`);
  }

  /**
   * Get current time in restaurant timezone
   * @returns {object} - {hours, minutes, seconds}
   */
  getCurrentTime() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: this.settings.timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    return {
      hours: parseInt(parts.find(p => p.type === 'hour').value),
      minutes: parseInt(parts.find(p => p.type === 'minute').value),
      seconds: parseInt(parts.find(p => p.type === 'second').value)
    };
  }

  /**
   * Check if a date is today in restaurant timezone
   * @param {Date|string|number} date - Date to check
   * @returns {boolean}
   */
  isToday(date) {
    const d = new Date(date);
    const today = this.getCurrentDate();
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: this.settings.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const dParts = formatter.formatToParts(d);
    const dYear = dParts.find(p => p.type === 'year').value;
    const dMonth = dParts.find(p => p.type === 'month').value;
    const dDay = dParts.find(p => p.type === 'day').value;
    
    const todayParts = formatter.formatToParts(today);
    const todayYear = todayParts.find(p => p.type === 'year').value;
    const todayMonth = todayParts.find(p => p.type === 'month').value;
    const todayDay = todayParts.find(p => p.type === 'day').value;
    
    return dYear === todayYear && dMonth === todayMonth && dDay === todayDay;
  }

  /**
   * Get timezone offset in hours
   * @returns {number} - Timezone offset in hours
   */
  getTimezoneOffset() {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: this.settings.timezone }));
    return (tzDate - utcDate) / (1000 * 60 * 60);
  }
}

// Create singleton instance
const dateTimeFormatter = new DateTimeFormatter();

export default dateTimeFormatter;
