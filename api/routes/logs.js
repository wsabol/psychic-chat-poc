/**
 * Error Logs Endpoint - Receives error reports from client
 * 
 * Route: POST /api/logs/error
 * Accepts error data from client-side errorLogger
 */

import express from 'express';
import { db } from '../shared/db.js';
import logger from '../shared/logger.js';
import { validationError, serverError, successResponse } from '../utils/responses.js';

const router = express.Router();

/**
 * POST /logs/error
 * Receive and log client-side errors to database
 */
router.post('/error', async (req, res) => {
  try {
    const { service, errorMessage, severity = 'error', context, stack, userAgent, url } = req.body;

    // Validate required fields
    if (!service || !errorMessage) {
      return validationError(res, 'Missing required fields: service, errorMessage');
    }

    // Validate severity
    const validSeverities = ['error', 'warning', 'critical'];
    const finalSeverity = validSeverities.includes(severity) ? severity : 'error';

    // Simple query without complex encryption in template
    let query = `
      INSERT INTO error_logs (
        service, 
        error_message, 
        severity, 
        context
      ) VALUES (
        $1, $2, $3, $4
      )
      RETURNING id
    `;
    
    let params = [service, errorMessage, finalSeverity, context || null];

    // Add encrypted stack trace if present
    if (stack && process.env.ENCRYPTION_KEY) {
      query = `
        INSERT INTO error_logs (
          service, 
          error_message, 
          severity, 
          context,
          error_stack_encrypted
        ) VALUES (
          $1, $2, $3, $4, pgp_sym_encrypt($5, $6)
        )
        RETURNING id
      `;
      params.push(stack);
      params.push(process.env.ENCRYPTION_KEY);
    }

    // Insert into database
    const result = await db.query(query, params);

    return successResponse(res, {
      success: true,
      message: 'Error logged successfully',
      errorId: result.rows[0]?.id
    });
  } catch (error) {
    logger.error('Failed to log client error:', error?.message || String(error));
    
    // Don't expose internal errors to client
    return serverError(res, 'Failed to log error');
  }
});

export default router;
