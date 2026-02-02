# Phase 2: Lambda Functions Migration

This directory contains all infrastructure-as-code and deployment scripts for AWS Lambda functions migration.

## 📁 Directory Structure

```
infrastructure/
├── template.yaml                    # SAM template (defines all Lambda functions)
├── deploy.ps1                       # Automated deployment script
├── setup-secrets.ps1                # AWS Secrets Manager setup
├── samconfig-production.toml        # Production deployment config
├── samconfig-staging.toml           # Staging deployment config
├── DEPLOYMENT-GUIDE.md              # Complete deployment guide
└── README.md                        # This file
```

## 🚀 Quick Start

### For Local Deployment (PowerShell)

```powershell
# 1. Setup AWS credentials
aws configure

# 2. Create secrets in AWS Secrets Manager
.\setup-secrets.ps1 -Environment production

# 3. Update samconfig-production.toml with your VPC/subnet IDs

# 4. Deploy!
.\deploy.ps1 -Environment production -Guided
```

### For GitHub Actions Deployment

1. Configure GitHub Secrets (see [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md#setup-github-secrets))
2. Push to `main` branch or trigger workflow manually
3. GitHub Actions will automatically deploy

## 📋 What Gets Deployed

The SAM template deploys:

| Lambda Function | Schedule | Purpose |
|----------------|----------|---------|
| **temp-account-cleanup** | Every 8 hours | Deletes temporary accounts older than 8 hours |
| **account-cleanup** | Daily at 2 AM UTC | Sends re-engagement emails, deletes 7-year-old accounts |
| **subscription-check** | Every 4 hours | Verifies Stripe subscription status |
| **policy-reminder** | Daily at 3 AM UTC | Sends policy change notifications |
| **grace-period-enforcement** | Every 6 hours | Logs out users with expired grace periods |
| **price-migration** | Daily at 4 AM UTC | Migrates subscriptions to new prices |

### Additional Resources

- **Security Group**: Allows HTTPS (443) and PostgreSQL (5432) access
- **IAM Role**: Execution role with VPC, Secrets Manager, and CloudWatch permissions
- **EventBridge Rules**: Scheduled triggers for each Lambda
- **CloudWatch Log Groups**: 30-day retention for all functions

## 🔧 Common Tasks

### Deploy to Production
```powershell
.\deploy.ps1 -Environment production
```

### Deploy to Staging
```powershell
.\deploy.ps1 -Environment staging
```

### Dry Run (Validate Only)
```powershell
.\deploy.ps1 -Environment production -DryRun
```

### Update Secrets
```powershell
.\setup-secrets.ps1 -Environment production -UpdateExisting
```

### View Logs
```powershell
aws logs tail /aws/lambda/production-temp-account-cleanup --follow
```

### Test a Function
```powershell
aws lambda invoke `
  --function-name production-temp-account-cleanup `
  --payload '{}' `
  response.json
```

## 📝 Configuration

### Required AWS Resources (Before Deployment)

You need the following AWS resources already created:

1. **VPC**: Your VPC ID (e.g., `vpc-xxxxx`)
2. **Subnets**: At least 2 private subnets in different AZs
3. **RDS Database**: PostgreSQL instance accessible from Lambda
4. **Secrets Manager**: Secrets for database, Firebase, encryption, Stripe

### Environment Variables (Configured in template.yaml)

All Lambda functions receive these environment variables:

- `ENCRYPTION_KEY`: From Secrets Manager
- `STRIPE_SECRET_KEY`: From Secrets Manager
- `TERMS_VERSION`: Current Terms of Service version
- `PRIVACY_VERSION`: Current Privacy Policy version
- `DB_SECRET_NAME`: ARN of database secret
- `FIREBASE_SECRET_NAME`: ARN of Firebase secret
- `NODE_ENV`: Environment name (production/staging/development)

## 🔐 Security

### Secrets Management

Secrets are stored in AWS Secrets Manager and accessed at runtime:

- **Database credentials**: `psychic-chat/database`
- **Firebase service account**: `psychic-chat/firebase`
- **Encryption key**: `psychic-chat/encryption`
- **Stripe API key**: `psychic-chat/stripe`

Never commit secrets to git or hardcode in Lambda functions.

### VPC Configuration

Lambda functions run in private subnets:
- ✅ Can access RDS database in same VPC
- ✅ Can call AWS APIs via NAT Gateway
- ❌ Cannot be accessed directly from internet

### IAM Permissions

Lambda execution role has minimal required permissions:
- Secrets Manager: GetSecretValue on specific secrets only
- CloudWatch: CreateLogGroup, CreateLogStream, PutLogEvents
- EC2: CreateNetworkInterface (for VPC access)

## 🧪 Testing

### Local Testing

Lambda functions can be tested locally:

```powershell
cd ..\lambdas

# Test a specific function
npm run invoke:temp-cleanup
npm run invoke:subscription-check
```

### AWS Testing

After deployment:

```powershell
# Invoke directly
aws lambda invoke --function-name production-temp-account-cleanup --payload '{}' response.json

# Check logs
aws logs tail /aws/lambda/production-temp-account-cleanup --follow
```

## 📊 Monitoring

### CloudWatch Logs

Each Lambda has its own log group:
```
/aws/lambda/production-temp-account-cleanup
/aws/lambda/production-account-cleanup
/aws/lambda/production-subscription-check
/aws/lambda/production-policy-reminder
/aws/lambda/production-grace-period-enforcement
/aws/lambda/production-price-migration
```

### Recommended Alarms

Set up CloudWatch Alarms for:
1. Lambda errors > 5 in 5 minutes
2. Lambda duration > 4 minutes (timeout warning)
3. Lambda throttles > 0
4. Database connection failures

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

Located at: `.github/workflows/deploy-lambdas.yml`

**Triggers:**
- Push to `main` → Deploy to production
- Push to `staging` → Deploy to staging
- Manual workflow dispatch → Deploy to any environment

**Steps:**
1. Validate SAM template
2. Run npm audit on dependencies
3. Build Lambda functions
4. Deploy to AWS
5. Run smoke tests
6. Send deployment notification

## 📚 Documentation

- **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)**: Complete step-by-step deployment guide
- **[template.yaml](./template.yaml)**: Infrastructure-as-Code definition
- **[Lambda README](../lambdas/README.md)**: Lambda function documentation

## 🆘 Troubleshooting

### Common Issues

**Problem**: Lambda can't connect to database
```powershell
# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxxxx

# Verify Lambda is in correct subnets
aws lambda get-function-configuration --function-name production-temp-account-cleanup
```

**Problem**: Secrets Manager access denied
```powershell
# Check IAM role permissions
aws iam get-role-policy --role-name psychic-chat-lambdas-production-LambdaExecutionRole --policy-name SecretsManagerAccess
```

**Problem**: Function timing out
```powershell
# Check recent invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=production-temp-account-cleanup \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average,Maximum
```

See [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md#troubleshooting) for more solutions.

## 🎯 Next Steps After Deployment

1. ✅ Verify all functions deployed successfully
2. ✅ Test each function manually
3. ✅ Monitor CloudWatch Logs for 24 hours
4. ✅ Set up CloudWatch Alarms
5. ✅ Configure SNS notifications
6. ✅ Document runbook for operations team
7. ✅ Schedule periodic review of logs

## 📞 Support

For questions or issues:
- Check [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)
- Review CloudWatch Logs
- Check AWS CloudFormation console for stack events
- Consult [AWS SAM documentation](https://docs.aws.amazon.com/serverless-application-model/)

---

**Status**: Phase 2 Migration Ready ✅

Last Updated: February 1, 2026
