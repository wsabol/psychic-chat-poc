# Simple Console Cleanup Script
# Removes console.log, console.warn, logger.* statements

Write-Host "Starting cleanup..." -ForegroundColor Cyan

$filesProcessed = 0
$linesRemoved = 0

# Function to clean a single file
function Clean-File {
    param([string]$FilePath)
    
    try {
        $content = [System.IO.File]::ReadAllText($FilePath)
        $original = $content
        
        # Remove logger.info lines
        $content = $content -replace '^\s*logger\.info\([^\)]*\);?\r?\n', ''
        
        # Remove logger.warn lines
        $content = $content -replace '^\s*logger\.warn\([^\)]*\);?\r?\n', ''
        
        # Remove logger.error lines
        $content = $content -replace '^\s*logger\.error\([^\)]*\);?\r?\n', ''
        
        # Remove console.log lines
        $content = $content -replace '^\s*console\.log\([^\)]*\);?\r?\n', ''
        
        # Remove console.warn lines
        $content = $content -replace '^\s*console\.warn\([^\)]*\);?\r?\n', ''
        
        if ($content -ne $original) {
            [System.IO.File]::WriteAllText($FilePath, $content)
            $removed = ($original.Length - $content.Length) / 50  # rough estimate
            return $removed
        }
    } catch {
        Write-Host "Error processing $FilePath : $_" -ForegroundColor Red
    }
    
    return 0
}

# Process api directory
Write-Host "`nProcessing api/..." -ForegroundColor Yellow
Get-ChildItem -Path api -Filter '*.js' -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notlike '*node_modules*' } | 
    ForEach-Object {
        $removed = Clean-File $_.FullName
        if ($removed -gt 0) {
            Write-Host "  ✓ $($_.Name)" -ForegroundColor Green
            $linesRemoved += $removed
            $filesProcessed++
        }
    }

# Process worker directory
Write-Host "`nProcessing worker/..." -ForegroundColor Yellow
Get-ChildItem -Path worker -Filter '*.js' -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notlike '*node_modules*' } | 
    ForEach-Object {
        $removed = Clean-File $_.FullName
        if ($removed -gt 0) {
            Write-Host "  ✓ $($_.Name)" -ForegroundColor Green
            $linesRemoved += $removed
            $filesProcessed++
        }
    }

# Process client/src directory
Write-Host "`nProcessing client/src/..." -ForegroundColor Yellow
Get-ChildItem -Path client/src -Filter '*.js' -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notlike '*node_modules*' } | 
    ForEach-Object {
        $removed = Clean-File $_.FullName
        if ($removed -gt 0) {
            Write-Host "  ✓ $($_.Name)" -ForegroundColor Green
            $linesRemoved += $removed
            $filesProcessed++
        }
    }

Get-ChildItem -Path client/src -Filter '*.jsx' -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notlike '*node_modules*' } | 
    ForEach-Object {
        $removed = Clean-File $_.FullName
        if ($removed -gt 0) {
            Write-Host "  ✓ $($_.Name)" -ForegroundColor Green
            $linesRemoved += $removed
            $filesProcessed++
        }
    }

Write-Host "`n" -ForegroundColor Cyan
Write-Host "═════════════════════════════════════════" -ForegroundColor Green
Write-Host "✓ CLEANUP COMPLETE" -ForegroundColor Green
Write-Host "Files modified: $filesProcessed" -ForegroundColor Green
Write-Host "✓ console.error() PRESERVED" -ForegroundColor Yellow
Write-Host "═════════════════════════════════════════`n" -ForegroundColor Green
