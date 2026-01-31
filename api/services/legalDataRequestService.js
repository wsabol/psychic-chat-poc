/**
 * Legal Data Request Service (Backward Compatibility Layer)
 * 
 * DEPRECATED: This file now acts as a compatibility layer.
 * The actual implementation has been refactored into the /legal directory.
 * 
 * NEW ARCHITECTURE (api/services/legal/):
 * - constants.js: Centralized constants and configuration
 * - types.js: JSDoc type definitions
 * - legalDataValidators.js: Input validation and sanitization
 * - legalDataQueryBuilder.js: SQL query construction
 * - legalDataTransformers.js: Data transformation and formatting
 * - legalDataRepository.js: Database operations (repository pattern)
 * - legalDataService.js: Business logic orchestration
 * 
 * IMPROVEMENTS IN NEW VERSION:
 * - Fixed bug in findUserByEmail (was missing return statement)
 * - Added comprehensive input validation
 * - Separated concerns (validation, DB, transformation, business logic)
 * - Better error handling and logging
 * - Reusable query builders
 * - Consistent DTOs via transformers
 * - Easier to test and maintain
 * 
 * Please import from './legal/legalDataService.js' for new code.
 */

// Re-export all functions from the new refactored service
export {
  findUserByEmail,
  getUserMessagesForLegal,
  getUserAuditTrailForLegal,
  getUserProfileForLegal,
  getUserViolationsForLegal,
  generateLegalDataPackage,
  searchUserMessagesForLegal
} from './legal/legalDataService.js';

// Also export as default for backward compatibility
import legalDataService from './legal/legalDataService.js';
export default legalDataService;
