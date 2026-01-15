# PowerShell Script to audit console.error and console.warn in api/ folder
# Shows first 5 files with issues for batch fixing

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "API Console.error/warn Audit - Batch 1" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiPath = "api"
$filesWithConsole = @()
$batchSize = 5

# Get all JS files recursively
$allJsFiles = @(Get-ChildItem -Path $apiPath -Filter "*.js" -Recurse -ErrorAction SilentlyContinue)

Write-Host "Total JS files in api/: $($allJsFiles.Count)" -ForegroundColor Green
Write-Host ""

foreach ($file in $allJsFiles) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }
        
        $lines = @($content -split "`n")
        $issues = @()
        $lineNum = 0
        
        foreach ($line in $lines) {
            $lineNum++
            
            # Check for console.error or console.warn (but NOT if commented out)
            if (($line -match 'console\.(error|warn)\s*\(' -and $line -notmatch '^\s*//')) {
                $method = if ($line -match 'console\.error') { 'error' } else { 'warn' }
                $cleaned = $line.Trim()
                if ($cleaned.Length -gt 100) { $cleaned = $cleaned.Substring(0, 97) + "..." }
                
                $issues += @{
                    LineNum = $lineNum
                    Method = $method
                    Code = $cleaned
                }
            }
        }
        
        if ($issues.Count -gt 0) {
            $relPath = $file.FullName.Replace((Get-Location).Path + "\", "")
            
            $filesWithConsole += @{
                File = $relPath
                Path = $file.FullName
                IssueCount = $issues.Count
                Issues = $issues
                ServiceName = (($relPath -split '\\')[2] -replace '.js$', '')  # Extract service name
            }
        }
    }
    catch {
        # Skip files with read errors
        continue
    }
}

Write-Host "Files with console.error/warn: $($filesWithConsole.Count)" -ForegroundColor Yellow
Write-Host ""

# Show first 5 files
$batch = $filesWithConsole | Select-Object -First $batchSize

Write-Host "BATCH 1 - First $($batch.Count) files to fix:" -ForegroundColor Yellow
Write-Host ""

$counter = 1
foreach ($file in $batch) {
    Write-Host "$counter. $($file.File)" -ForegroundColor Cyan
    Write-Host "   Service: $($file.ServiceName)" -ForegroundColor Gray
    Write-Host "   Issues: $($file.IssueCount)" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($issue in $file.Issues) {
        Write-Host "   Line $($issue.LineNum): console.$($issue.Method)()" -ForegroundColor Magenta
        Write-Host "   >>> $($issue.Code)" -ForegroundColor Gray
    }
    Write-Host ""
    $counter++
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TOTAL IN PROJECT: $($filesWithConsole.Count) files" -ForegroundColor Yellow
Write-Host "BATCH 1: $($batch.Count) files" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Save full list for reference
$filesWithConsole | ForEach-Object { $_.PSObject.Properties.Remove('Issues') } | ConvertTo-Json | Out-File "api/CONSOLE_FULL_LIST.json" -Force
Write-Host "Full list saved to: api/CONSOLE_FULL_LIST.json" -ForegroundColor Green
Write-Host ""

# Show files 6-30 that will be next
Write-Host "UPCOMING BATCHES:" -ForegroundColor Cyan
$upcomingBatch2 = $filesWithConsole | Select-Object -Skip $batchSize -First $batchSize
Write-Host "Batch 2 (files 6-10): $($upcomingBatch2.Count) files"
foreach ($f in $upcomingBatch2) {
    Write-Host "  - $($f.File) ($($f.IssueCount) issues)"
}
