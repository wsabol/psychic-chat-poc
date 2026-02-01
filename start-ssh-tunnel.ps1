# Start SSH Tunnel to AWS RDS via Bastion Host
# 
# Your RDS instance is in a PRIVATE SUBNET and is NOT publicly accessible.
# This SSH tunnel is REQUIRED to connect to the database from your local machine.
#
# Usage: .\start-ssh-tunnel.ps1

Write-Host ""
Write-Host "🔐 Starting SSH Tunnel to AWS RDS..." -ForegroundColor Cyan
Write-Host ""
Write-Host "ℹ️  Your RDS is in a private subnet (IP: 10.0.138.223)" -ForegroundColor Yellow
Write-Host "   This tunnel forwards localhost:5432 → RDS:5432 via bastion host" -ForegroundColor Yellow
Write-Host ""
Write-Host "RDS Endpoint:  psychic-db.cw1a2ak00w4x.us-east-1.rds.amazonaws.com" -ForegroundColor Gray
Write-Host "Bastion Host:  44.200.210.231" -ForegroundColor Gray
Write-Host "Local Port:    5433" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Keep this window open while using the app!" -ForegroundColor Yellow
Write-Host "   Press Ctrl+C to stop the tunnel" -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting tunnel..." -ForegroundColor Green

# Start the SSH tunnel
# -i: SSH key file
# -L: Local port forwarding (local:5432 → remote:5432)
# -N: Don't execute remote commands, just forward ports
# ec2-user: Default user for Amazon Linux 2

ssh -i "C:\Users\stars\.ssh\psychic-chat-bastion-key.pem" `
    -L 5433:psychic-db.cw1a2ak00w4x.us-east-1.rds.amazonaws.com:5432 `
    -N `
    ec2-user@44.200.210.231

Write-Host ""
Write-Host "❌ Tunnel closed" -ForegroundColor Red
