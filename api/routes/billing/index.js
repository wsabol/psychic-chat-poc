import express from 'express';
import webhooksRouter from './webhooks.js';
import setupIntentsRouter from './setupIntent.js';
import paymentMethodsRouter from './paymentMethods.js';
import subscriptionsRouter from './subscriptions.js';
import billingDataRouter from './billingData.js';
import onboardingRouter from './onboarding.js';

const router = express.Router();

// Mount webhooks FIRST (before authentication middleware)
router.use(webhooksRouter);

// Mount all other modular routers
router.use(setupIntentsRouter);
router.use(paymentMethodsRouter);
router.use(subscriptionsRouter);
router.use(billingDataRouter);
router.use(onboardingRouter);

export default router;
