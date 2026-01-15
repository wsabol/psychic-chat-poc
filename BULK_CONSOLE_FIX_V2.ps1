# Bulk Console.error/warn Fixer - Version 2 (Simplified)
# Processes up to 30 files at a time, replacing console.* with logging functions

param(
    [int]$BatchNumber = 1,
    [int]$BatchSize = 30
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BULK CONSOLE FIX V2 - Batch $BatchNumber (Max $BatchSize files)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load the audit results
$auditFile = "api/CONSOLE_BATCH_$($BatchNumber).json"
if (-not (Test-Path $auditFile)) {
    $auditFile = "api/CONSOLE_FULL_LIST.json"
}
if (-not (Test-Path $auditFile)) {
    Write-Host "ERROR: $auditFile not found. Run audit script first." -ForegroundColor Red
    exit 1
}

try {
    $allFiles = @(Get-Content $auditFile -Raw | ConvertFrom-Json)
} catch {
    Write-Host "ERROR: Could not parse JSON file" -ForegroundColor Red
    exit 1
}

$skipCount = ($BatchNumber - 1) * $BatchSize
$batchFiles = $allFiles | Select-Object -Skip $skipCount -First $BatchSize

Write-Host "Total files in project: $($allFiles.Count)" -ForegroundColor Green
Write-Host "Starting at file: $($skipCount + 1)" -ForegroundColor Green
Write-Host "Files in this batch: $($batchFiles.Count)" -ForegroundColor Yellow
Write-Host ""

if ($batchFiles.Count -eq 0) {
    Write-Host "No more files to process!" -ForegroundColor Yellow
    exit 0
}

$successCount = 0
$skipCount_local = 0
$changeLog = @()
$syntaxErrors = @()

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
    return "app"
}

# Process each file
foreach ($file in $batchFiles) {
    $filePath = $file.File
    $fullPath = Join-Path (Get-Location) $filePath
    
    Write-Host "Processing: $filePath" -ForegroundColor White
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "  ❌ File not found" -ForegroundColor Red
        continue
    }
    
    try {
        $originalContent = Get-Content $fullPath -Raw
        $content = $originalContent
        $serviceName = Get-ServiceName $filePath
        $changesMade = 0
        $needsImport = $false
        
        # Find all console.error lines
        $lines = $originalContent -split "`n"
        $newLines = @()
        $lineNum = 0
        
        foreach ($line in $lines) {
            $lineNum++
            $newLine = $line
            
            # Check if line has console.error
            if ($line -match 'console\.error\s*\(') {
                # Skip if already has logErrorFromCatch
                if ($line -match 'logErrorFromCatch|logErrorToDB') {
                    $newLines += $newLine
                    continue
                }
                
                # Replace pattern: console.error('...', error) or console.error('[TAG]...')
                # Simple replacement: extract context from the error message
                $context = "Error handling"
                if ($line -match '\[([A-Z][A-Z0-9\-]+)\]') {
                    $tag = $matches[1]
                    $context = $tag.ToLower() -replace '-', ' '
                }
                
                # Replace the console.error call
                $newLine = $line -replace 'console\.error\([^)]*\);?', "await logErrorFromCatch(error, '$serviceName', '$context');"
                
                # Handle .catch pattern
                if ($line -match '\.catch\s*\(\s*(\w+)\s*=>\s*console\.error') {
                    $varName = $matches[1]
                    $newLine = $line -replace "\.catch\s*\(\s*$varName\s*=>\s*console\.error\([^)]*\)", ".catch($varName => { logErrorFromCatch($varName, '$serviceName', 'Async operation'); })"
                }
                
                if ($newLine -ne $line) {
                    $changesMade++
                    $needsImport = $true
                }
            }
            
            $newLines += $newLine
        }
        
        # Reconstruct content
        $content = $newLines -join "`n"
        
        # Add import if needed and not already present
        if ($needsImport -and $content -notmatch "logErrorFromCatch") {
            # Find last import line
            $importLines = @()
            $contentLines = $content -split "`n"
            $lastImportIdx = -1
            
            for ($i = 0; $i -lt $contentLines.Count; $i++) {
                if ($contentLines[$i] -match "^import\s+" -and $contentLines[$i] -match "from\s+") {
                    $lastImportIdx = $i
                }
            }
            
            if ($lastImportIdx -ge 0) {
                # Insert import after last import
                $contentLines[$lastImportIdx] = $contentLines[$lastImportIdx] + "`nimport { logErrorFromCatch } from '../shared/errorLogger.js';"
                $content = $contentLines -join "`n"
            }
        }
        
        # Write back if changes made
        if ($content -ne $originalContent) {
            Set-Content -Path $fullPath -Value $content -NoNewline
            Write-Host "    ✅ $changesMade replacements made" -ForegroundColor Green
            $successCount++
            $changeLog += $filePath
        }
        else {
            Write-Host "    ⚠️  No changes found" -ForegroundColor Yellow
            $skipCount_local++
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
foreach ($file in $batchFiles) {
    $filePath = $file.File
    $fullPath = Join-Path (Get-Location) $filePath
    
    if (Test-Path $fullPath) {
        $result = & node -c $fullPath 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $filePath" -ForegroundColor Green
            $syntaxPassCount++
        }
        else {
            Write-Host "❌ $filePath" -ForegroundColor Red
            Write-Host "   $result" -ForegroundColor Gray
            $syntaxErrors += $filePath
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BATCH $BatchNumber SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Files processed: $($batchFiles.Count)" -ForegroundColor White
Write-Host "Files modified: $successCount" -ForegroundColor Green
Write-Host "Files skipped: $skipCount_local" -ForegroundColor Yellow
Write-Host "Syntax checks passed: $syntaxPassCount / $($batchFiles.Count)" -ForegroundColor $(if ($syntaxErrors.Count -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($syntaxErrors.Count -gt 0) {
    Write-Host "⚠️  SYNTAX ERRORS FOUND:" -ForegroundColor Red
    foreach ($err in $syntaxErrors) {
        Write-Host "  - $err" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "DO NOT COMMIT - Fix errors first" -ForegroundColor Red
}
else {
    Write-Host "✅ ALL SYNTAX CHECKS PASSED" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Review: git diff" -ForegroundColor Gray
    Write-Host "  2. Commit: git add -A && git commit -m 'Fix console.error in batch $BatchNumber ($(Get-Date -Format yyyy-MM-dd))'" -ForegroundColor Gray
    Write-Host "  3. Next batch: .\BULK_CONSOLE_FIX_V2.ps1 -BatchNumber $($BatchNumber + 1) -BatchSize 30" -ForegroundColor Gray
}

$logFile = "BULK_FIX_LOG_BATCH_$BatchNumber.json"
@{
    Batch = $BatchNumber
    FilesProcessed = $batchFiles.Count
    FilesModified = $successCount
    SyntaxPass = ($syntaxErrors.Count -eq 0)
    Timestamp = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
} | ConvertTo-Json | Out-File $logFile -Force

Write-Host ""
Write-Host "Log: $logFile" -ForegroundColor Cyan
