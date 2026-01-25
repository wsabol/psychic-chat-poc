/**
 * Price Formatting Utilities
 * Handles data formatting and transformation for price objects
 */

/**
 * Format amount in cents to dollar string
 * @param {number} amountInCents - Amount in cents
 * @returns {string} Formatted amount string (e.g., "$19.99")
 */
export function formatAmount(amountInCents) {
  return `$${(amountInCents / 100).toFixed(2)}`;
}

/**
 * Format interval to human-readable string
 * @param {string} interval - Billing interval
 * @returns {string} Formatted interval or 'N/A'
 */
export function formatInterval(interval) {
  return interval || 'N/A';
}

/**
 * Enhance price object with formatted fields and subscriber count
 * @param {Object} price - Stripe price object
 * @param {number} subscriberCount - Number of subscribers on this price
 * @returns {Object} Enhanced price object
 */
export function enhancePriceObject(price, subscriberCount = 0) {
  return {
    ...price,
    subscriberCount,
    productName: price.product?.name || 'Unknown Product',
    amountFormatted: formatAmount(price.unit_amount),
    intervalFormatted: formatInterval(price.recurring?.interval),
  };
}

/**
 * Format migration results for API response
 * @param {Object} results - Raw migration results
 * @returns {Object} Formatted results
 */
export function formatMigrationResults(results) {
  return {
    total: results.total,
    successful: results.successful,
    failed: results.failed,
    successRate: results.total > 0 
      ? ((results.successful / results.total) * 100).toFixed(2) + '%'
      : '0%',
    errors: results.errors,
  };
}

/**
 * Format migration status for reporting
 * @param {Object} status - Raw migration status from database
 * @returns {Object} Formatted status
 */
export function formatMigrationStatus(status) {
  const total = parseInt(status.total_notified, 10) || 0;
  const completed = parseInt(status.completed, 10) || 0;
  const pending = parseInt(status.pending, 10) || 0;

  return {
    totalNotified: total,
    completed,
    pending,
    completionRate: total > 0 
      ? ((completed / total) * 100).toFixed(2) + '%'
      : '0%',
  };
}
