/**
 * User Data Routes Router
 * GDPR Article 20 - Data Portability
 * GDPR Article 17 - Right to be Forgotten
 * CCPA - Consumer Rights
 * 
 * Mounts:
 * - Download routes (data export)
 * - Deletion routes (account removal)
 */

import { Router } from 'express';
import downloadRoutes from './download.js';
import deletionRoutes from './deletion.js';

const router = Router();

/**
 * Mount download/export routes
 * GET /download-data
 * GET /export-data/:userId?format=json|csv
 */
router.use(downloadRoutes);

/**
 * Mount account deletion routes
 * POST /send-delete-verification
 * DELETE /delete-account
 * DELETE /delete-account/:userId
 * POST /cancel-deletion/:userId
 */
router.use(deletionRoutes);

export default router;
