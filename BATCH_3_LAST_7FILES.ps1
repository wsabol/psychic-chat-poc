# Batch 3 - Last 7 Files (Final 7 of the 30)
$files = @(
    "api/middleware/consentCheck.js",
    "api/shared/smsService.js",
    "api/shared/emailService.js",
    "api/shared/queue.js",
    "api/routes/user-profile.js",
    "api/routes/user-settings.js",
    "api/routes/billing/subscriptions.js"
)

& .\BULK_CONSOLE_FIX_V4.ps1 -BatchName "Batch-3-Last-7Files" -Files $files
