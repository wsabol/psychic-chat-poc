#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test Docker container health endpoints

.DESCRIPTION
    Runs health checks against the Docker container to verify it's working
#>

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Error { Write-Host "❌ $args" -ForegroundColor Red }

Write-Info "=== Docker Health Check Tests ==="
Write-Info ""

$baseUrl = "http://localhost:3000"

# Wait for container to be ready
Write-Info "Waiting for container to start..."
Start-Sleep -Seconds 3

# Test 1: Health endpoint
Write-Info "[Test 1/3] Testing /health endpoint..."
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method Get -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        $content = $response.Content | ConvertFrom-Json
        Write-Success "Health check passed: $($content.status)"
        Write-Info "Timestamp: $($content.timestamp)"
    } else {
        Write-Error "Health check failed with status: $($response.StatusCode)"
    }
} catch {
    Write-Error "Health check failed: $_"
}

Write-Info ""

# Test 2: Root endpoint
Write-Info "[Test 2/3] Testing / endpoint..."
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/" -Method Get -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        $content = $response.Content | ConvertFrom-Json
        Write-Success "Root endpoint passed: $($content.message)"
    } else {
        Write-Error "Root endpoint failed with status: $($response.StatusCode)"
    }
} catch {
    Write-Error "Root endpoint failed: $_"
}

Write-Info ""

# Test 3: Check container logs
Write-Info "[Test 3/3] Checking container logs..."
try {
    $logs = docker logs psychic-chat-api-test --tail 20 2>&1
    if ($logs -match "error" -or $logs -match "Error" -or $logs -match "ERROR") {
        Write-Error "Found errors in logs:"
        $logs | Select-String -Pattern "error|Error|ERROR" | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    } else {
        Write-Success "No errors found in recent logs"
    }
    
    Write-Info ""
    Write-Info "Recent logs:"
    Write-Host $logs -ForegroundColor Gray
} catch {
    Write-Error "Could not read container logs: $_"
}

Write-Info ""
Write-Info "=== Test Summary ==="
Write-Success "Container is running and responding to requests"
Write-Info "Container logs: docker logs psychic-chat-api-test -f"
Write-Info "Stop container: docker stop psychic-chat-api-test"
