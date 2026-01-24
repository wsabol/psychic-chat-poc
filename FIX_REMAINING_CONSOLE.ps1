# Fix Remaining Console Statements
# For files that already have errorLogger imports but still have console.error/warn

$files = @(
    "api/shared/smsService.js",
    "api/services/stripe/customers.js",
    "api/jobs/scheduler.js",
    "api/jobs/policyChangeNotificationJob.js",
    "api/routes/billing/paymentMethods.js",
    "api/jobs/tempAccountCleanupJob.js",
    "worker/modules/handlers/moon-phase-handler.js"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FIX REMAINING CONSOLE STATEMENTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$totalFiles = $files.Count
$modifiedFiles = 0
$totalReplacements = 0
$errors = @()

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "⚠ $file - File not found" -ForegroundColor Yellow
        $errors += $file
        continue
    }
    
    Write-Host "Processing: $file" -ForegroundColor White
    
    try {
        $content = Get-Content $fullPath -Raw -Encoding UTF8
        $originalContent = $content
        $fileReplacements = 0
        
        # Replace console.error with logErrorFromCatch
        $pattern1 = 'console\.error\('
        $replacement1 = 'logErrorFromCatch('
        $matches1 = [regex]::Matches($content, $pattern1)
        if ($matches1.Count -gt 0) {
            $content = $content -replace $pattern1, $replacement1
            $fileReplacements += $matches1.Count
            Write-Host "  ✓ Replaced $($matches1.Count) console.error calls" -ForegroundColor Green
        }
        
        # Replace console.warn with logWarning
        $pattern2 = 'console\.warn\('
        $replacement2 = 'logWarning('
        $matches2 = [regex]::Matches($content, $pattern2)
        if ($matches2.Count -gt 0) {
            $content = $content -replace $pattern2, $replacement2
            $fileReplacements += $matches2.Count
            Write-Host "  ✓ Replaced $($matches2.Count) console.warn calls" -ForegroundColor Green
        }
        
        if ($fileReplacements -gt 0) {
            # Save the modified content
            Set-Content -Path $fullPath -Value $content -Encoding UTF8 -NoNewline
            $modifiedFiles++
            $totalReplacements += $fileReplacements
            Write-Host "  ✅ $file - $fileReplacements replacements" -ForegroundColor Green
        } else {
            Write-Host "  ⊘ $file - No replacements needed" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "  ✗ $file - Error: $_" -ForegroundColor Red
        $errors += $file
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SYNTAX VALIDATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$syntaxErrors = 0
foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (-not (Test-Path $fullPath)) {
        continue
    }
    
    # Check syntax with Node.js
    $result = node --check $fullPath 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "✗ $file - SYNTAX ERROR" -ForegroundColor Red
        Write-Host "  $result" -ForegroundColor Red
        $syntaxErrors++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total files: $totalFiles" -ForegroundColor White
Write-Host "Modified: $modifiedFiles" -ForegroundColor Green
Write-Host "Total replacements: $totalReplacements" -ForegroundColor Green
Write-Host "Syntax errors: $syntaxErrors" -ForegroundColor $(if ($syntaxErrors -eq 0) { "Green" } else { "Red" })

if ($syntaxErrors -eq 0) {
    Write-Host ""
    Write-Host "✅ ALL FILES PASSED SYNTAX CHECK" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠ SOME FILES HAVE SYNTAX ERRORS - REVIEW BEFORE COMMITTING" -ForegroundColor Yellow
}

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "Errors encountered in:" -ForegroundColor Red
    foreach ($err in $errors) {
        Write-Host "  - $err" -ForegroundColor Red
    }
}
