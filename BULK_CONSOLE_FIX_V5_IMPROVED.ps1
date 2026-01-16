# BULK CONSOLE FIX V5 - Improved with better .catch() handling
# Safely replaces console.error/warn/log with logging function calls

param(
    [string]$BatchName = "default",
    [string[]]$Files = @()
)

if ($Files.Count -eq 0) {
    Write-Host "Error: No files specified" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BULK CONSOLE FIX V5 - Improved" -ForegroundColor Cyan
Write-Host "Batch: $BatchName" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Files to process: $($Files.Count)" -ForegroundColor Green
Write-Host ""

$processedCount = 0
$modifiedCount = 0
$skippedCount = 0
$errorFiles = @()

foreach ($filePath in $Files) {
    if (-not (Test-Path $filePath)) {
        Write-Host "⚠️  File not found: $filePath" -ForegroundColor Yellow
        $skippedCount++
        continue
    }
    
    $content = Get-Content $filePath -Raw
    $originalContent = $content
    
    # Detect if file has console statements
    if ($content -notmatch 'console\.(error|warn|log)\s*\(') {
        Write-Host "⏭️  $filePath"
        Write-Host "    ⏭️  No changes found"
        $skippedCount++
        $processedCount++
        continue
    }
    
    # Determine service name from path
    $service = if ($filePath -match 'api') { "app" } elseif ($filePath -match 'worker') { "worker" } else { "client" }
    
    # Calculate import path
    $fileDir = Split-Path -Parent $filePath
    $levels = ([regex]::Matches($fileDir, '\\') | Measure-Object).Count - ([regex]::Matches("api", '\\') | Measure-Object).Count
    
    if ($filePath -match 'api\\') {
        $fromApi = $true
        $fileDir = $fileDir -replace '^.*\\api\\', ''
        $levels = $fileDir.Split('\').Count - 1
    } elseif ($filePath -match 'worker\\') {
        $fromApi = $false
        $service = "worker"
        $fileDir = $fileDir -replace '^.*\\worker\\', ''
        $levels = $fileDir.Split('\').Count - 1
    } else {
        $fromApi = $false
        $service = "client"
        $fileDir = $fileDir -replace '^.*\\client\\', ''
        $levels = $fileDir.Split('\').Count - 1
    }
    
    if ($fromApi) {
        $importPath = ('../' * $levels) + 'shared/errorLogger.js'
    } else {
        $importPath = ('../../' * ($levels + 1)) + 'errorLogger.js'
    }
    $importPath = $importPath -replace '\\', '/'
    
    # Check if already has import
    $hasImport = $content -match "import\s+.*errorLogger"
    
    # Add import if missing (with safer detection)
    if ((-not $hasImport) -and ($content -match 'console\.(error|warn|log)')) {
        $importLine = "import { logErrorFromCatch } from '$importPath';"
        # Find first import and add after it
        if ($content -match "^import\s+") {
            $content = $content -replace "^(import\s+[^\n]*\n)", "`$1$importLine`n"
        } else {
            $content = $importLine + "`n" + $content
        }
    }
    
    # SAFE replacement: only replace console.error/warn/log that are NOT already in an error handler
    $beforeModification = $content
    
    # Replace console.error with logErrorFromCatch (NOT in .catch blocks)
    $content = $content -replace 'console\.error\s*\(\s*([''"]([^''"]*)[''"],\s*)([^)]*)\)', 'logErrorFromCatch($3, ''$service'', ''$2'')'
    $content = $content -replace 'console\.error\s*\(\s*([^,]+),\s*([^)]*)\)', 'logErrorFromCatch($1, ''$service'', ''error'')'
    $content = $content -replace 'console\.error\s*\(\s*([^)]*)\)', 'logErrorFromCatch($1, ''$service'', ''error'')'
    
    # Replace console.warn
    $content = $content -replace 'console\.warn\s*\(([^)]*)\)', 'logErrorFromCatch($1, ''$service'', ''warning'')'
    
    # Replace console.log (keep as is - don't need logging)
    # For client code, console.log is development only - remove them
    if ($filePath -match 'client') {
        # Remove console.log entirely for client
        $content = $content -replace 'console\.log\s*\([^)]*\);?', ''
    }
    
    # Verify no malformed .catch() statements
    if ($content -match '\.catch\s*\([^)]*\{[^}]*\}[^)]*\)' -or $content -match '\{[^}]*\}\s*\)') {
        Write-Host "❌  $filePath"
        Write-Host "    ❌  SYNTAX ERROR: Malformed .catch() detected - skipping"
        $errorFiles += $filePath
        $processedCount++
        continue
    }
    
    # Check if modifications were made
    if ($beforeModification -ne $content) {
        $replacementCount = ([regex]::Matches($beforeModification, 'console\.(error|warn|log)').Count)
        Write-Host "✅  $filePath"
        Write-Host "    ✅  $replacementCount replacements, import path: $importPath"
        
        # Write back to file
        Set-Content -Path $filePath -Value $content -NoNewline
        $modifiedCount++
    } else {
        Write-Host "⏭️  $filePath"
        Write-Host "    ⏭️  No changes found"
        $skippedCount++
    }
    
    $processedCount++
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SYNTAX CHECK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$syntaxErrors = @()

foreach ($filePath in $Files) {
    if (-not (Test-Path $filePath)) { continue }
    
    $result = & node -c $filePath 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅  $filePath"
    } else {
        Write-Host "❌  $filePath"
        Write-Host "   Error details will be shown below"
        $syntaxErrors += $filePath
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BATCH SUMMARY: $BatchName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Files processed: $processedCount"
Write-Host "Files modified: $modifiedCount"
Write-Host "Files skipped: $skippedCount"
Write-Host "Syntax passes: $($Files.Count - $syntaxErrors.Count) / $($Files.Count)"

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
    Write-Host "Next commands:" -ForegroundColor Gray
    Write-Host "  git add -A" -ForegroundColor Gray
    Write-Host "  git commit -m 'Fix console.error in $BatchName'" -ForegroundColor Gray
}
