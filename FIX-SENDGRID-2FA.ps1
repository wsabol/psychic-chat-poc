# Fix SendGrid 2FA Email Configuration
# Adds missing SendGrid secrets to ECS task definition

Write-Host "🔧 Fixing SendGrid 2FA Email Configuration..." -ForegroundColor Cyan
Write-Host "=" * 70

# Step 1: Check if SendGrid secret exists in AWS Secrets Manager
Write-Host "`n📋 Step 1: Checking SendGrid Secret in AWS Secrets Manager..." -ForegroundColor Yellow

$sendgridSecretExists = aws secretsmanager describe-secret --secret-id "psychic-chat/sendgrid" --region us-east-1 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ SendGrid secret not found in AWS Secrets Manager!" -ForegroundColor Red
    Write-Host "`nCreating SendGrid secret..." -ForegroundColor Yellow
    
    # Prompt for SendGrid credentials
    Write-Host "`nPlease provide your SendGrid credentials:" -ForegroundColor Cyan
    $apiKey = Read-Host "Enter your SendGrid API Key (starts with SG.)"
    $fromEmail = Read-Host "Enter your verified sender email (e.g., noreply@starshippsychics.com)"
    
    if ([string]::IsNullOrWhiteSpace($apiKey) -or [string]::IsNullOrWhiteSpace($fromEmail)) {
        Write-Host "❌ API Key and From Email are required!" -ForegroundColor Red
        exit 1
    }
    
    # Create the secret
    $secretValue = @{
        api_key = $apiKey
        from_email = $fromEmail
    } | ConvertTo-Json
    
    aws secretsmanager create-secret `
        --name "psychic-chat/sendgrid" `
        --description "SendGrid API credentials for email sending" `
        --secret-string $secretValue `
        --region us-east-1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SendGrid secret created successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create SendGrid secret!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ SendGrid secret already exists" -ForegroundColor Green
}

# Step 2: Get the SendGrid secret ARN
Write-Host "`n📋 Step 2: Getting SendGrid Secret ARN..." -ForegroundColor Yellow

$sendgridSecretArn = aws secretsmanager describe-secret `
    --secret-id "psychic-chat/sendgrid" `
    --region us-east-1 `
    --query 'ARN' `
    --output text

if ([string]::IsNullOrWhiteSpace($sendgridSecretArn)) {
    Write-Host "❌ Failed to get SendGrid secret ARN!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ SendGrid Secret ARN: $sendgridSecretArn" -ForegroundColor Green

# Step 3: Update IAM policy to allow access to SendGrid secret
Write-Host "`n📋 Step 3: Updating IAM Task Execution Role Policy..." -ForegroundColor Yellow

$taskExecutionRoleArn = "arn:aws:iam::586337033065:role/psychic-chat-ecs-production-v2-EcsTaskExecutionRole-7ib3xm0mIvu1"
$roleName = $taskExecutionRoleArn.Split("/")[-1]

# Check if policy already has SendGrid access
$existingPolicy = aws iam get-role-policy `
    --role-name $roleName `
    --policy-name "SecretsManagerAccess" `
    --region us-east-1 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SecretsManagerAccess policy exists, updating..." -ForegroundColor Green
} else {
    Write-Host "Creating new SecretsManagerAccess policy..." -ForegroundColor Yellow
}

# Create/Update the policy with SendGrid secret access
$policyDocument = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret"
            ],
            "Resource": [
                "arn:aws:secretsmanager:us-east-1:586337033065:secret:psychic-chat/database-*",
                "arn:aws:secretsmanager:us-east-1:586337033065:secret:psychic-chat/encryption-*",
                "arn:aws:secretsmanager:us-east-1:586337033065:secret:psychic-chat/firebase-*",
                "arn:aws:secretsmanager:us-east-1:586337033065:secret:psychic-chat/stripe-*",
                "arn:aws:secretsmanager:us-east-1:586337033065:secret:psychic-chat/openai-*",
                "arn:aws:secretsmanager:us-east-1:586337033065:secret:psychic-chat/sendgrid-*"
            ]
        }
    ]
}
"@

$policyDocument | Out-File -FilePath "sendgrid-iam-policy-temp.json" -Encoding utf8

aws iam put-role-policy `
    --role-name $roleName `
    --policy-name "SecretsManagerAccess" `
    --policy-document file://sendgrid-iam-policy-temp.json `
    --region us-east-1

Remove-Item "sendgrid-iam-policy-temp.json" -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ IAM policy updated successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to update IAM policy!" -ForegroundColor Red
    exit 1
}

# Step 4: Update ECS task definition with SendGrid secrets
Write-Host "`n📋 Step 4: Updating ECS Task Definition..." -ForegroundColor Yellow

# Read current task definition
$taskDefJson = Get-Content "api-task-def.json" -Raw | ConvertFrom-Json

# Add SendGrid secrets to the secrets array
$sendgridApiKeySecret = @{
    name = "SENDGRID_API_KEY"
    valueFrom = "$sendgridSecretArn:api_key::"
}

$sendgridFromEmailSecret = @{
    name = "SENDGRID_FROM_EMAIL"
    valueFrom = "$sendgridSecretArn:from_email::"
}

# Check if secrets already exist
$existingApiKey = $taskDefJson.containerDefinitions[0].secrets | Where-Object { $_.name -eq "SENDGRID_API_KEY" }
$existingFromEmail = $taskDefJson.containerDefinitions[0].secrets | Where-Object { $_.name -eq "SENDGRID_FROM_EMAIL" }

if (-not $existingApiKey) {
    $taskDefJson.containerDefinitions[0].secrets += $sendgridApiKeySecret
    Write-Host "✅ Added SENDGRID_API_KEY secret" -ForegroundColor Green
} else {
    Write-Host "⚠️  SENDGRID_API_KEY secret already exists" -ForegroundColor Yellow
}

if (-not $existingFromEmail) {
    $taskDefJson.containerDefinitions[0].secrets += $sendgridFromEmailSecret
    Write-Host "✅ Added SENDGRID_FROM_EMAIL secret" -ForegroundColor Green
} else {
    Write-Host "⚠️  SENDGRID_FROM_EMAIL secret already exists" -ForegroundColor Yellow
}

# Save updated task definition
$taskDefJson | ConvertTo-Json -Depth 10 | Set-Content "api-task-def-sendgrid-fixed.json"

Write-Host "`n✅ Updated task definition saved to: api-task-def-sendgrid-fixed.json" -ForegroundColor Green

# Step 5: Register new task definition
Write-Host "`n📋 Step 5: Registering New Task Definition..." -ForegroundColor Yellow

aws ecs register-task-definition `
    --cli-input-json file://api-task-def-sendgrid-fixed.json `
    --region us-east-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ New task definition registered!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to register task definition!" -ForegroundColor Red
    exit 1
}

# Step 6: Update ECS service
Write-Host "`n📋 Step 6: Updating ECS Service..." -ForegroundColor Yellow

$serviceName = "psychic-chat-api-production-service"
$clusterName = "psychic-chat-ecs-production-v2"

aws ecs update-service `
    --cluster $clusterName `
    --service $serviceName `
    --task-definition psychic-chat-api-production `
    --force-new-deployment `
    --region us-east-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ECS service update initiated!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to update ECS service!" -ForegroundColor Red
    exit 1
}

# Step 7: Monitor deployment
Write-Host "`n📋 Step 7: Monitoring Deployment..." -ForegroundColor Yellow
Write-Host "Waiting for service to stabilize (this may take 3-5 minutes)..." -ForegroundColor Cyan

aws ecs wait services-stable `
    --cluster $clusterName `
    --services $serviceName `
    --region us-east-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Service is now stable!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Service stabilization timeout - check AWS Console for status" -ForegroundColor Yellow
}

# Summary
Write-Host "`n" + "=" * 70
Write-Host "✅ SendGrid 2FA Configuration Complete!" -ForegroundColor Green
Write-Host "=" * 70

Write-Host "`n📝 Summary:" -ForegroundColor Cyan
Write-Host "  ✓ SendGrid secret configured in Secrets Manager"
Write-Host "  ✓ IAM policy updated with SendGrid access"
Write-Host "  ✓ ECS task definition updated with SendGrid secrets"
Write-Host "  ✓ Service deployed with new configuration"

Write-Host "`n🧪 To test 2FA emails:" -ForegroundColor Cyan
Write-Host "  1. Go to https://starshippsychics.com"
Write-Host "  2. Sign in with an account that has 2FA enabled"
Write-Host "  3. Check your email for the 6-digit verification code"

Write-Host "`n📊 To view logs:" -ForegroundColor Cyan
Write-Host "  aws logs tail /ecs/psychic-chat-api-production --follow"

Write-Host "`n✅ 2FA emails should now be working!" -ForegroundColor Green
