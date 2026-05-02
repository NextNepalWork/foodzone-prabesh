// Dynamic currency formatting utility
import settingsService from '../services/settingsService';

// Format currency using dynamic settings
export function formatCurrency(amount, options = {}) {
  const displaySettings = settingsService.getDisplaySettings();
  const symbol = displaySettings.currencySymbol || 'Rs.';
  const position = displaySettings.currencyPosition || 'prefix';
  
  if (amount === null || amount === undefined || isNaN(amount)) {
    return position === 'prefix' ? `${symbol} 0` : `0 ${symbol}`;
  }
  
  const formattedAmount = Math.round(amount).toLocaleString();
  
  if (position === 'suffix') {
    return `${formattedAmount} ${symbol}`;
  } else {
    return `${symbol} ${formattedAmount}`;
  }
}

// Legacy function name for backward compatibility
export function formatNPR(amount) {
  return formatCurrency(amount);
}

// Get currency symbol only
export function getCurrencySymbol() {
  const displaySettings = settingsService.getDisplaySettings();
  return displaySettings.currencySymbol || 'Rs.';
}

// Get currency code
export function getCurrencyCode() {
  const displaySettings = settingsService.getDisplaySettings();
  return displaySettings.currencyCode || 'NPR';
}

const currencyUtils = {
  formatCurrency,
  formatNPR,
  getCurrencySymbol,
  getCurrencyCode
};

export default currencyUtils;