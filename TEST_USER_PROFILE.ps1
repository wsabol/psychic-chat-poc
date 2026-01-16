# Test api/routes/user-profile.js specifically
$files = @(
    "api/routes/user-profile.js"
)

& .\BULK_CONSOLE_FIX_V4.ps1 -BatchName "Test-user-profile" -Files $files
