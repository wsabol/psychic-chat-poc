# Test 1 file
$Files = @(
    "api/shared/sessionManager/services/fraudDetectionService.js"
)

& .\BULK_CONSOLE_FIX_V4.ps1 -Files $Files -BatchName "API_TEST_FRAUD"
