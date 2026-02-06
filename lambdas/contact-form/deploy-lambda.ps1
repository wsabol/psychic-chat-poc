# Deploy Contact Form Lambda
Write-Host "📧 Deploying Contact Form Lambda..." -ForegroundColor Cyan
Write-Host ""

# Get SendGrid API Key
$sendgridKey = Read-Host "Enter your SendGrid API Key - press Enter to use from environment"
if ([string]::IsNullOrWhiteSpace($sendgridKey)) {
    $sendgridKey = $env:SENDGRID_API_KEY
    if ([string]::IsNullOrWhiteSpace($sendgridKey)) {
        Write-Host "❌ SendGrid API Key is required!" -ForegroundColor Red
        Write-Host "Either provide it when prompted or set SENDGRID_API_KEY environment variable" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ SendGrid API Key found" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Step 1: Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Deploy with SAM
Write-Host "Step 2: Deploying Lambda with SAM..." -ForegroundColor Yellow
Write-Host ""

sam deploy `
    --template-file template.yaml `
    --stack-name starship-contact-form `
    --capabilities CAPABILITY_IAM `
    --parameter-overrides SendGridApiKey=$sendgridKey `
    --region us-east-1 `
    --no-confirm-changeset `
    --no-fail-on-empty-changeset

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Lambda deployed successfully!" -ForegroundColor Green
Write-Host ""

# Get the API endpoint
Write-Host "Step 3: Getting API endpoint..." -ForegroundColor Yellow
$apiUrl = aws cloudformation describe-stacks `
    --stack-name starship-contact-form `
    --region us-east-1 `
    --query "Stacks[0].Outputs[?OutputKey=='ContactFormApi'].OutputValue" `
    --output text

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "API Endpoint:" -ForegroundColor Yellow
Write-Host $apiUrl -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update marketing-website/script.js to use this URL" -ForegroundColor White
Write-Host "2. Redeploy the marketing website" -ForegroundColor White
Write-Host "3. Test the contact form" -ForegroundColor White
Write-Host ""
Write-Host "📝 Copy this URL - you'll need it!" -ForegroundColor Yellow
Write-Host ""
