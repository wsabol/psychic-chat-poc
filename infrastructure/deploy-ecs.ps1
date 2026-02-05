#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy Psychic Chat API to ECS Fargate

.DESCRIPTION
    This script builds a Docker image, pushes it to ECR, and deploys the ECS infrastructure using AWS SAM.
    
.PARAMETER Environment
    The environment to deploy to (development, staging, production)
    
.PARAMETER Guided
    Run in guided mode (interactive prompts)
    
.PARAMETER SkipBuild
    Skip Docker image build and push (use existing image)

.EXAMPLE
    .\deploy-ecs.ps1 -Environment production
    
.EXAMPLE
    .\deploy-ecs.ps1 -Environment production -Guided
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('development', 'staging', 'production')]
    [string]$Environment = 'production',
    
    [Parameter(Mandatory=$false)]
    [switch]$Guided,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

# Color output functions
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "[WARNING] $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "[ERROR] $args" -ForegroundColor Red }

Write-Info "=== Psychic Chat ECS Deployment ==="
Write-Info "Environment: $Environment"
Write-Info ""

# Step 1: Validate prerequisites
Write-Info "[1/7] Checking prerequisites..."

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed. Please install Docker Desktop."
    exit 1
}
Write-Success "Docker found"

# Check AWS CLI
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Error "AWS CLI is not installed. Please install from https://aws.amazon.com/cli/"
    exit 1
}
Write-Success "AWS CLI found"

# Check SAM CLI
if (-not (Get-Command sam -ErrorAction SilentlyContinue)) {
    Write-Error "SAM CLI is not installed. Please install from https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
    exit 1
}
Write-Success "SAM CLI found"

# Check AWS credentials
try {
    $null = aws sts get-caller-identity 2>&1
    Write-Success "AWS credentials configured"
} catch {
    Write-Error "AWS credentials not configured. Run 'aws configure'"
    exit 1
}

# Step 2: Get AWS account and region info
Write-Info "[2/7] Getting AWS account information..."
$awsAccountId = (aws sts get-caller-identity --query Account --output text)
$awsRegion = (aws configure get region)
if (-not $awsRegion) {
    $awsRegion = "us-east-1"
}
Write-Success "Account: $awsAccountId"
Write-Success "Region: $awsRegion"

# Step 3: Build Docker image (unless skipped)
if (-not $SkipBuild) {
    Write-Info "[3/7] Building Docker image..."
    
    $apiPath = Join-Path $PSScriptRoot "..\api"
    if (-not (Test-Path $apiPath)) {
        Write-Error "API directory not found: $apiPath"
        exit 1
    }
    
    Push-Location $apiPath
    try {
        docker build -t psychic-chat-api:latest .
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Docker build failed"
            exit 1
        }
        Write-Success "Docker image built successfully"
    } finally {
        Pop-Location
    }
} else {
    Write-Warning "Skipping Docker build (using existing image)"
}

# Step 4: Create ECR repository if it doesn't exist
Write-Info "[4/7] Checking ECR repository..."
$ecrRepoName = "psychic-chat-api-$Environment"
$ecrUri = "$awsAccountId.dkr.ecr.$awsRegion.amazonaws.com/$ecrRepoName"

try {
    aws ecr describe-repositories --repository-names $ecrRepoName --region $awsRegion 2>&1 | Out-Null
    Write-Success "ECR repository exists: $ecrRepoName"
} catch {
    Write-Info "Creating ECR repository: $ecrRepoName"
    aws ecr create-repository `
        --repository-name $ecrRepoName `
        --image-scanning-configuration scanOnPush=true `
        --region $awsRegion
    Write-Success "ECR repository created"
}

# Step 5: Push Docker image to ECR (unless skipped)
if (-not $SkipBuild) {
    Write-Info "[5/7] Pushing Docker image to ECR..."
    
    # Login to ECR
    Write-Info "Logging in to ECR..."
    aws ecr get-login-password --region $awsRegion | docker login --username AWS --password-stdin "$awsAccountId.dkr.ecr.$awsRegion.amazonaws.com"
    
    # Tag image
    Write-Info "Tagging image..."
    docker tag psychic-chat-api:latest "$ecrUri`:latest"
    docker tag psychic-chat-api:latest "$ecrUri`:$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    # Push image
    Write-Info "Pushing image to ECR..."
    docker push "$ecrUri`:latest"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker push failed"
        exit 1
    }
    Write-Success "Docker image pushed to ECR"
} else {
    Write-Warning "Skipping Docker push (using existing image)"
}

# Step 6: Deploy SAM template
Write-Info "[6/7] Deploying ECS infrastructure with SAM..."

$templatePath = Join-Path $PSScriptRoot "ecs-template.yaml"
$configFile = Join-Path $PSScriptRoot "samconfig-ecs-$Environment.toml"

if (-not (Test-Path $templatePath)) {
    Write-Error "Template not found: $templatePath"
    exit 1
}

if (-not (Test-Path $configFile)) {
    Write-Error "Config file not found: $configFile"
    Write-Info "Please create $configFile with your parameters"
    Write-Info "See samconfig-ecs-production.toml for an example"
    exit 1
}

# Build (not needed for pure CloudFormation, but validates template)
Write-Info "Validating SAM template..."
sam validate --template-file $templatePath --region $awsRegion
if ($LASTEXITCODE -ne 0) {
    Write-Error "Template validation failed"
    exit 1
}
Write-Success "Template is valid"

# Deploy
Write-Info "Deploying stack..."
if ($Guided) {
    sam deploy --template-file $templatePath --guided --config-env default --config-file $configFile
} else {
    sam deploy --template-file $templatePath --config-env default --config-file $configFile
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Deployment failed"
    exit 1
}
Write-Success "Stack deployed successfully"

# Step 7: Get outputs
Write-Info "[7/7] Deployment complete!"
Write-Info ""
Write-Info "=== Stack Outputs ==="

$stackName = "psychic-chat-ecs-$Environment"
$outputs = aws cloudformation describe-stacks `
    --stack-name $stackName `
    --query 'Stacks[0].Outputs' `
    --output json | ConvertFrom-Json

foreach ($output in $outputs) {
    Write-Success "$($output.OutputKey): $($output.OutputValue)"
}

Write-Info ""
Write-Info "=== Next Steps ==="
Write-Info "1. Update your client API_URL to point to the Load Balancer URL"
Write-Info "2. (Optional) Set up a custom domain with Route 53 and ACM certificate"
Write-Info "3. Monitor logs: aws logs tail /ecs/psychic-chat-api-$Environment --follow"
Write-Info "4. Check ECS service: aws ecs describe-services --cluster psychic-chat-$Environment --services psychic-chat-api-$Environment"
Write-Info ""
Write-Success "Deployment complete!"
