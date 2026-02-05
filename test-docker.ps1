#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test Docker container locally before deploying to AWS ECS

.DESCRIPTION
    Builds the Docker image and runs it locally to verify it works correctly
    
.EXAMPLE
    .\test-docker.ps1
#>

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "⚠️  $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "❌ $args" -ForegroundColor Red }

Write-Info "=== Docker Local Test ==="
Write-Info ""

# Check if Docker is running
Write-Info "[1/5] Checking Docker..."
try {
    docker info | Out-Null
    Write-Success "Docker is running"
} catch {
    Write-Error "Docker is not running. Please start Docker Desktop."
    exit 1
}

# Check if .env file exists
Write-Info "[2/5] Checking .env file..."
if (-not (Test-Path "api/.env")) {
    Write-Warning ".env file not found. Create api/.env with your configuration."
    Write-Info "Example:"
    Write-Info @"
DB_HOST=localhost
DB_PORT=5432
DB_NAME=psychic_chat
DB_USER=postgres
DB_PASSWORD=your_password
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=your_key
STRIPE_SECRET_KEY=your_stripe_key
NODE_ENV=development
"@
    $response = Read-Host "Continue without .env? (y/N)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        exit 0
    }
}

# Build Docker image
Write-Info "[3/5] Building Docker image..."
Push-Location api
try {
    docker build -t psychic-chat-api-test:latest .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker build failed"
        exit 1
    }
    Write-Success "Docker image built successfully"
} finally {
    Pop-Location
}

# Stop any existing container
Write-Info "[4/5] Cleaning up old containers..."
docker stop psychic-chat-api-test 2>$null
docker rm psychic-chat-api-test 2>$null

# Run container
Write-Info "[5/5] Starting container..."
Write-Info "Container will run on http://localhost:3000"
Write-Info "Press Ctrl+C to stop"
Write-Info ""

# Check if .env exists to decide on volume mount
if (Test-Path "api/.env") {
    # Run with .env file mounted
    docker run -it --rm `
        --name psychic-chat-api-test `
        -p 3000:3000 `
        -v "${PWD}/api/.env:/app/.env:ro" `
        psychic-chat-api-test:latest
} else {
    # Run without .env (will use defaults or fail gracefully)
    Write-Warning "Running without .env file - some features may not work"
    docker run -it --rm `
        --name psychic-chat-api-test `
        -p 3000:3000 `
        -e NODE_ENV=development `
        -e PORT=3000 `
        psychic-chat-api-test:latest
}
