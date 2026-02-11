# Deploy Client (Frontend) to AWS S3 and CloudFront
# This script builds and deploys the React frontend to production

Write-Host "=== DEPLOYING CLIENT TO PRODUCTION ===" -ForegroundColor Cyan
Write-Host ""

$S3_BUCKET = "app.starshippsychics.com"
$CLOUDFRONT_ID = "EI3I0LQC8J618"
$REGION = "us-east-1"

# Step 1: Install dependencies
Write-Host "[1/5] Installing dependencies..." -ForegroundColor Yellow
Push-Location client
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ npm install failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 2: Build production bundle
Write-Host "[2/5] Building production bundle..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✓ Production bundle built" -ForegroundColor Green
Write-Host ""

# Step 3: Sync to S3 with proper content types
Write-Host "[3/5] Syncing to S3 with proper content types..." -ForegroundColor Yellow

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

# Step 5: Invalidate CloudFront cache
Write-Host "[5/5] Invalidating CloudFront cache..." -ForegroundColor Yellow
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

Write-Host "✓ CLIENT DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host ""
Write-Host "The client is now live at: https://app.starshippsychics.com" -ForegroundColor Cyan
Write-Host "CloudFront cache invalidation may take 2-3 minutes to propagate" -ForegroundColor Gray
Write-Host ""
