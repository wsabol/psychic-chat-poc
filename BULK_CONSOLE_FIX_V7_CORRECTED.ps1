# Bulk Console.error/warn Fixer - Version 7 CORRECTED
# Process all files at once, then syntax check all, then report summary
# Works for api/, client/, worker/ with shared/errorLogger.js at PROJECT ROOT
# Based on V4's proven path calculation logic

param(
    [string[]]$Files = @(),
    [string]$BatchName = "Batch"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BULK CONSOLE FIX V7 CORRECTED" -ForegroundColor Cyan
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
$syntaxErrors = @()

# Calculate relative path to errorLogger at PROJECT ROOT
# Logic from V4 adapted for root-level shared/errorLogger.js
function Get-ErrorLoggerImportPath {
    param([string]$filePath)
    
    # Extract path after 'api/', 'client/', or 'worker/'
    $pathAfterRoot = ""
    $depth = 0
    
    if ($filePath -match 'api/shared/') {
        # api/shared/file.js -> ../../shared/errorLogger.js
        return '../../shared/errorLogger.js'
    }
    elseif ($filePath -match 'api/') {
        $pathAfterRoot = $filePath -replace '^api/', ''
        $depth = ($pathAfterRoot -split '/' | Measure-Object).Count - 1
        # api/routes/auth.js: depth=1 -> ../shared/errorLogger.js
        # api/routes/billing/file.js: depth=2 -> ../../shared/errorLogger.js
        $ups = '../' * ($depth + 1)
        return $ups + 'shared/errorLogger.js'
    }
    elseif ($filePath -match 'client/') {
        $pathAfterRoot = $filePath -replace '^client/', ''
        $depth = ($pathAfterRoot -split '/' | Measure-Object).Count - 1
        $ups = '../' * ($depth + 1)
        return $ups + 'shared/errorLogger.js'
    }
    elseif ($filePath -match 'worker/') {
        $pathAfterRoot = $filePath -replace '^worker/', ''
        $depth = ($pathAfterRoot -split '/' | Measure-Object).Count - 1
        $ups = '../' * ($depth + 1)
        return $ups + 'shared/errorLogger.js'
    }
    
    return '../shared/errorLogger.js'
}

# Extract service name from path
function Get-ServiceName {
    param([string]$filePath)
    
    $filePath = $filePath -replace '\\', '/'
    $parts = $filePath -split '/'
    $filename = $parts[-1] -replace '\.(js|jsx|ts|tsx)$', ''
    
    if ($filePath -match '/routes/') {
        $idx = [Array]::IndexOf($parts, 'routes')
        if ($idx -lt $parts.Count - 1 -and $parts[$idx + 1] -notmatch '\.(js|jsx|ts|tsx)$') {
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
        if ($idx -lt $parts.Count - 1 -and $parts[$idx + 1] -notmatch '\.(js|jsx|ts|tsx)$') {
            return $parts[$idx + 1]
        }
        return "service-$filename"
    }
    elseif ($filePath -match '/migrations/') {
        return "migration-$filename"
    }
    elseif ($filePath -match '/modules/handlers/') {
        return "handler-$filename"
    }
    elseif ($filePath -match '/modules/') {
        return "module-$filename"
    }
    elseif ($filePath -match '/hooks/') {
        return "hook-$filename"
    }
    elseif ($filePath -match '/components/') {
        return "component-$filename"
    }
    elseif ($filePath -match '/pages/') {
        return "page-$filename"
    }
    elseif ($filePath -match '/utils/') {
        return "util-$filename"
    }
    
    return "app"
}

# PHASE 1: Process all files (modify content)
Write-Host "PHASE 1: Processing files..." -ForegroundColor Cyan
Write-Host ""

foreach ($filePath in $Files) {
    $fullPath = Join-Path (Get-Location) $filePath
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "❌ $filePath - File not found" -ForegroundColor Red
        continue
    }
    
    $originalContent = Get-Content $fullPath -Raw
    
    # Skip if already has errorLogger import
    if ($originalContent -match "import.*logErrorFromCatch.*errorLogger") {
        Write-Host "⊘ $filePath - Already fixed" -ForegroundColor Yellow
        $skipCount++
        continue
    }
    
    # Skip if has no console.error or console.warn
    if ($originalContent -notmatch 'console\.(error|warn)\s*\(') {
        Write-Host "⊘ $filePath - No console.error/warn found" -ForegroundColor Yellow
        $skipCount++
        continue
    }
    
    $lines = $originalContent -split "`n"
    $newLines = @()
    $changeCount = 0
    $lastImportIdx = -1
    
    # Find last import line and process content
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        
        # Track last import
        if ($line -match '^import\s+' -and $line -match 'from\s+') {
            $lastImportIdx = $i
        }
        
        # Replace console.error (simple regex)
        if ($line -match 'console\.error\s*\(' -and $line -notmatch 'logErrorFromCatch') {
            $line = $line -replace 'console\.error\s*\(', 'logErrorFromCatch('
            $changeCount++
        }
        
        # Replace console.warn
        if ($line -match 'console\.warn\s*\(' -and $line -notmatch 'logWarning') {
            $line = $line -replace 'console\.warn\s*\(', 'logWarning('
            $changeCount++
        }
        
        $newLines += $line
    }
    
    # Reconstruct
    $newContent = $newLines -join "`n"
    
    # Add import if we made changes
    if ($changeCount -gt 0) {
        if ($lastImportIdx -ge 0) {
            $serviceName = Get-ServiceName $filePath
            $importPath = Get-ErrorLoggerImportPath $filePath
            $importStatement = "import { logErrorFromCatch } from '$importPath';"
            $newLines[$lastImportIdx] = $newLines[$lastImportIdx] + "`n$importStatement"
            $newContent = $newLines -join "`n"
        }
        
        Set-Content -Path $fullPath -Value $newContent -NoNewline
        Write-Host "✅ $filePath - $changeCount replacements" -ForegroundColor Green
        $successCount++
    }
    else {
        Write-Host "⊘ $filePath - No changes" -ForegroundColor Cyan
        $skipCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PHASE 2: Syntax checking all files..." -ForegroundColor Cyan
Write-Host ""

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
            $syntaxErrors += @{
                file = $filePath
                error = ($result | Out-String).Trim()
            }
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BATCH SUMMARY: $BatchName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total files: $($Files.Count)" -ForegroundColor White
Write-Host "Modified: $successCount" -ForegroundColor Green
Write-Host "Skipped: $skipCount" -ForegroundColor Yellow
Write-Host "Syntax pass: $syntaxPassCount / $($Files.Count)" -ForegroundColor $(if ($syntaxErrors.Count -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($syntaxErrors.Count -gt 0) {
    Write-Host "⚠️  SYNTAX ERRORS FOUND ($($syntaxErrors.Count)):" -ForegroundColor Red
    Write-Host ""
    foreach ($err in $syntaxErrors) {
        Write-Host "FILE: $($err.file)" -ForegroundColor Red
        Write-Host "ERROR: $($err.error)" -ForegroundColor DarkRed
        Write-Host ""
    }
    Write-Host "FIX ERRORS BEFORE COMMITTING" -ForegroundColor Red
}
else {
    Write-Host "✅ ALL SYNTAX CHECKS PASSED" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ready to commit:" -ForegroundColor Yellow
    Write-Host "  git add -A" -ForegroundColor Gray
    Write-Host "  git commit -m 'Fix console.error/warn: $BatchName'" -ForegroundColor Gray
}

Write-Host ""
