# Deploy Free Trial Chat Fix
# Fixes: Auth blocking + Missing OPENAI_API_KEY

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying Free Trial Complete Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

$AWS_REGION = "us-east-1"
$AWS_ACCOUNT_ID = "586337033065"
$CLUSTER_NAME = "psychic-chat-production"

# 1. Build and Push API
Write-Host "1. Building and pushing API..." -ForegroundColor Yellow
Set-Location api
try {
    docker build -t psychic-chat-api-production .
    if ($LASTEXITCODE -ne 0) { throw "API build failed" }
    
    $API_ECR = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/psychic-chat-api-production"
    docker tag psychic-chat-api-production:latest "${API_ECR}:latest"
    
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $API_ECR
    docker push "${API_ECR}:latest"
    
    Write-Host "  OK API image pushed" -ForegroundColor Green
} catch {
    Write-Host "  FAILED: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# 2. Build and Deploy Client
Write-Host "2. Building and deploying client..." -ForegroundColor Yellow
Set-Location client
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Client build failed" }
    
    aws s3 sync build/ s3://app.starshippsychics.com/ --delete
    aws cloudfront create-invalidation --distribution-id EI3I0LQC8J618 --paths "/*"
    
    Write-Host "  OK Client deployed" -ForegroundColor Green
} catch {
    Write-Host "  FAILED: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# 3. Update Worker with OPENAI_API_KEY
Write-Host "3. Updating worker with OPENAI_API_KEY..." -ForegroundColor Yellow
try {
    aws ecs register-task-definition --cli-input-json file://worker-task-def.json --region $AWS_REGION | Out-Null
    aws ecs update-service --cluster $CLUSTER_NAME --service psychic-chat-worker-production --force-new-deployment --region $AWS_REGION | Out-Null
    
    Write-Host "  OK Worker updated" -ForegroundColor Green
} catch {
    Write-Host "  FAILED: $_" -ForegroundColor Red
    exit 1
}

# 4. Update API with OPENAI_API_KEY
Write-Host "4. Updating API with OPENAI_API_KEY..." -ForegroundColor Yellow
try {
    $taskDefJson = Get-Content "current-task-def.json" | ConvertFrom-Json
    $taskDef = $taskDefJson.taskDefinition
    
    $payload = @{
        family = $taskDef.family
        taskRoleArn = $taskDef.taskRoleArn
        executionRoleArn = $taskDef.executionRoleArn
        networkMode = $taskDef.networkMode
        containerDefinitions = $taskDef.containerDefinitions
        requiresCompatibilities = $taskDef.requiresCompatibilities
        cpu = $taskDef.cpu
        memory = $taskDef.memory
    } | ConvertTo-Json -Depth 10 -Compress
    
    $payload | Set-Content "temp-api-def.json"
    aws ecs register-task-definition --cli-input-json file://temp-api-def.json --region $AWS_REGION | Out-Null
    Remove-Item "temp-api-def.json"
    
    aws ecs update-service --cluster $CLUSTER_NAME --service psychic-chat-api-production --force-new-deployment --region $AWS_REGION | Out-Null
    
    Write-Host "  OK API updated" -ForegroundColor Green
} catch {
    Write-Host "  FAILED: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Fixed:" -ForegroundColor White
Write-Host "  + Free trial chat endpoint (no auth)" -ForegroundColor Green
Write-Host "  + OPENAI_API_KEY added to worker" -ForegroundColor Green
Write-Host "  + OPENAI_API_KEY added to API" -ForegroundColor Green
Write-Host "  + Client routes temp users correctly" -ForegroundColor Green
Write-Host ""
Write-Host "Wait 2-3 minutes for services to restart" -ForegroundColor Yellow
Write-Host "Then test at: https://app.starshippsychics.com" -ForegroundColor Cyan
Write-Host ""
