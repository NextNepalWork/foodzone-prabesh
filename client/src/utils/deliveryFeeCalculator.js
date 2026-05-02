/**
 * Delivery Fee Calculator - Uses dynamic settings from admin
 * Calculates delivery fees based on distance and configured rates
 */

import settingsService from '../services/settingsService';

export const deliveryFeeCalculator = {
  /**
   * Calculate delivery fee based on distance and order subtotal
   * @param {number} distanceKm - Distance in kilometers
   * @param {number} subtotal - Order subtotal in Rs.
   * @returns {Promise<{fee: number, breakdown: string}>}
   */
  async calculateFee(distanceKm, subtotal) {
    try {
      const deliverySettings = settingsService.getDeliverySettings();
      
      // Check if free delivery threshold is met
      if (subtotal >= deliverySettings.freeDeliveryThreshold) {
        return {
          fee: 0,
          breakdown: `Free delivery (order above Rs. ${deliverySettings.freeDeliveryThreshold})`
        };
      }

      // Check if distance exceeds maximum
      if (distanceKm > deliverySettings.maxDistanceKm) {
        return {
          fee: null,
          breakdown: `Delivery not available beyond ${deliverySettings.maxDistanceKm}km`
        };
      }

      // Calculate fee based on distance
      let fee = 0;
      let breakdown = '';

      if (distanceKm <= deliverySettings.baseZoneKm) {
        // Within base zone - use base fee
        fee = deliverySettings.baseFee;
        breakdown = `Base fee (within ${deliverySettings.baseZoneKm}km): Rs. ${fee}`;
      } else {
        // Beyond base zone - add per-km fee
        const extraKm = distanceKm - deliverySettings.baseZoneKm;
        const extraFee = Math.ceil(extraKm) * deliverySettings.perKmFee;
        fee = deliverySettings.baseFee + extraFee;
        breakdown = `Base fee: Rs. ${deliverySettings.baseFee} + ${Math.ceil(extraKm)}km × Rs. ${deliverySettings.perKmFee}/km = Rs. ${fee}`;
      }

      return { fee, breakdown };
    } catch (error) {
      console.error('Error calculating delivery fee:', error);
      // Fallback to default values
      return {
        fee: 100,
        breakdown: 'Standard delivery fee'
      };
    }
  },

  /**
   * Get estimated delivery time based on distance
   * @param {number} distanceKm - Distance in kilometers
   * @returns {Promise<number>} - Estimated minutes
   */
  async getEstimatedTime(distanceKm) {
    try {
      const deliverySettings = settingsService.getDeliverySettings();
      // Rough estimate: base time + 2 minutes per km
      const estimatedMin = deliverySettings.estimatedMin + Math.ceil(distanceKm * 2);
      return estimatedMin;
    } catch (error) {
      console.error('Error calculating estimated time:', error);
      return 35; // Default fallback
    }
  },

  /**
   * Validate if delivery is possible to a location
   * @param {number} distanceKm - Distance in kilometers
   * @returns {Promise<{valid: boolean, reason: string}>}
   */
  async validateDeliveryLocation(distanceKm) {
    try {
      const deliverySettings = settingsService.getDeliverySettings();
      
      if (!deliverySettings.enabled) {
        return { valid: false, reason: 'Delivery is currently disabled' };
      }

      if (distanceKm > deliverySettings.maxDistanceKm) {
        return { 
          valid: false, 
          reason: `Delivery not available beyond ${deliverySettings.maxDistanceKm}km. Your location is ${distanceKm.toFixed(1)}km away.` 
        };
      }

      return { valid: true, reason: 'Delivery available' };
    } catch (error) {
      console.error('Error validating delivery location:', error);
      return { valid: true, reason: 'Delivery available' };
    }
  }
};
