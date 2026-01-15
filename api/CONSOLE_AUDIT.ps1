# PowerShell Script to Audit API Files for console.* statements
# Identifies which console methods are used and where

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "API Console Statement Audit" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiPath = "api"
$filesWithConsole = @()
$totalConsoleStatements = 0
$methodCounts = @{
    'error' = 0
    'warn' = 0
    'log' = 0
    'info' = 0
    'debug' = 0
}

# Get all JS files in api folder
$jsFiles = Get-ChildItem -Path $apiPath -Filter "*.js" -Recurse -ErrorAction SilentlyContinue

foreach ($file in $jsFiles) {
    $content = Get-Content $file.FullName -Raw
    $lines = Get-Content $file.FullName
    
    $hasConsole = $false
    $issues = @()
    $lineNum = 0
    
    foreach ($line in $lines) {
        $lineNum++
        
        # Check for console.error
        if ($line -match 'console\.error\s*\(') {
            $methodCounts['error']++
            $issues += @{
                LineNum = $lineNum
                Method = 'error'
                Code = $line.Trim().Substring(0, [Math]::Min(80, $line.Trim().Length))
            }
            $hasConsole = $true
        }
        
        # Check for console.warn
        if ($line -match 'console\.warn\s*\(') {
            $methodCounts['warn']++
            $issues += @{
                LineNum = $lineNum
                Method = 'warn'
                Code = $line.Trim().Substring(0, [Math]::Min(80, $line.Trim().Length))
            }
            $hasConsole = $true
        }
        
        # Check for console.log
        if ($line -match 'console\.log\s*\(') {
            $methodCounts['log']++
            $issues += @{
                LineNum = $lineNum
                Method = 'log'
                Code = $line.Trim().Substring(0, [Math]::Min(80, $line.Trim().Length))
            }
            $hasConsole = $true
        }
        
        # Check for console.info
        if ($line -match 'console\.info\s*\(') {
            $methodCounts['info']++
            $issues += @{
                LineNum = $lineNum
                Method = 'info'
                Code = $line.Trim().Substring(0, [Math]::Min(80, $line.Trim().Length))
            }
            $hasConsole = $true
        }
        
        # Check for console.debug
        if ($line -match 'console\.debug\s*\(') {
            $methodCounts['debug']++
            $issues += @{
                LineNum = $lineNum
                Method = 'debug'
                Code = $line.Trim().Substring(0, [Math]::Min(80, $line.Trim().Length))
            }
            $hasConsole = $true
        }
    }
    
    if ($hasConsole) {
        $filesWithConsole += @{
            File = $file.FullName.Replace("$(Get-Location)\", "")
            IssueCount = $issues.Count
            Issues = $issues
        }
        $totalConsoleStatements += $issues.Count
        
        Write-Host "⚠️  $($file.FullName.Replace("$(Get-Location)\", ""))" -ForegroundColor Yellow
        Write-Host "    Found: $($issues.Count) console statement(s)" -ForegroundColor Yellow
        
        foreach ($issue in $issues) {
            Write-Host "    Line $($issue.LineNum): console.$($issue.Method)(...)" -ForegroundColor Magenta
            Write-Host "        $($issue.Code)..." -ForegroundColor Gray
        }
        Write-Host ""
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Files with console statements: $($filesWithConsole.Count)" -ForegroundColor Yellow
Write-Host "Total console statements: $totalConsoleStatements" -ForegroundColor Yellow
Write-Host ""

Write-Host "Breakdown by method:" -ForegroundColor Cyan
foreach ($method in $methodCounts.Keys | Sort-Object) {
    if ($methodCounts[$method] -gt 0) {
        Write-Host "  console.$method`(...): $($methodCounts[$method])" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Files to update:" -ForegroundColor Red
foreach ($file in $filesWithConsole) {
    Write-Host "  - $($file.File) ($($file.IssueCount) statements)" -ForegroundColor Red
}

# Export to JSON
$report = @{
    FilesAffected = $filesWithConsole.Count
    TotalStatements = $totalConsoleStatements
    MethodBreakdown = $methodCounts
    Files = $filesWithConsole
}

$report | ConvertTo-Json -Depth 10 | Out-File "api/CONSOLE_AUDIT_RESULTS.json" -Force
Write-Host ""
Write-Host "Results saved to api/CONSOLE_AUDIT_RESULTS.json" -ForegroundColor Cyan
