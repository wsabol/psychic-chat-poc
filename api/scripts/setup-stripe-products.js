/**
 * Script to create Stripe Products and Prices for testing
 * Run: node api/scripts/setup-stripe-products.js
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

async function setupProducts() {
  try {

    // Product 1: Basic Plan
    const basicProduct = await stripe.products.create({
      name: 'Basic Plan',
      description: 'Our most popular plan for individuals',
      type: 'service',
      metadata: {
        tier: 'basic',
      },
    });

    const basicPrice = await stripe.prices.create({
      product: basicProduct.id,
      nickname: 'Basic Monthly',
      unit_amount: 999, // $9.99
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
      metadata: {
        displayName: 'Basic - $9.99/month',
      },
    });

    // Product 2: Pro Plan
    const proProduct = await stripe.products.create({
      name: 'Pro Plan',
      description: 'For power users and teams',
      type: 'service',
      metadata: {
        tier: 'pro',
      },
    });

    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      nickname: 'Pro Monthly',
      unit_amount: 2999, // $29.99
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
      metadata: {
        displayName: 'Pro - $29.99/month',
      },
    });
    // Product 3: Premium Plan
    const premiumProduct = await stripe.products.create({
      name: 'Premium Plan',
      description: 'All features, unlimited access',
      type: 'service',
      metadata: {
        tier: 'premium',
      },
    });
    console.log('✅ Premium Product created:', premiumProduct.id);

    const premiumPrice = await stripe.prices.create({
      product: premiumProduct.id,
      nickname: 'Premium Monthly',
      unit_amount: 5999, // $59.99
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
      metadata: {
        displayName: 'Premium - $59.99/month',
      },
    });
    console.log('✅ Premium Price created:', premiumPrice.id, '\n');

    console.log('✨ All products and prices created successfully!\n');
    console.log('📋 Summary:');
    console.log(`  Basic:   ${basicPrice.id}`);
    console.log(`  Pro:     ${proPrice.id}`);
    console.log(`  Premium: ${premiumPrice.id}`);
    console.log('\nYou can now use these Price IDs to create subscriptions.');
  } catch (error) {
    console.error('❌ Error setting up products:', error.message);
    process.exit(1);
  }
}

setupProducts();
