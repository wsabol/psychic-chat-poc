# Full Cleanup Script - Fixed
# Removes console.log, console.warn, logger.* statements from all source files

Write-Host ""
Write-Host "=================================================="
Write-Host "FULL CONSOLE CLEANUP"
Write-Host "=================================================="

$filesFixed = 0
$filesProcessed = 0

# Function to clean a file
function Clean-ConsoleStatements {
    param([string]$FilePath)
    
    try {
        $content = Get-Content $FilePath -Raw -ErrorAction SilentlyContinue
        if ([string]::IsNullOrEmpty($content)) {
            return 0
        }
        
        $original = $content
        
        # Remove lines with console.log
        $content = $content -replace '.*console\.log\(.*\);?.*\r?\n', ''
        
        # Remove lines with console.warn
        $content = $content -replace '.*console\.warn\(.*\);?.*\r?\n', ''
        
        # Remove lines with logger.info
        $content = $content -replace '.*logger\.info\(.*\);?.*\r?\n', ''
        
        # Remove lines with logger.warn
        $content = $content -replace '.*logger\.warn\(.*\);?.*\r?\n', ''
        
        # Remove lines with logger.error
        $content = $content -replace '.*logger\.error\(.*\);?.*\r?\n', ''
        
        # Write back if changed
        if ($content -ne $original) {
            Set-Content $FilePath $content -Force -ErrorAction SilentlyContinue
            return 1
        }
        
        return 0
    } catch {
        return 0
    }
}

# Process api directory
Write-Host ""
Write-Host "Processing api/" -ForegroundColor Yellow
$apiFiles = @()
$apiFiles += Get-ChildItem -Path api -Filter '*.js' -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notlike '*node_modules*' }

foreach ($file in $apiFiles) {
    $filesProcessed++
    $result = Clean-ConsoleStatements $file.FullName
    if ($result -eq 1) {
        Write-Host "  [FIXED] $($file.Name)" -ForegroundColor Green
        $filesFixed++
    }
}

# Process worker directory
Write-Host ""
Write-Host "Processing worker/" -ForegroundColor Yellow
$workerFiles = @()
$workerFiles += Get-ChildItem -Path worker -Filter '*.js' -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notlike '*node_modules*' }

foreach ($file in $workerFiles) {
    $filesProcessed++
    $result = Clean-ConsoleStatements $file.FullName
    if ($result -eq 1) {
        Write-Host "  [FIXED] $($file.Name)" -ForegroundColor Green
        $filesFixed++
    }
}

# Process client/src directory - .js files
Write-Host ""
Write-Host "Processing client/src/*.js" -ForegroundColor Yellow
$clientJsFiles = @()
$clientJsFiles += Get-ChildItem -Path client/src -Filter '*.js' -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notlike '*node_modules*' }

foreach ($file in $clientJsFiles) {
    $filesProcessed++
    $result = Clean-ConsoleStatements $file.FullName
    if ($result -eq 1) {
        Write-Host "  [FIXED] $($file.Name)" -ForegroundColor Green
        $filesFixed++
    }
}

# Process client/src directory - .jsx files
Write-Host ""
Write-Host "Processing client/src/*.jsx" -ForegroundColor Yellow
$clientJsxFiles = @()
$clientJsxFiles += Get-ChildItem -Path client/src -Filter '*.jsx' -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notlike '*node_modules*' }

foreach ($file in $clientJsxFiles) {
    $filesProcessed++
    $result = Clean-ConsoleStatements $file.FullName
    if ($result -eq 1) {
        Write-Host "  [FIXED] $($file.Name)" -ForegroundColor Green
        $filesFixed++
    }
}

Write-Host ""
Write-Host "=================================================="
Write-Host "CLEANUP SUMMARY"
Write-Host "=================================================="
Write-Host "Files processed: $filesProcessed" -ForegroundColor Gray
Write-Host "Files fixed:     $filesFixed" -ForegroundColor Green
Write-Host "console.error() statements PRESERVED" -ForegroundColor Yellow
Write-Host "=================================================="
Write-Host ""
Write-Host "NEXT STEPS - Rebuild Docker:"
Write-Host "  docker-compose down" -ForegroundColor Cyan
Write-Host "  docker image rm -f psychic-chat-api psychic-chat-client psychic-chat-worker" -ForegroundColor Cyan
Write-Host "  docker-compose build --no-cache" -ForegroundColor Cyan
Write-Host "  docker-compose up -d" -ForegroundColor Cyan
Write-Host ""
