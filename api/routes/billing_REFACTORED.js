import express from 'express';
import paymentMethodsRouter from './billing/paymentMethods.js';
import setupIntentsRouter from './billing/setupIntents.js';
import bankAccountsRouter from './billing/bankAccounts.js';
import subscriptionsRouter from './billing/subscriptions.js';
import billingDataRouter from './billing/billingData.js';

const router = express.Router();

/**
 * Billing Routes - Modular Structure
 * 
 * /setup-intent - SetupIntent creation
 * /payment-methods - Card/Payment method management
 * /bank - Bank account operations
 * /subscriptions - Subscription management
 * /data - Invoices, payments, prices
 */

// Setup Intent routes
router.post('/setup-intent', (req, res) => setupIntentsRouter(req, res));

// Payment Methods routes
router.use('/payment-methods', paymentMethodsRouter);

// Bank Account routes
router.use('/bank', bankAccountsRouter);

// Subscription routes
router.use('/subscriptions', subscriptionsRouter);

// Billing Data routes (invoices, payments, prices)
router.use('/data', billingDataRouter);

/**
 * Legacy route mappings for backward compatibility
 * These map old routes to new modular routes
 */

// Old: POST /verify-bank-setup → New: POST /bank/verify-setup
router.post('/verify-bank-setup', (req, res) => {
  return bankAccountsRouter._router.stack.find(r => r.route?.path === '/verify-setup')?.route?.stack?.[0]?.handle?.(req, res);
});

// Old: POST /verify-payment-method → New: POST /bank/verify-microdeposits
router.post('/verify-payment-method', (req, res) => {
  return bankAccountsRouter._router.stack.find(r => r.route?.path === '/verify-microdeposits')?.route?.stack?.[0]?.handle?.(req, res);
});

// Old: POST /attach-payment-method → New: POST /payment-methods/attach
router.post('/attach-payment-method', (req, res) => {
  return paymentMethodsRouter._router.stack.find(r => r.route?.path === '/attach')?.route?.stack?.[0]?.handle?.(req, res);
});

// Old: DELETE /payment-methods/:id → Already routed via paymentMethodsRouter

// Old: POST /cleanup-unverified-banks → New: POST /bank/cleanup-unverified
router.post('/cleanup-unverified-banks', (req, res) => {
  return bankAccountsRouter._router.stack.find(r => r.route?.path === '/cleanup-unverified')?.route?.stack?.[0]?.handle?.(req, res);
});

// Old: POST /set-default-payment-method → New: POST /payment-methods/set-default
router.post('/set-default-payment-method', (req, res) => {
  return paymentMethodsRouter._router.stack.find(r => r.route?.path === '/set-default')?.route?.stack?.[0]?.handle?.(req, res);
});

// Old: POST /create-subscription → New: POST /subscriptions/create
router.post('/create-subscription', (req, res) => {
  return subscriptionsRouter._router.stack.find(r => r.route?.path === '/create')?.route?.stack?.[0]?.handle?.(req, res);
});

// Old: GET /subscriptions → Already routed via subscriptionsRouter
// Old: POST /cancel-subscription/:id → Already routed via subscriptionsRouter

// Old: GET /invoices → New: GET /data/invoices
router.get('/invoices', (req, res) => {
  return billingDataRouter._router.stack.find(r => r.route?.path === '/invoices')?.route?.stack?.[0]?.handle?.(req, res);
});

// Old: GET /payments → New: GET /data/payments
router.get('/payments', (req, res) => {
  return billingDataRouter._router.stack.find(r => r.route?.path === '/payments')?.route?.stack?.[0]?.handle?.(req, res);
});

// Old: POST /attach-unattached-methods → New: POST /payment-methods/attach-unattached
router.post('/attach-unattached-methods', (req, res) => {
  return paymentMethodsRouter._router.stack.find(r => r.route?.path === '/attach-unattached')?.route?.stack?.[0]?.handle?.(req, res);
});

// Old: POST /financial-connections-session → New: POST /bank/financial-connections-session
router.post('/financial-connections-session', (req, res) => {
  return bankAccountsRouter._router.stack.find(r => r.route?.path === '/financial-connections-session')?.route?.stack?.[0]?.handle?.(req, res);
});

// Old: POST /get-financial-accounts → New: POST /bank/financial-accounts
router.post('/get-financial-accounts', (req, res) => {
  return bankAccountsRouter._router.stack.find(r => r.route?.path === '/financial-accounts')?.route?.stack?.[0]?.handle?.(req, res);
});

// Old: POST /create-bank-account-from-financial → New: POST /bank/create-from-financial
router.post('/create-bank-account-from-financial', (req, res) => {
  return bankAccountsRouter._router.stack.find(r => r.route?.path === '/create-from-financial')?.route?.stack?.[0]?.handle?.(req, res);
});

// Old: GET /available-prices → New: GET /data/prices
router.get('/available-prices', (req, res) => {
  return billingDataRouter._router.stack.find(r => r.route?.path === '/prices')?.route?.stack?.[0]?.handle?.(req, res);
});

export default router;
