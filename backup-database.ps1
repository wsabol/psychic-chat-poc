# ========================================
# Backup Database - Quick Backup Script
# ========================================
# Creates a timestamped backup of the entire database
# Last Updated: 2026-02-02

param(
    [string]$OutputFile = ""
)

# Color codes for output
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Step { param($Message) Write-Host "`n🔹 $Message" -ForegroundColor Blue }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DATABASE BACKUP" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ========================================
# CONFIGURATION
# ========================================
$BASTION_KEY_PATH = "$env:USERPROFILE\.ssh\psychic-chat-bastion.pem"
$LOCAL_PORT = "5433"

if (-not $OutputFile) {
    $OutputFile = "backup-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').sql"
}

Write-Info "Backup file: $OutputFile"

# Load .env file
if (Test-Path ".env") {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Check for required tools
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Error "pg_dump not found. Please install PostgreSQL client tools"
    exit 1
}

# ========================================
# CHECK/CREATE SSH TUNNEL
# ========================================
Write-Step "Checking SSH tunnel"

$existingTunnel = Get-NetTCPConnection -LocalPort $LOCAL_PORT -ErrorAction SilentlyContinue
if (-not $existingTunnel) {
    Write-Info "Creating SSH tunnel..."
    Start-Process ssh -ArgumentList "-i", $BASTION_KEY_PATH, "-L", "${LOCAL_PORT}:$($env:RDS_ENDPOINT):5432", "ec2-user@$($env:BASTION_IP)", "-N", "-f" -NoNewWindow
    Start-Sleep -Seconds 3
    Write-Success "SSH tunnel created"
} else {
    Write-Success "SSH tunnel already running"
}

# ========================================
# CREATE BACKUP
# ========================================
Write-Step "Creating database backup"

# Parse DATABASE_URL
if ($env:DATABASE_URL -match 'postgres://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    $DB_USER = $matches[1]
    $DB_PASS = $matches[2]
    $DB_NAME = $matches[5]
} else {
    Write-Error "Invalid DATABASE_URL format"
    exit 1
}

$env:PGPASSWORD = $DB_PASS

Write-Info "Backing up database: $DB_NAME"
Write-Info "This may take a few minutes for large databases..."

pg_dump -h localhost -p $LOCAL_PORT -U $DB_USER -d $DB_NAME -F p -f $OutputFile 2>&1

if ($LASTEXITCODE -eq 0) {
    $fileSize = (Get-Item $OutputFile).Length / 1MB
    Write-Success "Backup created successfully!"
    Write-Info "File: $OutputFile"
    Write-Info "Size: $([math]::Round($fileSize, 2)) MB"
} else {
    Write-Error "Backup failed"
    exit 1
}

Write-Host ""
Write-Success "Backup complete!"
Write-Info "To restore: psql -h localhost -p $LOCAL_PORT -U $DB_USER -d $DB_NAME -f $OutputFile"
Write-Host ""
