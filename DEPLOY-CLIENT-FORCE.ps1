# FORCE CLIENT DEPLOYMENT - Ensures fresh build
# This script forces a clean rebuild and deployment

Write-Host "=== FORCE DEPLOYING CLIENT TO PRODUCTION ===" -ForegroundColor Cyan
Write-Host ""

$S3_BUCKET = "app.starshippsychics.com"
$CLOUDFRONT_ID = "EI3I0LQC8J618"
$REGION = "us-east-1"

# Step 1: Navigate to client directory
Write-Host "[1/6] Navigating to client directory..." -ForegroundColor Yellow
Push-Location client

# Step 2: Remove old build folder
Write-Host "[2/6] Removing old build folder..." -ForegroundColor Yellow
if (Test-Path build) {
    Remove-Item -Recurse -Force build
    Write-Host "✓ Old build removed" -ForegroundColor Green
} else {
    Write-Host "✓ No old build to remove" -ForegroundColor Green
}
Write-Host ""

# Step 3: Install dependencies
Write-Host "[3/6] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ npm install failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 4: Build production bundle
Write-Host "[4/6] Building production bundle - this may take a minute..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Verify build folder exists and has files
if (!(Test-Path build)) {
    Write-Host "✗ Build folder not created" -ForegroundColor Red
    Pop-Location
    exit 1
}

$buildFiles = Get-ChildItem build -Recurse | Measure-Object
if ($buildFiles.Count -eq 0) {
    Write-Host "✗ Build folder is empty" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "✓ Production bundle built ($($buildFiles.Count) files)" -ForegroundColor Green
Write-Host ""

# Step 5: Sync to S3 with proper content types
Write-Host "[5/6] Syncing to S3 with proper content types..." -ForegroundColor Yellow

# Sync HTML files with proper content type and no cache
aws s3 sync build/ s3://$S3_BUCKET/ --delete --region $REGION --exclude "*" --include "*.html" --content-type "text/html" --cache-control "no-cache, no-store, must-revalidate"

# Sync JSON files with proper content type
aws s3 sync build/ s3://$S3_BUCKET/ --delete --region $REGION --exclude "*" --include "*.json" --content-type "application/json" --cache-control "no-cache, no-store, must-revalidate"

# Sync CSS files with proper content type and cache
aws s3 sync build/ s3://$S3_BUCKET/ --delete --region $REGION --exclude "*" --include "*.css" --content-type "text/css" --cache-control "public, max-age=31536000, immutable"

# Sync JS files with proper content type and cache
aws s3 sync build/ s3://$S3_BUCKET/ --delete --region $REGION --exclude "*" --include "*.js" --content-type "application/javascript" --cache-control "public, max-age=31536000, immutable"

# Sync image files (PNG, JPG, JPEG, GIF, SVG, ICO)
aws s3 sync build/ s3://$S3_BUCKET/ --delete --region $REGION --exclude "*" --include "*.png" --content-type "image/png" --cache-control "public, max-age=31536000, immutable"
aws s3 sync build/ s3://$S3_BUCKET/ --delete --region $REGION --exclude "*" --include "*.jpg" --content-type "image/jpeg" --cache-control "public, max-age=31536000, immutable"
aws s3 sync build/ s3://$S3_BUCKET/ --delete --region $REGION --exclude "*" --include "*.jpeg" --content-type "image/jpeg" --cache-control "public, max-age=31536000, immutable"
aws s3 sync build/ s3://$S3_BUCKET/ --delete --region $REGION --exclude "*" --include "*.gif" --content-type "image/gif" --cache-control "public, max-age=31536000, immutable"
aws s3 sync build/ s3://$S3_BUCKET/ --delete --region $REGION --exclude "*" --include "*.svg" --content-type "image/svg+xml" --cache-control "public, max-age=31536000, immutable"
aws s3 sync build/ s3://$S3_BUCKET/ --delete --region $REGION --exclude "*" --include "*.ico" --content-type "image/x-icon" --cache-control "public, max-age=31536000, immutable"

# Sync PDF files
aws s3 sync build/ s3://$S3_BUCKET/ --delete --region $REGION --exclude "*" --include "*.pdf" --content-type "application/pdf" --cache-control "public, max-age=86400"

# Sync any remaining files (fonts, etc.)
aws s3 sync build/ s3://$S3_BUCKET/ --delete --region $REGION --exclude "*.html" --exclude "*.json" --exclude "*.css" --exclude "*.js" --exclude "*.png" --exclude "*.jpg" --exclude "*.jpeg" --exclude "*.gif" --exclude "*.svg" --exclude "*.ico" --exclude "*.pdf"

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ S3 sync failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✓ Files synced to S3 with proper MIME types" -ForegroundColor Green
Write-Host ""

# Step 6: Invalidate CloudFront cache
Write-Host "[6/6] Invalidating CloudFront cache..." -ForegroundColor Yellow
$invalidationId = aws cloudfront create-invalidation `
    --distribution-id $CLOUDFRONT_ID `
    --paths "/*" `
    --query 'Invalidation.Id' `
    --output text

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ CloudFront invalidation failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✓ CloudFront invalidation created: $invalidationId" -ForegroundColor Green
Write-Host ""

Pop-Location

Write-Host "CLIENT FORCE DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host ""
Write-Host "The client is now live at: https://app.starshippsychics.com" -ForegroundColor Cyan
Write-Host "CloudFront cache invalidation may take 2-3 minutes to propagate" -ForegroundColor Gray
Write-Host "Clear your browser cache if you still see old code" -ForegroundColor Yellow
Write-Host ""
