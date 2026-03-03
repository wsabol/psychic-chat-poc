/**
 * DEPRECATED: This route has been removed.
 * Billing address is no longer stored in the database.
 * Address data is passed directly to Stripe and stored there.
 * The /billing/save-billing-address endpoint handles Stripe customer address updates.
 */

import express from 'express';
const router = express.Router();
export default router;
