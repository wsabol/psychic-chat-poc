# ECS Deployment Troubleshooting Guide

## ✅ Fixes Applied

### 1. **Removed Container Health Check from Task Definition**
- **Problem**: Alpine image lacks `curl` by default
- **Solution**: Removed CMD-SHELL health check from task definition
- **Result**: ECS now relies solely on ALB target group health checks

### 2. **Increased Health Check Grace Period**
- **Changed**: 60 seconds → 180 seconds
- **Reason**: App needs time to:
  - Load secrets from Secrets Manager (10-30s)
  - Connect to PostgreSQL database (5-15s)
  - Connect to Redis (0-10s)
  - Initialize schedulers and pub/sub (5-10s)
- **Total estimated startup**: 60-120 seconds on cold start

### 3. **Made Redis Connection Non-Blocking**
- **Problem**: `process.exit(1)` on Redis failure crashed containers
- **Solution**: Graceful degradation with reconnection strategy
- **Result**: App starts even if Redis is temporarily unavailable
- **Fallback**: SSE notifications use polling instead of pub/sub

### 4. **Enhanced Dockerfile**
- Added `curl` to Alpine image for better debugging
- Improved health check with fallback
- Longer start period (60s) to allow initialization

## 📋 Pre-Deployment Checklist

Before deploying, verify these critical requirements:

### Network Configuration
```powershell
# 1. Verify VPC has NAT Gateway for private subnets
aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=<YOUR_VPC_ID>"

# 2. Check route tables for private subnets
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=<YOUR_VPC_ID>"
# Private subnets MUST have route: 0.0.0.0/0 → NAT Gateway

# 3. Verify public subnets have Internet Gateway
# Public subnets MUST have route: 0.0.0.0/0 → Internet Gateway
```

### Security Groups (Auto-created by template, but verify)
```powershell
# ECS Security Group should allow:
# - Ingress: Port 3000 from ALB Security Group
# - Egress: Port 443 to 0.0.0.0/0 (AWS APIs, Secrets Manager)
# - Egress: Port 5432 to RDS Security Group (PostgreSQL)
# - Egress: Port 6379 to Redis Security Group (Redis)

# ALB Security Group should allow:
# - Ingress: Port 80 from 0.0.0.0/0 (HTTP)
# - Ingress: Port 443 from 0.0.0.0/0 (HTTPS, if certificate provided)
# - Egress: Port 3000 to ECS Security Group
```

### Secrets Manager
```powershell
# Verify all secrets exist and have correct structure
aws secretsmanager get-secret-value --secret-id psychic-chat/database/production
aws secretsmanager get-secret-value --secret-id psychic-chat/firebase/production
aws secretsmanager get-secret-value --secret-id psychic-chat/encryption/production
aws secretsmanager get-secret-value --secret-id psychic-chat/stripe/production
```

### ECR Repository
```powershell
# Verify image exists
aws ecr describe-images --repository-name psychic-chat-api-production --region us-east-1

# If not, build and push:
cd api
docker build -t psychic-chat-api-production .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker tag psychic-chat-api-production:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/psychic-chat-api-production:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/psychic-chat-api-production:latest
```

## 🚀 Deployment Steps

### Step 1: Rebuild and Push Docker Image
```powershell
cd api

# Build with new Dockerfile changes
docker build -t psychic-chat-api-production .

# Tag and push to ECR
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$REGION = "us-east-1"
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
docker tag psychic-chat-api-production:latest "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/psychic-chat-api-production:latest"
docker push "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/psychic-chat-api-production:latest"
```

### Step 2: Deploy Updated CloudFormation Stack
```powershell
cd ../infrastructure

# Deploy with SAM CLI
sam deploy --config-file samconfig-ecs-production.toml --no-confirm-changeset

# OR with AWS CLI
aws cloudformation deploy `
  --template-file ecs-template.yaml `
  --stack-name psychic-chat-ecs-production `
  --parameter-overrides file://parameters-production.json `
  --capabilities CAPABILITY_IAM
```

### Step 3: Monitor Deployment
```powershell
# Watch CloudFormation events
aws cloudformation describe-stack-events --stack-name psychic-chat-ecs-production --max-items 20

# Watch ECS service deployment
aws ecs describe-services --cluster psychic-chat-production --services psychic-chat-api-production

# Stream CloudWatch logs
aws logs tail /ecs/psychic-chat-api-production --follow
```

## 🔍 Troubleshooting Common Issues

### Issue 1: Tasks Still Failing Health Checks

**Symptoms**: Tasks start but get marked unhealthy after 3-5 minutes

**Diagnosis**:
```powershell
# Check ECS task logs
aws logs tail /ecs/psychic-chat-api-production --follow

# Check task stopped reason
aws ecs describe-tasks --cluster psychic-chat-production --tasks <TASK_ARN>

# Check target health
aws elbv2 describe-target-health --target-group-arn <TARGET_GROUP_ARN>
```

**Possible Causes**:
1. **Database connection fails**: Check RDS security group, connection string
2. **Secrets not accessible**: Verify IAM permissions, secret ARNs
3. **Redis not accessible**: Check ElastiCache security group
4. **/health endpoint returns non-200**: Check application logs

**Solutions**:
```powershell
# Test database connectivity from ECS task
aws ecs execute-command --cluster psychic-chat-production --task <TASK_ID> --interactive --command "/bin/sh"
# Inside container:
apk add postgresql-client
psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME>

# Test secrets access
aws ecs execute-command --cluster psychic-chat-production --task <TASK_ID> --interactive --command "/bin/sh"
# Inside container:
env | grep DB_
```

### Issue 2: Tasks Can't Pull Image from ECR

**Symptoms**: "CannotPullContainerError" in task events

**Solutions**:
```powershell
# 1. Verify image exists
aws ecr describe-images --repository-name psychic-chat-api-production

# 2. Check ECS task execution role has ECR permissions
aws iam get-role-policy --role-name <ECS_TASK_EXECUTION_ROLE> --policy-name <POLICY_NAME>

# 3. Re-push image
docker push <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/psychic-chat-api-production:latest
```

### Issue 3: Private Subnet Has No Internet Access

**Symptoms**: Tasks can't reach AWS APIs, Secrets Manager, or external services

**Diagnosis**:
```powershell
# Check NAT Gateway exists and is available
aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=<VPC_ID>"

# Check route table for private subnets
aws ec2 describe-route-tables --filters "Name=association.subnet-id,Values=<PRIVATE_SUBNET_ID>"
# Should have: Destination 0.0.0.0/0, Target nat-xxxxx
```

**Solutions**:
1. **Create NAT Gateway** if missing:
   - Go to VPC Console → NAT Gateways → Create
   - Place in PUBLIC subnet
   - Allocate Elastic IP
2. **Update Route Table**:
   - Add route: 0.0.0.0/0 → NAT Gateway
3. **Alternative**: Use VPC Endpoints (cost-effective):
   ```powershell
   # Create VPC endpoints for AWS services (avoids NAT Gateway costs)
   aws ec2 create-vpc-endpoint --vpc-id <VPC_ID> --service-name com.amazonaws.us-east-1.secretsmanager --vpc-endpoint-type Interface --subnet-ids <PRIVATE_SUBNET_IDS>
   aws ec2 create-vpc-endpoint --vpc-id <VPC_ID> --service-name com.amazonaws.us-east-1.ecr.api --vpc-endpoint-type Interface --subnet-ids <PRIVATE_SUBNET_IDS>
   aws ec2 create-vpc-endpoint --vpc-id <VPC_ID> --service-name com.amazonaws.us-east-1.ecr.dkr --vpc-endpoint-type Interface --subnet-ids <PRIVATE_SUBNET_IDS>
   aws ec2 create-vpc-endpoint --vpc-id <VPC_ID> --service-name com.amazonaws.us-east-1.s3 --vpc-endpoint-type Gateway --route-table-ids <ROUTE_TABLE_IDS>
   ```

### Issue 4: Circuit Breaker Still Triggers

**Symptoms**: Deployment rolls back after a few minutes

**Solutions**:
1. **Increase grace period further** (if startup takes >180s):
   ```yaml
   HealthCheckGracePeriodSeconds: 300  # 5 minutes
   ```

2. **Temporarily disable circuit breaker** for debugging:
   ```yaml
   DeploymentCircuitBreaker:
     Enable: false
     Rollback: false
   ```

3. **Reduce desired count** for testing:
   ```yaml
   DesiredCount: 1  # Already set to 1
   ```

4. **Check ALB target health**:
   ```powershell
   aws elbv2 describe-target-health --target-group-arn <ARN>
   # Look for "Reason" field explaining why targets are unhealthy
   ```

### Issue 5: Application Starts But Crashes

**Symptoms**: Container starts, then exits after 30-60 seconds

**Check logs**:
```powershell
aws logs tail /ecs/psychic-chat-api-production --follow --since 5m
```

**Common causes**:
1. **Missing environment variables**: Check .env-loader.js is working
2. **Database migration needed**: May need to run migrations manually
3. **Unhandled exceptions**: Check for uncaught promise rejections
4. **Memory/CPU limits**: Container may be OOM killed

**Solutions**:
```powershell
# Increase memory/CPU
# In ecs-template.yaml:
Cpu: '1024'      # Was 512
Memory: '2048'   # Was 1024
```

## 📊 Monitoring After Deployment

### CloudWatch Metrics to Watch
- ECS Service: `CPUUtilization`, `MemoryUtilization`
- ALB: `TargetResponseTime`, `HTTPCode_Target_2XX_Count`, `UnHealthyHostCount`
- Target Group: `HealthyHostCount`, `RequestCount`

### Set Up Alarms
```powershell
# Alarm for unhealthy targets
aws cloudwatch put-metric-alarm \
  --alarm-name ecs-unhealthy-targets \
  --alarm-description "Alert when ECS targets are unhealthy" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold
```

## 🎯 Success Criteria

Deployment is successful when:
1. ✅ CloudFormation stack shows `CREATE_COMPLETE` or `UPDATE_COMPLETE`
2. ✅ ECS service shows `RUNNING` status with 1/1 tasks healthy
3. ✅ ALB target group shows 1 healthy target
4. ✅ Health check endpoint returns 200: `curl http://<ALB_DNS>/health`
5. ✅ Application logs show no errors
6. ✅ Can make API requests through ALB

## 🔐 Security Checklist Post-Deployment

- [ ] Verify HTTPS listener is configured (if certificate provided)
- [ ] Test CORS settings allow only intended origins
- [ ] Verify secrets are loaded from Secrets Manager (not hardcoded)
- [ ] Check security groups follow least privilege
- [ ] Enable CloudWatch Container Insights
- [ ] Set up CloudWatch alarms for critical metrics
- [ ] Test application functionality end-to-end

## 📝 Next Steps After Successful Deployment

1. **Set up custom domain** (if DomainName parameter provided)
2. **Configure auto-scaling** based on actual traffic patterns
3. **Enable AWS WAF** on ALB for DDoS protection
4. **Set up CI/CD pipeline** for automated deployments
5. **Configure backup/disaster recovery** strategy
6. **Document runbook** for operational procedures
