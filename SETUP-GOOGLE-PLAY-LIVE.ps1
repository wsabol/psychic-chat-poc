# ============================================================
# SETUP-GOOGLE-PLAY-LIVE.ps1
#
# What this does:
#   1. Creates the "psychic-chat/google-play" secret in AWS
#      Secrets Manager containing:
#        service_account_json  - Google Play Developer API key
#        pubsub_token          - security token for the RTDN webhook
#   2. Wires GOOGLE_PLAY_SERVICE_ACCOUNT_JSON and
#      GOOGLE_PLAY_PUBSUB_TOKEN into api-task-def.json
#   3. Also wires APPLE_SHARED_SECRET into api-task-def.json
#      (the "apple-iap" secret already exists in AWS but is not
#       yet referenced by the ECS task -- without this, the
#       /billing/validate-receipt/apple endpoint throws on every
#       purchase because APPLE_SHARED_SECRET is undefined)
#   4. Applies the updated IAM policy to the ECS execution role so
#      ECS can read the new secrets from Secrets Manager at startup.
#
# ─── BEFORE RUNNING ───────────────────────────────────────────────────────────
#
# ── Step 1: Create a service account in Google Cloud Console ──────────────────
#   URL: https://console.cloud.google.com/iam-admin/serviceaccounts
#
#   a) Select the GCP project linked to your Play Console account.
#      (Not sure which project? Check Play Console Settings ->
#       Developer account -> Linked services -- it shows the linked project.)
#   b) Click "Create Service Account"
#   c) Name: e.g. "play-billing-api"  (any name is fine)
#   d) Click "Continue" to skip "Grant this service account access to project"
#   e) Click "Done" to skip "Grant users access"
#   f) Click on the new service account -> "Keys" tab
#      -> "Add Key" -> "Create new key" -> JSON -> Create
#   g) A .json key file downloads automatically. Keep it -- you will
#      paste its contents into this script.
#
# ── Step 2: Grant the service account access to Play Console ──────────────────
#
#   The current Play Console UI (2024/2025) does NOT have a "Setup" menu.
#   The Settings page shows:
#     Personal -> Email notifications
#     Developer account -> General | App transfers | Benchmarking |
#                          Email lists | Game projects | Linked services
#     Monetization -> Alternative billing | License testing | ...
#
#   Path: Play Console (account home) -> Settings ->
#         Developer account -> Linked services
#
#   On the Linked services page:
#   a) Look for a "Google APIs" card or a "Google Cloud project" section.
#      Click "Link" or "View" next to it.
#   b) If prompted to choose a GCP project, select the same project used
#      in Step 1, then click "Link".
#   c) Once linked, a "Service accounts" section appears. Your new service
#      account should be listed.
#      Click "Grant access" next to it.
#   d) Check these two permissions:
#        - "View financial data, orders and cancellation survey responses"
#        - "Manage orders and subscriptions"
#   e) Click "Invite user" or "Save" (label varies -- it means Apply).
#   f) Wait 10-15 minutes for permissions to propagate.
#
#   If you do not see a GCP / service accounts option on Linked services:
#   Try the direct URL -- find your numeric developer ID in the Play Console
#   URL bar when you are on the account home page (it looks like a long
#   number, e.g. 1234567890123456789), then go to:
#     https://play.google.com/console/u/0/developers/YOUR_DEVELOPER_ID/api-access
#
# ── Step 3: Enable the Google Play Android Developer API in GCP ───────────────
#   URL: https://console.cloud.google.com/apis/library
#   Search "Google Play Android Developer API" -> click it -> Enable
#   (If it shows "Manage" it is already enabled.)
#
# ─── AFTER RUNNING ────────────────────────────────────────────────────────────
#   1. Run .\DEPLOY-API.ps1   (picks up the new secrets, redeploys ECS)
#   2. Set up the Pub/Sub RTDN push subscription (the script prints the
#      exact gcloud commands to run after it finishes).
# ============================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$REGION  = "us-east-1"
$ACCOUNT = "586337033065"

Write-Host ""
Write-Host "=== GOOGLE PLAY PRODUCTION BILLING SETUP ===" -ForegroundColor Cyan
Write-Host ""

# ─── Verify AWS credentials ───────────────────────────────────────────────────
$caller = aws sts get-caller-identity --query Account --output text 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: AWS CLI not configured." -ForegroundColor Red
    Write-Host "Run:  aws configure" -ForegroundColor Yellow
    exit 1
}
Write-Host "AWS account verified: $caller" -ForegroundColor Green
Write-Host ""

# ─── Step 1: Collect the service account JSON ─────────────────────────────────
Write-Host "[1/3] Google Play Service Account JSON" -ForegroundColor Yellow
Write-Host "  Paste the FULL content of the downloaded .json key file," -ForegroundColor Gray
Write-Host "  then press Enter twice to finish:" -ForegroundColor Gray
Write-Host ""

$lines = @()
$blanks = 0
while ($blanks -lt 2) {
    $line = Read-Host
    if ([string]::IsNullOrEmpty($line)) { $blanks++ } else { $blanks = 0; $lines += $line }
}
$serviceAccountJson = ($lines -join "`n").Trim()

if ([string]::IsNullOrWhiteSpace($serviceAccountJson)) {
    Write-Host "ERROR: No JSON provided. Exiting." -ForegroundColor Red
    exit 1
}

# Basic validation
try { $null = $serviceAccountJson | ConvertFrom-Json } catch {
    Write-Host "ERROR: Text does not parse as JSON. Re-run and paste the complete file." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Service account JSON looks valid." -ForegroundColor Green
Write-Host ""

# ─── Step 2: Generate a Pub/Sub token ─────────────────────────────────────────
Write-Host "[2/3] Generating secure Pub/Sub token..." -ForegroundColor Yellow
$tokenBytes = New-Object Byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($tokenBytes)
# URL-safe base64 without padding
$pubSubToken = [System.Convert]::ToBase64String($tokenBytes).Replace('+','-').Replace('/','_').TrimEnd('=')
Write-Host "  Generated:  $pubSubToken" -ForegroundColor Cyan
Write-Host "  (Also stored in Secrets Manager -- no need to save separately.)" -ForegroundColor Gray
Write-Host ""

# ─── Step 3: Create / update the secret in Secrets Manager ────────────────────
Write-Host "[3/3] Storing secret in AWS Secrets Manager..." -ForegroundColor Yellow

$secretName  = "psychic-chat/google-play"
$secretValue = @{
    service_account_json = $serviceAccountJson
    pubsub_token         = $pubSubToken
} | ConvertTo-Json -Compress

# Check if secret already exists
$existingArn = aws secretsmanager describe-secret `
    --secret-id $secretName `
    --region $REGION `
    --query 'ARN' `
    --output text 2>&1

if ($LASTEXITCODE -eq 0 -and $existingArn -match "arn:aws") {
    aws secretsmanager put-secret-value `
        --secret-id $secretName `
        --region $REGION `
        --secret-string $secretValue | Out-Null
    $googlePlayArn = $existingArn.Trim()
    Write-Host "  [OK] Updated existing secret '$secretName'" -ForegroundColor Green
} else {
    $createResult = aws secretsmanager create-secret `
        --name $secretName `
        --description "Google Play billing service account and RTDN Pub/Sub token" `
        --region $REGION `
        --secret-string $secretValue `
        --query 'ARN' `
        --output text 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR creating secret:" -ForegroundColor Red
        Write-Host $createResult
        exit 1
    }
    $googlePlayArn = $createResult.Trim()
    Write-Host "  [OK] Created new secret '$secretName'" -ForegroundColor Green
}
Write-Host "  ARN: $googlePlayArn" -ForegroundColor DarkGray
Write-Host ""

# ─── Step 4: Resolve the apple-iap ARN ───────────────────────────────────────
Write-Host "Resolving existing apple-iap secret ARN..." -ForegroundColor Yellow
$appleArn = aws secretsmanager describe-secret `
    --secret-id "apple-iap" `
    --region $REGION `
    --query 'ARN' `
    --output text 2>&1

if ($LASTEXITCODE -ne 0 -or $appleArn -notmatch "arn:aws") {
    Write-Host "  WARNING: Could not find 'apple-iap' secret in Secrets Manager." -ForegroundColor Yellow
    Write-Host "           APPLE_SHARED_SECRET will NOT be wired into the task definition." -ForegroundColor Yellow
    $appleArn = $null
} else {
    $appleArn = $appleArn.Trim()
    Write-Host "  [OK] Found apple-iap: $appleArn" -ForegroundColor Green
}
Write-Host ""

# ─── Step 5: Patch api-task-def.json ─────────────────────────────────────────
Write-Host "Patching api-task-def.json..." -ForegroundColor Yellow

$taskDefPath = Join-Path $PSScriptRoot "api-task-def.json"
if (-not (Test-Path $taskDefPath)) {
    Write-Host "ERROR: api-task-def.json not found at $taskDefPath" -ForegroundColor Red
    exit 1
}

$taskDef = Get-Content $taskDefPath -Raw | ConvertFrom-Json
$secrets  = $taskDef.containerDefinitions[0].secrets

function Has-Secret([string]$Name) {
    return ($secrets | Where-Object { $_.name -eq $Name }).Count -gt 0
}

function Add-Secret([string]$Name, [string]$Arn, [string]$Field) {
    if (-not (Has-Secret $Name)) {
        $ref = [PSCustomObject]@{ name = $Name; valueFrom = "${Arn}:${Field}::" }
        $script:taskDef.containerDefinitions[0].secrets += $ref
        Write-Host "  [OK] Added $Name" -ForegroundColor Green
    } else {
        Write-Host "  [--] $Name already present -- skipping" -ForegroundColor DarkGray
    }
}

# Google Play secrets
Add-Secret "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON" $googlePlayArn "service_account_json"
Add-Secret "GOOGLE_PLAY_PUBSUB_TOKEN"         $googlePlayArn "pubsub_token"

# Apple IAP secret (already in AWS, just not in the task def)
if ($appleArn) {
    $appleSecretPreview = aws secretsmanager get-secret-value `
        --secret-id "apple-iap" `
        --region $REGION `
        --query 'SecretString' `
        --output text 2>&1

    $appleField = "shared_secret"
    try {
        $parsed = $appleSecretPreview | ConvertFrom-Json
        if ($parsed.PSObject.Properties.Name -contains "shared_secret") {
            $appleField = "shared_secret"
        } elseif ($parsed.PSObject.Properties.Name -contains "secret") {
            $appleField = "secret"
        } else {
            $fields = $parsed.PSObject.Properties.Name -join ", "
            Write-Host "  NOTE: apple-iap has fields: $fields -- using first field" -ForegroundColor Yellow
            $appleField = $parsed.PSObject.Properties.Name[0]
        }
    } catch {
        # Plain string secret -- reference the whole thing (empty field)
        $appleField = ""
    }

    if ($appleField -eq "") {
        if (-not (Has-Secret "APPLE_SHARED_SECRET")) {
            $ref = [PSCustomObject]@{ name = "APPLE_SHARED_SECRET"; valueFrom = "${appleArn}::" }
            $script:taskDef.containerDefinitions[0].secrets += $ref
            Write-Host "  [OK] Added APPLE_SHARED_SECRET (plain string secret)" -ForegroundColor Green
        } else {
            Write-Host "  [--] APPLE_SHARED_SECRET already present -- skipping" -ForegroundColor DarkGray
        }
    } else {
        Add-Secret "APPLE_SHARED_SECRET" $appleArn $appleField
    }
}

$taskDef | ConvertTo-Json -Depth 20 | Set-Content $taskDefPath -Encoding UTF8
Write-Host "  [OK] api-task-def.json saved" -ForegroundColor Green
Write-Host ""

# ─── Step 6: Apply the updated IAM policy to the ECS execution role ───────────
# The execution role needs GetSecretValue permission for the new secrets.
# add-secrets-policy.json now includes psychic-chat/google-play* and apple-iap*.
Write-Host "Updating ECS execution-role IAM policy..." -ForegroundColor Yellow

$executionRoleArn  = $taskDef.executionRoleArn
$executionRoleName = $executionRoleArn -replace '^arn:aws:iam::[^:]+:role/', ''
$policyDocPath     = Join-Path $PSScriptRoot "add-secrets-policy.json"

if (-not (Test-Path $policyDocPath)) {
    Write-Host "  WARNING: add-secrets-policy.json not found -- skipping IAM update." -ForegroundColor Yellow
    Write-Host "           ECS will be denied reading the new secrets until this is applied." -ForegroundColor Yellow
} else {
    aws iam put-role-policy `
        --role-name   $executionRoleName `
        --policy-name "PsychicChatAdditionalSecretsAccess" `
        --policy-document "file://$policyDocPath" `
        --region $REGION 2>&1 | Out-Null

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Could not apply IAM policy to '$executionRoleName'." -ForegroundColor Red
        Write-Host "  Run manually:" -ForegroundColor Yellow
        Write-Host "    aws iam put-role-policy --role-name $executionRoleName --policy-name PsychicChatAdditionalSecretsAccess --policy-document file://add-secrets-policy.json" -ForegroundColor White
    } else {
        Write-Host "  [OK] IAM policy applied to $executionRoleName" -ForegroundColor Green
    }
}
Write-Host ""

# ─── Done ─────────────────────────────────────────────────────────────────────
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " COMPLETE THESE STEPS NEXT:" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Redeploy the API:" -ForegroundColor Yellow
Write-Host "     .\DEPLOY-API.ps1" -ForegroundColor White
Write-Host ""

Write-Host "2. Set up Google Play RTDN (Real-Time Developer Notifications):" -ForegroundColor Yellow
Write-Host "   This tells the backend immediately when a subscription renews or cancels." -ForegroundColor Gray
Write-Host ""
$rtdnUrl = "https://api.starshippsychics.com/billing/google-play-rtdn?token=$pubSubToken"
Write-Host "   a) Create the Pub/Sub topic (replace YOUR_PROJECT_ID):" -ForegroundColor White
Write-Host "        gcloud pubsub topics create play-billing-rtdn --project=YOUR_PROJECT_ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "   b) Create the push subscription:" -ForegroundColor White
Write-Host "        gcloud pubsub subscriptions create play-billing-rtdn-push \" -ForegroundColor Cyan
Write-Host "          --topic=play-billing-rtdn \" -ForegroundColor Cyan
Write-Host "          --project=YOUR_PROJECT_ID \" -ForegroundColor Cyan
Write-Host "          --push-endpoint=`"$rtdnUrl`" \" -ForegroundColor Cyan
Write-Host "          --ack-deadline=60" -ForegroundColor Cyan
Write-Host ""
Write-Host "   c) Play Console (inside the app) -> Monetize -> Monetization setup" -ForegroundColor White
Write-Host "      -> Real-time developer notifications -> enter topic name:" -ForegroundColor White
Write-Host "        projects/YOUR_PROJECT_ID/topics/play-billing-rtdn" -ForegroundColor Cyan
Write-Host "      -> Send test notification (should get 200 OK from the API)" -ForegroundColor White
Write-Host ""

Write-Host "3. About the '$0.00 / This is a test' billing sheet:" -ForegroundColor Yellow
Write-Host "   This appears for any Google account in Play Console -> Settings ->" -ForegroundColor Gray
Write-Host "   Monetization -> License testing. It is Google's design for testing." -ForegroundColor Gray
Write-Host "   Real users who are NOT license testers will pay the real price." -ForegroundColor Gray
Write-Host "   This is NOT a bug and will not affect production customers." -ForegroundColor Gray
Write-Host ""
Write-Host "DONE" -ForegroundColor Green
