# ========================================
# Clear All Database Data - PowerShell Script
# ========================================
# Clears all data from database while preserving structure
# Last Updated: 2026-02-02

param(
    [switch]$Force
)

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  CLEAR DATABASE - FRESH START" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Yellow

$LOCAL_PORT = "5433"
$SQL_SCRIPT = "clear-all-data.sql"

Write-Host "ℹ️  Local Port: $LOCAL_PORT" -ForegroundColor Cyan
Write-Host "ℹ️  SQL Script: $SQL_SCRIPT" -ForegroundColor Cyan

# Load .env file if exists
if (Test-Path ".env") {
    Write-Host "`n🔹 Loading configuration from .env file" -ForegroundColor Blue
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "✅ Configuration loaded" -ForegroundColor Green
}

# Check DATABASE_URL
if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL not set in .env file" -ForegroundColor Red
    exit 1
}

# ========================================
# SAFETY CHECKS
# ========================================
Write-Host "`n🔹 Performing safety checks" -ForegroundColor Blue

# Check if psql is installed
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "❌ PostgreSQL client (psql) is not installed" -ForegroundColor Red
    Write-Host "ℹ️  Install from: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    exit 1
}
Write-Host "✅ PostgreSQL client found" -ForegroundColor Green

# Check if SQL script exists
if (-not (Test-Path $SQL_SCRIPT)) {
    Write-Host "❌ SQL script not found: $SQL_SCRIPT" -ForegroundColor Red
    exit 1
}
Write-Host "✅ SQL script found" -ForegroundColor Green

# ========================================
# CHECK SSH TUNNEL
# ========================================
Write-Host "`n🔹 Checking SSH tunnel" -ForegroundColor Blue

$existingTunnel = Get-NetTCPConnection -LocalPort $LOCAL_PORT -ErrorAction SilentlyContinue
if ($existingTunnel) {
    Write-Host "✅ SSH tunnel running on port $LOCAL_PORT" -ForegroundColor Green
} else {
    Write-Host "❌ No tunnel detected on port $LOCAL_PORT" -ForegroundColor Red
    Write-Host "ℹ️  Please run: .\start-ssh-tunnel.ps1" -ForegroundColor Cyan
    exit 1
}

# ========================================
# FINAL WARNING
# ========================================
Write-Host "`n========================================" -ForegroundColor Red
Write-Host "  ⚠️  FINAL WARNING ⚠️" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host "⚠️  This will DELETE ALL DATA from your database!" -ForegroundColor Yellow
Write-Host "⚠️  Table structures will be preserved" -ForegroundColor Yellow
Write-Host "⚠️  This action is IRREVERSIBLE" -ForegroundColor Yellow
Write-Host ""

if (-not $Force) {
    $confirmation = Read-Host "Type 'DELETE ALL DATA' to confirm (or anything else to cancel)"
    if ($confirmation -ne "DELETE ALL DATA") {
        Write-Host "ℹ️  Operation cancelled by user" -ForegroundColor Cyan
        exit 0
    }
}

# ========================================
# TEST CONNECTION
# ========================================
Write-Host "`n🔹 Testing database connection" -ForegroundColor Blue

# Parse DATABASE_URL to get password
if ($env:DATABASE_URL -match 'postgres://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    $DB_USER = $matches[1]
    $DB_PASS = $matches[2]
    $DB_NAME = $matches[5]
} else {
    Write-Host "❌ Invalid DATABASE_URL format" -ForegroundColor Red
    exit 1
}

$env:PGPASSWORD = $DB_PASS

$testResult = psql -h localhost -p $LOCAL_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database connection successful" -ForegroundColor Green
} else {
    Write-Host "❌ Database connection failed" -ForegroundColor Red
    Write-Host $testResult -ForegroundColor Red
    exit 1
}

# ========================================
# EXECUTE CLEAR SCRIPT
# ========================================
Write-Host "`n🔹 Executing data clear script" -ForegroundColor Blue
Write-Host "ℹ️  This may take a moment..." -ForegroundColor Cyan

$result = psql -h localhost -p $LOCAL_PORT -U $DB_USER -d $DB_NAME -f $SQL_SCRIPT 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Data cleared successfully!" -ForegroundColor Green
    Write-Host "`n$result" -ForegroundColor Gray
} else {
    Write-Host "❌ Failed to clear data" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}

# ========================================
# VERIFICATION
# ========================================
Write-Host "`n🔹 Verifying database is empty" -ForegroundColor Blue

$countQuery = @"
SELECT 
    'user_personal_info' as table_name, COUNT(*) as records FROM user_personal_info
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'audit_log', COUNT(*) FROM audit_log
UNION ALL SELECT 'security_sessions', COUNT(*) FROM security_sessions;
"@

$counts = psql -h localhost -p $LOCAL_PORT -U $DB_USER -d $DB_NAME -c $countQuery -t

Write-Host "ℹ️  Record counts:" -ForegroundColor Cyan
Write-Host $counts -ForegroundColor Gray

# ========================================
# COMPLETION
# ========================================
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ✅ FRESH START COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ All data has been cleared" -ForegroundColor Green
Write-Host "✅ Table structures preserved" -ForegroundColor Green
Write-Host "✅ Database ready for fresh data" -ForegroundColor Green
Write-Host ""
