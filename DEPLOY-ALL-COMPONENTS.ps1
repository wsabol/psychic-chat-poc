# Complete Deployment Script - API, Worker, and Client
# This script deploys all three components of the application

param(
    [Parameter(Mandatory=$false)]
    [switch]$SkipApi,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipWorker,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipClient
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DEPLOYING ALL COMPONENTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get AWS account info
Write-Host "Checking AWS credentials..." -ForegroundColor Yellow
$awsAccount = aws sts get-caller-identity --query Account --output text
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: AWS credentials not configured. Run 'aws configure' first." -ForegroundColor Red
    exit 1
}
$awsRegion = "us-east-1"
Write-Host "AWS Account: $awsAccount" -ForegroundColor Green
Write-Host "Region: $awsRegion" -ForegroundColor Green
Write-Host ""

# ============================================
# PART 1: DEPLOY API TO ECS
# ============================================
if (-not $SkipApi) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "PART 1: DEPLOYING API" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "[1/4] Building API Docker image..." -ForegroundColor Yellow
    Set-Location api
    docker build -t psychic-chat-api-production .
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: API Docker build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "SUCCESS: API Docker image built" -ForegroundColor Green
    Set-Location ..
    Write-Host ""
    
    Write-Host "[2/4] Logging into ECR..." -ForegroundColor Yellow
    $ecrLogin = "$awsAccount.dkr.ecr.$awsRegion.amazonaws.com"
    aws ecr get-login-password --region $awsRegion | docker login --username AWS --password-stdin $ecrLogin
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: ECR login failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "SUCCESS: Logged into ECR" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "[3/4] Pushing API image to ECR..." -ForegroundColor Yellow
    $apiImage = "$awsAccount.dkr.ecr.$awsRegion.amazonaws.com/psychic-chat-api-production:latest"
    docker tag psychic-chat-api-production:latest $apiImage
    docker push $apiImage
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: API Docker push failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "SUCCESS: API image pushed to ECR" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "[4/4] Updating ECS service..." -ForegroundColor Yellow
    $updateCmd = "aws ecs update-service --cluster psychic-chat-production " +
                 "--service psychic-chat-api-production --force-new-deployment --region $awsRegion"
    Invoke-Expression "$updateCmd" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: ECS service update may have failed, but continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "SUCCESS: API ECS service updated" -ForegroundColor Green
    }
    Write-Host ""
} else {
    Write-Host "Skipping API deployment" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================
# PART 2: DEPLOY WORKER TO ECS
# ============================================
if (-not $SkipWorker) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "PART 2: DEPLOYING WORKER" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "[1/5] Building Worker Docker image..." -ForegroundColor Yellow
    Set-Location worker
    docker build -t psychic-chat-worker-production .
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Worker Docker build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "SUCCESS: Worker Docker image built" -ForegroundColor Green
    Set-Location ..
    Write-Host ""
    
    Write-Host "[2/5] Checking/Creating Worker ECR repository..." -ForegroundColor Yellow
    $workerRepo = "psychic-chat-worker-production"
    $ErrorActionPreference = "SilentlyContinue"
    $workerRepoCheck = aws ecr describe-repositories --repository-names $workerRepo --region $awsRegion 2>&1
    $repoExists = $LASTEXITCODE -eq 0
    $ErrorActionPreference = "Stop"
    
    if (-not $repoExists) {
        Write-Host "Creating Worker ECR repository..." -ForegroundColor Yellow
        aws ecr create-repository --repository-name $workerRepo --region $awsRegion | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to create Worker ECR repository!" -ForegroundColor Red
            exit 1
        }
        Write-Host "SUCCESS: Worker ECR repository created" -ForegroundColor Green
    } else {
        Write-Host "SUCCESS: Worker ECR repository exists" -ForegroundColor Green
    }
    Write-Host ""
    
    Write-Host "[3/5] Pushing Worker image to ECR..." -ForegroundColor Yellow
    $workerImage = "$awsAccount.dkr.ecr.$awsRegion.amazonaws.com/psychic-chat-worker-production:latest"
    docker tag psychic-chat-worker-production:latest $workerImage
    docker push $workerImage
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Worker Docker push failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "SUCCESS: Worker image pushed to ECR" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "[4/5] Checking if Worker ECS service exists..." -ForegroundColor Yellow
    $ErrorActionPreference = "SilentlyContinue"
    $workerServiceCheck = aws ecs describe-services --cluster psychic-chat-production --services psychic-chat-worker-production --region $awsRegion 2>&1
    $serviceExists = $LASTEXITCODE -eq 0
    $ErrorActionPreference = "Stop"
    
    if ($serviceExists) {
        $statusCmd = "aws ecs describe-services --cluster psychic-chat-production " +
                     "--services psychic-chat-worker-production " +
                     "--query `"services[0].status`" --output text --region $awsRegion"
        $serviceStatus = Invoke-Expression $statusCmd
        if ($serviceStatus -eq "ACTIVE") {
            Write-Host "[5/5] Updating Worker ECS service..." -ForegroundColor Yellow
            $updateWorkerCmd = "aws ecs update-service --cluster psychic-chat-production " +
                              "--service psychic-chat-worker-production --force-new-deployment --region $awsRegion"
            Invoke-Expression $updateWorkerCmd | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "WARNING: Worker ECS service update may have failed" -ForegroundColor Yellow
            } else {
                Write-Host "SUCCESS: Worker ECS service updated" -ForegroundColor Green
            }
        } else {
            Write-Host "WARNING: Worker service exists but is not ACTIVE. Status: $serviceStatus" -ForegroundColor Yellow
            Write-Host "You may need to manually deploy the worker service" -ForegroundColor Yellow
        }
    } else {
        Write-Host "WARNING: Worker ECS service does not exist yet" -ForegroundColor Yellow
        Write-Host "The worker image has been pushed to ECR: $workerImage" -ForegroundColor Yellow
        Write-Host "You need to add the worker to your ECS CloudFormation template" -ForegroundColor Yellow
    }
    Write-Host ""
} else {
    Write-Host "Skipping Worker deployment" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================
# PART 3: DEPLOY CLIENT TO S3/CLOUDFRONT
# ============================================
if (-not $SkipClient) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "PART 3: DEPLOYING CLIENT" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Running frontend deployment script..." -ForegroundColor Yellow
    Set-Location infrastructure
    & .\deploy-frontend.ps1 -Environment "production" -Domain "app.starshippsychics.com"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Client deployment may have encountered issues" -ForegroundColor Yellow
    }
    Set-Location ..
    Write-Host ""
} else {
    Write-Host "Skipping Client deployment" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================
# SUMMARY
# ============================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Deployment Summary:" -ForegroundColor Cyan
if (-not $SkipApi) {
    Write-Host "  - API deployed to ECS" -ForegroundColor Green
}
if (-not $SkipWorker) {
    Write-Host "  - Worker image built and pushed to ECR" -ForegroundColor Green
    Write-Host "    (Worker service deployment status checked above)" -ForegroundColor Yellow
}
if (-not $SkipClient) {
    Write-Host "  - Client deployed to S3/CloudFront" -ForegroundColor Green
}
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
$logCmd1 = "aws logs tail /ecs/psychic-chat-api-production --follow"
Write-Host "  1. Monitor API logs:" -ForegroundColor White
Write-Host "     $logCmd1" -ForegroundColor Gray
if (-not $SkipWorker) {
    $logCmd2 = "aws logs tail /ecs/psychic-chat-worker-production --follow"
    Write-Host "  2. Monitor Worker logs:" -ForegroundColor White
    Write-Host "     $logCmd2" -ForegroundColor Gray
}
Write-Host "  3. Visit: https://app.starshippsychics.com" -ForegroundColor White
Write-Host "  4. Check ECS services in AWS Console" -ForegroundColor White
Write-Host ""
