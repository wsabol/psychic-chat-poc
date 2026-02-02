# Lambda Deployment - Quick Reference

One-page cheat sheet for common deployment tasks.

## 🚀 Initial Setup (One-Time)

```powershell
# 1. Configure AWS credentials
aws configure

# 2. Create secrets
cd infrastructure
.\setup-secrets.ps1 -Environment production

# 3. Edit samconfig-production.toml with your VPC/subnet IDs

# 4. First deployment (guided)
.\deploy.ps1 -Environment production -Guided
```

## 📦 Deployment Commands

### PowerShell Scripts

```powershell
# Deploy to production
.\deploy.ps1 -Environment production

# Deploy to staging
.\deploy.ps1 -Environment staging

# Validate without deploying
.\deploy.ps1 -Environment production -DryRun

# Skip build step (faster)
.\deploy.ps1 -Environment production -SkipBuild
```

### Manual SAM Commands

```powershell
# Build
cd infrastructure
sam build --template-file template.yaml

# Deploy (guided first time)
sam deploy --guided --config-file samconfig-production.toml

# Deploy (subsequent)
sam deploy --config-file samconfig-production.toml --config-env default
```

## 🔍 Verification Commands

```powershell
# List Lambda functions
aws lambda list-functions --query "Functions[?contains(FunctionName, 'production-')]"

# Get function details
aws lambda get-function --function-name production-temp-account-cleanup

# View CloudFormation stack
aws cloudformation describe-stacks --stack-name psychic-chat-lambdas-production

# Check EventBridge schedules
aws events list-rules --name-prefix "psychic-chat-lambdas-production"
```

## 🧪 Testing Commands

```powershell
# Test Lambda locally (from /lambdas directory)
npm run invoke:temp-cleanup
npm run invoke:subscription-check
npm run invoke:account-cleanup

# Test Lambda in AWS
aws lambda invoke `
  --function-name production-temp-account-cleanup `
  --payload '{}' `
  response.json

cat response.json
```

## 📊 Monitoring Commands

```powershell
# List log groups
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/production-"

# Tail logs (real-time)
aws logs tail /aws/lambda/production-temp-account-cleanup --follow

# Filter for errors
aws logs filter-log-events `
  --log-group-name /aws/lambda/production-temp-account-cleanup `
  --filter-pattern "ERROR"

# Get recent invocations
aws lambda get-function --function-name production-temp-account-cleanup `
  --query 'Configuration.[LastModified,State,LastUpdateStatus]'
```

## 🔐 Secrets Management

```powershell
# Create/update all secrets
.\setup-secrets.ps1 -Environment production

# Update existing secrets
.\setup-secrets.ps1 -Environment production -UpdateExisting

# View secret (without value)
aws secretsmanager describe-secret --secret-id psychic-chat/database

# Get secret value
aws secretsmanager get-secret-value --secret-id psychic-chat/database
```

## 🔧 Troubleshooting Commands

```powershell
# Check Lambda configuration
aws lambda get-function-configuration `
  --function-name production-temp-account-cleanup `
  --query 'Environment.Variables'

# View IAM role
aws iam get-role --role-name psychic-chat-lambdas-production-LambdaExecutionRole

# Check security group
aws ec2 describe-security-groups --group-ids sg-xxxxx

# Validate SAM template
sam validate --template-file template.yaml --lint

# View CloudFormation events
aws cloudformation describe-stack-events `
  --stack-name psychic-chat-lambdas-production `
  --max-items 20
```

## 🔄 Update & Rollback

```powershell
# Update Lambda code (rebuild and deploy)
.\deploy.ps1 -Environment production

# Rollback (cancel stack update)
aws cloudformation cancel-update-stack --stack-name psychic-chat-lambdas-production

# Delete stack (removes everything)
aws cloudformation delete-stack --stack-name psychic-chat-lambdas-production
```

## 📋 Lambda Functions

| Function | Cron Schedule | Purpose |
|----------|---------------|---------|
| `temp-account-cleanup` | `0 */8 * * ? *` | Delete temp accounts > 8 hours |
| `account-cleanup` | `0 2 * * ? *` | Re-engagement emails, 7-year deletion |
| `subscription-check` | `0 */4 * * ? *` | Verify Stripe subscriptions |
| `policy-reminder` | `0 3 * * ? *` | Send policy notifications |
| `grace-period-enforcement` | `0 */6 * * ? *` | Logout expired grace periods |
| `price-migration` | `0 4 * * ? *` | Migrate to new prices |

## 🎯 Common Workflows

### Update Lambda Function Code

```powershell
# 1. Edit code in /lambdas/[function-name]/index.js
# 2. Test locally
cd lambdas
npm run invoke:[function-name]

# 3. Deploy
cd ..\infrastructure
.\deploy.ps1 -Environment production
```

### Check Function Execution

```powershell
# View recent executions
aws cloudwatch get-metric-statistics `
  --namespace AWS/Lambda `
  --metric-name Invocations `
  --dimensions Name=FunctionName,Value=production-temp-account-cleanup `
  --start-time 2024-01-01T00:00:00Z `
  --end-time 2024-01-02T00:00:00Z `
  --period 3600 `
  --statistics Sum
```

### Update Environment Variables

```powershell
# 1. Edit template.yaml (Globals.Function.Environment.Variables)
# 2. Redeploy
.\deploy.ps1 -Environment production
```

### Add New Lambda Function

```powershell
# 1. Create function directory: /lambdas/new-function/
# 2. Create index.js with handler export
# 3. Add function to template.yaml (copy existing function block)
# 4. Deploy
.\deploy.ps1 -Environment production
```

## 🌐 GitHub Actions

### Trigger Manual Deployment

1. Go to GitHub → Actions
2. Select "Deploy Lambda Functions"
3. Click "Run workflow"
4. Choose environment
5. Click "Run workflow"

### Auto-Deploy on Push

```bash
# Deploy to staging
git push origin staging

# Deploy to production
git push origin main
```

## 📞 Quick Links

- [Full Deployment Guide](./DEPLOYMENT-GUIDE.md)
- [SAM Template](./template.yaml)
- [Lambda Functions](../lambdas/)
- [AWS SAM Docs](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS CLI Docs](https://docs.aws.amazon.com/cli/)

## 🆘 Emergency Contacts

If Lambda functions fail:

1. Check CloudWatch Logs for errors
2. Verify RDS database is accessible
3. Check EventBridge schedules are enabled
4. Verify Secrets Manager secrets exist
5. Review security group rules

---

**Pro Tip**: Bookmark this page for quick reference during deployments!
