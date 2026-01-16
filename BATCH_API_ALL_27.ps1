# All 27 API files in one batch
$Files = @(
    "api/migrations/encrypt_audit_emails.js",
    "api/migrations/encrypt_audit_emails_v2.js",
    "api/migrations/encrypt-messages.js",
    "api/migrations/remove-plaintext-messages.js",
    "api/routes/cleanup-status.js",
    "api/routes/tarot.js",
    "api/scripts/setup-stripe-products.js",
    "api/services/security/deviceService.js",
    "api/services/security/passwordService.js",
    "api/services/security/phoneService.js",
    "api/services/security/twoFAService.js",
    "api/services/security/verificationService.js",
    "api/services/stripe/customers.js",
    "api/services/stripe/database.js",
    "api/services/stripe/paymentMethods.js",
    "api/services/stripe/webhooks.js",
    "api/shared/accountMigration.js",
    "api/shared/accountMigration_with_firebase.js",
    "api/shared/auditLog.js",
    "api/shared/authUtils.js",
    "api/shared/decryptionHelper.js",
    "api/shared/healthGuardrail.js",
    "api/shared/queue.js",
    "api/shared/redis.js",
    "api/shared/sessionManager/services/fraudDetectionService.js",
    "api/shared/timezoneHelper.js",
    "api/utils/encryption.js"
)

& .\BULK_CONSOLE_FIX_V4.ps1 -Files $Files -BatchName "API_ALL_27"
