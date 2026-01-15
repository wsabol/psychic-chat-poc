# Batch 3 - First 15 Files (Testing)
$files = @(
    "api/shared/db.js",
    "api/shared/firebase-admin.js",
    "api/shared/encryptionUtils.js",
    "api/shared/encryptedQueries.js",
    "api/shared/auditLog.js",
    "api/services/authService.js",
    "api/services/twoFAService.js",
    "api/services/stripeService.js",
    "api/routes/auth-endpoints/register.js",
    "api/routes/auth-endpoints/account.js",
    "api/routes/auth-endpoints/2fa.js",
    "api/routes/astrology.js",
    "api/routes/horoscope.js",
    "api/routes/chat.js",
    "api/middleware/auth.js"
)

& .\BULK_CONSOLE_FIX_V4.ps1 -BatchName "Batch-3-15Files" -Files $files
