# Next 7 API files
$Files = @(
    "api/services/stripe/paymentMethods.js",
    "api/services/stripe/webhooks.js",
    "api/shared/accountMigration.js",
    "api/shared/accountMigration_with_firebase.js",
    "api/shared/authUtils.js",
    "api/shared/decryptionHelper.js",
    "api/shared/healthGuardrail.js"
)

& .\BULK_CONSOLE_FIX_V4.ps1 -Files $Files -BatchName "API_REMAINING_7"
