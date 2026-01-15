# Batch 2 - 10 Files
$files = @(
    "api/shared/smsService.js",
    "api/routes/consent.js",
    "api/routes/cleanup.js",
    "api/routes/help.js",
    "api/routes/user-data.js",
    "api/routes/user-profile.js",
    "api/routes/user-settings.js",
    "api/routes/security.js",
    "api/routes/analytics.js",
    "api/routes/violationReports.js"
)

& .\BULK_CONSOLE_FIX_V4.ps1 -BatchName "Batch-2-10Files" -Files $files
