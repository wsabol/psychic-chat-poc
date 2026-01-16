# Test last 8 files ONE BY ONE
$files = @(
    "api/middleware/consentCheck.js",
    "api/shared/smsService.js",
    "api/shared/emailService.js",
    "api/shared/queue.js",
    "api/routes/user-profile.js",
    "api/routes/user-settings.js",
    "api/routes/billing/subscriptions.js",
    "api/routes/consent.js"
)

$counter = 1
foreach ($file in $files) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "FILE $counter / 8: $file" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Run script on this one file
    & .\BULK_CONSOLE_FIX_V4.ps1 -BatchName "Test-File-$counter-$([System.IO.Path]::GetFileNameWithoutExtension($file))" -Files @($file)
    
    Write-Host ""
    Write-Host "Commit this file? Type YES to commit, or press Enter to skip: " -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response.ToUpper() -eq 'YES') {
        git add $file
        git commit -m "Fix console.error in $(Split-Path -Leaf $file)"
        Write-Host "✅ Committed and saved" -ForegroundColor Green
        Write-Host "Next: Restart API and check for SASL errors" -ForegroundColor Gray
    } else {
        Write-Host "⏭️  Skipped - file not committed" -ForegroundColor Yellow
    }
    
    $counter++
    Write-Host ""
}

Write-Host "✅ All 8 files tested!" -ForegroundColor Green
