# Final Batch - Last 8 Files (all together)
$files = @(
    "api/middleware/consentCheck.js",
    "api/shared/smsService.js",
    "api/shared/emailService.js",
    "api/routes/user-profile.js",
    "api/routes/user-settings.js",
    "api/routes/billing/subscriptions.js",
    "api/routes/consent.js",
    "api/middleware/rateLimiter.js"
)

& .\BULK_CONSOLE_FIX_V4.ps1 -BatchName "Final-8Files-Batch" -Files $files
