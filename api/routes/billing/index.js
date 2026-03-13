import express from 'express';
import setupIntentsRouter from './setupIntent.js';
import paymentMethodsRouter from './paymentMethods.js';
import subscriptionsRouter from './subscriptions.js';
import billingDataRouter from './billingData.js';
import onboardingRouter from './onboarding.js';
import saveBillingAddressRouter from './save-billing-address.js';
import googlePlayRouter from './googlePlay.js';
import appleIapRouter from './appleIap.js';

const router = express.Router();

// NOTE: Stripe webhook (/billing/stripe-webhook) is registered directly in index.js
// BEFORE express.json() and authenticateToken, so it is NOT mounted here.

// Mount all other modular routers
router.use(setupIntentsRouter);
router.use(paymentMethodsRouter);
router.use(subscriptionsRouter);
router.use(billingDataRouter);
router.use(onboardingRouter);
router.use(saveBillingAddressRouter);

// Google Play Billing (Android IAP)
router.use(googlePlayRouter);

// Apple App Store IAP (iOS)
router.use(appleIapRouter);

export default router;
