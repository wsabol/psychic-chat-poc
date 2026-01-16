# Bulk Console.error/warn Fixer - Version 6 FIXED
# Works with new shared/errorLogger.js location
# Properly escapes all regex patterns for PowerShell

param(
    [string[]]$Files = @(),
    [string]$BatchName = "Batch"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BULK CONSOLE FIX V6 FIXED" -ForegroundColor Cyan
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

function Get-ErrorLoggerImportPath {
    param([string]$filePath)
    
    $filePath = $filePath -replace '\\', '/'
    
    if ($filePath -match 'api/shared/') {
        return '../../../shared/errorLogger.js'
    }
    elseif ($filePath -match 'api/') {
        $afterApi = $filePath -replace '.*api/', ''
        $dirCount = ($afterApi -split '/' | Measure-Object).Count - 1
        return ('../' * ($dirCount + 1)) + 'shared/errorLogger.js'
    }
    elseif ($filePath -match 'client/') {
        $afterClient = $filePath -replace '.*client/', ''
        $dirCount = ($afterClient -split '/' | Measure-Object).Count - 1
        return ('../' * ($dirCount + 1)) + 'shared/errorLogger.js'
    }
    elseif ($filePath -match 'worker/') {
        $afterWorker = $filePath -replace '.*worker/', ''
        $dirCount = ($afterWorker -split '/' | Measure-Object).Count - 1
        return ('../' * ($dirCount + 1)) + 'shared/errorLogger.js'
    }
    
    return '../../../../shared/errorLogger.js'
}

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

foreach ($filePath in $Files) {
    $fullPath = Join-Path (Get-Location) $filePath
    
    Write-Host "Processing: $filePath" -ForegroundColor White
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "  File not found" -ForegroundColor Red
        continue
    }
    
    $originalContent = Get-Content $fullPath -Raw
    
    if ($originalContent -match "logErrorFromCatch.*errorLogger") {
        Write-Host "  Already fixed" -ForegroundColor Yellow
        $skipCount++
        continue
    }
    
    $lines = $originalContent -split "`n"
    $newLines = @()
    $serviceName = Get-ServiceName $filePath
    $importPath = Get-ErrorLoggerImportPath $filePath
    $changeCount = 0
    $lastImportLine = -1
    
    Write-Host "  Service: $serviceName" -ForegroundColor Gray
    Write-Host "  Import: $importPath" -ForegroundColor Gray
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        $newLine = $line
        
        if ($line -match '^import\s+' -and $line -match 'from\s+') {
            $lastImportLine = $i
        }
        
        if ($line -match 'console\.error\s*\(' -and $line -notmatch 'logErrorFromCatch') {
            $context = "Error handling"
            $newLine = $line -replace 'console\.error\s*\(', 'logErrorFromCatch('
            $changeCount++
        }
        
        if ($line -match 'console\.warn\s*\(' -and $line -notmatch 'logWarning') {
            $newLine = $line -replace 'console\.warn\s*\(', 'logWarning('
            $changeCount++
        }
        
        $newLines += $newLine
    }
    
    $newContent = $newLines -join "`n"
    
    if ($changeCount -gt 0 -and $newContent -notmatch 'logErrorFromCatch.*errorLogger') {
        if ($lastImportLine -ge 0) {
            $newLines[$lastImportLine] = $newLines[$lastImportLine] + "`nimport { logErrorFromCatch } from '$importPath';"
            $newContent = $newLines -join "`n"
        }
    }
    
    if ($newContent -ne $originalContent) {
        Set-Content -Path $fullPath -Value $newContent -NoNewline
        Write-Host "  ✅ $changeCount replacements" -ForegroundColor Green
        $successCount++
        $changeLog += $filePath
    }
    else {
        Write-Host "  No changes needed" -ForegroundColor Cyan
        $skipCount++
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
            Write-Host "   $result" -ForegroundColor Red
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
    Write-Host "SYNTAX ERRORS:" -ForegroundColor Red
    $syntaxErrors | ForEach-Object { Write-Host "  - $_" }
    Write-Host ""
    Write-Host "DO NOT COMMIT" -ForegroundColor Red
}
else {
    Write-Host "ALL CHECKS PASSED - READY TO COMMIT" -ForegroundColor Green
}

Write-Host ""
