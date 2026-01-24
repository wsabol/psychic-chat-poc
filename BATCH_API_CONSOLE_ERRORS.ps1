# API Files with console.error/warn statements
# Based on COMPREHENSIVE_CONSOLE_AUDIT.ps1 results
# Excludes utility scripts (PRODUCTION_AUDIT_SCRIPT, SECURITY_AUTO_FIX)

$Files = @(
    "api/jobs/cleanupOrphanedFirebaseAccounts.js",
    "api/jobs/policyChangeNotificationJob.js",
    "api/jobs/scheduler.js",
    "api/jobs/tempAccountCleanupJob.js",
    "api/routes/billing/paymentMethods.js",
    "api/routes/user-profile.js",
    "api/services/stripe/customers.js",
    "api/services/user/astrologyService.js",
    "api/services/user/personalInfoService.js",
    "api/services/freeTrialService.js",
    "api/shared/queue.js",
    "api/shared/smsService.js",
    "api/index.js",
    "api/test-decrypt.js"
)

Write-Host "Executing BULK_CONSOLE_FIX_V7_CORRECTED.ps1 for API files..." -ForegroundColor Cyan
& .\BULK_CONSOLE_FIX_V7_CORRECTED.ps1 -Files $Files -BatchName "API_CONSOLE_ERRORS"
