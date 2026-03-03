$BUILD = "c:\Projects\psychic-chat-poc\client\build"
$BUCKET = "app.starshippsychics.com"
$CF_ID = "EI3I0LQC8J618"
$REGION = "us-east-1"

Write-Host "Syncing HTML (no-cache)..." -ForegroundColor Yellow
aws s3 sync $BUILD s3://$BUCKET/ --delete --region $REGION --exclude "*" --include "*.html" --content-type "text/html" --cache-control "no-cache, no-store, must-revalidate"

Write-Host "Syncing JSON (no-cache)..." -ForegroundColor Yellow
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.json" --content-type "application/json" --cache-control "no-cache, no-store, must-revalidate"

Write-Host "Syncing CSS..." -ForegroundColor Yellow
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.css" --content-type "text/css" --cache-control "public, max-age=31536000, immutable"

Write-Host "Syncing JS..." -ForegroundColor Yellow
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.js" --content-type "application/javascript" --cache-control "public, max-age=31536000, immutable"

Write-Host "Syncing images..." -ForegroundColor Yellow
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.png" --content-type "image/png" --cache-control "public, max-age=31536000, immutable"
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.jpg" --content-type "image/jpeg" --cache-control "public, max-age=31536000, immutable"
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.jpeg" --content-type "image/jpeg" --cache-control "public, max-age=31536000, immutable"
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.svg" --content-type "image/svg+xml" --cache-control "public, max-age=31536000, immutable"
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*" --include "*.ico" --content-type "image/x-icon" --cache-control "public, max-age=31536000, immutable"

Write-Host "Syncing remaining files..." -ForegroundColor Yellow
aws s3 sync $BUILD s3://$BUCKET/ --region $REGION --exclude "*.html" --exclude "*.json" --exclude "*.css" --exclude "*.js" --exclude "*.png" --exclude "*.jpg" --exclude "*.jpeg" --exclude "*.svg" --exclude "*.ico"

Write-Host ""
Write-Host "Invalidating CloudFront cache..." -ForegroundColor Yellow
$result = aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*" --query "Invalidation.Id" --output text
Write-Host "CloudFront invalidation created: $result" -ForegroundColor Green
Write-Host ""
Write-Host "CLIENT DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "Live at: https://app.starshippsychics.com" -ForegroundColor Cyan
Write-Host "(Cache clear may take 2-3 minutes to propagate)" -ForegroundColor Gray
