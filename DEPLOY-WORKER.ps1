# Deploy Worker to AWS ECS
# This script builds and deploys the worker service to production

Write-Host "=== DEPLOYING WORKER TO PRODUCTION ===" -ForegroundColor Cyan
Write-Host ""

$REGION = "us-east-1"
$CLUSTER = "psychic-chat-production"
$SERVICE = "psychic-chat-worker-production"
$REPO = "586337033065.dkr.ecr.us-east-1.amazonaws.com/psychic-chat-worker-production"
$TASK_FAMILY = "psychic-chat-worker-production"

# Step 1: Build Docker image
Write-Host "[1/5] Building Docker image..." -ForegroundColor Yellow
docker build -t $SERVICE ./worker
if ($LASTEXITCODE -ne 0) {
    Write-Host "X Docker build failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK Docker image built" -ForegroundColor Green
Write-Host ""

# Step 2: Tag and push to ECR
Write-Host "[2/5] Pushing to ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REPO
docker tag ${SERVICE}:latest ${REPO}:latest
docker push ${REPO}:latest
if ($LASTEXITCODE -ne 0) {
    Write-Host "X Push to ECR failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK Image pushed to ECR" -ForegroundColor Green
Write-Host ""

# Step 3: Register task definition
Write-Host "[3/5] Registering task definition..." -ForegroundColor Yellow
$taskDefArn = aws ecs register-task-definition --cli-input-json file://worker-task-def-fixed.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text

if ($LASTEXITCODE -ne 0) {
    Write-Host "X Task definition registration failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK Task definition registered: $taskDefArn" -ForegroundColor Green
Write-Host ""

# Step 4: Update service
Write-Host "[4/5] Updating ECS service..." -ForegroundColor Yellow
aws ecs update-service --cluster $CLUSTER --service $SERVICE --task-definition $taskDefArn --force-new-deployment --region $REGION --query 'service.[serviceName,status,desiredCount]' --output table

if ($LASTEXITCODE -ne 0) {
    Write-Host "X Service update failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK Service update initiated" -ForegroundColor Green
Write-Host ""

# Step 5: Monitor deployment
Write-Host "[5/5] Monitoring deployment..." -ForegroundColor Yellow
Write-Host "Waiting for service to stabilize (this may take 2-3 minutes)..." -ForegroundColor Gray
Write-Host ""

$maxAttempts = 30
$attempt = 0
$stable = $false

while ($attempt -lt $maxAttempts -and !$stable) {
    Start-Sleep -Seconds 10
    $attempt++
    
    $serviceStatus = aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION --query 'services[0].[runningCount,desiredCount,deployments[0].status]' --output text
    
    $parts = $serviceStatus -split "`t"
    $running = $parts[0]
    $desired = $parts[1]
    $status = $parts[2]
    
    Write-Host "  Attempt $attempt/$maxAttempts - Running: $running/$desired, Status: $status" -ForegroundColor Gray
    
    if ($running -eq $desired -and $status -eq "PRIMARY") {
        $stable = $true
    }
}

Write-Host ""

if ($stable) {
    Write-Host "OK WORKER DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The worker is now processing chat messages from the queue" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "WARNING Service did not stabilize within expected time" -ForegroundColor Yellow
    Write-Host "Check the ECS console for more details" -ForegroundColor Gray
}
