import express from 'express';
import setupIntentsRouter from './setupIntent.js';
import paymentMethodsRouter from './paymentMethods.js';
import subscriptionsRouter from './subscriptions.js';
import bankAccountsRouter from './bankAccounts.js';
import billingDataRouter from './billingData.js';

const router = express.Router();

// Mount all modular routers
router.use(setupIntentsRouter);
router.use(paymentMethodsRouter);
router.use(subscriptionsRouter);
router.use(bankAccountsRouter);
router.use(billingDataRouter);

export default router;
