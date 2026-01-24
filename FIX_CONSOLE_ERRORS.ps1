# Fix Console.error Statements
# Replaces console.error with errorLogger calls in API files
# NOTE: errorLogger.js itself must NOT be modified (to avoid circular calls)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FIX CONSOLE.ERROR STATEMENTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$directories = @("api", "worker")
$filesModified = 0
$statementsReplaced = 0

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        Write-Host "Skipping $dir (not found)" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Processing $dir..." -ForegroundColor Cyan
    
    $jsFiles = Get-ChildItem -Path $dir -Include "*.js" -Recurse -File -ErrorAction SilentlyContinue | 
        Where-Object {
            $path = $_.FullName
            -not ($path -like "*node_modules*") -and
            -not ($path -like "*.git*") -and
            -not ($_.Name -eq "errorLogger.js")  # CRITICAL: Skip errorLogger.js itself
        }
    
    foreach ($file in $jsFiles) {
        try {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if (-not $content) { continue }
            
            # Skip if no console.error found
            if ($content -notmatch "console\.error") { continue }
            
            $originalContent = $content
            $modified = $false
            
            # Check if errorLogger is already imported
            $hasErrorLoggerImport = $content -match "import\s+\{[^}]*logErrorFromCatch"
            
            # If not imported, add it at the top after existing imports
            if (-not $hasErrorLoggerImport) {
                # Find the last import statement
                $lines = $content -split "`n"
                $lastImportIndex = -1
                
                for ($i = 0; $i -lt $lines.Count; $i++) {
                    if ($lines[$i] -match "^import\s+") {
                        $lastImportIndex = $i
                    }
                }
                
                if ($lastImportIndex -ge 0) {
                    # Determine the correct relative path to errorLogger.js
                    $relativePath = $file.DirectoryName
                    $depth = ($relativePath.Replace((Get-Location).Path, "").Split('\') | Where-Object { $_ -ne "" }).Count
                    
                    $importPath = "../" * ($depth - 1) + "shared/errorLogger.js"
                    if ($dir -eq "worker") {
                        $importPath = "./shared/errorLogger.js"
                    }
                    
                    $importStatement = "import { logErrorFromCatch, logErrorToDB } from '$importPath';"
                    $lines = @($lines[0..$lastImportIndex]) + @($importStatement) + @($lines[($lastImportIndex + 1)..($lines.Count - 1)])
                    $content = $lines -join "`n"
                    $modified = $true
                    
                    Write-Host "  Added errorLogger import to: $($file.Name)" -ForegroundColor Green
                }
            }
            
            # Replace console.error in catch blocks with logErrorFromCatch
            # Pattern: catch (error) { ... console.error(...) ... }
            $pattern1 = 'catch\s*\(\s*(\w+)\s*\)\s*\{[^}]*console\.error\s*\([^)]*\)[^}]*\}'
            if ($content -match $pattern1) {
                $lines = $content -split "`n"
                $newLines = @()
                $inCatchBlock = $false
                $catchVarName = ""
                
                for ($i = 0; $i -lt $lines.Count; $i++) {
                    $line = $lines[$i]
                    
                    # Detect catch block start
                    if ($line -match 'catch\s*\(\s*(\w+)\s*\)') {
                        $inCatchBlock = $true
                        $catchVarName = $matches[1]
                    }
                    
                    # Replace console.error in catch blocks
                    if ($inCatchBlock -and $line -match 'console\.error\s*\(') {
                        # Extract service name from file path
                        $serviceName = $file.Directory.Name
                        if ($serviceName -eq "api" -or $serviceName -eq "worker") {
                            $serviceName = $file.BaseName
                        }
                        
                        # Get context from nearby comments or function names
                        $context = "Error in $serviceName"
                        if ($i -gt 0 -and $lines[$i-1] -match '//\s*(.+)$') {
                            $context = $matches[1].Trim()
                        }
                        
                        # Replace with logErrorFromCatch
                        $indent = if ($line -match '^(\s*)') { $matches[1] } else { "" }
                        $line = "$indent" + "await logErrorFromCatch($catchVarName, '$serviceName', '$context');"
                        $modified = $true
                        $statementsReplaced++
                    }
                    
                    # Detect end of catch block
                    if ($inCatchBlock -and $line -match '\}' -and $line -notmatch '\{') {
                        $inCatchBlock = $false
                        $catchVarName = ""
                    }
                    
                    $newLines += $line
                }
                
                $content = $newLines -join "`n"
            }
            
            # Replace standalone console.error with logErrorToDB
            # This is for console.error calls outside of catch blocks
            $content = $content -replace '(?<!//\s*)console\.error\s*\(([^)]+)\);?', 'await logErrorToDB({ service: ''general'', errorMessage: $1 });'
            if ($content -ne $originalContent) {
                $modified = $true
            }
            
            # Save if modified
            if ($modified) {
                $content | Out-File $file.FullName -Encoding UTF8 -NoNewline -Force
                $filesModified++
                Write-Host "  Fixed: $($file.Name)" -ForegroundColor Green
            }
        }
        catch {
            Write-Host "  Error processing $($file.Name): $_" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FIX SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files Modified: $filesModified" -ForegroundColor Green
Write-Host "Statements Replaced: $statementsReplaced" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Client-side files were NOT modified (errorLogger is server-side only)" -ForegroundColor Yellow
Write-Host "Client console.error statements should be handled separately or removed" -ForegroundColor Yellow
Write-Host ""
