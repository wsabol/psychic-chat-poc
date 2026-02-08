# Deploy FormSubmit Contact Form Fix
# This script deploys the updated marketing website with FormSubmit integration

$BucketName = "www.starshippsychics.com"
$AWS = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DEPLOYING FORMSUBMIT FIX" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nUploading updated files to S3..." -ForegroundColor Yellow

# Change to the marketing-website directory
Set-Location $ScriptDir

# Upload the three main files that were updated
& $AWS s3 cp index.html "s3://$BucketName/" --content-type "text/html" --cache-control "no-cache"
& $AWS s3 cp styles.css "s3://$BucketName/" --content-type "text/css" --cache-control "no-cache"
& $AWS s3 cp script.js "s3://$BucketName/" --content-type "application/javascript" --cache-control "no-cache"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nChanges deployed:" -ForegroundColor Yellow
Write-Host "  ✓ FormSubmit integration added to both forms" -ForegroundColor Green
Write-Host "  ✓ New prominent contact form on home page" -ForegroundColor Green
Write-Host "  ✓ 'Get Notified' navigation link added" -ForegroundColor Green
Write-Host "  ✓ Removed mailto: links that opened email clients" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "IMPORTANT: FORMSUBMIT ACTIVATION REQUIRED" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nFormSubmit requires one-time email verification:" -ForegroundColor White
Write-Host "  1. Visit your website and submit a test form" -ForegroundColor White
Write-Host "  2. Check info@starshippsychics.com for activation email" -ForegroundColor White
Write-Host "  3. Click the activation link in that email" -ForegroundColor White
Write-Host "  4. After activation, all form submissions will be delivered" -ForegroundColor White

Write-Host "`nWebsite: https://www.starshippsychics.com" -ForegroundColor Cyan
