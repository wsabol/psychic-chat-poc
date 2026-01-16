# Batch 5 - First 15 of the 44 source files
$files = @(
    "api/services/stripeService_PLAINTEXT.js",
    "api/services/securityService_commonjs.js",
    "api/shared/intrusionDetection.js",
    "api/routes/user-data/deletion.js",
    "api/shared/sessionManager/services/sessionService.js",
    "api/shared/complianceChecker.js",
    "api/shared/auditLog_updated.js",
    "api/routes/user-data/helpers/deletionHelper.js",
    "api/services/stripe/subscriptions.js",
    "api/shared/violationHandler.js",
    "api/routes/billing/webhooks.js",
    "api/shared/deviceFingerprint.js",
    "api/services/security/emailService.js",
    "api/shared/sessionManager/services/loginAttemptService.js",
    "api/routes/user-data/download.js"
)

& .\BULK_CONSOLE_FIX_V4.ps1 -BatchName "Batch-5-FirstOf44" -Files $files
