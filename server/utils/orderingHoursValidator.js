/**
 * Ordering Hours Validator - Checks if orders can be accepted based on settings
 * Uses dynamic settings for operating hours and order cutoff times
 */

const { query } = require('../database/config');
const settingsLoader = require('./settingsLoader');

class OrderingHoursValidator {
  /**
   * Check if restaurant is currently open for orders
   * @returns {Promise<{open: boolean, reason: string}>}
   */
  async isOpenForOrders() {
    try {
      // Check if temporarily closed
      const temporarilyClosed = await settingsLoader.get('hours.temporarily_closed', false);
      if (temporarilyClosed) {
        const closedReason = await settingsLoader.get('hours.closed_reason', 'We are closed right now');
        return { open: false, reason: closedReason };
      }

      // Get current time in restaurant timezone
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Get operating hours for today
      const { rows } = await query(
        `SELECT is_open, open_time, close_time, break_start, break_end 
         FROM operating_hours 
         WHERE weekday = $1`,
        [dayOfWeek]
      );

      if (!rows.length || !rows[0].is_open) {
        return { open: false, reason: 'Restaurant is closed today' };
      }

      const hours = rows[0];

      // Check if within operating hours
      if (currentTime < hours.open_time || currentTime > hours.close_time) {
        return { open: false, reason: `Restaurant is closed. Opens at ${hours.open_time}` };
      }

      // Check if in break time
      if (hours.break_start && hours.break_end) {
        if (currentTime >= hours.break_start && currentTime <= hours.break_end) {
          return { open: false, reason: `Restaurant is on break. Resumes at ${hours.break_end}` };
        }
      }

      // Check if within last order buffer
      const lastOrderBuffer = await settingsLoader.get('hours.last_order_buffer', 30);
      const closeTime = hours.close_time;
      const [closeHour, closeMin] = closeTime.split(':').map(Number);
      const closeTimeMs = closeHour * 60 + closeMin;
      const currentTimeMs = now.getHours() * 60 + now.getMinutes();
      const minutesUntilClose = closeTimeMs - currentTimeMs;

      if (minutesUntilClose < lastOrderBuffer) {
        return { 
          open: false, 
          reason: `Kitchen is closing soon. Last orders accepted at ${this.subtractMinutes(closeTime, lastOrderBuffer)}` 
        };
      }

      return { open: true, reason: 'Open for orders' };
    } catch (error) {
      console.error('Error checking ordering hours:', error);
      // Default to open if there's an error
      return { open: true, reason: 'Open for orders' };
    }
  }

  /**
   * Check if pre-orders are allowed when closed
   * @returns {Promise<boolean>}
   */
  async allowPreOrders() {
    try {
      return await settingsLoader.get('hours.accept_pre_orders', true);
    } catch (error) {
      console.error('Error checking pre-order setting:', error);
      return true;
    }
  }

  /**
   * Get estimated prep time for an order
   * @returns {Promise<number>} - Minutes
   */
  async getEstimatedPrepTime() {
    try {
      return await settingsLoader.get('ordering.order_prep_buffer_min', 15);
    } catch (error) {
      console.error('Error getting prep time:', error);
      return 15;
    }
  }

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
}

module.exports = new OrderingHoursValidator();
