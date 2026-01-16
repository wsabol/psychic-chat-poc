# Next 3 API files
$Files = @(
    "api/shared/auditLog.js",
    "api/shared/queue.js",
    "api/shared/redis.js"
)

& .\BULK_CONSOLE_FIX_V4.ps1 -Files $Files -BatchName "API_REMAINING_3A"
