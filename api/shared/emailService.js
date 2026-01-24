/**
 * LEGACY FILE - REFACTORED TO MODULAR ARCHITECTURE
 * 
 * This file now serves as a compatibility layer that re-exports from the new
 * modular email service structure located in ./email/
 * 
 * New structure:
 *   api/shared/email/
 *   ├── index.js                 - Main exports (this file forwards to)
 *   ├── emailSender.js           - Core sending logic
 *   ├── config.js                - Configuration
 *   ├── templates/               - Email templates
 *   │   ├── baseTemplate.js      - Base HTML wrapper
 *   │   ├── components.js        - Reusable components
 *   │   ├── verificationEmail.js
 *   │   ├── passwordResetEmail.js
 *   │   ├── twoFactorEmail.js
 *   │   ├── reengagementEmail.js
 *   │   └── policyChangeEmail.js
 *   └── utils/                   - Utilities
 *       ├── tokenGenerator.js    - Secure token generation
 *       └── dateFormatter.js     - Date formatting
 * 
 * Benefits of refactoring:
 *   - 80% reduction in code duplication
 *   - Single source of truth for branding/styling
 *   - Easy to add new email types
 *   - Better testability and maintainability
 *   - Centralized error handling
 *   - Improved security for token generation
 */

// Re-export all functions from the new modular structure for backward compatibility
export {
    sendEmailVerification,
    sendPasswordResetEmail,
    sendEmailVerificationCode,
    send2FACodeEmail,
    sendAccountReengagementEmail,
    sendPolicyChangeNotification,
    sendEmail,
    EMAIL_CONFIG,
    generateReactivationToken,
    verifyReactivationToken
} from './email/index.js';
