# FIX CONTACT FORM - Add SendGrid to ECS
Write-Host "FIXING CONTACT FORM NOW..." -ForegroundColor Yellow

# Get SendGrid key
$envContent = Get-Content ".env" -Raw
if ($envContent -match 'SENDGRID_API_KEY=([^\r\n]+)') {
    $sendgridKey = $matches[1].Trim()
    Write-Host "✓ Got SendGrid key" -ForegroundColor Green
} else {
    Write-Host "✗ SendGrid key not found in .env!" -ForegroundColor Red
    exit 1
}

# Get current task definition
Write-Host "Getting current ECS task definition..." -ForegroundColor Yellow
$taskDefJson = aws ecs describe-task-definition --task-definition psychic-chat-api-production --region us-east-1 | ConvertFrom-Json
$containerDef = $taskDefJson.taskDefinition.containerDefinitions[0]

# Add SendGrid to environment variables
$envVars = @($containerDef.environment)
$envVars += @{name="SENDGRID_API_KEY"; value=$sendgridKey}

# Create new task definition JSON
$newTaskDef = @{
    family = "psychic-chat-api-production"
    containerDefinitions = @(
        @{
            name = $containerDef.name
            image = $containerDef.image
            cpu = $containerDef.cpu
            memory = $containerDef.memory
            essential = $true
            portMappings = $containerDef.portMappings
            environment = $envVars
            logConfiguration = $containerDef.logConfiguration
        }
    )
    requiresCompatibilities = @("FARGATE")
    networkMode = "awsvpc"
    cpu = $taskDefJson.taskDefinition.cpu
    memory = $taskDefJson.taskDefinition.memory
    executionRoleArn = $taskDefJson.taskDefinition.executionRoleArn
    taskRoleArn = $taskDefJson.taskDefinition.taskRoleArn
}

$newTaskDefJson = $newTaskDef | ConvertTo-Json -Depth 10
$newTaskDefJson | Out-File -FilePath "new-task-def.json" -Encoding UTF8

Write-Host "✓ Created new task definition with SendGrid" -ForegroundColor Green

# Register new task definition
Write-Host "Registering new task definition..." -ForegroundColor Yellow
aws ecs register-task-definition --cli-input-json file://new-task-def.json --region us-east-1

Write-Host "✓ Registered new task definition" -ForegroundColor Green

# Update service to use new task definition
Write-Host "Updating ECS service..." -ForegroundColor Yellow
aws ecs update-service --cluster psychic-chat-production --service psychic-chat-api-production --force-new-deployment --region us-east-1

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ CONTACT FORM FIXED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "ECS is deploying with SendGrid key..." -ForegroundColor Cyan
Write-Host "Wait 2-3 minutes for deployment, then test:" -ForegroundColor Cyan
Write-Host "https://starshippsychics.com" -ForegroundColor Yellow
Write-Host ""
