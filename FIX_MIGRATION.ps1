# Fix api/routes/migration.js
$files = @(
    "api/routes/migration.js"
)

& .\BULK_CONSOLE_FIX_V4.ps1 -BatchName "Fix-migration" -Files $files
