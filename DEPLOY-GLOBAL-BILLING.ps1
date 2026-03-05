# ============================================================
# DEPLOY-GLOBAL-BILLING.ps1
#
# Full deployment for the Phase 6.0 global multi-currency billing feature.
#
# Order of operations:
#   1. Verify AWS credentials
#   2. Start SSH tunnel to production RDS (localhost:5433)
#   3. Run DB migration  → adds country_code + subscription_currency columns
#   4. Close SSH tunnel
#   5. Build & deploy API Docker image to ECR / ECS
#   6. Dry-run the Stripe price currency-options script
#   7. (Optional) Apply currency options to all Stripe prices
#
# Prerequisites:
#   - Docker running
#   - AWS CLI configured (aws configure)
#   - SSH key at C:\Users\stars\.ssh\psychic-chat-bastion-key.pem
#   - api/.env present with DATABASE_URL / DB credentials + STRIPE_SECRET_KEY
# ============================================================

$ErrorActionPreference = "Stop"

$REGION    = "us-east-1"
$CLUSTER   = "psychic-chat-production"
$SERVICE   = "psychic-chat-api-production"
$REPO      = "586337033065.dkr.ecr.us-east-1.amazonaws.com/psychic-chat-api-production"
$TASK_FAMILY = "psychic-chat-api-production"
$SSH_KEY   = "C:\Users\stars\.ssh\psychic-chat-bastion-key.pem"
$BASTION   = "ec2-user@3.238.36.97"
$RDS_HOST  = "psychic-db.cw1a2ak00w4x.us-east-1.rds.amazonaws.com"
$TUNNEL_PORT = 5433

function Write-Step { param($n, $total, $msg)
    Write-Host ""
    Write-Host "[$n/$total] $msg" -ForegroundColor Cyan
}
function Write-OK   { param($msg) Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "    FAIL $msg" -ForegroundColor Red; exit 1 }
function Write-Info { param($msg) Write-Host "    -->  $msg" -ForegroundColor Gray }

# ─── Banner ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  DEPLOY — Phase 6.0 Global Multi-Currency Billing"      -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will:" -ForegroundColor White
Write-Host "  1. Verify AWS credentials"
Write-Host "  2. Open SSH tunnel → run DB migration → close tunnel"
Write-Host "  3. Build + push API Docker image to ECR"
Write-Host "  4. Update ECS service (force new deployment)"
Write-Host "  5. Run Stripe price currency-options dry-run"
Write-Host "  6. (Optional) Apply currency options to Stripe prices"
Write-Host ""

$confirm = Read-Host "Proceed? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Aborted." -ForegroundColor Yellow
    exit 0
}

# ─── Step 1: AWS credentials ──────────────────────────────────────────────────
Write-Step 1 6 "Verifying AWS credentials…"
$awsIdentity = aws sts get-caller-identity --output json 2>&1
if ($LASTEXITCODE -ne 0) { Write-Fail "AWS credentials not configured. Run 'aws configure' first." }
$awsJson = $awsIdentity | ConvertFrom-Json
Write-OK "Account: $($awsJson.Account)   User: $($awsJson.Arn)"

# ─── Step 2: DB migration via SSH tunnel ─────────────────────────────────────
Write-Step 2 6 "Running DB migration (via SSH tunnel to production RDS)…"
Write-Info "Starting SSH tunnel: localhost:$TUNNEL_PORT → $RDS_HOST`:5432"

# Start tunnel as a background job so we can kill it after the migration
$tunnelJob = Start-Job -ScriptBlock {
    param($key, $port, $rds, $bastion)
    & ssh -i $key -L "${port}:${rds}:5432" -N -o StrictHostKeyChecking=no -o ServerAliveInterval=30 $bastion 2>&1
} -ArgumentList $SSH_KEY, $TUNNEL_PORT, $RDS_HOST, $BASTION

Write-Info "Waiting for tunnel to be ready…"
$tunnelReady = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 2
    $tcpConn = Test-NetConnection -ComputerName localhost -Port $TUNNEL_PORT -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($tcpConn) { $tunnelReady = $true; break }
    Write-Info "  Still waiting… ($($i*2)s)"
}

if (-not $tunnelReady) {
    Stop-Job $tunnelJob | Out-Null
    Remove-Job $tunnelJob | Out-Null
    Write-Fail "Could not establish SSH tunnel. Check bastion host ($BASTION) and key ($SSH_KEY)."
}

Write-OK "SSH tunnel established on port $TUNNEL_PORT"

# Run the migration
Write-Info "Running: node api/migrations/add-global-billing-fields.js"
$migrationOutput = node api/migrations/add-global-billing-fields.js 2>&1
Write-Host $migrationOutput

if ($LASTEXITCODE -ne 0) {
    Stop-Job $tunnelJob | Out-Null
    Remove-Job $tunnelJob | Out-Null
    Write-Fail "DB migration failed. See output above."
}
Write-OK "DB migration applied successfully"

# Close tunnel
Stop-Job $tunnelJob | Out-Null
Remove-Job $tunnelJob | Out-Null
Write-Info "SSH tunnel closed"

# ─── Step 3: Build Docker image ───────────────────────────────────────────────
Write-Step 3 6 "Building API Docker image…"
docker build -t $SERVICE ./api
if ($LASTEXITCODE -ne 0) { Write-Fail "Docker build failed." }
Write-OK "Docker image built"

# ─── Step 3b: Push to ECR ─────────────────────────────────────────────────────
Write-Info "Logging into ECR…"
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REPO
docker tag "${SERVICE}:latest" "${REPO}:latest"
docker push "${REPO}:latest"
if ($LASTEXITCODE -ne 0) { Write-Fail "ECR push failed." }
Write-OK "Image pushed to ECR: $REPO:latest"

# ─── Step 4: Register task definition + update ECS ───────────────────────────
Write-Step 4 6 "Deploying to ECS…"
$taskDefArn = aws ecs register-task-definition `
    --cli-input-json file://api-task-def.json `
    --region $REGION `
    --query 'taskDefinition.taskDefinitionArn' `
    --output text

if ($LASTEXITCODE -ne 0) { Write-Fail "Task definition registration failed." }
Write-OK "Task definition registered: $taskDefArn"

aws ecs update-service `
    --cluster $CLUSTER `
    --service $SERVICE `
    --task-definition $taskDefArn `
    --force-new-deployment `
    --region $REGION `
    --output table `
    --query 'service.[serviceName,status,desiredCount]' | Out-Host

if ($LASTEXITCODE -ne 0) { Write-Fail "ECS service update failed." }
Write-OK "ECS service update initiated"

# Monitor rollout
Write-Info "Waiting for ECS service to stabilize (up to 5 min)…"
$stable = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 10
    $svcStatus = aws ecs describe-services `
        --cluster $CLUSTER --services $SERVICE `
        --region $REGION `
        --query 'services[0].[runningCount,desiredCount,deployments[0].status]' `
        --output text
    $parts   = $svcStatus -split "\s+"
    $running = $parts[0]; $desired = $parts[1]; $status = $parts[2]
    Write-Info "  attempt $($i+1)/30 — running $running/$desired  status $status"
    if ($running -eq $desired -and $status -eq "PRIMARY") { $stable = $true; break }
}

if ($stable) {
    Write-OK "ECS deployment stable — API is live at https://api.starshippsychics.com"
} else {
    Write-Host "    WARN  ECS did not stabilize within 5 min — check the console." -ForegroundColor Yellow
}

# ─── Step 5/6: Stripe currency options ───────────────────────────────────────
Write-Step 5 6 "Running Stripe price currency-options script (DRY RUN)…"
Write-Info "This previews what amounts would be set for each active Stripe price."
Write-Host ""
node api/scripts/add-currency-options-to-prices.js --dry-run
Write-Host ""

Write-Step 6 6 "(Optional) Apply currency options to Stripe prices"
Write-Host ""
Write-Host "  The dry run above shows what will be updated." -ForegroundColor White
Write-Host "  This adds local-currency pricing to your existing Stripe prices." -ForegroundColor White
Write-Host "  IMPORTANT: Review the multipliers in:" -ForegroundColor Yellow
Write-Host "    api/services/stripe/price/priceConfig.js  (CURRENCY_PRICE_MULTIPLIERS)" -ForegroundColor Gray
Write-Host ""
$applyStripe = Read-Host "Apply currency options to Stripe now? (y/N)"
if ($applyStripe -eq 'y' -or $applyStripe -eq 'Y') {
    Write-Info "Applying…"
    node api/scripts/add-currency-options-to-prices.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    WARN  Stripe script reported errors — check output above." -ForegroundColor Yellow
    } else {
        Write-OK "Stripe prices updated with currency options"
    }
} else {
    Write-Host "    Skipped. Run manually later:" -ForegroundColor Yellow
    Write-Host "      node api/scripts/add-currency-options-to-prices.js" -ForegroundColor Gray
}

# ─── Summary ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE"                                    -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "What was deployed:" -ForegroundColor Cyan
Write-Host "  DB    country_code + subscription_currency columns added"
Write-Host "  API   New build live on ECS — https://api.starshippsychics.com"
Write-Host ""
Write-Host "New API endpoints:" -ForegroundColor Cyan
Write-Host "  GET  /billing/locale?country=BR  → returns currency + payment methods"
Write-Host "  POST /billing/setup-intent        → now accepts { country } for local PM"
Write-Host "  POST /billing/create-subscription → now accepts { country, currency }"
Write-Host "  POST /billing/save-billing-address → now stores country_code in DB"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Enable Stripe Tax in Dashboard → Settings → Tax"
Write-Host "  2. Add tax registrations per country (EU VAT, AU GST, etc.)"
Write-Host "  3. Update frontend to call GET /billing/locale before payment UI"
Write-Host "  4. Monitor logs:"
Write-Host "     aws logs tail /ecs/psychic-chat-api-production --follow --region us-east-1"
Write-Host ""
