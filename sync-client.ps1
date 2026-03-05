# Sync Client - Builds then deploys to S3 + CloudFront
# NOTE: Always builds first to prevent deploying stale code.
#       Use DEPLOY-CLIENT-FORCE.ps1 for a clean rebuild (removes old build folder first).

$CLIENT_DIR = "c:\Projects\psychic-chat-poc\client"
$BUILD = "c:\Projects\psychic-chat-poc\client\build"
$BUCKET = "app.starshippsychics.com"
$CF_ID = "EI3I0LQC8J618"
$REGION = "us-east-1"

# ── Step 1: Build ──────────────────────────────────────────────────────────────
Write-Host "=== BUILDING CLIENT ===" -ForegroundColor Cyan
Push-Location $CLIENT_DIR

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ npm install failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "Building production bundle..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Verify build folder was created and is not empty
if (!(Test-Path $BUILD)) {
    Write-Host "✗ Build folder not found after build - aborting sync" -ForegroundColor Red
    Pop-Location
    exit 1
}
$buildCount = (Get-ChildItem $BUILD -Recurse | Measure-Object).Count
if ($buildCount -eq 0) {
    Write-Host "✗ Build folder is empty - aborting sync" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✓ Production bundle built ($buildCount files)" -ForegroundColor Green

Pop-Location

# ── Step 2: Sync to S3 ────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== SYNCING TO S3 ===" -ForegroundColor Cyan

Write-Host "Syncing HTML (no-cache)..." -ForegroundColor Yellow
aws s3 sync $BUILD s3://$BUCKET/ --delete --region $REGION --exclude "*" --include "*.html" --content-type "text/html" --cache-control "no-cache, no-store, must-revalidate"

Write-Host "Syncing JSON (no-cache)..." -ForegroundColor Yellow
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.json" --content-type "application/json" --cache-control "no-cache, no-store, must-revalidate"

Write-Host "Syncing CSS..." -ForegroundColor Yellow
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.css" --content-type "text/css" --cache-control "public, max-age=31536000, immutable"

Write-Host "Syncing JS (service-worker no-cache, rest immutable)..." -ForegroundColor Yellow
aws s3 cp $BUILD/service-worker.js s3://$BUCKET/service-worker.js `
    --region $REGION `
    --content-type "application/javascript" `
    --cache-control "no-cache, no-store, must-revalidate"
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION `
    --exclude "*" --include "*.js" --exclude "service-worker.js" `
    --content-type "application/javascript" `
    --cache-control "public, max-age=31536000, immutable"

Write-Host "Syncing images..." -ForegroundColor Yellow
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.png"  --content-type "image/png"       --cache-control "public, max-age=31536000, immutable"
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.jpg"  --content-type "image/jpeg"      --cache-control "public, max-age=31536000, immutable"
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.jpeg" --content-type "image/jpeg"      --cache-control "public, max-age=31536000, immutable"
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.gif"  --content-type "image/gif"       --cache-control "public, max-age=31536000, immutable"
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.svg"  --content-type "image/svg+xml"   --cache-control "public, max-age=31536000, immutable"
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.ico"  --content-type "image/x-icon"    --cache-control "public, max-age=31536000, immutable"

Write-Host "Syncing remaining files (fonts, etc.)..." -ForegroundColor Yellow
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION `
    --exclude "*.html" --exclude "*.json" --exclude "*.css" --exclude "*.js" `
    --exclude "*.png"  --exclude "*.jpg"  --exclude "*.jpeg" --exclude "*.gif" `
    --exclude "*.svg"  --exclude "*.ico"

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ S3 sync failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Files synced to S3" -ForegroundColor Green

# ── Step 3: Invalidate CloudFront ─────────────────────────────────────────────
Write-Host ""
Write-Host "Invalidating CloudFront cache..." -ForegroundColor Yellow
$result = aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*" --query "Invalidation.Id" --output text
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ CloudFront invalidation failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ CloudFront invalidation created: $result" -ForegroundColor Green
Write-Host ""
Write-Host "CLIENT DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "Live at: https://app.starshippsychics.com" -ForegroundColor Cyan
Write-Host "(Cache propagation may take 2-3 minutes)" -ForegroundColor Gray
