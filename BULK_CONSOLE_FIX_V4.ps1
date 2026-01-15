# Bulk Console.error/warn Fixer - Version 4 (Smart Relative Paths)
# Processes specified files, replacing console.* with logging functions
# Automatically calculates correct relative import paths

param(
    [string[]]$Files = @(
        "api/migrations/encrypt-messages.js",
        "api/migrations/encrypt_audit_emails.js",
        "api/migrations/encrypt_audit_emails_v2.js",
        "api/migrations/remove-plaintext-messages.js",
        "api/routes/billing/paymentMethods.js",
        "api/shared/db.js",
        "api/shared/firebase-admin.js",
        "api/shared/emailService.js",
        "api/shared/queue.js",
        "api/shared/sessionManager.js"
    ),
    [string]$BatchName = "Test"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BULK CONSOLE FIX V4 - Smart Path Calc" -ForegroundColor Cyan
Write-Host "Batch: $BatchName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Files to process: $($Files.Count)" -ForegroundColor Yellow
Write-Host ""

if ($Files.Count -eq 0) {
    Write-Host "No files provided!" -ForegroundColor Red
    exit 1
}

$successCount = 0
$skipCount = 0
$changeLog = @()
$syntaxErrors = @()

# Function to calculate relative path to errorLogger
function Get-ErrorLoggerImportPath {
    param([string]$filePath)
    
    # Extract path after 'api/'
    $pathAfterApi = $filePath -replace '^api/', ''
    
    # Count directory depth (slashes in path)
    $depth = ($pathAfterApi -split '/').Count - 1
    
    # Special case: file is in shared directory
    if ($filePath -match 'api/shared/') {
        return './errorLogger.js'
    }
    
    # Build relative path
    if ($depth -eq 1) {
        # One level deep (e.g., api/middleware/auth.js)
        return '../shared/errorLogger.js'
    }
    else {
        # Multiple levels deep (e.g., api/routes/billing/paymentMethods.js)
        $ups = '../' * ($depth - 1)
        return "$ups../shared/errorLogger.js"
    }
}

# Function to extract service name from file path
function Get-ServiceName {
    param([string]$filePath)
    $parts = $filePath -split '\\'
    
    if ($parts -contains 'routes' -and $parts.Count -gt 2) {
        $idx = [Array]::IndexOf($parts, 'routes')
        if ($idx -lt $parts.Count - 1) {
            $next = $parts[$idx + 1]
            if ($next -notmatch '\.js$') {
                return $next
            }
        }
    }
    elseif ($parts -contains 'middleware') {
        $name = $parts[-1] -replace '.js$', ''
        return "middleware-$name"
    }
    elseif ($parts -contains 'jobs') {
        $name = $parts[-1] -replace '.js$', ''
        return "jobs-$name"
    }
    elseif ($parts -contains 'shared') {
        $name = $parts[-1] -replace '.js$', ''
        return "shared-$name"
    }
    elseif ($parts -contains 'services') {
        $name = $parts[-1] -replace '.js$', ''
        return "service-$name"
    }
    elseif ($parts -contains 'migrations') {
        $name = $parts[-1] -replace '.js$', ''
        return "migration-$name"
    }
    return "app"
}

# Process each file
foreach ($filePath in $Files) {
    $fullPath = Join-Path (Get-Location) $filePath
    
    Write-Host "Processing: $filePath" -ForegroundColor White
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "  ❌ File not found" -ForegroundColor Red
        continue
    }
    
    try {
        $originalContent = Get-Content $fullPath -Raw
        $lines = $originalContent -split "`n"
        $newLines = @()
        $serviceName = Get-ServiceName $filePath
        $importPath = Get-ErrorLoggerImportPath $filePath
        $changeCount = 0
        $needsImport = $false
        
        Write-Host "    Service: $serviceName, Import: $importPath" -ForegroundColor Gray
        
        foreach ($line in $lines) {
            $newLine = $line
            
            # Check if line has console.error
            if ($line -match 'console\.error\s*\(' -and $line -notmatch 'logErrorFromCatch|logErrorToDB') {
                # Extract context from error message
                $context = "Error handling"
                if ($line -match '\[([A-Z][A-Z0-9\-]+)\]') {
                    $tag = $matches[1]
                    $context = $tag.ToLower() -replace '-', ' '
                }
                
                # Handle .catch pattern
                if ($line -match '\.catch\s*\(\s*(\w+)\s*=>\s*console\.error') {
                    $varName = $matches[1]
                    $newLine = $line -replace "console\.error\([^)]*\)", "logErrorFromCatch($varName, '$serviceName', '$context')"
                    $newLine = ".catch($varName => { $newLine })"
                }
                # Standard catch block with await
                elseif ($line -match '^\s*console\.error\(' -and $line -match 'catch\s*\(') {
                    $newLine = $line -replace 'console\.error\([^)]*\);?', "await logErrorFromCatch(error, '$serviceName', '$context');"
                }
                # Inline usage
                else {
                    $newLine = $line -replace 'console\.error\([^)]*\);?', "logErrorFromCatch(error, '$serviceName', '$context');"
                }
                
                if ($newLine -ne $line) {
                    $changeCount++
                    $needsImport = $true
                }
            }
            
            $newLines += $newLine
        }
        
        # Reconstruct content
        $newContent = $newLines -join "`n"
        
        # Add import if needed
        if ($needsImport -and $newContent -notmatch 'logErrorFromCatch') {
            $contentLines = $newContent -split "`n"
            $lastImportIdx = -1
            
            for ($i = 0; $i -lt $contentLines.Count; $i++) {
                if ($contentLines[$i] -match "^import\s+" -and $contentLines[$i] -match "from\s+") {
                    $lastImportIdx = $i
                }
            }
            
            if ($lastImportIdx -ge 0) {
                $importStatement = "import { logErrorFromCatch } from '$importPath';"
                $contentLines[$lastImportIdx] = $contentLines[$lastImportIdx] + "`n$importStatement"
                $newContent = $contentLines -join "`n"
            }
        }
        
        # Write back if changes made
        if ($newContent -ne $originalContent) {
            Set-Content -Path $fullPath -Value $newContent -NoNewline
            Write-Host "    ✅ $changeCount replacements, import path: $importPath" -ForegroundColor Green
            $successCount++
            $changeLog += $filePath
        }
        else {
            Write-Host "    ⚠️  No changes found" -ForegroundColor Yellow
            $skipCount++
        }
    }
    catch {
        Write-Host "    ❌ Error: $_" -ForegroundColor Red
        continue
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SYNTAX CHECK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$syntaxPassCount = 0
foreach ($filePath in $Files) {
    $fullPath = Join-Path (Get-Location) $filePath
    
    if (Test-Path $fullPath) {
        $result = & node -c $fullPath 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $filePath" -ForegroundColor Green
            $syntaxPassCount++
        }
        else {
            Write-Host "❌ $filePath" -ForegroundColor Red
            Write-Host "   Error details will be shown below" -ForegroundColor Gray
            $syntaxErrors += $filePath
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BATCH SUMMARY: $BatchName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Files processed: $($Files.Count)" -ForegroundColor White
Write-Host "Files modified: $successCount" -ForegroundColor Green
Write-Host "Files skipped: $skipCount" -ForegroundColor Yellow
Write-Host "Syntax passes: $syntaxPassCount / $($Files.Count)" -ForegroundColor $(if ($syntaxErrors.Count -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($syntaxErrors.Count -gt 0) {
    Write-Host "⚠️  SYNTAX ERRORS:" -ForegroundColor Red
    foreach ($err in $syntaxErrors) {
        Write-Host "  - $err" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "DO NOT COMMIT - Review errors above" -ForegroundColor Red
}
else {
    Write-Host "✅ ALL CHECKS PASSED - READY TO COMMIT" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next commands:" -ForegroundColor Yellow
    Write-Host "  git add -A" -ForegroundColor Gray
    Write-Host "  git commit -m 'Fix console.error in $BatchName'" -ForegroundColor Gray
}

Write-Host ""
