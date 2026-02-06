# Simple Lambda Deployment Script
Write-Host "Deploying Contact Form Lambda..." -ForegroundColor Cyan

# Read SendGrid key from parent .env
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$envContent = Get-Content "$scriptPath\..\.env"
$sendgridLine = $envContent | Where-Object { $_ -match "^SENDGRID_API_KEY=" }
$sendgridKey = $sendgridLine -replace "SENDGRID_API_KEY=", ""

if ([string]::IsNullOrWhiteSpace($sendgridKey)) {
    Write-Host "ERROR: SENDGRID_API_KEY not found in lambdas/.env" -ForegroundColor Red
    exit 1
}

Write-Host "Found SendGrid API Key" -ForegroundColor Green

# Deploy
sam deploy `
    --template-file template.yaml `
    --stack-name starship-contact-form `
    --capabilities CAPABILITY_IAM `
    --parameter-overrides "SendGridApiKey=$sendgridKey" `
    --region us-east-1 `
    --resolve-s3 `
    --no-confirm-changeset `
    --no-fail-on-empty-changeset

# Get the Lambda Function URL
Write-Host ""
Write-Host "Getting Lambda Function URL..." -ForegroundColor Yellow
$apiUrl = aws cloudformation describe-stacks --stack-name starship-contact-form --region us-east-1 --query "Stacks[0].Outputs[?OutputKey=='ContactFormUrl'].OutputValue" --output text

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Lambda URL: $apiUrl" -ForegroundColor Cyan
Write-Host ""
