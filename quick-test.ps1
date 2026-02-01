# Quick test to see exact error
$env:PATH += ";C:\Program Files\PostgreSQL\18\bin"

Write-Host "Creating tunnel..." -ForegroundColor Yellow
$ssh = Start-Process -FilePath "ssh" -ArgumentList "-i", "C:\Users\stars\.ssh\psychic-chat-bastion-key.pem", "-L", "5433:psychic-db.cw1a2ak00w4x.us-east-1.rds.amazonaws.com:5432", "ec2-user@44.200.210.231", "-N" -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 5

Write-Host "Testing connection..." -ForegroundColor Yellow
$env:PGPASSWORD = "joNO%NoGBx#6vvcc"
$env:PGSSLMODE = "require"

Write-Host "Running: psql -h localhost -p 5433 -U postgres -d postgres -c SELECT 1" -ForegroundColor Cyan
psql -h localhost -p 5433 -U postgres -d postgres -c "SELECT 1"

Write-Host "`nExit code: $LASTEXITCODE" -ForegroundColor $(if ($LASTEXITCODE -eq 0) { "Green" } else { "Red" })

Write-Host "`nClosing tunnel..." -ForegroundColor Yellow
Stop-Process -Id $ssh.Id -Force

Write-Host "`n=== If connection failed ===" -ForegroundColor Yellow
Write-Host "Check AWS Console > RDS > Databases > [your-db] > Configuration tab" -ForegroundColor White
Write-Host "Verify:" -ForegroundColor White
Write-Host "  - Master username (might not be 'postgres')" -ForegroundColor Cyan
Write-Host "  - Try resetting the master password" -ForegroundColor Cyan
