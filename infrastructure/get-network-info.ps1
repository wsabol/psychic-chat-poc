#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Get VPC and subnet information for ECS deployment

.DESCRIPTION
    Retrieves VPC, subnet IDs, and formats them correctly for samconfig-ecs-production.toml
#>

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Error { Write-Host "❌ $args" -ForegroundColor Red }

Write-Info "=== AWS Network Information for ECS ==="
Write-Info ""

# Check AWS credentials
try {
    $null = aws sts get-caller-identity 2>&1
} catch {
    Write-Error "AWS credentials not configured. Run 'aws configure'"
    exit 1
}

$region = aws configure get region
if (-not $region) {
    $region = "us-east-1"
}
Write-Info "Region: $region"
Write-Info ""

# List all VPCs
Write-Info "Available VPCs:"
Write-Info "─────────────────────────────────────────────────────────"
$vpcs = aws ec2 describe-vpcs `
    --query 'Vpcs[*].[VpcId,CidrBlock,Tags[?Key==`Name`].Value|[0],IsDefault]' `
    --output text

if ($vpcs) {
    $vpcs -split "`n" | ForEach-Object {
        $parts = $_ -split "`t"
        $vpcId = $parts[0]
        $cidr = $parts[1]
        $name = $parts[2]
        $isDefault = $parts[3]
        
        $displayName = if ($name) { $name } else { "(unnamed)" }
        $defaultTag = if ($isDefault -eq "True") { " [DEFAULT]" } else { "" }
        
        Write-Host "  $vpcId" -ForegroundColor Yellow -NoNewline
        Write-Host " - $displayName" -ForegroundColor Cyan -NoNewline
        Write-Host " ($cidr)$defaultTag" -ForegroundColor Gray
    }
} else {
    Write-Error "No VPCs found"
    exit 1
}

Write-Info ""
$vpcId = Read-Host "Enter VPC ID to use"

if (-not $vpcId) {
    Write-Error "No VPC ID provided"
    exit 1
}

Write-Info ""
Write-Info "Subnets in $vpcId"
Write-Info "─────────────────────────────────────────────────────────"

# Get all subnets for the VPC
$subnets = aws ec2 describe-subnets `
    --filters "Name=vpc-id,Values=$vpcId" `
    --query 'Subnets[*].[SubnetId,AvailabilityZone,CidrBlock,MapPublicIpOnLaunch,Tags[?Key==`Name`].Value|[0]]' `
    --output text

if (-not $subnets) {
    Write-Error "No subnets found in VPC $vpcId"
    exit 1
}

$publicSubnets = @()
$privateSubnets = @()

$subnets -split "`n" | ForEach-Object {
    $parts = $_ -split "`t"
    $subnetId = $parts[0]
    $az = $parts[1]
    $cidr = $parts[2]
    $isPublic = $parts[3] -eq "True"
    $name = $parts[4]
    
    $displayName = if ($name) { $name } else { "(unnamed)" }
    $type = if ($isPublic) { "PUBLIC " } else { "PRIVATE" }
    $color = if ($isPublic) { "Green" } else { "Blue" }
    
    Write-Host "  [$type]" -ForegroundColor $color -NoNewline
    Write-Host " $subnetId" -ForegroundColor Yellow -NoNewline
    Write-Host " - $displayName" -ForegroundColor Cyan -NoNewline
    Write-Host " ($az, $cidr)" -ForegroundColor Gray
    
    if ($isPublic) {
        $publicSubnets += $subnetId
    } else {
        $privateSubnets += $subnetId
    }
}

Write-Info ""
Write-Info "=== Configuration for samconfig-ecs-production.toml ==="
Write-Info "─────────────────────────────────────────────────────────"
Write-Info ""

Write-Host 'VpcId=' -NoNewline
Write-Host $vpcId -ForegroundColor Yellow

Write-Info ""

if ($publicSubnets.Count -ge 2) {
    $publicSubnetList = $publicSubnets[0..1] -join ","
    Write-Host 'PublicSubnetIds=' -NoNewline
    Write-Host $publicSubnetList -ForegroundColor Green
    Write-Success "Found $($publicSubnets.Count) public subnets (using first 2)"
} else {
    Write-Error "Need at least 2 public subnets for ALB (found $($publicSubnets.Count))"
    Write-Info "Public subnets have 'MapPublicIpOnLaunch' enabled"
}

Write-Info ""

if ($privateSubnets.Count -ge 2) {
    $privateSubnetList = $privateSubnets[0..1] -join ","
    Write-Host 'PrivateSubnetIds=' -NoNewline
    Write-Host $privateSubnetList -ForegroundColor Blue
    Write-Success "Found $($privateSubnets.Count) private subnets (using first 2)"
} else {
    Write-Error "Need at least 2 private subnets for ECS tasks (found $($privateSubnets.Count))"
    Write-Info ""
    Write-Info "If you don't have private subnets:"
    Write-Info "  1. You can use public subnets for both (less secure)"
    Write-Info "  2. Or create private subnets in the AWS Console"
    
    if ($publicSubnets.Count -ge 2) {
        Write-Info ""
        Write-Info "Using public subnets for private (not recommended for production):"
        Write-Host 'PrivateSubnetIds=' -NoNewline
        Write-Host ($publicSubnets[0..1] -join ",") -ForegroundColor Yellow
    }
}

Write-Info ""
Write-Info "─────────────────────────────────────────────────────────"
Write-Info "Copy the values above into infrastructure/samconfig-ecs-production.toml"
Write-Info "under parameter_overrides section"
