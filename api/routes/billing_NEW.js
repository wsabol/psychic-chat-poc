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
 * Routes are organized by feature:
 * - /setup-intent - SetupIntent creation for card/bank verification
 * - /payment-methods - Credit card management (list, attach, delete, set default)
 * - /bank - Bank account operations (verify, financial connections)
 * - /subscriptions - Subscription lifecycle (create, list, cancel)
 * - /data - Billing data (invoices, payments, prices)
 * 
 * All old routes are redirected to new modular endpoints for backward compatibility
 */

// ============ MODULAR ROUTES ============

// Setup Intent
router.use('/setup-intent', setupIntentsRouter);

// Payment Methods
router.use('/payment-methods', paymentMethodsRouter);

// Bank Accounts
router.use('/bank', bankAccountsRouter);

// Subscriptions
router.use('/subscriptions', subscriptionsRouter);

// Billing Data
router.use('/data', billingDataRouter);

// ============ LEGACY ROUTES (Backward Compatibility) ============
// These routes maintain the old API for existing clients

// Legacy: GET /payment-methods → redirect to modular
router.get('/payment-methods', paymentMethodsRouter);

// Legacy: POST /attach-payment-method → POST /payment-methods/attach
router.post('/attach-payment-method', (req, res, next) => {
  req.baseUrl = '/payment-methods';
  req.url = '/attach';
  paymentMethodsRouter(req, res, next);
});

// Legacy: DELETE /payment-methods/:id → DELETE /payment-methods/:id
router.delete('/payment-methods/:id', paymentMethodsRouter);

// Legacy: POST /set-default-payment-method → POST /payment-methods/set-default
router.post('/set-default-payment-method', (req, res, next) => {
  req.baseUrl = '/payment-methods';
  req.url = '/set-default';
  paymentMethodsRouter(req, res, next);
});

// Legacy: POST /attach-unattached-methods → POST /payment-methods/attach-unattached
router.post('/attach-unattached-methods', (req, res, next) => {
  req.baseUrl = '/payment-methods';
  req.url = '/attach-unattached';
  paymentMethodsRouter(req, res, next);
});

// Legacy: POST /verify-bank-setup → POST /bank/verify-setup
router.post('/verify-bank-setup', (req, res, next) => {
  req.baseUrl = '/bank';
  req.url = '/verify-setup';
  bankAccountsRouter(req, res, next);
});

// Legacy: POST /verify-payment-method → POST /bank/verify-microdeposits
router.post('/verify-payment-method', (req, res, next) => {
  req.baseUrl = '/bank';
  req.url = '/verify-microdeposits';
  bankAccountsRouter(req, res, next);
});

// Legacy: POST /cleanup-unverified-banks → POST /bank/cleanup-unverified
router.post('/cleanup-unverified-banks', (req, res, next) => {
  req.baseUrl = '/bank';
  req.url = '/cleanup-unverified';
  bankAccountsRouter(req, res, next);
});

// Legacy: POST /financial-connections-session → POST /bank/financial-connections-session
router.post('/financial-connections-session', (req, res, next) => {
  req.baseUrl = '/bank';
  req.url = '/financial-connections-session';
  bankAccountsRouter(req, res, next);
});

// Legacy: POST /get-financial-accounts → POST /bank/financial-accounts
router.post('/get-financial-accounts', (req, res, next) => {
  req.baseUrl = '/bank';
  req.url = '/financial-accounts';
  bankAccountsRouter(req, res, next);
});

// Legacy: POST /create-bank-account-from-financial → POST /bank/create-from-financial
router.post('/create-bank-account-from-financial', (req, res, next) => {
  req.baseUrl = '/bank';
  req.url = '/create-from-financial';
  bankAccountsRouter(req, res, next);
});

// Legacy: POST /create-subscription → POST /subscriptions/create
router.post('/create-subscription', (req, res, next) => {
  req.baseUrl = '/subscriptions';
  req.url = '/create';
  subscriptionsRouter(req, res, next);
});

// Legacy: GET /subscriptions → GET /subscriptions
router.get('/subscriptions', subscriptionsRouter);

// Legacy: POST /cancel-subscription/:subscriptionId → POST /subscriptions/cancel/:subscriptionId
router.post('/cancel-subscription/:subscriptionId', (req, res, next) => {
  req.baseUrl = '/subscriptions';
  req.url = `/cancel/${req.params.subscriptionId}`;
  subscriptionsRouter(req, res, next);
});

// Legacy: GET /invoices → GET /data/invoices
router.get('/invoices', (req, res, next) => {
  req.baseUrl = '/data';
  req.url = '/invoices';
  billingDataRouter(req, res, next);
});

// Legacy: GET /payments → GET /data/payments
router.get('/payments', (req, res, next) => {
  req.baseUrl = '/data';
  req.url = '/payments';
  billingDataRouter(req, res, next);
});

// Legacy: GET /available-prices → GET /data/prices
router.get('/available-prices', (req, res, next) => {
  req.baseUrl = '/data';
  req.url = '/prices';
  billingDataRouter(req, res, next);
});

export default router;
