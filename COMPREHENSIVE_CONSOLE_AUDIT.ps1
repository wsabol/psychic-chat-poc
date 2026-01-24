# Comprehensive Console Statement Audit
# Scans api/, client/src/, and worker/ for all console.* statements
# Generates detailed report for cleanup

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "COMPREHENSIVE CONSOLE AUDIT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$excludePaths = @("node_modules", ".git", "build", "dist", ".next")
$directories = @("api", "client/src", "worker")

$results = @{
    TotalFiles = 0
    FilesWithIssues = 0
    TotalStatements = 0
    ByType = @{
        error = 0
        warn = 0
        log = 0
        info = 0
        debug = 0
    }
    Files = @()
}

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        Write-Host "Skipping $dir (not found)" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Scanning $dir..." -ForegroundColor Cyan
    
    $jsFiles = Get-ChildItem -Path $dir -Include "*.js","*.jsx" -Recurse -File -ErrorAction SilentlyContinue | 
        Where-Object {
            $path = $_.FullName
            -not ($excludePaths | Where-Object { $path -like "*$_*" })
        }
    
    $results.TotalFiles += $jsFiles.Count
    
    foreach ($file in $jsFiles) {
        try {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if (-not $content) { continue }
            
            # Skip errorLogger.js itself to avoid circular calls
            if ($file.Name -eq "errorLogger.js") {
                Write-Host "  Skipping $($file.Name) (errorLogger itself)" -ForegroundColor Gray
                continue
            }
            
            $lines = $content -split "`n"
            $issues = @()
            
            for ($i = 0; $i -lt $lines.Count; $i++) {
                $line = $lines[$i]
                $lineNum = $i + 1
                
                # Skip commented lines
                if ($line -match '^\s*//') { continue }
                if ($line -match '^\s*\*') { continue }
                
                # Check each console method
                @('error', 'warn', 'log', 'info', 'debug') | ForEach-Object {
                    $method = $_
                    if ($line -match "console\.$method\s*\(") {
                        $results.ByType[$method]++
                        $results.TotalStatements++
                        
                        $codeSnippet = $line.Trim()
                        if ($codeSnippet.Length -gt 100) {
                            $codeSnippet = $codeSnippet.Substring(0, 97) + "..."
                        }
                        
                        $issues += @{
                            Line = $lineNum
                            Method = $method
                            Code = $codeSnippet
                        }
                    }
                }
            }
            
            if ($issues.Count -gt 0) {
                $results.FilesWithIssues++
                $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
                
                $results.Files += @{
                    Path = $relativePath
                    FullPath = $file.FullName
                    IssueCount = $issues.Count
                    Issues = $issues
                }
                
                Write-Host "  Found: $relativePath ($($issues.Count) statements)" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "  Error reading $($file.Name): $_" -ForegroundColor Red
        }
    }
}

# Display summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AUDIT SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total Files Scanned: $($results.TotalFiles)" -ForegroundColor White
Write-Host "Files With Issues: $($results.FilesWithIssues)" -ForegroundColor Yellow
Write-Host "Total Console Statements: $($results.TotalStatements)" -ForegroundColor Red
Write-Host ""
Write-Host "Breakdown by Type:" -ForegroundColor White
Write-Host "  console.error: $($results.ByType.error)" -ForegroundColor Red
Write-Host "  console.warn: $($results.ByType.warn)" -ForegroundColor Yellow
Write-Host "  console.log: $($results.ByType.log)" -ForegroundColor Cyan
Write-Host "  console.info: $($results.ByType.info)" -ForegroundColor Blue
Write-Host "  console.debug: $($results.ByType.debug)" -ForegroundColor Magenta
Write-Host ""

# Show top 20 files with most issues
Write-Host "Top 20 Files by Issue Count:" -ForegroundColor White
$results.Files | Sort-Object -Property IssueCount -Descending | Select-Object -First 20 | ForEach-Object {
    Write-Host "  $($_.Path): $($_.IssueCount) statements" -ForegroundColor Yellow
}
Write-Host ""

# Save detailed report
$jsonReport = $results | ConvertTo-Json -Depth 10
$jsonReport | Out-File "CONSOLE_AUDIT_REPORT.json" -Encoding UTF8 -Force

Write-Host "Detailed report saved to: CONSOLE_AUDIT_REPORT.json" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run FIX_CONSOLE_ERRORS.ps1 to replace console.error with errorLogger" -ForegroundColor White
Write-Host "  2. Run cleanup.ps1 to remove console.log, console.warn, etc." -ForegroundColor White
Write-Host ""
