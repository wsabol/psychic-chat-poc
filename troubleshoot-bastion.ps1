# Bastion Troubleshooting Script
# Run this to diagnose connection issues

$BASTION_IP = "44.200.210.231"

Write-Host "=== Bastion Connection Troubleshooting ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check if you can reach the bastion
Write-Host "1. Testing network connectivity to bastion..." -ForegroundColor Yellow
$pingResult = Test-Connection -ComputerName $BASTION_IP -Count 2 -Quiet
if ($pingResult) {
    Write-Host "   checkmark Can reach bastion IP" -ForegroundColor Green
} else {
    Write-Host "   x Cannot reach bastion IP (this may be normal - some instances block ping)" -ForegroundColor Yellow
}

# 2. Check if SSH port is open
Write-Host ""
Write-Host "2. Testing SSH port (22)..." -ForegroundColor Yellow
$tcpTest = Test-NetConnection -ComputerName $BASTION_IP -Port 22 -WarningAction SilentlyContinue
if ($tcpTest.TcpTestSucceeded) {
    Write-Host "   checkmark SSH port 22 is open" -ForegroundColor Green
} else {
    Write-Host "   x SSH port 22 is NOT accessible" -ForegroundColor Red
    Write-Host "   Possible issues:" -ForegroundColor Yellow
    Write-Host "   - Security group doesn't allow SSH from your IP" -ForegroundColor Yellow
    Write-Host "   - Bastion instance is not running" -ForegroundColor Yellow
}

# 3. Get your public IP
Write-Host ""
Write-Host "3. Your current public IP address:" -ForegroundColor Yellow
$myIP = "unknown"
try {
    $myIP = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
    Write-Host "   Your IP: $myIP" -ForegroundColor Cyan
    Write-Host "   Make sure this IP is allowed in bastion security group!" -ForegroundColor Yellow
} catch {
    Write-Host "   Could not determine your public IP" -ForegroundColor Red
}

# 4. Check key file
Write-Host ""
Write-Host "4. Checking SSH key file..." -ForegroundColor Yellow
$keyPath = "C:\Users\stars\.ssh\psychic-chat-bastion-key.pem"
if (Test-Path $keyPath) {
    Write-Host "   checkmark Key file exists at: $keyPath" -ForegroundColor Green
} else {
    Write-Host "   x Key file NOT found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If SSH port is NOT accessible, check in AWS Console:" -ForegroundColor Yellow
Write-Host "1. EC2 > Instances > psychic-chat-bastion > Check 'Instance state' is 'Running'" -ForegroundColor White
Write-Host "2. EC2 > Security Groups > psychic-chat-bastion-sg > Inbound rules" -ForegroundColor White
Write-Host "   - Should have: SSH (22) from $myIP/32" -ForegroundColor White
Write-Host ""
Write-Host "To update security group with your current IP:" -ForegroundColor Yellow
Write-Host "   aws ec2 authorize-security-group-ingress --group-id <sg-id> --protocol tcp --port 22 --cidr $myIP/32" -ForegroundColor Cyan
