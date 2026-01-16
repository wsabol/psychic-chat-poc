# Bulk Console.error/warn Fixer - Version 6 (Universal with Fixed Imports)
# Works with new shared/errorLogger.js location
# Features:
# - Calculates correct relative paths automatically
# - Properly adds imports BEFORE checking for their existence
# - Validates syntax after each batch
# - Safe for api/, client/, worker/

param(
    [string[]]$Files = @(),
    [string]$BatchName = "Batch"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BULK CONSOLE FIX V6 - Universal Logger" -ForegroundColor Cyan
Write-Host "Batch: $BatchName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($Files.Count -eq 0) {
    Write-Host "No files provided!" -ForegroundColor Red
    exit 1
}

Write-Host "Files to process: $($Files.Count)" -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$skipCount = 0
$changeLog = @()
$syntaxErrors = @()

# Function to calculate relative path to errorLogger
# Works for files at any depth
function Get-ErrorLoggerImportPath {
    param([string]$filePath)
    
    # Normalize path
    $filePath = $filePath -replace '\\', '/'
    
    # Count directory levels from project root
    $parts = $filePath -split '/'
    $depth = $parts.Count - 2  # -2 because we have filename and first dir
    
    # Calculate how many ../ we need
    $ups = if ($depth -le 0) { './' } else { ('../' * $depth) + '../shared/errorLogger.js' }
    
    # Return the correct relative path
    if ($filePath -match 'api/shared/') {
        return '../../../shared/errorLogger.js'
    }
    elseif ($filePath -match 'api/') {
        # File is somewhere in api/
        $afterApi = $filePath -replace '.*api/', ''
        $dirCount = ($afterApi -split '/' | Measure-Object).Count - 1
        return ('../' * ($dirCount + 1)) + 'shared/errorLogger.js'
    }
    elseif ($filePath -match 'client/') {
        # File is somewhere in client/
        $afterClient = $filePath -replace '.*client/', ''
        $dirCount = ($afterClient -split '/' | Measure-Object).Count - 1
        return ('../' * ($dirCount + 1)) + 'shared/errorLogger.js'
    }
    elseif ($filePath -match 'worker/') {
        # File is somewhere in worker/
        $afterWorker = $filePath -replace '.*worker/', ''
        $dirCount = ($afterWorker -split '/' | Measure-Object).Count - 1
        return ('../' * ($dirCount + 1)) + 'shared/errorLogger.js'
    }
    
    # Default fallback
    return '../../../../shared/errorLogger.js'
}

# Function to extract service name from file path
function Get-ServiceName {
    param([string]$filePath)
    
    $filePath = $filePath -replace '\\', '/'
    $parts = $filePath -split '/'
    $filename = $parts[-1] -replace '\.js$', ''
    
    if ($filePath -match '/routes/') {
        $idx = [Array]::IndexOf($parts, 'routes')
        if ($idx -lt $parts.Count - 1 -and $parts[$idx + 1] -notmatch '\.js$') {
            return $parts[$idx + 1]
        }
        return $filename
    }
    elseif ($filePath -match '/middleware/') {
        return "middleware-$filename"
    }
    elseif ($filePath -match '/jobs/') {
        return "job-$filename"
    }
    elseif ($filePath -match '/shared/') {
        return "shared-$filename"
    }
    elseif ($filePath -match '/services/') {
        $idx = [Array]::IndexOf($parts, 'services')
        if ($idx -lt $parts.Count - 1 -and $parts[$idx + 1] -notmatch '\.js$') {
            return $parts[$idx + 1]
        }
        return "service-$filename"
    }
    elseif ($filePath -match '/migrations/') {
        return "migration-$filename"
    }
    
    return "app"
}

# Process each file
foreach ($filePath in $Files) {
    $fullPath = Join-Path (Get-Location) $filePath
    
    Write-Host "Processing: $filePath" -ForegroundColor White
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "  ❌ File not found: $fullPath" -ForegroundColor Red
        continue
    }
    
    try {
        $originalContent = Get-Content $fullPath -Raw
        
        # Skip if already has logErrorFromCatch import
        if ($originalContent -match "import.*logErrorFromCatch.*errorLogger") {
            Write-Host "  ⚠️  Already has errorLogger import" -ForegroundColor Yellow
            $skipCount++
            continue
        }
        
        $lines = $originalContent -split "`n"
        $newLines = @()
        $serviceName = Get-ServiceName $filePath
        $importPath = Get-ErrorLoggerImportPath $filePath
        $changeCount = 0
        $hasImport = $false
        $importAdded = $false
        
        Write-Host "    Service: $serviceName" -ForegroundColor Gray
        Write-Host "    Import Path: $importPath" -ForegroundColor Gray
        
        foreach ($i in 0..($lines.Count - 1)) {
            $line = $lines[$i]
            $newLine = $line
            
            # Check if this is an import statement (to know where to add our import)
            if ($line -match '^\s*import\s+' -and -not $importAdded) {
                $hasImport = $true
            }
            
            # Add our import after the last existing import (but only once)
            if ($hasImport -and -not $importAdded -and $line -notmatch '^\s*import\s+') {
                # This is the first non-import line, insert before it
                if ($originalContent -notmatch "import.*logErrorFromCatch") {
                    $newLines += "import { logErrorFromCatch } from '$importPath';"
                    $importAdded = $true
                }
            }
            
            # Replace console.error
            if ($line -match 'console\.error\s*\(' -and $line -notmatch 'logErrorFromCatch|logErrorToDB') {
                $context = "Error handling"
                
                # Try to extract context from error message
                if ($line -match 'console\.error\s*\(\s*[\'\"]([^\'\"]*)') { {
                    $msg = $matches[1]
                    if ($msg.Length -gt 0 -and $msg.Length -lt 50) {
                        $context = $msg
                    }
                }
                
                # Handle different error patterns
                if ($line -match '\.catch\s*\(\s*(\w+)\s*=>\s*console\.error') {
                    # Arrow function in catch
                    $varName = $matches[1]
                    $newLine = $line -replace "console\.error\([^)]*\)", "logErrorFromCatch($varName, '$serviceName', '$context')"
                }
                elseif ($line -match '^\s*console\.error\(' -and $line -match ';\s*$') {
                    # Standalone console.error with semicolon
                    $newLine = $line -replace 'console\.error\(', "logErrorFromCatch("
                }
                else {
                    # Generic replacement
                    $newLine = $line -replace 'console\.error\(', "logErrorFromCatch("
                }
                
                if ($newLine -ne $line) {
                    $changeCount++
                }
            }
            
            # Replace console.warn
            if ($line -match 'console\.warn\s*\(' -and $line -notmatch 'logErrorFromCatch|logWarning') {
                $newLine = $line -replace 'console\.warn\(', "logWarning("
                if ($newLine -ne $line) {
                    $changeCount++
                }
            }
            
            $newLines += $newLine
        }
        
        # Reconstruct content
        $newContent = $newLines -join "`n"
        
        # Ensure import is added if we made changes
        if ($changeCount -gt 0 -and $newContent -notmatch "import.*logErrorFromCatch") {
            # Find the last import line
            $contentLines = $newContent -split "`n"
            $lastImportIdx = -1
            
            for ($j = 0; $j -lt $contentLines.Count; $j++) {
                if ($contentLines[$j] -match "^import\s+" -and $contentLines[$j] -match "from\s+") {
                    $lastImportIdx = $j
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
            Write-Host "    ✅ $changeCount replacements" -ForegroundColor Green
            $successCount++
            $changeLog += $filePath
        }
        else {
            Write-Host "    ℹ️  No console.error/warn found" -ForegroundColor Cyan
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
Write-Host "SYNTAX VALIDATION" -ForegroundColor Cyan
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
            Write-Host "   $result" -ForegroundColor DarkRed
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
    Write-Host "⚠️  SYNTAX ERRORS - DO NOT COMMIT:" -ForegroundColor Red
    foreach ($err in $syntaxErrors) {
        Write-Host "  - $err" -ForegroundColor Red
    }
}
else {
    Write-Host "✅ ALL CHECKS PASSED - READY TO COMMIT" -ForegroundColor Green
}

Write-Host ""
