# Test V5 on Batch 5
$batch5Files = @(
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

& .\BULK_CONSOLE_FIX_V5_IMPROVED.ps1 -BatchName "Batch-5-Test-V5" -Files $batch5Files
