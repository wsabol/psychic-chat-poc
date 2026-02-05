# ========================================
# SECURITY UPDATE DEPLOYMENT SCRIPT
# Deploy all services with new API keys
# ========================================

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SECURITY UPDATE - FULL DEPLOYMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$S3Bucket = "www.starshippsychics.com"
$CloudFrontDistId = "EJTHM507MIGTB"
$Region = "us-east-1"

# Step 1: Build Client
Write-Host "[1/5] Building React Client..." -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
Set-Location client
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Client build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Client built successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy Client to S3
Write-Host "[2/5] Deploying Client to S3..." -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
aws s3 sync build/ s3://$S3Bucket --delete
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ S3 upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Client deployed to S3!" -ForegroundColor Green
Write-Host ""

# Step 3: Invalidate CloudFront Cache
Write-Host "[3/5] Invalidating CloudFront Cache..." -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
try {
    $invalidation = aws cloudfront create-invalidation --distribution-id $CloudFrontDistId --paths "/*" 2>&1
    Write-Host "✅ CloudFront invalidation created!" -ForegroundColor Green
    Write-Host "   (Will complete in 1-5 minutes)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  CloudFront invalidation skipped (no permissions)" -ForegroundColor Yellow
    Write-Host "   Please create invalidation manually in AWS Console" -ForegroundColor Gray
}
Write-Host ""

# Step 4: Deploy Lambda Functions
Write-Host "[4/5] Deploying Lambda Functions..." -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
Set-Location ..\infrastructure
sam deploy --config-file samconfig-production.toml --no-confirm-changeset
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Lambda deployment failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Lambda functions deployed!" -ForegroundColor Green
Write-Host ""

# Step 5: Deploy ECS API Service
Write-Host "[5/5] Deploying ECS API Service..." -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Gray
.\deploy-ecs.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ECS deployment failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ ECS API service deployed!" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Deployed Services:" -ForegroundColor Cyan
Write-Host "  ✅ Client (React App) → S3 + CloudFront" -ForegroundColor White
Write-Host "  ✅ Lambda Functions → AWS Lambda" -ForegroundColor White
Write-Host "  ✅ API Service → ECS/Fargate" -ForegroundColor White
Write-Host ""
Write-Host "New Keys Active:" -ForegroundColor Cyan
Write-Host "  ✅ Restricted Firebase API Key" -ForegroundColor White
Write-Host "  ✅ Rotated Stripe Keys (Public + Secret)" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Wait 2-5 minutes for CloudFront cache invalidation" -ForegroundColor White
Write-Host "  2. Test your site: https://www.starshippsychics.com" -ForegroundColor White
Write-Host "  3. Verify Firebase authentication works" -ForegroundColor White
Write-Host "  4. Test Stripe payment processing" -ForegroundColor White
Write-Host "  5. Clean Git history (remove exposed files)" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT: Run git history cleanup next!" -ForegroundColor Yellow
Write-Host "    See: CLEAN-GIT-HISTORY.ps1" -ForegroundColor Gray
Write-Host ""

# Return to root
Set-Location ..
