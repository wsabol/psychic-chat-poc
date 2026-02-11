/**
 * Stripe Price Operations
 * Pure Stripe API operations for price management
 */
import { stripe } from '../stripeClient.js';
import { logErrorFromCatch } from '../../../../shared/errorLogger.js';
import { 
  PRODUCT_CONFIGS, 
  PRICE_DEFAULTS, 
  METADATA_TAGS,
  STRIPE_LIMITS 
} from './priceConfig.js';

/**
 * Create a new product in Stripe
 * @param {string} interval - 'month' or 'year'
 * @returns {Promise<Object>} Created Stripe product
 */
async function createProduct(interval) {
  const config = PRODUCT_CONFIGS[interval];
  
  if (!config) {
    throw new Error(`Invalid interval: ${interval}`);
  }

  return await stripe.products.create({
    name: config.name,
    description: config.description,
    metadata: {
      type: METADATA_TAGS.subscriptionType,
      interval: config.interval,
      created_by: METADATA_TAGS.createdBy,
      created_at: new Date().toISOString(),
    }
  });
}

/**
 * Create a new price in Stripe with automatic tax collection
 * Creates a new product with proper name and description for each price
 * @param {number} amount - Price in cents
 * @param {string} interval - 'month' or 'year'
 * @returns {Promise<Object>} Created Stripe price object with productId
 */
export async function createNewPrice(amount, interval) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    // Create a new product for this price
    const product = await createProduct(interval);

    // Create price for the product
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: PRICE_DEFAULTS.currency,
      recurring: {
        interval: interval,
        interval_count: PRICE_DEFAULTS.intervalCount,
      },
      tax_behavior: PRICE_DEFAULTS.taxBehavior,
      metadata: {
        created_by: METADATA_TAGS.createdBy,
        created_at: new Date().toISOString(),
      },
    });

    return {
      ...price,
      productId: product.id
    };
  } catch (error) {
    logErrorFromCatch(error, 'stripe-price', 'create-new-price');
    throw error;
  }
}

/**
 * Update a subscription to use a new price
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {string} newPriceId - New Stripe price ID
 * @returns {Promise<Object>} Updated Stripe subscription object
 */
export async function updateSubscriptionPrice(subscriptionId, newPriceId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Update subscription with new price
    // proration_behavior: 'none' means no immediate charge, change takes effect at next billing cycle
    // billing_cycle_anchor: 'unchanged' keeps the current billing date
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: PRICE_DEFAULTS.prorationBehavior,
      billing_cycle_anchor: PRICE_DEFAULTS.billingCycleAnchor,
    });

    return updatedSubscription;
  } catch (error) {
    logErrorFromCatch(error, 'stripe-price', 'update-subscription-price');
    throw error;
  }
}

/**
 * Get list of all active Stripe prices
 * @returns {Promise<Array>} Array of Stripe price objects with product info
 */
export async function getAllActivePrices() {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    // Get all active prices from Stripe
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: STRIPE_LIMITS.priceListLimit,
    });

    return prices.data;
  } catch (error) {
    logErrorFromCatch(error, 'stripe-price', 'get-all-active-prices');
    throw new Error(`Failed to fetch prices: ${error.message}`);
  }
}

/**
 * Retrieve a specific Stripe price by ID
 * @param {string} priceId - Stripe price ID
 * @returns {Promise<Object>} Stripe price object
 */
export async function getPriceById(priceId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    return await stripe.prices.retrieve(priceId, {
      expand: ['product']
    });
  } catch (error) {
    logErrorFromCatch(error, 'stripe-price', 'get-price-by-id');
    throw error;
  }
}
