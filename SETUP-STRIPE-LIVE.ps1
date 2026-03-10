# ============================================================
# SETUP-STRIPE-LIVE.ps1
# Migrates the app from Stripe Test (sandbox) to Stripe Live.
#
# WHAT THIS SCRIPT DOES:
#   1. Updates STRIPE_SECRET_KEY in AWS Secrets Manager
#      (ECS reads it from there automatically - no Docker rebuild needed)
#   2. Adds STRIPE_WEBHOOK_SECRET to AWS Secrets Manager
#      and patches api-task-def.json so ECS injects it as an env var
#
# BEFORE RUNNING:
#   - Have your live Stripe keys ready from https://dashboard.stripe.com/apikeys
#   - Have your live webhook signing secret ready (see WEBHOOK SETUP below)
#
# WEBHOOK SETUP (do this first if you have not already):
#   1. Go to https://dashboard.stripe.com/webhooks
#      (In Stripe: left sidebar -> Developers -> Webhooks)
#   2. Click "Add endpoint"
#   3. Endpoint URL: https://api.starshippsychics.com/billing/stripe-webhook
#   4. Select events:
#        customer.subscription.created
#        customer.subscription.updated
#        customer.subscription.deleted
#        invoice.payment_succeeded
#        invoice.payment_failed
#        payment_method.detached
#   5. Click "Add endpoint"
#   6. On the endpoint detail page, click "Reveal" next to "Signing secret"
#      That is your whsec_... value - paste it when this script asks.
# ============================================================

Write-Host ""
Write-Host "=== STRIPE LIVE MODE SETUP ===" -ForegroundColor Cyan
Write-Host ""

$REGION = "us-east-1"
$STRIPE_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:586337033065:secret:psychic-chat/stripe-LvGISE"

# ── Step 1: Live secret key ─────────────────────────────────────────────────
$liveSecretKey = Read-Host "Enter your Stripe LIVE secret key (sk_live_...)"
if (-not $liveSecretKey.StartsWith("sk_live_")) {
    Write-Host "ERROR: Must start with sk_live_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[1/3] Updating STRIPE_SECRET_KEY in AWS Secrets Manager..." -ForegroundColor Yellow

$currentSecretRaw = aws secretsmanager get-secret-value `
    --secret-id $STRIPE_SECRET_ARN `
    --region $REGION `
    --query SecretString `
    --output text 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Could not read existing secret. Check your AWS credentials." -ForegroundColor Red
    Write-Host $currentSecretRaw
    exit 1
}

$secretObj = $currentSecretRaw | ConvertFrom-Json
$secretObj.secret_key = $liveSecretKey
$newSecretValue = $secretObj | ConvertTo-Json -Compress

aws secretsmanager put-secret-value `
    --secret-id $STRIPE_SECRET_ARN `
    --region $REGION `
    --secret-string $newSecretValue

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to update secret key" -ForegroundColor Red
    exit 1
}
Write-Host "OK  STRIPE_SECRET_KEY updated in Secrets Manager" -ForegroundColor Green

# ── Step 2: Live webhook secret ─────────────────────────────────────────────
Write-Host ""
Write-Host "[2/3] Storing STRIPE_WEBHOOK_SECRET in AWS Secrets Manager..." -ForegroundColor Yellow
Write-Host "(See the WEBHOOK SETUP comment at the top of this script if you" -ForegroundColor Gray
Write-Host " have not yet created a live webhook endpoint in Stripe)" -ForegroundColor Gray
Write-Host ""

$liveWebhookSecret = Read-Host "Enter your Stripe LIVE webhook signing secret (whsec_...)"

if (-not $liveWebhookSecret.StartsWith("whsec_")) {
    Write-Host "WARNING: Expected whsec_ prefix - continuing anyway" -ForegroundColor Yellow
}

$secretObj2 = $currentSecretRaw | ConvertFrom-Json
$secretObj2.secret_key = $liveSecretKey
$secretObj2 | Add-Member -NotePropertyName "webhook_secret" -NotePropertyValue $liveWebhookSecret -Force
$newSecretValue2 = $secretObj2 | ConvertTo-Json -Compress

aws secretsmanager put-secret-value `
    --secret-id $STRIPE_SECRET_ARN `
    --region $REGION `
    --secret-string $newSecretValue2

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to store webhook secret" -ForegroundColor Red
    exit 1
}
Write-Host "OK  Webhook secret stored in Secrets Manager" -ForegroundColor Green

# ── Step 3: Patch api-task-def.json to wire STRIPE_WEBHOOK_SECRET ──────────
Write-Host ""
Write-Host "[3/3] Checking api-task-def.json for STRIPE_WEBHOOK_SECRET reference..." -ForegroundColor Yellow

$taskDefPath = "$PSScriptRoot\api-task-def.json"
$taskDef = Get-Content $taskDefPath -Raw | ConvertFrom-Json

$alreadyHasWebhook = $taskDef.containerDefinitions[0].secrets |
    Where-Object { $_.name -eq "STRIPE_WEBHOOK_SECRET" }

if (-not $alreadyHasWebhook) {
    $webhookRef = [PSCustomObject]@{
        name      = "STRIPE_WEBHOOK_SECRET"
        valueFrom = "${STRIPE_SECRET_ARN}:webhook_secret::"
    }
    $taskDef.containerDefinitions[0].secrets += $webhookRef
    $taskDef | ConvertTo-Json -Depth 20 | Set-Content $taskDefPath -Encoding UTF8
    Write-Host "OK  STRIPE_WEBHOOK_SECRET added to api-task-def.json" -ForegroundColor Green
} else {
    Write-Host "OK  STRIPE_WEBHOOK_SECRET already present in task def" -ForegroundColor Green
}

# ── Done ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " SECRETS UPDATED - NOW REDEPLOY" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run these two commands to go live:" -ForegroundColor Yellow
Write-Host "  .\DEPLOY-API.ps1       <- picks up new sk_live_ + whsec_ from Secrets Manager"
Write-Host "  .\DEPLOY-CLIENT.ps1    <- rebuilds with pk_live_ key baked in"
Write-Host ""
Write-Host "IMPORTANT: Stripe Price IDs are different between test and live mode." -ForegroundColor Cyan
Write-Host "Re-create your subscription products/prices in the live Stripe dashboard" -ForegroundColor Cyan
Write-Host "and update any price IDs stored in your database." -ForegroundColor Cyan
Write-Host ""
Write-Host "DONE" -ForegroundColor Green
