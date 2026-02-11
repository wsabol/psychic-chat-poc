# Check Production Environment Variables
# This script checks if all required environment variables are set in ECS

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Checking Production Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$TASK_DEF_NAME = "psychic-chat-api-task"
$REGION = "us-east-1"

Write-Host "Fetching ECS task definition..." -ForegroundColor Yellow

try {
    $taskDef = aws ecs describe-task-definition --task-definition $TASK_DEF_NAME --region $REGION | ConvertFrom-Json
    
    $envVars = $taskDef.taskDefinition.containerDefinitions[0].environment
    $secrets = $taskDef.taskDefinition.containerDefinitions[0].secrets
    
    Write-Host ""
    Write-Host "Environment Variables:" -ForegroundColor White
    Write-Host "----------------------" -ForegroundColor White
    
    $requiredVars = @(
        "NODE_ENV",
        "PORT",
        "CORS_ORIGIN",
        "REACT_APP_API_URL"
    )
    
    $requiredSecrets = @(
        "DATABASE_URL",
        "ENCRYPTION_KEY",
        "FIREBASE_SERVICE_ACCOUNT",
        "OPENAI_API_KEY",
        "STRIPE_SECRET_KEY"
    )
    
    foreach ($var in $requiredVars) {
        $found = $envVars | Where-Object { $_.name -eq $var }
        if ($found) {
            Write-Host "  ✓ $var = $($found.value)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $var = NOT SET" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Secrets (from AWS Secrets Manager):" -ForegroundColor White
    Write-Host "------------------------------------" -ForegroundColor White
    
    foreach ($secret in $requiredSecrets) {
        $found = $secrets | Where-Object { $_.name -eq $secret }
        if ($found) {
            Write-Host "  ✓ $secret = [from $($found.valueFrom)]" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $secret = NOT SET" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Check if ENCRYPTION_KEY is actually set
    $encKeyFound = $secrets | Where-Object { $_.name -eq "ENCRYPTION_KEY" }
    if (-not $encKeyFound) {
        Write-Host ""
        Write-Host "⚠️  CRITICAL ISSUE FOUND!" -ForegroundColor Red
        Write-Host "ENCRYPTION_KEY is not set in production!" -ForegroundColor Red
        Write-Host ""
        Write-Host "This will cause:" -ForegroundColor Yellow
        Write-Host "  • Database writes to fail (encryption not possible)" -ForegroundColor Yellow
        Write-Host "  • Free trial sessions not created" -ForegroundColor Yellow
        Write-Host "  • user_personal_info records not saved" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To fix this, run:" -ForegroundColor White
        Write-Host "  .\infrastructure\setup-secrets.ps1" -ForegroundColor Cyan
        Write-Host ""
    }
    
} catch {
    Write-Host "✗ Error fetching task definition: $_" -ForegroundColor Red
    exit 1
}
