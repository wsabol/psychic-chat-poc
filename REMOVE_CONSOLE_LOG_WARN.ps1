# Remove console.log and console.warn statements
# Preserves console.error for separate processing

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "REMOVING CONSOLE.LOG AND CONSOLE.WARN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$directories = @("api", "client/src", "worker")
$excludePaths = @("node_modules", ".git", "build", "dist", ".next")
$filesModified = 0
$linesRemoved = 0

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        Write-Host "Skipping $dir (not found)" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Processing $dir..." -ForegroundColor Cyan
    
    $jsFiles = Get-ChildItem -Path $dir -Include "*.js","*.jsx" -Recurse -File -ErrorAction SilentlyContinue | 
        Where-Object {
            $path = $_.FullName
            -not ($excludePaths | Where-Object { $path -like "*$_*" })
        }
    
    foreach ($file in $jsFiles) {
        try {
            # Skip errorLogger itself and audit/utility scripts
            if ($file.Name -eq "errorLogger.js" -or 
                $file.Name -like "*AUDIT*" -or 
                $file.Name -like "*SECURITY_AUTO_FIX*" -or
                $file.Name -like "*PRODUCTION_AUDIT*") {
                continue
            }
            
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if (-not $content) { continue }
            
            $originalContent = $content
            $removed = 0
            
            # Remove console.log lines
            $pattern = '^\s*console\.log\([^)]*\);?\s*$'
            $lines = $content -split "`r?`n"
            $newLines = @()
            
            foreach ($line in $lines) {
                if ($line -match $pattern) {
                    $removed++
                } elseif ($line -match '^\s*console\.warn\([^)]*\);?\s*$') {
                    $removed++
                } else {
                    $newLines += $line
                }
            }
            
            if ($removed -gt 0) {
                $content = $newLines -join "`n"
                $content | Out-File $file.FullName -Encoding UTF8 -NoNewline -Force
                $filesModified++
                $linesRemoved += $removed
                
                $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
                Write-Host "  Removed $removed lines from: $relativePath" -ForegroundColor Green
            }
        }
        catch {
            Write-Host "  Error processing $($file.Name): $_" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CLEANUP SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files Modified: $filesModified" -ForegroundColor Green
Write-Host "Lines Removed: $linesRemoved" -ForegroundColor Green
Write-Host ""
Write-Host "Note: console.error statements were PRESERVED" -ForegroundColor Yellow
Write-Host "Run audit again to see remaining console.error statements" -ForegroundColor Yellow
Write-Host ""
