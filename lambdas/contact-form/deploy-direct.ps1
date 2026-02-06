# Direct Lambda Deployment (No SAM)
Write-Host "🚀 Deploying Contact Form Lambda directly..." -ForegroundColor Cyan
Write-Host ""

# Get SendGrid key
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$envContent = Get-Content "$scriptPath\..\.env"
$sendgridLine = $envContent | Where-Object { $_ -match "^SENDGRID_API_KEY=" }
$sendgridKey = $sendgridLine -replace "SENDGRID_API_KEY=", ""

if ([string]::IsNullOrWhiteSpace($sendgridKey)) {
    Write-Host "❌ SENDGRID_API_KEY not found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found SendGrid API Key" -ForegroundColor Green

# Create deployment package
Write-Host ""
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
if (Test-Path function.zip) { Remove-Item function.zip }
Compress-Archive -Path index.js,package.json,node_modules -DestinationPath function.zip -Force
Write-Host "✅ Package created" -ForegroundColor Green

# Create IAM role if it doesn't exist
Write-Host ""
Write-Host "🔐 Setting up IAM role..." -ForegroundColor Yellow
$roleExists = aws iam get-role --role-name ContactFormLambdaRole 2>&1
if ($LASTEXITCODE -ne 0) {
    $trustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
"@
    $trustPolicy | Out-File -FilePath trust-policy.json -Encoding utf8
    aws iam create-role --role-name ContactFormLambdaRole --assume-role-policy-document file://trust-policy.json
    aws iam attach-role-policy --role-name ContactFormLambdaRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    Remove-Item trust-policy.json
    Write-Host "✅ Role created" -ForegroundColor Green
    Write-Host "⏳ Waiting 10 seconds for role to propagate..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
} else {
    Write-Host "✅ Role already exists" -ForegroundColor Green
}

# Create or update Lambda function
Write-Host ""
Write-Host "⚡ Deploying Lambda function..." -ForegroundColor Yellow
$functionExists = aws lambda get-function --function-name starship-contact-form 2>&1
if ($LASTEXITCODE -ne 0) {
    # Create new function
    aws lambda create-function `
        --function-name starship-contact-form `
        --runtime nodejs20.x `
        --role arn:aws:iam::586337033065:role/ContactFormLambdaRole `
        --handler index.handler `
        --zip-file fileb://function.zip `
        --timeout 30 `
        --memory-size 256 `
        --environment "Variables={SENDGRID_API_KEY=$sendgridKey}" `
        --region us-east-1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Function created" -ForegroundColor Green
    } else {
        Write-Host "❌ Function creation failed" -ForegroundColor Red
        exit 1
    }
} else {
    # Update existing function
    aws lambda update-function-code `
        --function-name starship-contact-form `
        --zip-file fileb://function.zip `
        --region us-east-1
    
    aws lambda update-function-configuration `
        --function-name starship-contact-form `
        --environment "Variables={SENDGRID_API_KEY=$sendgridKey}" `
        --region us-east-1
    
    Write-Host "✅ Function updated" -ForegroundColor Green
}

# Create Function URL if doesn't exist
Write-Host ""
Write-Host "🔗 Setting up Function URL..." -ForegroundColor Yellow
$urlConfig = aws lambda get-function-url-config --function-name starship-contact-form --region us-east-1 2>&1
if ($LASTEXITCODE -ne 0) {
    aws lambda create-function-url-config `
        --function-name starship-contact-form `
        --auth-type NONE `
        --cors "AllowOrigins=https://starshippsychics.com,https://www.starshippsychics.com,http://www.starshippsychics.com.s3-website-us-east-1.amazonaws.com,AllowMethods=POST,AllowHeaders=Content-Type" `
        --region us-east-1
    Write-Host "✅ Function URL created" -ForegroundColor Green
} else {
    Write-Host "✅ Function URL already exists" -ForegroundColor Green
}

# Get the Function URL
Write-Host ""
Write-Host "📍 Getting Function URL..." -ForegroundColor Yellow
$functionUrl = aws lambda get-function-url-config --function-name starship-contact-form --region us-east-1 --query "FunctionUrl" --output text

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Lambda Function URL:" -ForegroundColor Yellow
Write-Host $functionUrl -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: Update marketing-website/script.js with this URL" -ForegroundColor Yellow
Write-Host ""

# Cleanup
Remove-Item function.zip -ErrorAction SilentlyContinue
