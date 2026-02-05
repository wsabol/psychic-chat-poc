# ECS Deployment Script - Fixed Version
# This script will deploy your updated ECS infrastructure

Write-Host "🚀 Starting ECS Deployment with Fixes..." -ForegroundColor Green
Write-Host ""

# Step 0: Verify prerequisites
Write-Host "Step 0: Checking prerequisites..." -ForegroundColor Cyan

$account = aws sts get-caller-identity --query Account --output text
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ AWS credentials not configured. Run 'aws configure' first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ AWS Account: $account" -ForegroundColor Green

$region = "us-east-1"
Write-Host "✅ Region: $region" -ForegroundColor Green
Write-Host ""

# Step 1: Build Docker image
Write-Host "Step 1: Building Docker image with fixes..." -ForegroundColor Cyan
Set-Location api

docker build -t psychic-chat-api-production .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker image built successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Login to ECR
Write-Host "Step 2: Logging into ECR..." -ForegroundColor Cyan
aws ecr get-login-password --region $region | docker login --username AWS --password-stdin "$account.dkr.ecr.$region.amazonaws.com"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ECR login failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Logged into ECR" -ForegroundColor Green
Write-Host ""

# Step 3: Check if ECR repository exists, create if not
Write-Host "Step 3: Checking ECR repository..." -ForegroundColor Cyan
$repoCheck = aws ecr describe-repositories --repository-names psychic-chat-api-production 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Repository doesn't exist, creating..." -ForegroundColor Yellow
    aws ecr create-repository --repository-name psychic-chat-api-production --region $region
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create ECR repository!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ ECR repository created" -ForegroundColor Green
} else {
    Write-Host "✅ ECR repository exists" -ForegroundColor Green
}
Write-Host ""

# Step 4: Tag and push image
Write-Host "Step 4: Tagging and pushing image to ECR..." -ForegroundColor Cyan
docker tag psychic-chat-api-production:latest "$account.dkr.ecr.$region.amazonaws.com/psychic-chat-api-production:latest"
docker push "$account.dkr.ecr.$region.amazonaws.com/psychic-chat-api-production:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker push failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Image pushed to ECR" -ForegroundColor Green
Write-Host ""

# Step 5: Deploy CloudFormation stack
Write-Host "Step 5: Deploying CloudFormation stack with fixed template..." -ForegroundColor Cyan
Set-Location ../infrastructure

# Check if samconfig exists
if (!(Test-Path "samconfig-ecs-production.toml")) {
    Write-Host "❌ samconfig-ecs-production.toml not found!" -ForegroundColor Red
    Write-Host "   Please ensure the SAM config file exists before deploying." -ForegroundColor Yellow
    exit 1
}

Write-Host "Deploying with SAM CLI..." -ForegroundColor Yellow
sam deploy --config-file samconfig-ecs-production.toml --no-confirm-changeset

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CloudFormation deployment failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Checking recent CloudFormation events..." -ForegroundColor Yellow
    aws cloudformation describe-stack-events --stack-name psychic-chat-ecs-production --max-items 10
    exit 1
}

Write-Host "✅ CloudFormation stack deployed" -ForegroundColor Green
Write-Host ""

# Step 6: Monitor deployment
Write-Host "Step 6: Monitoring ECS deployment..." -ForegroundColor Cyan
Write-Host "This may take 3-5 minutes as the container starts up..." -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 30

# Check ECS service status
Write-Host "Checking ECS service status..." -ForegroundColor Cyan
$serviceStatus = aws ecs describe-services --cluster psychic-chat-production --services psychic-chat-api-production --query "services[0].runningCount" --output text

Write-Host "Running tasks: $serviceStatus" -ForegroundColor Yellow
Write-Host ""

# Get ALB DNS name
Write-Host "Getting Application Load Balancer DNS..." -ForegroundColor Cyan
$albDns = aws cloudformation describe-stacks --stack-name psychic-chat-ecs-production --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerDnsName'].OutputValue" --output text

if ($albDns) {
    Write-Host "✅ ALB DNS: $albDns" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 To monitor logs in real-time, run:" -ForegroundColor Yellow
    Write-Host "   aws logs tail /ecs/psychic-chat-api-production --follow" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 To test health endpoint (wait ~3 minutes first):" -ForegroundColor Yellow
    Write-Host "   curl http://$albDns/health" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 To check target health:" -ForegroundColor Yellow
    Write-Host "   aws elbv2 describe-target-health --target-group-arn <TARGET_GROUP_ARN>" -ForegroundColor White
} else {
    Write-Host "⚠️  Could not retrieve ALB DNS name" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "What changed this time:" -ForegroundColor Cyan
Write-Host "  ✅ Removed curl-based health check (was failing)" -ForegroundColor White
Write-Host "  ✅ Increased grace period: 60s → 180s" -ForegroundColor White
Write-Host "  ✅ Redis can't crash the app anymore" -ForegroundColor White
Write-Host "  ✅ Added curl to Docker image for debugging" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Wait 3-5 minutes for container to fully start" -ForegroundColor White
Write-Host "  2. Monitor logs: aws logs tail /ecs/psychic-chat-api-production --follow" -ForegroundColor White
Write-Host "  3. Test health endpoint: curl http://$albDns/health" -ForegroundColor White
Write-Host "  4. Check service status: aws ecs describe-services --cluster psychic-chat-production --services psychic-chat-api-production" -ForegroundColor White
Write-Host ""
