# First 14 of 27 API files
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
    "api/services/stripe/database.js"
)

& .\BULK_CONSOLE_FIX_V4.ps1 -Files $Files -BatchName "API_FIRST_14"
