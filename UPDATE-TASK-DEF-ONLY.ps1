# Update ECS Task Definition Only (No Docker Build Required)
# Use this when you only need to update environment variables

Write-Host "=== UPDATING TASK DEFINITION (NO DOCKER BUILD) ===" -ForegroundColor Cyan
Write-Host ""

$REGION = "us-east-1"
$CLUSTER = "psychic-chat-production"
$SERVICE = "psychic-chat-api-production"

# Step 1: Register new task definition
Write-Host "[1/2] Registering updated task definition..." -ForegroundColor Yellow
$taskDefArn = aws ecs register-task-definition --cli-input-json file://api-task-def.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text

if ($LASTEXITCODE -ne 0) {
    Write-Host "X Task definition registration failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK Task definition registered: $taskDefArn" -ForegroundColor Green
Write-Host ""

# Step 2: Update service with new task definition
Write-Host "[2/2] Updating ECS service..." -ForegroundColor Yellow
aws ecs update-service --cluster $CLUSTER --service $SERVICE --task-definition $taskDefArn --force-new-deployment --region $REGION --query 'service.[serviceName,status,desiredCount]' --output table

if ($LASTEXITCODE -ne 0) {
    Write-Host "X Service update failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK Service update initiated" -ForegroundColor Green
Write-Host ""

Write-Host "Deployment started successfully!" -ForegroundColor Green
Write-Host "The service will restart with the new environment variables in 2-3 minutes." -ForegroundColor Cyan
Write-Host ""
Write-Host "You can monitor the deployment in the AWS ECS console:" -ForegroundColor Gray
Write-Host "https://console.aws.amazon.com/ecs/v2/clusters/$CLUSTER/services/$SERVICE" -ForegroundColor Gray
Write-Host ""
