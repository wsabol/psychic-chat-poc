# Quick Fix & Redeploy Guide

## 🎯 What Was Fixed

The ECS Circuit Breaker was triggered because:

1. **Missing `curl` in Alpine image** - Health check command failed
2. **Insufficient grace period** - 60s wasn't enough for startup (needs ~120s)
3. **Redis connection crashed app** - `process.exit(1)` on failure
4. **Container health check conflict** - Task definition health check failed

## ✅ Changes Made

### 1. `infrastructure/ecs-template.yaml`
- ❌ Removed container health check (curl not available)
- ✅ Increased grace period: 60s → 180s
- ✅ Now relies on ALB target group health checks only

### 2. `api/Dockerfile`
- ✅ Added `curl` to Alpine image
- ✅ Improved health check with fallback
- ✅ Increased start period to 60s

### 3. `api/shared/redis.js`
- ✅ Removed `process.exit(1)` on connection failure
- ✅ Added automatic reconnection with exponential backoff
- ✅ App now starts even if Redis is unavailable
- ✅ Graceful degradation (polling fallback)

## 🚀 Next Steps to Deploy

### Step 1: Rebuild Docker Image
```powershell
cd api
docker build -t psychic-chat-api-production .
```

### Step 2: Push to ECR
```powershell
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
$REGION = "us-east-1"

# Login to ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# Tag and push
docker tag psychic-chat-api-production:latest "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/psychic-chat-api-production:latest"
docker push "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/psychic-chat-api-production:latest"
```

### Step 3: Deploy Updated Stack
```powershell
cd ../infrastructure
sam deploy --config-file samconfig-ecs-production.toml --no-confirm-changeset
```

### Step 4: Monitor Deployment
```powershell
# Watch CloudFormation events
aws cloudformation describe-stack-events --stack-name psychic-chat-ecs-production --max-items 20

# Watch logs
aws logs tail /ecs/psychic-chat-api-production --follow
```

## ⚠️ Before You Deploy - Critical Checks

### 1. Verify NAT Gateway Exists
```powershell
aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=<YOUR_VPC_ID>" --query "NatGateways[?State=='available']"
```

**If empty**: Your private subnets can't reach the internet. You need:
- A NAT Gateway in a PUBLIC subnet
- Route table for private subnets with: `0.0.0.0/0 → NAT Gateway`

### 2. Verify Secrets Exist
```powershell
aws secretsmanager list-secrets --query "SecretList[?contains(Name, 'psychic-chat')].Name"
```

Expected secrets:
- `psychic-chat/database/production`
- `psychic-chat/firebase/production`
- `psychic-chat/encryption/production`
- `psychic-chat/stripe/production`

### 3. Verify ECR Repository Exists
```powershell
aws ecr describe-repositories --repository-names psychic-chat-api-production
```

If it doesn't exist:
```powershell
aws ecr create-repository --repository-name psychic-chat-api-production
```

## 📊 How to Know It Worked

After ~3-5 minutes, you should see:

```powershell
# Check stack status
aws cloudformation describe-stacks --stack-name psychic-chat-ecs-production --query "Stacks[0].StackStatus"
# Should be: "CREATE_COMPLETE" or "UPDATE_COMPLETE"

# Check service status
aws ecs describe-services --cluster psychic-chat-production --services psychic-chat-api-production --query "services[0].runningCount"
# Should be: 1

# Check target health
aws elbv2 describe-target-health --target-group-arn <TARGET_GROUP_ARN>
# Should show: "State": "healthy"

# Test health endpoint
$ALB_DNS = aws cloudformation describe-stacks --stack-name psychic-chat-ecs-production --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerDnsName'].OutputValue" --output text
curl "http://$ALB_DNS/health"
# Should return: {"status":"healthy","timestamp":"..."}
```

## 🔍 If It Still Fails

### Check CloudWatch Logs
```powershell
aws logs tail /ecs/psychic-chat-api-production --follow --since 5m
```

Look for:
- ❌ Database connection errors → Check RDS security group
- ❌ Secret retrieval errors → Check IAM permissions
- ❌ Timeout errors → May need to increase grace period further
- ❌ Module not found errors → Check Docker image build

### Check Task Stopped Reason
```powershell
aws ecs list-tasks --cluster psychic-chat-production --service-name psychic-chat-api-production --desired-status STOPPED
# Get the task ARN, then:
aws ecs describe-tasks --cluster psychic-chat-production --tasks <TASK_ARN> --query "tasks[0].stoppedReason"
```

### Common Issues & Quick Fixes

**Issue**: "CannotPullContainerError"
- **Fix**: Verify image was pushed successfully, check ECR permissions

**Issue**: "Task failed to start"
- **Fix**: Check CloudWatch logs for startup errors

**Issue**: "Health check failed"
- **Fix**: Verify `/health` endpoint works, check database connectivity

**Issue**: "Timeout waiting for task to reach steady state"
- **Fix**: Increase `HealthCheckGracePeriodSeconds` to 300

## 📚 Additional Resources

- Full troubleshooting guide: `infrastructure/ECS-DEPLOYMENT-TROUBLESHOOTING.md`
- Root cause analysis: `DEPLOYMENT-FIX.md`
- Deployment guide: `infrastructure/DEPLOYMENT-GUIDE.md`

## 💡 Pro Tips

1. **First deployment?** It may take 3-5 minutes due to:
   - Image pull from ECR
   - Secrets loading from Secrets Manager
   - Database connection establishment
   - Application initialization

2. **Monitoring**: Keep CloudWatch logs open during first deployment:
   ```powershell
   aws logs tail /ecs/psychic-chat-api-production --follow
   ```

3. **Rollback**: If deployment fails, CloudFormation automatically rolls back (Circuit Breaker enabled)

4. **Testing**: Once deployed, test the health endpoint first before testing full application

## ✅ Success Checklist

- [ ] Docker image rebuilt with new Dockerfile
- [ ] Image pushed to ECR successfully
- [ ] CloudFormation stack deployed
- [ ] ECS service shows 1/1 tasks running
- [ ] ALB target group shows 1 healthy target
- [ ] Health endpoint returns 200 OK
- [ ] Application logs show no errors
- [ ] Can make API requests through ALB

---

**Need help?** Check the detailed troubleshooting guide in `infrastructure/ECS-DEPLOYMENT-TROUBLESHOOTING.md`
