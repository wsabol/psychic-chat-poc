# Simple Lambda Deploy
$envContent = Get-Content "..\.env"
$sendgridLine = $envContent | Where-Object { $_ -match "^SENDGRID_API_KEY=" }
$sendgridKey = $sendgridLine -replace "SENDGRID_API_KEY=", ""

Write-Host "Creating Lambda function..." -ForegroundColor Yellow
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

Write-Host "Creating Function URL..." -ForegroundColor Yellow
aws lambda create-function-url-config `
    --function-name starship-contact-form `
    --auth-type NONE `
    --cors "AllowOrigins=*,AllowMethods=POST,AllowHeaders=Content-Type" `
    --region us-east-1

Write-Host ""
Write-Host "Getting Function URL..." -ForegroundColor Yellow
$url = aws lambda get-function-url-config --function-name starship-contact-form --region us-east-1 --query "FunctionUrl" --output text

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SUCCESS!" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Lambda Function URL:" -ForegroundColor Cyan
Write-Host $url -ForegroundColor Yellow
Write-Host ""
