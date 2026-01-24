# Worker Files with console.error/warn statements
# Based on COMPREHENSIVE_CONSOLE_AUDIT.ps1 results

$Files = @(
    "worker/modules/handlers/moon-phase-handler.js",
    "worker/modules/utils/timezoneHelper-fixed.js",
    "worker/test-moon-phase.js"
)

Write-Host "Executing BULK_CONSOLE_FIX_V7_CORRECTED.ps1 for worker files..." -ForegroundColor Cyan
& .\BULK_CONSOLE_FIX_V7_CORRECTED.ps1 -Files $Files -BatchName "WORKER_CONSOLE_ERRORS"
