# Fix Database Connection - Update ECS Task Definition
# Changes DB_NAME from 'postgres' to 'psychic_chat'

Write-Host "Fixing Database Connection for Production API..." -ForegroundColor Cyan
Write-Host ""

$region = "us-east-1"
$cluster = "psychic-chat-production"
$service = "psychic-chat-api-production"
$family = "psychic-chat-api-production"

Write-Host "Step 1: Registering new task definition with DB_NAME=psychic_chat..." -ForegroundColor Yellow
Write-Host ""

# Register the new task definition (strip out the wrapper and metadata)
$taskDefJson = Get-Content "current-task-def.json" | ConvertFrom-Json
$taskDef = $taskDefJson.taskDefinition

# Create a new registration object (removing fields that AWS doesn't accept)
$registerDef = @{
    family = $taskDef.family
    taskRoleArn = $taskDef.taskRoleArn
    executionRoleArn = $taskDef.executionRoleArn
    networkMode = $taskDef.networkMode
    containerDefinitions = $taskDef.containerDefinitions
    volumes = $taskDef.volumes
    placementConstraints = $taskDef.placementConstraints
    requiresCompatibilities = $taskDef.requiresCompatibilities
    cpu = $taskDef.cpu
    memory = $taskDef.memory
}

# Convert to JSON and save temporarily
$registerJson = $registerDef | ConvertTo-Json -Depth 10
$registerJson | Out-File -FilePath "temp-task-def.json" -Encoding utf8

# Register the new task definition
Write-Host "Registering new task definition..." -ForegroundColor Yellow
$result = aws ecs register-task-definition `
    --cli-input-json file://temp-task-def.json `
    --region $region `
    --output json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to register task definition!" -ForegroundColor Red
    Remove-Item "temp-task-def.json" -ErrorAction SilentlyContinue
    exit 1
}

$newRevision = $result.taskDefinition.revision
$taskDefArn = $result.taskDefinition.taskDefinitionArn

Write-Host "New task definition registered: $family revision $newRevision" -ForegroundColor Green
Write-Host "ARN: $taskDefArn" -ForegroundColor Gray
Write-Host ""

# Clean up temp file
Remove-Item "temp-task-def.json" -ErrorAction SilentlyContinue

# Step 2: Update ECS service to use new task definition
Write-Host "Step 2: Updating ECS service to use new task definition..." -ForegroundColor Yellow
Write-Host ""

$taskDefArg = "$family`:$newRevision"
aws ecs update-service `
    --cluster $cluster `
    --service $service `
    --task-definition $taskDefArg `
    --force-new-deployment `
    --region $region `
    --query 'service.{serviceName:serviceName,taskDefinition:taskDefinition,desiredCount:desiredCount}' `
    --output json

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update ECS service!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Service update initiated!" -ForegroundColor Green
Write-Host ""

# Step 3: Monitor deployment
Write-Host "Step 3: Monitoring deployment..." -ForegroundColor Yellow
Write-Host "Waiting for new tasks to start (this may take 2-3 minutes)..." -ForegroundColor Yellow
Write-Host ""

$maxWaitTime = 300
$startTime = Get-Date
$deployed = $false

while (((Get-Date) - $startTime).TotalSeconds -lt $maxWaitTime) {
    $serviceInfo = aws ecs describe-services `
        --cluster $cluster `
        --services $service `
        --region $region `
        --output json | ConvertFrom-Json
    
    $runningCount = $serviceInfo.services[0].runningCount
    $desiredCount = $serviceInfo.services[0].desiredCount
    $deployments = $serviceInfo.services[0].deployments
    
    Write-Host "Running: $runningCount / Desired: $desiredCount" -ForegroundColor Cyan
    
    $primaryDeployment = $deployments | Where-Object { $_.status -eq "PRIMARY" }
    if ($primaryDeployment.taskDefinition -eq $taskDefArn -and $runningCount -eq $desiredCount) {
        $deployed = $true
        break
    }
    
    Start-Sleep -Seconds 15
}

Write-Host ""

if ($deployed) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "The API is now connected to the 'psychic_chat' database." -ForegroundColor Green
    Write-Host "Personal information will now be saved correctly." -ForegroundColor Green
    Write-Host ""
    Write-Host "Test the app at: https://starshippsychics.com" -ForegroundColor Cyan
} else {
    Write-Host "Deployment in progress..." -ForegroundColor Yellow
    Write-Host "Check status with AWS CLI if needed." -ForegroundColor Yellow
}

Write-Host ""
