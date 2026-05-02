// Simple Table ID System
// Direct numeric table IDs (1-25) for fast and reliable table ordering

/**
 * Get table number from URL path
 * @param {string} urlPath - The URL path (e.g., '5' or '/5')
 * @returns {number|null} - Table number or null if invalid
 */
export function getTableNumberFromUrl(urlPath) {
  // Remove leading slash if present
  const cleanPath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
  const tableNumber = parseInt(cleanPath, 10);
  
  // Validate table number is between 1-25
  if (isNaN(tableNumber) || tableNumber < 1 || tableNumber > 25) {
    return null;
  }
  
  return tableNumber;
}

/**
 * Get URL from table number
 * @param {number} tableNumber - The table number (1-25)
 * @returns {string|null} - URL path or null if invalid
 */
export function getUrlFromTableNumber(tableNumber) {
  // Validate table number
  if (typeof tableNumber !== 'number' || tableNumber < 1 || tableNumber > 25) {
    return null;
  }
  
  return tableNumber.toString();
}

/**
 * Check if a URL path is a valid table URL
 * @param {string} urlPath - The URL path to check
 * @returns {boolean} - True if valid table URL
 */
export function isValidTableUrl(urlPath) {
  const tableNumber = getTableNumberFromUrl(urlPath);
  return tableNumber !== null;
}

/**
 * Get all table URLs for QR code generation
 * @returns {Array} - Array of {tableNumber, url, fullUrl} objects
 */
export function getAllTableUrls(baseUrl = 'https://foodzoneduwakot.netlify.app') {
  const tables = [];
  for (let i = 1; i <= 25; i++) {
    tables.push({
      tableNumber: i,
      url: i.toString(),
      fullUrl: `${baseUrl}/${i}`,
      qrText: `Table ${i}`
    });
  }
  return tables;
}

export default {
  getTableNumberFromUrl,
  getUrlFromTableNumber,
  isValidTableUrl,
  getAllTableUrls
};
