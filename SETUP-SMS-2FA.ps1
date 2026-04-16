# SETUP-SMS-2FA.ps1
# Activates SMS 2FA on the live ECS service.
#
# What this does:
#   1. Verifies the ECS task role has sns:Publish permission
#   2. Registers the updated task definition (api-task-def.json) that now
#      includes SMS_ORIGINATION_NUMBER=+14255554411 and AWS_REGION=us-east-1
#   3. Updates the ECS service to use the new task definition
#   4. Waits for the deployment to stabilise
#
# No Docker build required — this is a config-only change.
# Run DEPLOY-API.ps1 if you also need to deploy code changes.

$REGION       = "us-east-1"
$CLUSTER      = "psychic-chat-production"
$SERVICE      = "psychic-chat-api-production"
$TASK_FAMILY  = "psychic-chat-api-production"
$TASK_ROLE    = "arn:aws:iam::586337033065:role/psychic-chat-ecs-production-v2-EcsTaskRole-pgu6a9ANIiBw"
$ORIGINATION  = "+14255554411"

Write-Host ""
Write-Host "=== SMS 2FA ACTIVATION ===" -ForegroundColor Cyan
Write-Host "Origination number : $ORIGINATION" -ForegroundColor Cyan
Write-Host "Phone Number ID    : phone-f5a566c0fa9e4bf3be049f4caf00441c" -ForegroundColor Cyan
Write-Host "AWS Region         : $REGION" -ForegroundColor Cyan
Write-Host ""

# ─── Step 1: Verify IAM task role has sns:Publish ─────────────────────────────

Write-Host "[1/4] Checking ECS task role for SNS publish permission..." -ForegroundColor Yellow

$simulateResult = aws iam simulate-principal-policy `
    --policy-source-arn $TASK_ROLE `
    --action-names "sns:Publish" `
    --region $REGION `
    --query 'EvaluationResults[0].EvalDecision' `
    --output text 2>&1

if ($simulateResult -eq "allowed") {
    Write-Host "OK  sns:Publish is allowed on task role" -ForegroundColor Green
} elseif ($simulateResult -like "*allowed*") {
    Write-Host "OK  sns:Publish appears to be allowed" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "WARNING: sns:Publish may NOT be allowed on the task role." -ForegroundColor Yellow
    Write-Host "  Result: $simulateResult" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  To grant SNS permissions, attach the following inline policy to:" -ForegroundColor White
    Write-Host "  $TASK_ROLE" -ForegroundColor White
    Write-Host ""
    Write-Host '  {' -ForegroundColor Gray
    Write-Host '    "Version": "2012-10-17",' -ForegroundColor Gray
    Write-Host '    "Statement": [{' -ForegroundColor Gray
    Write-Host '      "Effect": "Allow",' -ForegroundColor Gray
    Write-Host '      "Action": ["sns:Publish"],' -ForegroundColor Gray
    Write-Host '      "Resource": "*"' -ForegroundColor Gray
    Write-Host '    }]' -ForegroundColor Gray
    Write-Host '  }' -ForegroundColor Gray
    Write-Host ""

    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "Aborted. Fix IAM permissions first, then re-run this script." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# ─── Step 2: Register updated task definition ──────────────────────────────────

Write-Host "[2/4] Registering updated task definition (api-task-def.json)..." -ForegroundColor Yellow
Write-Host "      Adding: SMS_ORIGINATION_NUMBER=$ORIGINATION" -ForegroundColor Gray
Write-Host "      Adding: AWS_REGION=$REGION" -ForegroundColor Gray
Write-Host ""

$taskDefArn = aws ecs register-task-definition `
    --cli-input-json file://api-task-def.json `
    --region $REGION `
    --query 'taskDefinition.taskDefinitionArn' `
    --output text

if ($LASTEXITCODE -ne 0 -or -not $taskDefArn) {
    Write-Host "X Task definition registration failed" -ForegroundColor Red
    exit 1
}

Write-Host "OK Task definition registered: $taskDefArn" -ForegroundColor Green
Write-Host ""

# ─── Step 3: Update the live ECS service ──────────────────────────────────────

Write-Host "[3/4] Updating ECS service to use new task definition..." -ForegroundColor Yellow

aws ecs update-service `
    --cluster $CLUSTER `
    --service $SERVICE `
    --task-definition $taskDefArn `
    --force-new-deployment `
    --region $REGION `
    --query 'service.[serviceName,status,desiredCount]' `
    --output table | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "X ECS service update failed" -ForegroundColor Red
    exit 1
}

Write-Host "OK ECS service update initiated" -ForegroundColor Green
Write-Host ""

# ─── Step 4: Wait for deployment to stabilise ─────────────────────────────────

Write-Host "[4/4] Waiting for deployment to stabilise (up to 5 minutes)..." -ForegroundColor Yellow

$maxAttempts = 30
$attempt     = 0
$stable      = $false

while ($attempt -lt $maxAttempts -and -not $stable) {
    Start-Sleep -Seconds 10
    $attempt++

    $svcInfo = aws ecs describe-services `
        --cluster $CLUSTER `
        --services $SERVICE `
        --region $REGION `
        --query 'services[0].[runningCount,desiredCount,deployments[0].status]' `
        --output text

    $parts   = $svcInfo -split "`t"
    $running = $parts[0]
    $desired = $parts[1]
    $status  = $parts[2]

    Write-Host "  [$attempt/$maxAttempts] Running: $running/$desired  Status: $status" -ForegroundColor Gray

    if ($running -eq $desired -and $status -eq "PRIMARY") {
        $stable = $true
    }
}

Write-Host ""

if ($stable) {
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host " SMS 2FA IS NOW LIVE" -ForegroundColor Green
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host " Origination number : $ORIGINATION" -ForegroundColor White
    Write-Host " All 2FA SMS codes will arrive from this number." -ForegroundColor White
    Write-Host ""
    Write-Host " Test it:" -ForegroundColor Cyan
    Write-Host "   1. Open the mobile app → Profile → Security" -ForegroundColor Cyan
    Write-Host "   2. Re-authenticate, then tap the 2FA tab" -ForegroundColor Cyan
    Write-Host "   3. Enable 2FA → choose SMS → enter your phone number" -ForegroundColor Cyan
    Write-Host "   4. You should receive a code from $ORIGINATION" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "WARNING: Service did not stabilise within expected time." -ForegroundColor Yellow
    Write-Host "Check the ECS console: https://console.aws.amazon.com/ecs/home?region=$REGION" -ForegroundColor Gray
}
