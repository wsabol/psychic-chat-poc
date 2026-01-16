# First 7 of 27 API files
$Files = @(
    "api/migrations/encrypt_audit_emails.js",
    "api/migrations/encrypt_audit_emails_v2.js",
    "api/migrations/encrypt-messages.js",
    "api/migrations/remove-plaintext-messages.js",
    "api/routes/cleanup-status.js",
    "api/routes/tarot.js",
    "api/scripts/setup-stripe-products.js"
)

& .\BULK_CONSOLE_FIX_V4.ps1 -Files $Files -BatchName "API_FIRST_7"
