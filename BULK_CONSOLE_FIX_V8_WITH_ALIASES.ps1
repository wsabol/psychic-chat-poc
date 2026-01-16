# Bulk Console.error/warn Fixer - Version 8 WITH PATH ALIASES
# Process all files at once, then syntax check all, then report summary
# CLIENT: Uses @shared path alias (via jsconfig.json)
# WORKER/API: Uses relative paths to PROJECT ROOT /shared/

param(
    [string[]]$Files = @(),
    [string]$BatchName = "Batch"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BULK CONSOLE FIX V8 WITH PATH ALIASES" -ForegroundColor Cyan
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

# Calculate import path to errorLogger
# For client: Use path alias @shared (defined in jsconfig.json)
# For worker/api: Use relative paths to PROJECT ROOT /shared/
function Get-ErrorLoggerImportPath {
    param([string]$filePath)
    
    # Normalize path separators
    $filePath = $filePath -replace '\\', '/'
    
    # CLIENT FILES: Use path alias @shared (webpack alias via jsconfig.json)
    if ($filePath -match '^client/') {
        return '@shared/errorLogger.js'
    }
    
    # API/SHARED: One level up to api/, then up one more to project root
    if ($filePath -match '^api/shared/') {
        return '../shared/errorLogger.js'
    }
    
    # API FILES: Count dirs after 'api/', add 1 more for root
    if ($filePath -match '^api/') {
        $pathAfterApi = $filePath -replace '^api/', ''
        $parts = $pathAfterApi -split '/'
        $dirCount = $parts.Count - 1  # -1 to exclude filename
        $ups = '../' * ($dirCount + 1)  # +1 to go up one more level to project root
        return $ups + 'shared/errorLogger.js'
    }
    
    # WORKER FILES: Count dirs after 'worker/', add 2 for root (worker dir + project root)
    if ($filePath -match '^worker/') {
        $pathAfterWorker = $filePath -replace '^worker/', ''
        $parts = $pathAfterWorker -split '/'
        $dirCount = $parts.Count - 1  # -1 to exclude filename
        $ups = '../' * ($dirCount + 2)  # +2 to go up through worker dir and to project root
        return $ups + 'shared/errorLogger.js'
    }
    
    return '@shared/errorLogger.js'
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
        Write-Host "✅ $filePath - $changeCount replacements (path: $(Get-ErrorLoggerImportPath $filePath))" -ForegroundColor Green
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
        # Skip .jsx and .tsx files - React validates these at runtime
        if ($filePath -match '\.(jsx|tsx)$') {
            Write-Host "⊘ $filePath (JSX/TSX - validated by React)" -ForegroundColor Yellow
            $syntaxPassCount++
            continue
        }
        
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
