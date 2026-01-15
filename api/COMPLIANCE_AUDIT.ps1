# PowerShell Script to Audit API Files for Non-Compliant Response Patterns
# Checks for .json({ patterns that should use standardized response functions

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "API Response Compliance Audit" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Define file paths to check
$filesToCheck = @(
    "api/index.js",
    "api/middleware/complianceGate.js",
    "api/middleware/inputValidation.js",
    "api/routes/analytics.js",
    "api/routes/astrology-insights.js",
    "api/routes/astrology.js",
    "api/routes/chat.js",
    "api/routes/cleanup-status.js",
    "api/routes/cleanup.js",
    "api/routes/compliance-admin.js",
    "api/routes/consent.js",
    "api/routes/horoscope.js",
    "api/routes/help.js",
    "api/routes/migration.js",
    "api/routes/moon-phase.js",
    "api/routes/response-status.js",
    "api/routes/security.js",
    "api/routes/user-data.js",
    "api/routes/user-profile.js",
    "api/routes/user-settings.js",
    "api/routes/violationReports.js",
    "api/routes/tarot.js",
    "api/routes/admin/compliance-dashboard.js",
    "api/routes/auth-endpoints/account.js",
    "api/routes/auth-endpoints/account-reactivation.js",
    "api/routes/auth-endpoints/2fa.js",
    "api/routes/auth-endpoints/login.js",
    "api/routes/auth-endpoints/preferences.js",
    "api/routes/auth-endpoints/register.js",
    "api/routes/billing/billingData.js",
    "api/routes/billing/index.js",
    "api/routes/billing/onboarding.js",
    "api/routes/billing/paymentMethods.js",
    "api/routes/billing/setupIntent.js",
    "api/routes/billing/setupIntents.js",
    "api/routes/billing/subscriptions.js",
    "api/routes/billing/webhooks.js",
    "api/shared/healthGuardrail.js"
)

$filesNeedingChanges = @()
$totalIssues = 0

# Patterns to check for
$patterns = @{
    'res.status(###).json({' = 'res\.status\(\d{3}\)\.json\(\{'
    'res.json({' = 'res\.json\(\{'
    'return res.' = 'return res\.'
}

foreach ($file in $filesToCheck) {
    if (-Not (Test-Path $file)) {
        Write-Host "⚠️  SKIP: $file (not found)" -ForegroundColor Yellow
        continue
    }

    $content = Get-Content $file -Raw
    $lines = Get-Content $file
    
    $hasIssues = $false
    $issueCount = 0
    $issues = @()
    
    # Check for non-compliant patterns
    $lineNum = 0
    foreach ($line in $lines) {
        $lineNum++
        
        # Pattern 1: res.status(###).json({ that's NOT inside a response function
        if ($line -match 'return res\.status\(\d{3}\)\.json\(\{') {
            $statusCode = [regex]::Matches($line, '\d{3}')[0].Value
            # Skip if it's already using a standardized function name
            if (-not ($line -match '(validationError|authError|notFoundError|serverError|forbiddenError|conflictError|unprocessableError|createdResponse|billingError|databaseError|healthContentBlockedError|processingResponse)')) {
                $issues += @{
                    Line = $lineNum
                    Code = $statusCode
                    Pattern = 'res.status(###).json'
                    Content = $line.Trim()
                }
                $issueCount++
                $hasIssues = $true
            }
        }
        
        # Pattern 2: res.json({ without status code
        if ($line -match 'res\.json\(\{' -and -not ($line -match 'return res\.status')) {
            # These are OK if they're just success responses
            # Flag only if they look like error responses
            if ($line -match '(error|Error|failed|Failed)') {
                $issues += @{
                    Line = $lineNum
                    Code = '200'
                    Pattern = 'res.json({ with error'
                    Content = $line.Trim()
                }
                $issueCount++
                $hasIssues = $true
            }
        }
    }
    
    if ($hasIssues) {
        $filesNeedingChanges += @{
            File = $file
            IssueCount = $issueCount
            Issues = $issues
        }
        $totalIssues += $issueCount
        
        Write-Host "❌ $file" -ForegroundColor Red
        Write-Host "   Issues found: $issueCount" -ForegroundColor Yellow
        foreach ($issue in $issues) {
            Write-Host "   Line $($issue.Line): [$($issue.Code)] $($issue.Pattern)" -ForegroundColor Magenta
            Write-Host "      $($issue.Content)" -ForegroundColor Gray
        }
        Write-Host ""
    }
    else {
        Write-Host "✅ $file" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Files needing changes: $($filesNeedingChanges.Count)" -ForegroundColor Yellow
Write-Host "Total issues found: $totalIssues" -ForegroundColor Yellow
Write-Host ""

if ($filesNeedingChanges.Count -gt 0) {
    Write-Host "Files to fix:" -ForegroundColor Red
    foreach ($file in $filesNeedingChanges) {
        Write-Host "  - $($file.File) ($($file.IssueCount) issues)" -ForegroundColor Red
    }
}

# Export results
$filesNeedingChanges | ConvertTo-Json | Out-File "api/COMPLIANCE_AUDIT_RESULTS.json" -Force
Write-Host ""
Write-Host "Results saved to api/COMPLIANCE_AUDIT_RESULTS.json" -ForegroundColor Cyan
