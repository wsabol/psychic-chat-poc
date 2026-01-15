# Bulk Console.error/warn Fixer
# Processes up to 30 files at a time, replacing console.* with logging functions
# Safe mode: All changes tracked, syntax checked before completion

param(
    [int]$BatchNumber = 1,
    [int]$BatchSize = 30
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BULK CONSOLE FIX - Batch $BatchNumber (Max $BatchSize files)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load the audit results
$auditFile = "api/CONSOLE_FULL_LIST.json"
if (-not (Test-Path $auditFile)) {
    Write-Host "ERROR: $auditFile not found. Run audit script first." -ForegroundColor Red
    exit 1
}

$allFiles = Get-Content $auditFile -Raw | ConvertFrom-Json
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
$errorCount = 0
$changeLog = @()
$syntaxErrors = @()

# Function to extract service name from file path
function Get-ServiceName {
    param([string]$filePath)
    
    # Extract service from path
    $parts = $filePath -split '\\'
    
    # Try to get from specific folder
    if ($parts -contains 'routes') {
        $idx = [Array]::IndexOf($parts, 'routes')
        if ($idx -lt $parts.Count - 1) {
            $next = $parts[$idx + 1]
            if ($next -notmatch '\.js$') {
                return $next
            }
        }
    }
    elseif ($parts -contains 'middleware') {
        return "middleware-$(($parts[-1] -replace '.js$', ''))"
    }
    elseif ($parts -contains 'jobs') {
        return "jobs-$(($parts[-1] -replace '.js$', ''))"
    }
    elseif ($parts -contains 'shared') {
        return "shared-$(($parts[-1] -replace '.js$', ''))"
    }
    elseif ($parts -contains 'services') {
        return "service-$(($parts[-1] -replace '.js$', ''))"
    }
    
    return "app"
}

# Function to extract context from error message
function Get-Context {
    param([string]$errorMessage)
    
    # Try to extract meaningful context from error message
    if ($errorMessage -match '\[([A-Z\-]+)\]') {
        $tag = $matches[1]
        return $tag.ToLower() -replace '-', ' '
    }
    
    # Fallback: try to get function context
    if ($errorMessage -match 'console\.error\([''`]([^''`]+)') {
        $msg = $matches[1]
        return $msg.Substring(0, [Math]::Min(50, $msg.Length))
    }
    
    return "Error handling"
}

# Function to check if file needs import
function Add-ImportIfNeeded {
    param(
        [string]$content,
        [string]$filePath,
        [string]$importType = 'logErrorFromCatch'
    )
    
    $importMap = @{
        'logErrorFromCatch' = "import { logErrorFromCatch } from '../shared/errorLogger.js';"
        'logErrorToDB' = "import { logErrorToDB } from '../shared/errorLogger.js';"
        'logWarning' = "import { logWarning } from '../shared/errorLogger.js';"
    }
    
    $importStatement = $importMap[$importType]
    
    # Skip if already imported
    if ($content -match [regex]::Escape($importStatement)) {
        return $content
    }
    
    # Find the last import line
    $lines = $content -split "`n"
    $lastImportIdx = -1
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^import\s+.*\s+from\s+['\`]") {
            $lastImportIdx = $i
        }
    }
    
    if ($lastImportIdx -ge 0) {
        # Insert after last import
        $lines[$lastImportIdx] = $lines[$lastImportIdx] + "`n$importStatement"
        return $lines -join "`n"
    }
    
    # Fallback: add after opening comments
    if ($content -match "^((?:\/\/.*?\n|\/\*.*?\*\/\n)*)") {
        $insertPos = $matches[1].Length
        return $content.Substring(0, $insertPos) + "$importStatement`n" + $content.Substring($insertPos)
    }
    
    return $content
}

# Process each file
foreach ($file in $batchFiles) {
    $filePath = $file.File
    $fullPath = Join-Path (Get-Location) $filePath
    
    Write-Host "Processing: $filePath" -ForegroundColor White
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "  ❌ File not found: $fullPath" -ForegroundColor Red
        $errorCount++
        continue
    }
    
    try {
        $originalContent = Get-Content $fullPath -Raw
        $content = $originalContent
        $serviceName = Get-ServiceName $filePath
        $changesMade = @()
        $needsImport = $false
        
        # Pattern 1: console.error in catch blocks with standard format
        $pattern1 = "console\.error\(`\[([A-Z\-]+)\]\s+([^`']+)`\);"
        $matches = [regex]::Matches($content, $pattern1)
        
        if ($matches.Count -gt 0) {
            Write-Host "    Found $($matches.Count) console.error pattern 1" -ForegroundColor Yellow
            
            foreach ($match in $matches) {
                $tag = $match.Groups[1].Value
                $context = $tag.ToLower() -replace '-', ' '
                
                $oldLine = $match.Value
                $newLine = "await logErrorFromCatch(error, '$serviceName', '$context');"
                
                $content = $content -replace [regex]::Escape($oldLine), $newLine
                $changesMade += "Pattern 1: Replaced $($match.Value.Substring(0, 40))..."
                $needsImport = $true
            }
        }
        
        # Pattern 2: console.error with quoted string (single/double quotes)
        $pattern2 = "console\.error\(['\"](\[.*?\].*?)['\"]"
        $matches = [regex]::Matches($content, $pattern2)
        
        if ($matches.Count -gt 0) {
            Write-Host "    Found $($matches.Count) console.error pattern 2" -ForegroundColor Yellow
            
            foreach ($match in $matches) {
                $msg = $match.Groups[1].Value
                $context = if ($msg -match '\[([A-Z\-]+)\]') { 
                    $matches[1] -replace '-', ' ' 
                } else { 
                    "Error handling" 
                }
                
                # Replace simple console.error calls
                $oldPattern = "console\.error\(['\"]" + [regex]::Escape($msg) + "['\"]"
                $newLine = "logErrorFromCatch(error, '$serviceName', '$context')"
                
                $content = $content -replace $oldPattern, $newLine
                $changesMade += "Pattern 2: Replaced error message logging"
                $needsImport = $true
            }
        }
        
        # Pattern 3: .catch(e => console.error(...))
        $pattern3 = "\.catch\s*\(\s*([a-zA-Z]+)\s*=>\s*console\.error\([^)]+\)\s*\)"
        $matches = [regex]::Matches($content, $pattern3)
        
        if ($matches.Count -gt 0) {
            Write-Host "    Found $($matches.Count) .catch pattern" -ForegroundColor Yellow
            
            foreach ($match in $matches) {
                $varName = $match.Groups[1].Value
                $oldLine = $match.Value
                $newLine = ".catch($varName => { logErrorFromCatch($varName, '$serviceName', 'Async operation'); })"
                
                $content = $content -replace [regex]::Escape($oldLine), $newLine
                $changesMade += "Pattern 3: Converted .catch() to logging"
                $needsImport = $true
            }
        }
        
        # Add import if needed and not already present
        if ($needsImport) {
            $content = Add-ImportIfNeeded $content $filePath "logErrorFromCatch"
        }
        
        # Write back to file if changes made
        if ($content -ne $originalContent) {
            Set-Content -Path $fullPath -Value $content -NoNewline
            Write-Host "    ✅ Changes applied: $($changesMade.Count) replacements" -ForegroundColor Green
            
            $changeLog += @{
                File = $filePath
                Changes = $changesMade.Count
                Details = $changesMade -join "; "
            }
            
            $successCount++
        }
        else {
            Write-Host "    ⚠️  No changes needed (patterns not found)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "    ❌ Error processing file: $_" -ForegroundColor Red
        $errorCount++
        continue
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SYNTAX CHECK - Running node -c on all files" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Syntax check all files
$syntaxPassCount = 0
foreach ($file in $batchFiles) {
    $filePath = $file.File
    $fullPath = Join-Path (Get-Location) $filePath
    
    if (Test-Path $fullPath) {
        try {
            $output = & node -c $fullPath 2>&1
            Write-Host "✅ $filePath" -ForegroundColor Green
            $syntaxPassCount++
        }
        catch {
            Write-Host "❌ $filePath - SYNTAX ERROR" -ForegroundColor Red
            Write-Host "   $_" -ForegroundColor Red
            $syntaxErrors += @{
                File = $filePath
                Error = $_.ToString()
            }
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BATCH $BatchNumber SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Files processed: $($batchFiles.Count)" -ForegroundColor White
Write-Host "Files changed: $successCount" -ForegroundColor Green
Write-Host "Files skipped: $($batchFiles.Count - $successCount)" -ForegroundColor Yellow
Write-Host "Syntax passes: $syntaxPassCount" -ForegroundColor Green
Write-Host "Syntax errors: $($syntaxErrors.Count)" -ForegroundColor $(if ($syntaxErrors.Count -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($syntaxErrors.Count -gt 0) {
    Write-Host "SYNTAX ERRORS FOUND:" -ForegroundColor Red
    foreach ($err in $syntaxErrors) {
        Write-Host "  - $($err.File)" -ForegroundColor Red
        Write-Host "    $($err.Error)" -ForegroundColor Gray
    }
}

# Save detailed log
$logData = @{
    BatchNumber = $BatchNumber
    BatchSize = $BatchSize
    FilesProcessed = $batchFiles.Count
    ChangesApplied = $successCount
    SyntaxPasses = $syntaxPassCount
    SyntaxErrors = $syntaxErrors.Count
    Details = $changeLog
    Errors = $syntaxErrors
    Timestamp = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
}

$logFile = "BULK_FIX_LOG_BATCH_$BatchNumber.json"
$logData | ConvertTo-Json -Depth 10 | Out-File $logFile -Force

Write-Host ""
Write-Host "Log saved to: $logFile" -ForegroundColor Cyan
Write-Host ""

if ($syntaxErrors.Count -eq 0) {
    Write-Host "✅ BATCH $BatchNumber READY TO COMMIT" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Review changes: git diff" -ForegroundColor Yellow
    Write-Host "  2. Commit: git commit -m 'Fix console.error in batch $BatchNumber'" -ForegroundColor Yellow
    Write-Host "  3. Run next batch: .\BULK_CONSOLE_FIX.ps1 -BatchNumber $($BatchNumber + 1) -BatchSize 30" -ForegroundColor Yellow
}
else {
    Write-Host "⚠️  BATCH $BatchNumber HAS SYNTAX ERRORS - DO NOT COMMIT" -ForegroundColor Red
    Write-Host "Review errors above and rerun if needed" -ForegroundColor Yellow
}

exit 0
