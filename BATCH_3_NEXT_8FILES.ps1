# Batch 3 - Next 8 Files (Finding the culprit)
$files = @(
    "api/shared/sessionManager.js",
    "api/routes/auth-endpoints/account-reactivation.js",
    "api/routes/auth-endpoints/preferences.js",
    "api/routes/moon-phase.js",
    "api/routes/astrology-insights.js",
    "api/routes/migration.js",
    "api/middleware/inputValidation.js",
    "api/middleware/rateLimiter.js"
)

& .\BULK_CONSOLE_FIX_V4.ps1 -BatchName "Batch-3-Next-8Files" -Files $files
