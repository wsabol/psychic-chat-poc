# Simple deployment script for existing CloudFront setup
# Usage: .\deploy-to-existing-cloudfront.ps1

param(
    [string]$BucketName = "app.starshippsychics.com",
    [string]$DistributionId = "EI3I0LQC8J618"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying React App to S3 + CloudFront" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if build exists
Write-Host "Checking if build exists..." -ForegroundColor Yellow
$buildPath = Join-Path $PSScriptRoot "..\client\build"
if (-not (Test-Path $buildPath)) {
    Write-Host "Build folder not found at: $buildPath" -ForegroundColor Red
    Write-Host "Please run 'npm run build' from the client directory first" -ForegroundColor Yellow
    exit 1
}
Write-Host "Build folder found" -ForegroundColor Green

# Upload static assets with long cache
Write-Host ""
Write-Host "Uploading static assets to S3..." -ForegroundColor Yellow
try {
    aws s3 sync $buildPath s3://$BucketName/ --delete --cache-control "public, max-age=31536000, immutable" --exclude "*.html" --exclude "*.json"
    
    if ($LASTEXITCODE -ne 0) {
        throw "S3 sync failed for static assets"
    }
    Write-Host "Static assets uploaded" -ForegroundColor Green
}
catch {
    Write-Host "Failed to upload static assets: $_" -ForegroundColor Red
    exit 1
}

# Upload HTML and JSON files with no cache
Write-Host ""
Write-Host "Uploading HTML and JSON files..." -ForegroundColor Yellow
try {
    aws s3 sync $buildPath s3://$BucketName/ --cache-control "public, max-age=0, must-revalidate" --exclude "*" --include "*.html" --include "*.json"
    
    if ($LASTEXITCODE -ne 0) {
        throw "S3 sync failed for HTML/JSON"
    }
    Write-Host "HTML and JSON files uploaded" -ForegroundColor Green
}
catch {
    Write-Host "Failed to upload HTML/JSON: $_" -ForegroundColor Red
    exit 1
}

# Invalidate CloudFront cache
Write-Host ""
Write-Host "Invalidating CloudFront cache..." -ForegroundColor Yellow
try {
    $invalidation = aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*" | ConvertFrom-Json
    
    if ($LASTEXITCODE -ne 0) {
        throw "CloudFront invalidation failed"
    }
    Write-Host "CloudFront cache invalidated (ID: $($invalidation.Invalidation.Id))" -ForegroundColor Green
}
catch {
    Write-Host "Failed to invalidate CloudFront cache: $_" -ForegroundColor Red
    Write-Host "Changes are uploaded but may take time to appear due to caching" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your site is now live at:" -ForegroundColor Green
Write-Host "  https://app.starshippsychics.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "S3 Bucket: $BucketName" -ForegroundColor White
Write-Host "CloudFront Distribution: $DistributionId" -ForegroundColor White
Write-Host ""
Write-Host "Note: CloudFront invalidation may take 1-5 minutes to propagate" -ForegroundColor Yellow
Write-Host ""
