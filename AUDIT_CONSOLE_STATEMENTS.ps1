# Audit all files with console.error, console.warn, console.log
$results = @()

Get-ChildItem -Path "api" -Filter "*.js" -Recurse | ForEach-Object {
    $file = $_
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
Write-Host "Files with console statements: $($results.Count)" -ForegroundColor Green
Write-Host ""

# Save to file
$results | ConvertTo-Json | Out-File "CONSOLE_AUDIT_FULL.json" -Force

# Display top 50
Write-Host "Top 50 files with most console statements:" -ForegroundColor Yellow
$results | Select-Object -First 50 | ForEach-Object {
    Write-Host "$($_.File) - Total: $($_.Total) (E:$($_.Errors) W:$($_.Warns) L:$($_.Logs))"
}

Write-Host ""
Write-Host "Full audit saved to: CONSOLE_AUDIT_FULL.json" -ForegroundColor Green
