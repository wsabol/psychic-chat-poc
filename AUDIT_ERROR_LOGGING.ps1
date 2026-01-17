# Audit script to find error logging mismatches
# Scans for:
# Pattern 1: catch (err) ... logErrorFromCatch(error, ...)
# Pattern 2: catch (error) ... logErrorFromCatch(err, ...)

$patterns = @(
    @{
        Name = "Pattern 1: catch(err) with logErrorFromCatch(error, ...)"
        Regex = "catch\s*\(\s*err\s*\)"
        Check = "logErrorFromCatch\s*\(\s*error\s*,"
    },
    @{
        Name = "Pattern 2: catch(error) with logErrorFromCatch(err, ...)"
        Regex = "catch\s*\(\s*error\s*\)"
        Check = "logErrorFromCatch\s*\(\s*err\s*,"
    }
)

$excludeFolders = @("node_modules", ".git", ".next", "dist", "build", ".vscode")
$jsFiles = Get-ChildItem -Path . -Recurse -Include "*.js" -ErrorAction SilentlyContinue | 
    Where-Object { 
        $path = $_.FullName
        -not ($excludeFolders | ForEach-Object { $path -match [regex]::Escape($_) }) -and
        -not ($path -match "\\node_modules\\")
    }

Write-Host "Scanning $($jsFiles.Count) JavaScript files..." -ForegroundColor Cyan
Write-Host ""

$results = @{
    Pattern1 = @()
    Pattern2 = @()
}

foreach ($file in $jsFiles) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }
        
        # Check for Pattern 1: catch(err) with logErrorFromCatch(error, ...)
        if ($content -match "catch\s*\(\s*err\s*\)" -and $content -match "logErrorFromCatch\s*\(\s*error\s*,") {
            # More precise check: look for catch(err) block containing logErrorFromCatch(error,
            $lines = $content -split "`n"
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "catch\s*\(\s*err\s*\)") {
                    # Check next 10 lines for logErrorFromCatch(error,
                    for ($j = $i; $j -lt [Math]::Min($i + 10, $lines.Count); $j++) {
                        if ($lines[$j] -match "logErrorFromCatch\s*\(\s*error\s*,") {
                            $results.Pattern1 += @{
                                File = $file.FullName
                                LineNumber = $j + 1
                                Line = $lines[$j].Trim()
                            }
                            break
                        }
                    }
                }
            }
        }
        
        # Check for Pattern 2: catch(error) with logErrorFromCatch(err, ...)
        if ($content -match "catch\s*\(\s*error\s*\)" -and $content -match "logErrorFromCatch\s*\(\s*err\s*,") {
            # More precise check: look for catch(error) block containing logErrorFromCatch(err,
            $lines = $content -split "`n"
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "catch\s*\(\s*error\s*\)") {
                    # Check next 10 lines for logErrorFromCatch(err,
                    for ($j = $i; $j -lt [Math]::Min($i + 10, $lines.Count); $j++) {
                        if ($lines[$j] -match "logErrorFromCatch\s*\(\s*err\s*,") {
                            $results.Pattern2 += @{
                                File = $file.FullName
                                LineNumber = $j + 1
                                Line = $lines[$j].Trim()
                            }
                            break
                        }
                    }
                }
            }
        }
    }
    catch {
        # Skip files that can't be read
    }
}

# Output results
Write-Host "=" * 80
Write-Host "ERROR LOGGING AUDIT RESULTS" -ForegroundColor Yellow
Write-Host "=" * 80
Write-Host ""

if ($results.Pattern1.Count -gt 0) {
    Write-Host "PATTERN 1: catch(err) + logErrorFromCatch(error, ...)" -ForegroundColor Red
    Write-Host "Count: $($results.Pattern1.Count) issues found" -ForegroundColor Red
    Write-Host ""
    foreach ($issue in $results.Pattern1) {
        Write-Host "  File: $($issue.File)"
        Write-Host "  Line: $($issue.LineNumber)"
        Write-Host "  Code: $($issue.Line)"
        Write-Host ""
    }
}

if ($results.Pattern2.Count -gt 0) {
    Write-Host "PATTERN 2: catch(error) + logErrorFromCatch(err, ...)" -ForegroundColor Red
    Write-Host "Count: $($results.Pattern2.Count) issues found" -ForegroundColor Red
    Write-Host ""
    foreach ($issue in $results.Pattern2) {
        Write-Host "  File: $($issue.File)"
        Write-Host "  Line: $($issue.LineNumber)"
        Write-Host "  Code: $($issue.Line)"
        Write-Host ""
    }
}

Write-Host "=" * 80
Write-Host ""

# Create summary file
$summary = @"
# ERROR LOGGING AUDIT SUMMARY

## Pattern 1: catch(err) + logErrorFromCatch(error, ...)
Total Issues: $($results.Pattern1.Count)

"@

if ($results.Pattern1.Count -gt 0) {
    $summary += "Files to fix:`n"
    $uniqueFiles1 = $results.Pattern1 | Select-Object -ExpandProperty File -Unique
    foreach ($file in $uniqueFiles1) {
        $count = ($results.Pattern1 | Where-Object { $_.File -eq $file }).Count
        $summary += "- $file ($count issue(s))`n"
    }
}

$summary += "`n## Pattern 2: catch(error) + logErrorFromCatch(err, ...)`n"
$summary += "Total Issues: $($results.Pattern2.Count)`n`n"

if ($results.Pattern2.Count -gt 0) {
    $summary += "Files to fix:`n"
    $uniqueFiles2 = $results.Pattern2 | Select-Object -ExpandProperty File -Unique
    foreach ($file in $uniqueFiles2) {
        $count = ($results.Pattern2 | Where-Object { $_.File -eq $file }).Count
        $summary += "- $file ($count issue(s))`n"
    }
}

# Save summary
$summary | Out-File -FilePath "./ERROR_LOGGING_AUDIT.md" -Encoding UTF8
Write-Host "Summary saved to: ./ERROR_LOGGING_AUDIT.md" -ForegroundColor Green
