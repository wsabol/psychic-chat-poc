# RDS Migration Script for Windows
# This script helps you migrate your PostgreSQL database to AWS RDS via bastion host

# Configuration - UPDATE THESE VALUES
$BASTION_KEY_PATH = "C:\Users\stars\.ssh\psychic-chat-bastion-key.pem"
$BASTION_IP = "44.200.210.231"
$RDS_ENDPOINT = "psychic-db.cw1a2ak00w4x.us-east-1.rds.amazonaws.com"
$RDS_USER = "masteradmin"
$RDS_DATABASE = "psychic_chat"
$RDS_PASSWORD = "ofnlopH7H$63GqxX"
$LOCAL_PORT = "5433"
$BACKUP_FILE = "backup.sql"

Write-Host "=== RDS Migration Helper (Windows) ===" -ForegroundColor Green
Write-Host ""

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "Bastion IP: $BASTION_IP"
Write-Host "RDS Endpoint: $RDS_ENDPOINT"
Write-Host "RDS Database: $RDS_DATABASE"
Write-Host "Local Port: $LOCAL_PORT"
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check if psql is installed
$psqlExists = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlExists) {
    Write-Host "Error: PostgreSQL client (psql) is not installed" -ForegroundColor Red
    Write-Host "Download and install from: https://www.postgresql.org/download/windows/"
    Write-Host "Or install via Chocolatey: choco install postgresql"
    exit 1
}

# Check if SSH key exists
if (-not (Test-Path $BASTION_KEY_PATH)) {
    Write-Host "Error: SSH key not found at $BASTION_KEY_PATH" -ForegroundColor Red
    Write-Host "Please update BASTION_KEY_PATH in this script"
    exit 1
}

# Check if backup file exists
if (-not (Test-Path $BACKUP_FILE)) {
    Write-Host "Warning: Backup file not found. Creating backup now..." -ForegroundColor Yellow
    
    # Set environment variable for pg_dump if needed
    $env:PGPASSWORD = "your_local_db_password"
    
    pg_dump -U postgres psychic_chat > backup.sql
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Backup created successfully" -ForegroundColor Green
    } else {
        Write-Host "Error: Failed to create backup" -ForegroundColor Red
        Write-Host "Please create backup manually: pg_dump psychic_chat > backup.sql"
        exit 1
    }
} else {
    Write-Host "[OK] Backup file exists" -ForegroundColor Green
}

Write-Host "[OK] All prerequisites met" -ForegroundColor Green
Write-Host ""

# Function to check if SSH tunnel is running
function Test-Tunnel {
    $connection = Get-NetTCPConnection -LocalPort $LOCAL_PORT -ErrorAction SilentlyContinue
    return ($null -ne $connection)
}

# Function to create SSH tunnel
function Start-SSHTunnel {
    Write-Host "Creating SSH tunnel..." -ForegroundColor Yellow
    Write-Host "Running: ssh -i $BASTION_KEY_PATH -L ${LOCAL_PORT}:${RDS_ENDPOINT}:5432 ec2-user@$BASTION_IP -N"
    
    # Start SSH tunnel in background
    $sshProcess = Start-Process -FilePath "ssh" -ArgumentList "-i", $BASTION_KEY_PATH, "-L", "${LOCAL_PORT}:${RDS_ENDPOINT}:5432", "ec2-user@$BASTION_IP", "-N" -PassThru -WindowStyle Hidden
    
    # Wait for tunnel to establish
    Start-Sleep -Seconds 3
    
    if (Test-Tunnel) {
        Write-Host "[OK] SSH tunnel created successfully" -ForegroundColor Green
        return $sshProcess
    } else {
        Write-Host "Error: Failed to create SSH tunnel" -ForegroundColor Red
        Write-Host "Please check:" -ForegroundColor Yellow
        Write-Host "  - Bastion host IP is correct"
        Write-Host "  - SSH key has proper permissions (Properties > Security > Advanced)"
        Write-Host "  - You can SSH to the bastion host manually"
        return $null
    }
}

# Function to close SSH tunnel
function Stop-SSHTunnel {
    param($Process)
    
    Write-Host "Closing SSH tunnel..." -ForegroundColor Yellow
    
    if ($Process) {
        Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Also kill any process using the port
    $connections = Get-NetTCPConnection -LocalPort $LOCAL_PORT -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
    
    Write-Host "[OK] Tunnel closed" -ForegroundColor Green
}

# Main migration steps
Write-Host "=== Starting Migration ===" -ForegroundColor Green
Write-Host ""

# Step 1: Create SSH tunnel
Write-Host "Step 1: Creating SSH tunnel to RDS" -ForegroundColor Yellow
$sshProcess = $null

if (Test-Tunnel) {
    Write-Host "Tunnel already exists on port $LOCAL_PORT" -ForegroundColor Yellow
    $response = Read-Host "Close and recreate? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Stop-SSHTunnel
        Start-Sleep -Seconds 2
        $sshProcess = Start-SSHTunnel
    }
} else {
    $sshProcess = Start-SSHTunnel
}

if (-not (Test-Tunnel)) {
    Write-Host "Error: Tunnel is not running" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Test connection
Write-Host "Step 2: Testing connection to RDS" -ForegroundColor Yellow
$env:PGPASSWORD = $RDS_PASSWORD
$env:PGSSLMODE = "require"
$testResult = psql -h localhost -p $LOCAL_PORT -U $RDS_USER -d postgres -c "SELECT version()" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Connection successful" -ForegroundColor Green
} else {
    Write-Host "Error: Cannot connect to RDS" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  - RDS endpoint is correct"
    Write-Host "  - RDS password is correct"
    Write-Host "  - Security groups allow bastion -> RDS on port 5432"
    Stop-SSHTunnel -Process $sshProcess
    exit 1
}

Write-Host ""

# Step 3: Create database (if needed)
Write-Host "Step 3: Creating database (if not exists)" -ForegroundColor Yellow
$env:PGPASSWORD = $RDS_PASSWORD
$env:PGSSLMODE = "require"
$dbCheck = psql -h localhost -p $LOCAL_PORT -U $RDS_USER -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$RDS_DATABASE'" 2>&1

if (-not ($dbCheck -match "1")) {
    Write-Host "Creating database $RDS_DATABASE..."
    psql -h localhost -p $LOCAL_PORT -U $RDS_USER -d postgres -c "CREATE DATABASE $RDS_DATABASE"
    Write-Host "[OK] Database created" -ForegroundColor Green
} else {
    Write-Host "[OK] Database already exists" -ForegroundColor Green
}

Write-Host ""

# Step 4: Import backup
Write-Host "Step 4: Importing backup to RDS" -ForegroundColor Yellow
Write-Host "This may take a few minutes..."

$env:PGPASSWORD = $RDS_PASSWORD
$env:PGSSLMODE = "require"
Get-Content $BACKUP_FILE | psql -h localhost -p $LOCAL_PORT -U $RDS_USER -d $RDS_DATABASE

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Backup imported successfully" -ForegroundColor Green
} else {
    Write-Host "Error: Failed to import backup" -ForegroundColor Red
    Stop-SSHTunnel -Process $sshProcess
    exit 1
}

Write-Host ""

# Step 5: Verify migration
Write-Host "Step 5: Verifying migration" -ForegroundColor Yellow

# Count tables
$env:PGPASSWORD = $RDS_PASSWORD
$env:PGSSLMODE = "require"
$tableCount = psql -h localhost -p $LOCAL_PORT -U $RDS_USER -d $RDS_DATABASE -tc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>&1
Write-Host "Tables found: $($tableCount.Trim())"

# Count users (if users table exists)
$userCount = psql -h localhost -p $LOCAL_PORT -U $RDS_USER -d $RDS_DATABASE -tc "SELECT COUNT(*) FROM users" 2>&1
if ($userCount -match '\d+') {
    Write-Host "Users in database: $($userCount.Trim())"
}

Write-Host ""
Write-Host "=== Migration Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test your application with the new RDS endpoint"
Write-Host "2. Update environment variables in your .env file:"
Write-Host "   DB_HOST=$RDS_ENDPOINT"
Write-Host "   DB_PORT=5432"
Write-Host "   DB_USER=$RDS_USER"
Write-Host "   DB_NAME=$RDS_DATABASE"
Write-Host ""
Write-Host "SSH Tunnel Information:" -ForegroundColor Cyan
if ($sshProcess) {
    Write-Host "  - Process ID: $($sshProcess.Id)"
}
Write-Host "  - Local Port: $LOCAL_PORT"
Write-Host "  - Status: Running"
Write-Host ""
Write-Host "To close the tunnel later, run:" -ForegroundColor Yellow
if ($sshProcess) {
    Write-Host "  Stop-Process -Id $($sshProcess.Id)"
}
Write-Host "Or find and kill the process using port $LOCAL_PORT"
Write-Host ""
Write-Host "Keep the tunnel open to test your application!" -ForegroundColor Green
