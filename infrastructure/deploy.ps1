# AWS Lambda Deployment Script
# Automates SAM build and deploy process for psychic-chat Lambda functions
#
# Usage:
#   .\deploy.ps1 -Environment production
#   .\deploy.ps1 -Environment staging -Guided
#   .\deploy.ps1 -Environment production -DryRun

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('development', 'staging', 'production')]
    [string]$Environment,
    
    [switch]$Guided,
    [switch]$DryRun,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Info "=========================================="
Write-Info "  AWS Lambda Deployment Script"
Write-Info "=========================================="
Write-Info "Environment: $Environment"
Write-Info "Dry Run: $DryRun"
Write-Info "Guided: $Guided"
Write-Info ""

# Check prerequisites
Write-Info "Checking prerequisites..."

# Check AWS CLI
try {
    $awsVersion = aws --version 2>&1
    Write-Success "✓ AWS CLI installed: $awsVersion"
} catch {
    Write-Error "✗ AWS CLI not found. Please install from https://aws.amazon.com/cli/"
    exit 1
}

# Check SAM CLI
try {
    $samVersion = sam --version 2>&1
    Write-Success "✓ SAM CLI installed: $samVersion"
} catch {
    Write-Error "✗ SAM CLI not found. Please install from https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Success "✓ Node.js installed: $nodeVersion"
} catch {
    Write-Error "✗ Node.js not found. Please install Node.js 18 or higher"
    exit 1
}

Write-Info ""

# Validate AWS credentials
Write-Info "Validating AWS credentials..."
try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Success "✓ AWS credentials valid"
    Write-Info "  Account: $($identity.Account)"
    Write-Info "  User: $($identity.Arn)"
} catch {
    Write-Error "✗ AWS credentials not configured or invalid"
    Write-Error "  Run: aws configure"
    exit 1
}

Write-Info ""

# Set working directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Load configuration
$configFile = "samconfig-$Environment.toml"
if (!(Test-Path $configFile)) {
    Write-Warning "Configuration file not found: $configFile"
    Write-Info "Creating default configuration..."
    
    # Create default config
    $defaultConfig = @"
version = 0.1
[default.deploy.parameters]
stack_name = "psychic-chat-lambdas-$Environment"
s3_prefix = "psychic-chat-lambdas"
region = "us-east-1"
confirm_changeset = true
capabilities = "CAPABILITY_IAM"
parameter_overrides = "Environment=$Environment"
"@
    
    Set-Content -Path $configFile -Value $defaultConfig
    Write-Success "✓ Created default configuration: $configFile"
    Write-Warning "  Please review and update the configuration file with your specific values"
    Write-Warning "  Required parameters: VpcId, PrivateSubnetIds, DatabaseSecretArn, FirebaseSecretArn"
    Write-Info ""
}

# Install Lambda dependencies
if (!$SkipBuild) {
    Write-Info "Installing Lambda dependencies..."
    
    Set-Location "..\lambdas"
    
    if (!(Test-Path "node_modules")) {
        Write-Info "Running npm install..."
        npm install --production
        if ($LASTEXITCODE -ne 0) {
            Write-Error "✗ npm install failed"
            exit 1
        }
        Write-Success "✓ Dependencies installed"
    } else {
        Write-Info "Dependencies already installed"
    }
    
    Set-Location "..\infrastructure"
    Write-Info ""
}

# Build Lambda functions
if (!$SkipBuild) {
    Write-Info "Building Lambda functions with SAM..."
    
    sam build --template-file template.yaml
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "✗ SAM build failed"
        exit 1
    }
    
    Write-Success "✓ Lambda functions built successfully"
    Write-Info ""
} else {
    Write-Warning "Skipping build (--SkipBuild flag set)"
    Write-Info ""
}

# Deploy Lambda functions
if ($DryRun) {
    Write-Warning "DRY RUN MODE - No actual deployment will occur"
    Write-Info "Would execute:"
    Write-Info "  sam deploy --config-file $configFile --config-env default"
    if ($Guided) {
        Write-Info "  --guided flag would be included"
    }
    Write-Info ""
    Write-Success "Dry run completed successfully"
    exit 0
}

Write-Info "Deploying Lambda functions to AWS..."

if ($Guided) {
    Write-Info "Running in guided mode..."
    sam deploy --guided --config-file $configFile --config-env default
} else {
    sam deploy --config-file $configFile --config-env default
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "✗ SAM deploy failed"
    exit 1
}

Write-Success ""
Write-Success "=========================================="
Write-Success "  Deployment Completed Successfully!"
Write-Success "=========================================="
Write-Info ""
Write-Info "Next steps:"
Write-Info "1. Verify Lambda functions in AWS Console"
Write-Info "2. Check CloudWatch Logs for execution"
Write-Info "3. Monitor EventBridge schedules"
Write-Info ""

# Get stack outputs
Write-Info "Stack outputs:"
aws cloudformation describe-stacks --stack-name "psychic-chat-lambdas-$Environment" --query "Stacks[0].Outputs" --output table 2>$null

Write-Info ""
Write-Success "Deployment complete!"
