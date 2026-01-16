# Audit console statements - SOURCE FILES ONLY (exclude node_modules)
$results = @()

Get-ChildItem -Path "api" -Filter "*.js" -Recurse | ForEach-Object {
    $file = $_
    # SKIP node_modules
    if ($file.FullName -match "node_modules") {
        return
    }
    
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if ($content -match 'console\.(error|warn|log)\s*\(') {
        $errorCount = ([regex]::Matches($content, 'console\.error\s*\(').Count)
        $warnCount = ([regex]::Matches($content, 'console\.warn\s*\(').Count)
        $logCount = ([regex]::Matches($content, 'console\.log\s*\(').Count)
        $total = $errorCount + $warnCount + $logCount
        
        if ($total -gt 0) {
            $results += @{
                File = $file.FullName.Replace((Get-Location).Path + '\', '')
                Errors = $errorCount
                Warns = $warnCount
                Logs = $logCount
                Total = $total
            }
        }
    }
}

# Sort by total count descending
$results = $results | Sort-Object { $_.Total } -Descending

# Display summary
Write-Host "Source files with console statements: $($results.Count)" -ForegroundColor Green
Write-Host ""

# Save to file
$results | ConvertTo-Json | Out-File "CONSOLE_AUDIT_SOURCE_ONLY.json" -Force

# Display all
Write-Host "All source files with console statements:" -ForegroundColor Yellow
$results | ForEach-Object {
    Write-Host "$($_.File) - Total: $($_.Total) (E:$($_.Errors) W:$($_.Warns) L:$($_.Logs))"
}

Write-Host ""
Write-Host "Full audit saved to: CONSOLE_AUDIT_SOURCE_ONLY.json" -ForegroundColor Green
Write-Host "Total files to fix: $($results.Count)" -ForegroundColor Cyan
