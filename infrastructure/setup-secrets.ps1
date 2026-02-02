# Setup AWS Secrets Manager Script
# Creates and configures required secrets for Lambda functions
#
# Usage:
#   .\setup-secrets.ps1 -Environment production
#   .\setup-secrets.ps1 -Environment staging -Region us-west-2

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('development', 'staging', 'production')]
    [string]$Environment,
    
    [string]$Region = "us-east-1",
    [switch]$UpdateExisting
)

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Info "=========================================="
Write-Info "  AWS Secrets Manager Setup"
Write-Info "=========================================="
Write-Info "Environment: $Environment"
Write-Info "Region: $Region"
Write-Info ""

# Check AWS CLI
try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Success "✓ AWS credentials valid (Account: $($identity.Account))"
} catch {
    Write-Error "✗ AWS credentials not configured"
    exit 1
}

Write-Info ""

# Load environment variables from .env file
$envFile = "..\lambdas\.env"
if (Test-Path $envFile) {
    Write-Info "Loading configuration from $envFile..."
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.+)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
    Write-Success "✓ Configuration loaded"
} else {
    Write-Warning "⚠ .env file not found at $envFile"
}

Write-Info ""

# Secret name prefix
$secretPrefix = "psychic-chat"
if ($Environment -ne "production") {
    $secretPrefix = "$secretPrefix-$Environment"
}

# Function to create or update secret
function Set-AWSSecret {
    param(
        [string]$Name,
        [string]$Value,
        [string]$Description
    )
    
    $fullName = "$secretPrefix/$Name"
    
    # Check if secret exists
    $exists = $false
    try {
        aws secretsmanager describe-secret --secret-id $fullName --region $Region 2>&1 | Out-Null
        $exists = $true
    } catch {}
    
    if ($exists) {
        if ($UpdateExisting) {
            Write-Info "Updating secret: $fullName"
            aws secretsmanager put-secret-value `
                --secret-id $fullName `
                --secret-string $Value `
                --region $Region
            Write-Success "✓ Secret updated: $fullName"
        } else {
            Write-Warning "⚠ Secret already exists: $fullName (use -UpdateExisting to update)"
        }
    } else {
        Write-Info "Creating secret: $fullName"
        aws secretsmanager create-secret `
            --name $fullName `
            --description $Description `
            --secret-string $Value `
            --region $Region
        Write-Success "✓ Secret created: $fullName"
    }
}

# 1. Database Secret
Write-Info "Setting up database secret..."
if ($env:DATABASE_URL) {
    # Parse DATABASE_URL
    if ($env:DATABASE_URL -match 'postgres://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
        $dbUser = $matches[1]
        $dbPassword = $matches[2]
        $dbHost = $matches[3]
        $dbPort = $matches[4]
        $dbName = $matches[5] -replace '\?.*$', ''
        
        $dbSecret = @{
            username = $dbUser
            password = $dbPassword
            host = $dbHost
            port = [int]$dbPort
            database = $dbName
        } | ConvertTo-Json -Compress
        
        Set-AWSSecret -Name "database" -Value $dbSecret -Description "RDS PostgreSQL database credentials for $Environment"
    } else {
        Write-Warning "⚠ Could not parse DATABASE_URL"
    }
} else {
    Write-Warning "⚠ DATABASE_URL not found in environment"
}

Write-Info ""

# 2. Firebase Secret
Write-Info "Setting up Firebase secret..."
if ($env:FIREBASE_SERVICE_ACCOUNT_KEY) {
    $firebaseSecret = @{
        serviceAccountKey = ($env:FIREBASE_SERVICE_ACCOUNT_KEY | ConvertFrom-Json)
    } | ConvertTo-Json -Compress -Depth 10
    
    Set-AWSSecret -Name "firebase" -Value $firebaseSecret -Description "Firebase service account key for $Environment"
} else {
    Write-Warning "⚠ FIREBASE_SERVICE_ACCOUNT_KEY not found in environment"
}

Write-Info ""

# 3. Encryption Key Secret
Write-Info "Setting up encryption key secret..."
if ($env:ENCRYPTION_KEY) {
    $encryptionSecret = @{
        key = $env:ENCRYPTION_KEY
    } | ConvertTo-Json -Compress
    
    Set-AWSSecret -Name "encryption" -Value $encryptionSecret -Description "Database encryption key for $Environment"
} else {
    Write-Warning "⚠ ENCRYPTION_KEY not found in environment"
}

Write-Info ""

# 4. Stripe Secret
Write-Info "Setting up Stripe secret..."
if ($env:STRIPE_SECRET_KEY) {
    $stripeSecret = @{
        secret_key = $env:STRIPE_SECRET_KEY
    } | ConvertTo-Json -Compress
    
    Set-AWSSecret -Name "stripe" -Value $stripeSecret -Description "Stripe API secret key for $Environment"
} else {
    Write-Warning "⚠ STRIPE_SECRET_KEY not found in environment"
}

Write-Info ""
Write-Success "=========================================="
Write-Success "  Secrets setup completed!"
Write-Success "=========================================="
Write-Info ""
Write-Info "Secret ARNs to use in samconfig-$Environment.toml:"
Write-Info ""

# Display ARNs
$accountId = (aws sts get-caller-identity --query Account --output text)
Write-Info "DatabaseSecretArn=arn:aws:secretsmanager:${Region}:${accountId}:secret:${secretPrefix}/database"
Write-Info "FirebaseSecretArn=arn:aws:secretsmanager:${Region}:${accountId}:secret:${secretPrefix}/firebase"
Write-Info ""
Write-Info "For encryption and Stripe, use dynamic references in parameter_overrides:"
Write-Info "EncryptionKey={{resolve:secretsmanager:${secretPrefix}/encryption:SecretString:key}}"
Write-Info "StripeSecretKey={{resolve:secretsmanager:${secretPrefix}/stripe:SecretString:secret_key}}"
Write-Info ""
