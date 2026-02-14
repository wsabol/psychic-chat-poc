#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy Lambda functions for scheduled jobs
.DESCRIPTION
    Builds and deploys all Lambda functions using AWS SAM
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Lambda Functions Deployment Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Change to infrastructure directory
Set-Location -Path "$PSScriptRoot\infrastructure"

# Build the Lambda functions
Write-Host "Building Lambda functions..." -ForegroundColor Yellow
sam build --template-file template.yaml

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Deploy the Lambda functions
Write-Host "Deploying Lambda functions to production..." -ForegroundColor Yellow
sam deploy --config-file samconfig-production.toml --no-confirm-changeset

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Lambda functions deployed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Checking Lambda function status..." -ForegroundColor Yellow
aws lambda list-functions --query "Functions[?contains(FunctionName, 'production')].{Name:FunctionName,Runtime:Runtime,LastModified:LastModified}" --output table

Write-Host ""
Write-Host "Checking EventBridge rules..." -ForegroundColor Yellow
aws events list-rules --query "Rules[?State=='ENABLED' && contains(Name, 'psychic')].{Name:Name,Schedule:ScheduleExpression,State:State}" --output table
