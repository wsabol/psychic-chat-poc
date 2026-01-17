/**
 * User Data Rights Routes (THIN CONTROLLER - 40 lines)
 * GDPR Article 20 - Data Portability
 * GDPR Article 17 - Right to be Forgotten
 * CCPA - Consumer Rights
 * 
 * This file mounts sub-routers for download and deletion operations
 */

import { Router } from 'express';
import downloadRoutes from './user-data/download.js';
import deletionRoutes from './user-data/deletion.js';

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
