# Force ECS to use updated Docker image
# This script tags the image with a timestamp to force pull

Write-Host "🔄 Forcing ECS to update with new Docker image..." -ForegroundColor Cyan
Write-Host ""

$region = "us-east-1"
$account = "586337033065"
$repo = "psychic-chat-api-production"

# Step 1: Tag the existing latest image with timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$newTag = "${account}.dkr.ecr.${region}.amazonaws.com/${repo}:${timestamp}"

Write-Host "Step 1: Tagging image with timestamp: $timestamp" -ForegroundColor Yellow

docker tag ${account}.dkr.ecr.${region}.amazonaws.com/${repo}:latest $newTag
aws ecr get-login-password --region $region | docker login --username AWS --password-stdin "${account}.dkr.ecr.${region}.amazonaws.com"
docker push $newTag

Write-Host "✅ Image tagged and pushed: $newTag" -ForegroundColor Green
Write-Host ""

# Step 2: Update service to force new deployment
Write-Host "Step 2: Forcing ECS service to redeploy..." -ForegroundColor Yellow

aws ecs update-service `
    --cluster psychic-chat-production `
    --service psychic-chat-api-production `
    --force-new-deployment `
    --region $region `
    --query "service.{serviceName:serviceName,status:status,desiredCount:desiredCount}" `
    --output json

Write-Host ""
Write-Host "✅ Service update initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "⏳ Waiting 60 seconds for new task to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# Step 3: Check status
Write-Host ""
Write-Host "Step 3: Checking deployment status..." -ForegroundColor Yellow
aws ecs describe-services `
    --cluster psychic-chat-production `
    --services psychic-chat-api-production `
    --region $region `
    --query "services[0].{runningCount:runningCount,desiredCount:desiredCount,deployments:deployments[*].{status:status,desiredCount:desiredCount,runningCount:runningCount}}" `
    --output json

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Status" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Test the contact form at:" -ForegroundColor Yellow
Write-Host "https://starshippsychics.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or test API directly:" -ForegroundColor Yellow
Write-Host "powershell -ExecutionPolicy Bypass -File test-contact.ps1" -ForegroundColor Cyan
Write-Host ""
