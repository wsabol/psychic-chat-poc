# ADD-APPLE-SECRET.ps1
#
# Stores the Apple IAP App-Specific Shared Secret in AWS Secrets Manager and
# registers it as an environment variable in the ECS task definition so the
# API container can read it as process.env.APPLE_SHARED_SECRET at runtime.
#
# Prerequisites
#   - AWS CLI configured with credentials that can write Secrets Manager + ECS
#   - jq installed (https://jqlang.github.io/jq/)  — or remove the jq usage
#     below and inspect the JSON manually
#
# How to get the shared secret:
#   App Store Connect → Your App → General → App Information →
#   Scroll to "App-Specific Shared Secret" → click "Manage"
#   Click "Generate" (first time) or copy the existing 32-char hex string.
#
# Usage:
#   .\ADD-APPLE-SECRET.ps1 -AppleSharedSecret "your32charhexstring"
#
# After this script completes, redeploy the API (DEPLOY-API.ps1) so the new
# task definition revision is picked up by the ECS service.

param(
    [Parameter(Mandatory=$true)]
    [string]$AppleSharedSecret,

    [string]$Region    = "us-east-1",
    [string]$AccountId = "586337033065"
)

$ErrorActionPreference = "Stop"

function Write-Success { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Info    { param($msg) Write-Host "  $msg" -ForegroundColor Cyan  }
function Write-Warn    { param($msg) Write-Host "⚠ $msg" -ForegroundColor Yellow }

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Add Apple IAP Shared Secret → AWS + ECS"      -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Validate input ──────────────────────────────────────────────────────

if ($AppleSharedSecret.Length -lt 16) {
    Write-Host "✗ AppleSharedSecret looks too short — expected a 32-char hex string from App Store Connect." -ForegroundColor Red
    exit 1
}
Write-Success "Secret value provided (length: $($AppleSharedSecret.Length))"

# ── 2. Store in Secrets Manager ────────────────────────────────────────────

$SecretName  = "psychic-chat/apple-iap"
$SecretValue = (@{ shared_secret = $AppleSharedSecret } | ConvertTo-Json -Compress)

Write-Info "Checking for existing Secrets Manager secret: $SecretName"

$existingSecret = $null
try {
    $existingSecret = aws secretsmanager describe-secret `
        --secret-id $SecretName `
        --region $Region `
        --output json 2>$null | ConvertFrom-Json
} catch { }

if ($existingSecret) {
    Write-Info "Secret already exists — updating value..."
    aws secretsmanager put-secret-value `
        --secret-id $SecretName `
        --secret-string $SecretValue `
        --region $Region | Out-Null
    Write-Success "Secrets Manager secret updated: $SecretName"
} else {
    Write-Info "Creating new secret..."
    aws secretsmanager create-secret `
        --name $SecretName `
        --description "Apple App Store IAP app-specific shared secret" `
        --secret-string $SecretValue `
        --region $Region | Out-Null
    Write-Success "Secrets Manager secret created: $SecretName"
}

# Retrieve the ARN (suffix varies by AWS-generated random chars)
$secretArn = (aws secretsmanager describe-secret `
    --secret-id $SecretName `
    --region $Region `
    --query "ARN" `
    --output text)
Write-Info "Secret ARN: $secretArn"

# ── 3. Build a new ECS task definition with APPLE_SHARED_SECRET ────────────

Write-Host ""
Write-Info "Fetching current task definition..."

$currentTaskDefRaw = aws ecs describe-task-definition `
    --task-definition psychic-chat-api-production `
    --region $Region `
    --output json | ConvertFrom-Json

$containerDef = $currentTaskDefRaw.taskDefinition.containerDefinitions[0]

# Check if already present
$alreadyHasSecret = $containerDef.secrets | Where-Object { $_.name -eq "APPLE_SHARED_SECRET" }
if ($alreadyHasSecret) {
    Write-Warn "APPLE_SHARED_SECRET already in task definition secrets — updating ARN..."
    $containerDef.secrets = $containerDef.secrets | Where-Object { $_.name -ne "APPLE_SHARED_SECRET" }
}

# Append the new secret reference  (ECS reads shared_secret key from the JSON blob)
$newSecretEntry = [PSCustomObject]@{
    name      = "APPLE_SHARED_SECRET"
    valueFrom = "${secretArn}:shared_secret::"
}
$containerDef.secrets = @($containerDef.secrets) + $newSecretEntry

Write-Success "APPLE_SHARED_SECRET secret reference added to container definition"

# ── 4. Register the new task definition revision ────────────────────────────

Write-Host ""
Write-Info "Registering new task definition revision..."

$taskDef = $currentTaskDefRaw.taskDefinition

# Build registration payload (only the fields ECS accepts on register)
$registerPayload = @{
    family                  = $taskDef.family
    taskRoleArn             = $taskDef.taskRoleArn
    executionRoleArn        = $taskDef.executionRoleArn
    networkMode             = $taskDef.networkMode
    containerDefinitions    = @($containerDef)
    volumes                 = @()
    requiresCompatibilities = @("FARGATE")
    cpu                     = $taskDef.cpu
    memory                  = $taskDef.memory
} | ConvertTo-Json -Depth 20 -Compress

$tempFile = [System.IO.Path]::GetTempFileName() + ".json"
$registerPayload | Out-File -FilePath $tempFile -Encoding utf8

$newRevisionRaw = aws ecs register-task-definition `
    --cli-input-json "file://$tempFile" `
    --region $Region `
    --output json | ConvertFrom-Json

Remove-Item $tempFile -Force

$newRevision = $newRevisionRaw.taskDefinition.revision
$newArn      = $newRevisionRaw.taskDefinition.taskDefinitionArn
Write-Success "New task definition registered: revision $newRevision"
Write-Info "ARN: $newArn"

# ── 5. Update the ECS service to use the new revision ──────────────────────

Write-Host ""
Write-Info "Updating ECS service to use new task definition revision..."

aws ecs update-service `
    --cluster psychic-chat-production `
    --service psychic-chat-api-production `
    --task-definition "psychic-chat-api-production:$newRevision" `
    --region $Region `
    --force-new-deployment | Out-Null

Write-Success "ECS service update triggered (revision $newRevision)"

# ── 6. IAM: ensure the execution role can read the new secret ──────────────

Write-Host ""
Write-Info "Granting ECS execution role access to the new secret..."
Write-Host ""
Write-Host "  Run the following if the deployment fails with a permissions error:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  aws iam put-role-policy ``" -ForegroundColor White
Write-Host "    --role-name psychic-chat-ecs-production-EcsTaskExecutionRole-1B5ZvTkrRJhy ``" -ForegroundColor White
Write-Host "    --policy-name AllowAppleIapSecret ``" -ForegroundColor White
Write-Host "    --policy-document '{""Version"":""2012-10-17"",""Statement"":[{""Effect"":""Allow"",""Action"":[""secretsmanager:GetSecretValue""],""Resource"":""$secretArn""}]}'" -ForegroundColor White
Write-Host ""

# ── Done ──────────────────────────────────────────────────────────────────

Write-Host "================================================" -ForegroundColor Green
Write-Host "  Done!  APPLE_SHARED_SECRET is now live."       -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Watch ECS deploy:  aws ecs wait services-stable --cluster psychic-chat-production --services psychic-chat-api-production --region $Region"
Write-Host "  2. Verify the var:    curl https://api.starshippsychics.com/health"
Write-Host "  3. If IAM error appears in ECS events, run the 'put-role-policy' command shown above."
Write-Host ""
