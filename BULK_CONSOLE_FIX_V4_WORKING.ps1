# BULK CONSOLE FIX V4 - Proven working version (reverted from broken V5)
param(
    [string]$BatchName = "default",
    [string[]]$Files = @()
)

if ($Files.Count -eq 0) {
    Write-Host "Error: No files specified" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================"
Write-Host "BULK CONSOLE FIX V4 - Proven Working"
Write-Host "Batch: $BatchName"
Write-Host "========================================"
Write-Host "Files to process: $($Files.Count)"
Write-Host ""

$processedCount = 0
$modifiedCount = 0
$skippedCount = 0

foreach ($filePath in $Files) {
    if (-not (Test-Path $filePath)) {
        Write-Host "⚠️  File not found: $filePath"
        $skippedCount++
        continue
    }
    
    $content = Get-Content $filePath -Raw
    $originalContent = $content
    
    # Count console statements before
    $beforeCount = ([regex]::Matches($content, 'console\.(error|warn|log)\s*\(').Count)
    
    if ($beforeCount -eq 0) {
        Write-Host "⏭️  $filePath"
        Write-Host "    ⏭️  No changes found"
        $skippedCount++
        $processedCount++
        continue
    }
    
    # Determine service name
    $service = if ($filePath -match 'api') { "app" } elseif ($filePath -match 'worker') { "worker" } else { "client" }
    
    # Calculate import path based on file location
    if ($filePath -match 'api') {
        $depth = ($filePath -split '\\' | Where-Object { $_ -and $_ -ne 'api' } | Measure-Object).Count
        if ($filePath -match 'api\\shared') {
            $importPath = './errorLogger.js'
        } elseif ($filePath -match 'api\\services' -or $filePath -match 'api\\routes\\[^\\]*\.js') {
            $importPath = '../shared/errorLogger.js'
        } elseif ($filePath -match 'api\\routes') {
            $importPath = '../../shared/errorLogger.js'
        } else {
            $importPath = '../shared/errorLogger.js'
        }
    } else {
        $importPath = '../../shared/errorLogger.js'
    }
    
    # Add import if missing
    if ($content -notmatch "import.*errorLogger") {
        $importLine = "import { logErrorFromCatch } from '$importPath';"
        if ($content -match "^import ") {
            $firstImportEnd = $content.IndexOf("`n", $content.IndexOf("import ")) + 1
            $content = $content.Substring(0, $firstImportEnd) + $importLine + "`n" + $content.Substring($firstImportEnd)
        } else {
            $content = $importLine + "`n`n" + $content
        }
    }
    
    # Simple and effective replacements
    $content = $content -replace 'console\.error\s*\(', "logErrorFromCatch("
    $content = $content -replace 'console\.warn\s*\(', "logErrorFromCatch("
    $content = $content -replace 'console\.log\s*\(', "logErrorFromCatch("
    
    # Write back to file
    Set-Content -Path $filePath -Value $content -NoNewline
    
    Write-Host "✅  $filePath"
    Write-Host "    ✅  $beforeCount replacements, import path: $importPath"
    
    $modifiedCount++
    $processedCount++
}

Write-Host ""
Write-Host "========================================="
Write-Host "SYNTAX CHECK"
Write-Host "========================================="

$syntaxPasses = 0
$syntaxErrors = @()

foreach ($filePath in $Files) {
    if (-not (Test-Path $filePath)) { continue }
    
    $result = & node -c $filePath 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅  $filePath"
        $syntaxPasses++
    } else {
        Write-Host "❌  $filePath"
        Write-Host "   Error: $result"
        $syntaxErrors += $filePath
    }
}

Write-Host ""
Write-Host "========================================="
Write-Host "BATCH SUMMARY: $BatchName"
Write-Host "========================================="
Write-Host "Files processed: $processedCount"
Write-Host "Files modified: $modifiedCount"
Write-Host "Files skipped: $skippedCount"
Write-Host "Syntax passes: $syntaxPasses / $($Files.Count)"

if ($syntaxErrors.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  SYNTAX ERRORS:" -ForegroundColor Red
    $syntaxErrors | ForEach-Object {
        Write-Host "  - $_"
    }
    Write-Host ""
    Write-Host "DO NOT COMMIT - Review errors above" -ForegroundColor Red
} else {
    Write-Host ""
    Write-Host "✅  ALL CHECKS PASSED - READY TO COMMIT" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next commands:"
    Write-Host "  git add -A"
    Write-Host "  git commit -m 'Fix console.error in $BatchName'"
}
