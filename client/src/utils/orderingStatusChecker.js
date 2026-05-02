/**
 * Ordering Status Checker - Checks if orders can be placed based on restaurant hours
 * Uses dynamic settings from admin
 */

import settingsService from '../services/settingsService';

export const orderingStatusChecker = {
  /**
   * Check if restaurant is currently open for orders
   * @returns {Promise<{canOrder: boolean, message: string, reason: string}>}
   */
  async canPlaceOrder() {
    try {
      // Check if temporarily closed
      const temporarilyClosed = settingsService.get('hours.temporarily_closed', false);
      if (temporarilyClosed) {
        const closedReason = settingsService.get('hours.closed_reason', 'We are closed right now');
        return { 
          canOrder: false, 
          message: closedReason,
          reason: 'temporarily_closed'
        };
      }

      // Get current time
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Get operating hours from settings
      const hoursSettings = settingsService.get('hours.weekly', []);
      const todayHours = hoursSettings.find(h => h.weekday === dayOfWeek);

      if (!todayHours || !todayHours.is_open) {
        return { 
          canOrder: false, 
          message: 'Restaurant is closed today',
          reason: 'closed_today'
        };
      }

      // Check if within operating hours
      if (currentTime < todayHours.open_time || currentTime > todayHours.close_time) {
        return { 
          canOrder: false, 
          message: `Restaurant is closed. Opens at ${todayHours.open_time}`,
          reason: 'outside_hours'
        };
      }

      // Check if in break time
      if (todayHours.break_start && todayHours.break_end) {
        if (currentTime >= todayHours.break_start && currentTime <= todayHours.break_end) {
          return { 
            canOrder: false, 
            message: `Restaurant is on break. Resumes at ${todayHours.break_end}`,
            reason: 'on_break'
          };
        }
      }

      // Check if within last order buffer
      const lastOrderBuffer = settingsService.get('hours.last_order_buffer', 30);
      const closeTime = todayHours.close_time;
      const [closeHour, closeMin] = closeTime.split(':').map(Number);
      const closeTimeMs = closeHour * 60 + closeMin;
      const currentTimeMs = now.getHours() * 60 + now.getMinutes();
      const minutesUntilClose = closeTimeMs - currentTimeMs;

      if (minutesUntilClose < lastOrderBuffer) {
        const lastOrderTime = this.subtractMinutes(closeTime, lastOrderBuffer);
        return { 
          canOrder: false, 
          message: `Kitchen is closing soon. Last orders accepted at ${lastOrderTime}`,
          reason: 'last_order_buffer'
        };
      }

      return { 
        canOrder: true, 
        message: 'Open for orders',
        reason: 'open'
      };
    } catch (error) {
      console.error('Error checking ordering status:', error);
      // Default to open if there's an error
      return { 
        canOrder: true, 
        message: 'Open for orders',
        reason: 'open'
      };
    }
  },

  /**
   * Get minimum order amount for a given order type
   * @param {string} orderType - 'dine-in' or 'delivery'
   * @returns {number} - Minimum order amount in Rs.
   */
  getMinimumOrderAmount(orderType = 'dine-in') {
    if (orderType === 'delivery') {
      return settingsService.get('ordering.min_order_delivery', 200);
    }
    return settingsService.get('ordering.min_order_dinein', 0);
  },

  /**
   * Get estimated prep time
   * @returns {number} - Minutes
   */
  getEstimatedPrepTime() {
    return settingsService.get('ordering.order_prep_buffer_min', 15);
  },

  /**
   * Check if pre-orders are allowed when closed
   * @returns {boolean}
   */
  allowPreOrders() {
    return settingsService.get('hours.accept_pre_orders', true);
  },

  /**
   * Helper: Subtract minutes from time string (HH:MM)
   */
  subtractMinutes(timeStr, minutes) {
    const [hours, mins] = timeStr.split(':').map(Number);
    let totalMins = hours * 60 + mins - minutes;
    if (totalMins < 0) totalMins += 24 * 60;
    const newHours = Math.floor(totalMins / 60) % 24;
    const newMins = totalMins % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  }
};
