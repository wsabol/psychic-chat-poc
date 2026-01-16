# Comprehensive audit: api, worker, client - SOURCE FILES ONLY
$results = @()
$directories = @("api", "worker", "client")

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        Write-Host "⚠️  Directory not found: $dir" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Scanning $dir/..." -ForegroundColor Gray
    
    Get-ChildItem -Path $dir -Filter "*.js" -Recurse | ForEach-Object {
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
}

# Sort by total count descending
$results = $results | Sort-Object { $_.Total } -Descending

# Display summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "COMPREHENSIVE CONSOLE AUDIT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Source files with console statements: $($results.Count)" -ForegroundColor Green
Write-Host ""

# Save to file
$results | ConvertTo-Json | Out-File "CONSOLE_AUDIT_COMPREHENSIVE.json" -Force

# Display all
Write-Host "All source files:" -ForegroundColor Yellow
$results | ForEach-Object {
    Write-Host "$($_.File) - Total: $($_.Total) (E:$($_.Errors) W:$($_.Warns) L:$($_.Logs))"
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
$byDir = $results | Group-Object { ($_.File -split '\\')[0] }
$byDir | ForEach-Object {
    $count = $_.Group.Count
    Write-Host "  $($_.Name): $count files" -ForegroundColor White
}

Write-Host ""
Write-Host "Full audit saved to: CONSOLE_AUDIT_COMPREHENSIVE.json" -ForegroundColor Green
Write-Host "Total files to fix: $($results.Count)" -ForegroundColor Cyan
