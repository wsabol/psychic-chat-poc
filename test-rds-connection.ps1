# Test RDS Connection Manually
# This helps diagnose the exact error

$BASTION_KEY_PATH = "C:\Users\stars\.ssh\psychic-chat-bastion-key.pem"
$BASTION_IP = "44.200.210.231"
$RDS_ENDPOINT = "psychic-db.cw1a2ak00w4x.us-east-1.rds.amazonaws.com"
$RDS_USER = "postgres"
$RDS_PASSWORD = "joNO%NoGBx#6vvcc"
$LOCAL_PORT = "5433"

Write-Host "Creating SSH tunnel..." -ForegroundColor Yellow
$sshProcess = Start-Process -FilePath "ssh" -ArgumentList "-i", $BASTION_KEY_PATH, "-L", "${LOCAL_PORT}:${RDS_ENDPOINT}:5432", "ec2-user@$BASTION_IP", "-N" -PassThru -WindowStyle Hidden

Write-Host "Waiting for tunnel to establish..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`nTesting connection with verbose output..." -ForegroundColor Yellow
Write-Host "Command: psql -h localhost -p $LOCAL_PORT -U $RDS_USER -d postgres -c 'SELECT version()'" -ForegroundColor Cyan

$env:PGPASSWORD = $RDS_PASSWORD
psql -h localhost -p $LOCAL_PORT -U $RDS_USER -d postgres -c "SELECT version()"

Write-Host "`nExit code: $LASTEXITCODE" -ForegroundColor $(if ($LASTEXITCODE -eq 0) { "Green" } else { "Red" })

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n=== Troubleshooting ===" -ForegroundColor Yellow
    Write-Host "1. Verify RDS master username (should be 'postgres' but might be different)" -ForegroundColor White
    Write-Host "2. Try resetting RDS password in AWS Console" -ForegroundColor White
    Write-Host "3. Check if password has special characters that need escaping" -ForegroundColor White
    
    Write-Host "`nTrying alternative connection methods..." -ForegroundColor Yellow
    
    # Try with password in connection string
    Write-Host "`nAttempt 2: Using pgpass syntax..." -ForegroundColor Cyan
    "localhost:${LOCAL_PORT}:*:${RDS_USER}:${RDS_PASSWORD}" | Out-File -FilePath "$env:APPDATA\postgresql\pgpass.conf" -Encoding ascii -Force
    psql -h localhost -p $LOCAL_PORT -U $RDS_USER -d postgres -c "SELECT version()"
    Write-Host "Exit code: $LASTEXITCODE" -ForegroundColor $(if ($LASTEXITCODE -eq 0) { "Green" } else { "Red" })
}

Write-Host "`nClosing tunnel..." -ForegroundColor Yellow
Stop-Process -Id $sshProcess.Id -Force -ErrorAction SilentlyContinue
Write-Host "Done" -ForegroundColor Green
