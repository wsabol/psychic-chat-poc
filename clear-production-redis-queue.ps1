# Clear Production Redis Queue via SSH Tunnel
#
# This script:
# 1. Creates SSH tunnel to production Redis via bastion host
# 2. Clears the stuck "chat-jobs" queue
# 3. Shows queue statistics

Write-Host ""
Write-Host "Clearing Production Redis Queue..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Redis Endpoint: psychic-chat-redis-0rflqd.serverless.use1.cache.amazonaws.com:6379" -ForegroundColor Yellow
Write-Host "Bastion Host: 3.238.36.97" -ForegroundColor Gray
Write-Host "Local Port: 6379 (temporary)" -ForegroundColor Gray
Write-Host ""

# Step 1: Start SSH tunnel in background
Write-Host "Step 1: Creating SSH tunnel to Redis..." -ForegroundColor Green

$tunnelJob = Start-Job -ScriptBlock {
    ssh -i "C:\Users\stars\.ssh\psychic-chat-bastion-key.pem" `
        -L 6379:psychic-chat-redis-0rflqd.serverless.use1.cache.amazonaws.com:6379 `
        -N `
        ec2-user@3.238.36.97
}

# Wait for tunnel to establish
Write-Host "   Waiting for tunnel to establish..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Step 2: Clear the queue
Write-Host ""
Write-Host "Step 2: Clearing 'chat-jobs' queue..." -ForegroundColor Green

try {
    # Run the clear-queue script
    $result = node clear-queue.js 2>&1
    Write-Host $result
    Write-Host ""
    Write-Host "Queue cleared successfully!" -ForegroundColor Green
}
catch {
    Write-Host "Error clearing queue: $_" -ForegroundColor Red
}
finally {
    # Step 3: Close the tunnel
    Write-Host ""
    Write-Host "Step 3: Closing SSH tunnel..." -ForegroundColor Yellow
    Stop-Job -Job $tunnelJob
    Remove-Job -Job $tunnelJob
    Write-Host "   Tunnel closed" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Write-Host ""
