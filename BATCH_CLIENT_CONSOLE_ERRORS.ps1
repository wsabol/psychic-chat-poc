# Client Files with console.error/warn statements
# Based on COMPREHENSIVE_CONSOLE_AUDIT.ps1 results

$Files = @(
    "client/src/components/admin/hooks/useWhitelist.js",
    "client/src/context/AuthContext.jsx",
    "client/src/hooks/useAuthAPI.js",
    "client/src/layouts/MainContainer.js",
    "client/src/screens/AppShells.jsx"
)

Write-Host "Executing BULK_CONSOLE_FIX_V7_CORRECTED.ps1 for client files..." -ForegroundColor Cyan
& .\BULK_CONSOLE_FIX_V7_CORRECTED.ps1 -Files $Files -BatchName "CLIENT_CONSOLE_ERRORS"
