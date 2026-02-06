# Deploy React Client App to S3 + CloudFront
# Usage: .\deploy-frontend.ps1

param(
    [string]$Environment = "production",
    [string]$Domain = "app.starshippsychics.com"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying React Client to S3 + CloudFront" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is configured
Write-Host "Checking AWS CLI configuration..." -ForegroundColor Yellow
try {
    $awsIdentity = aws sts get-caller-identity 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI not configured"
    }
    Write-Host "AWS CLI configured" -ForegroundColor Green
} catch {
    Write-Host "AWS CLI not configured. Please run 'aws configure'" -ForegroundColor Red
    exit 1
}

# Get Route53 Hosted Zone ID
Write-Host ""
Write-Host "Using Hosted Zone ID for starshippsychics.com..." -ForegroundColor Yellow
$hostedZoneId = "Z064791524UJ1R2U2CGTU"
Write-Host "Hosted Zone ID: $hostedZoneId" -ForegroundColor Green

# Check if build exists
Write-Host ""
Write-Host "Checking if build exists..." -ForegroundColor Yellow
$buildPath = Join-Path $PSScriptRoot "..\client\build"
if (-not (Test-Path $buildPath)) {
    Write-Host "Build folder not found at: $buildPath" -ForegroundColor Red
    Write-Host "Please run 'npm run build' from the client directory first" -ForegroundColor Yellow
    exit 1
}
Write-Host "Build folder found" -ForegroundColor Green

# Deploy CloudFormation Stack
Write-Host ""
Write-Host "Deploying CloudFormation stack..." -ForegroundColor Yellow
$stackName = "$Environment-psychic-chat-frontend"
$templateFile = Join-Path $PSScriptRoot "frontend-template.yaml"

try {
    aws cloudformation deploy --template-file $templateFile --stack-name $stackName --parameter-overrides Environment=$Environment DomainName=$Domain HostedZoneId=$hostedZoneId --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset

    if ($LASTEXITCODE -ne 0) {
        throw "CloudFormation deployment failed"
    }
    Write-Host "CloudFormation stack deployed" -ForegroundColor Green
} catch {
    Write-Host "Failed to deploy CloudFormation stack: $_" -ForegroundColor Red
    exit 1
}

# Get Stack Outputs
Write-Host ""
Write-Host "Getting stack outputs..." -ForegroundColor Yellow
try {
    $outputs = aws cloudformation describe-stacks --stack-name $stackName --query "Stacks[0].Outputs" | ConvertFrom-Json
    $bucketName = ($outputs | Where-Object { $_.OutputKey -eq "BucketName" }).OutputValue
    $distributionId = ($outputs | Where-Object { $_.OutputKey -eq "CloudFrontDistributionId" }).OutputValue
    $websiteURL = ($outputs | Where-Object { $_.OutputKey -eq "WebsiteURL" }).OutputValue
    
    Write-Host "Bucket Name: $bucketName" -ForegroundColor Green
    Write-Host "Distribution ID: $distributionId" -ForegroundColor Green
    Write-Host "Website URL: $websiteURL" -ForegroundColor Green
} catch {
    Write-Host "Failed to get stack outputs: $_" -ForegroundColor Red
    exit 1
}

# Wait for certificate validation
Write-Host ""
Write-Host "Checking certificate status..." -ForegroundColor Yellow
Write-Host "Note: If this is the first deployment, DNS validation may take a few minutes" -ForegroundColor Yellow

# Upload files to S3
Write-Host ""
Write-Host "Uploading files to S3..." -ForegroundColor Yellow
try {
    aws s3 sync $buildPath s3://$bucketName/ --delete --cache-control "public, max-age=31536000, immutable" --exclude "*.html" --exclude "*.json"
    
    # Upload HTML files with different cache settings
    aws s3 sync $buildPath s3://$bucketName/ --cache-control "public, max-age=0, must-revalidate" --exclude "*" --include "*.html" --include "*.json"
    
    if ($LASTEXITCODE -ne 0) {
        throw "S3 sync failed"
    }
    Write-Host "Files uploaded to S3" -ForegroundColor Green
} catch {
    Write-Host "Failed to upload files: $_" -ForegroundColor Red
    exit 1
}

# Invalidate CloudFront cache
Write-Host ""
Write-Host "Invalidating CloudFront cache..." -ForegroundColor Yellow
try {
    $invalidation = aws cloudfront create-invalidation --distribution-id $distributionId --paths "/*" | ConvertFrom-Json
    
    if ($LASTEXITCODE -ne 0) {
        throw "CloudFront invalidation failed"
    }
    Write-Host "CloudFront cache invalidated (ID: $($invalidation.Invalidation.Id))" -ForegroundColor Green
} catch {
    Write-Host "Failed to invalidate CloudFront cache: $_" -ForegroundColor Red
    Write-Host "You may need to manually invalidate the cache in the CloudFront console" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Website URL: $websiteURL" -ForegroundColor Green
Write-Host "S3 Bucket: $bucketName" -ForegroundColor Cyan
Write-Host "CloudFront Distribution: $distributionId" -ForegroundColor Cyan
Write-Host ""
Write-Host "Important Notes:" -ForegroundColor Yellow
Write-Host "1. If this is the first deployment, DNS propagation may take up to 48 hours" -ForegroundColor White
Write-Host "2. CloudFront distribution may take 15-20 minutes to fully deploy" -ForegroundColor White
Write-Host "3. Check ACM certificate status in AWS Console if HTTPS does not work" -ForegroundColor White
Write-Host "4. The API is configured to use: https://api.starshippsychics.com" -ForegroundColor White
Write-Host ""
Write-Host "Test the deployment:" -ForegroundColor Yellow
Write-Host "  1. Wait a few minutes for CloudFront to deploy" -ForegroundColor White
Write-Host "  2. Visit: $websiteURL" -ForegroundColor White
Write-Host "  3. Check browser console for any API connection issues" -ForegroundColor White
Write-Host ""
