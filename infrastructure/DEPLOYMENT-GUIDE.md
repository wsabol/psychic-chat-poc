# Lambda Functions Deployment Guide

Complete guide for deploying AWS Lambda functions for the Psychic Chat application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [One-Time Setup](#one-time-setup)
3. [Local Deployment](#local-deployment)
4. [GitHub Actions Deployment](#github-actions-deployment)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

1. **AWS CLI** (v2 or higher)
   ```powershell
   # Install on Windows
   msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
   
   # Verify installation
   aws --version
   ```

2. **AWS SAM CLI** (v1.100.0 or higher)
   ```powershell
   # Install on Windows using pip
   pip install aws-sam-cli
   
   # Or download MSI installer from:
   # https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
   
   # Verify installation
   sam --version
   ```

3. **Node.js** (v18 or higher)
   ```powershell
   node --version
   npm --version
   ```

### AWS Account Setup

1. **Configure AWS Credentials**
   ```powershell
   aws configure
   # AWS Access Key ID: [Your Access Key]
   # AWS Secret Access Key: [Your Secret Key]
   # Default region: us-east-1
   # Default output format: json
   ```

2. **Verify AWS Access**
   ```powershell
   aws sts get-caller-identity
   ```

---

## One-Time Setup

### Step 1: Create AWS Secrets

Run the setup script to create all required secrets in AWS Secrets Manager:

```powershell
cd infrastructure

# For production
.\setup-secrets.ps1 -Environment production

# For staging
.\setup-secrets.ps1 -Environment staging
```

This script will:
- Read values from `lambdas/.env`
- Create secrets in AWS Secrets Manager
- Display the ARNs needed for configuration

**Manual Alternative:**

If you prefer to create secrets manually via AWS Console:

1. Go to AWS Secrets Manager in the console
2. Create the following secrets:

**Database Secret** (`psychic-chat/database`):
```json
{
  "username": "masteradmin",
  "password": "your-password",
  "host": "your-rds-endpoint.rds.amazonaws.com",
  "port": 5432,
  "database": "psychic_chat"
}
```

**Firebase Secret** (`psychic-chat/firebase`):
```json
{
  "serviceAccountKey": {
    "type": "service_account",
    "project_id": "psychic-chat-poc",
    "private_key_id": "...",
    "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-...@psychic-chat-poc.iam.gserviceaccount.com",
    "client_id": "...",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "..."
  }
}
```

**Encryption Secret** (`psychic-chat/encryption`):
```json
{
  "key": "your-base64-encryption-key"
}
```

**Stripe Secret** (`psychic-chat/stripe`):
```json
{
  "secret_key": "sk_live_..."
}
```

### Step 2: Update Configuration Files

Edit the environment-specific configuration files:

**For Production** (`samconfig-production.toml`):
```toml
parameter_overrides = [
    "Environment=production",
    "VpcId=vpc-YOUR_VPC_ID",
    "PrivateSubnetIds=subnet-XXXXXX,subnet-YYYYYY",
    "DatabaseSecretArn=arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:psychic-chat/database-XXXXX",
    "FirebaseSecretArn=arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:psychic-chat/firebase-XXXXX",
    "EncryptionKey={{resolve:secretsmanager:psychic-chat/encryption:SecretString:key}}",
    "StripeSecretKey={{resolve:secretsmanager:psychic-chat/stripe:SecretString:secret_key}}",
    "TermsVersion=2.0",
    "PrivacyVersion=1.1"
]
```

**For Staging** (`samconfig-staging.toml`):
```toml
parameter_overrides = [
    "Environment=staging",
    "VpcId=vpc-YOUR_STAGING_VPC_ID",
    "PrivateSubnetIds=subnet-XXXXXX,subnet-YYYYYY",
    "DatabaseSecretArn=arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:psychic-chat/database-staging-XXXXX",
    "FirebaseSecretArn=arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:psychic-chat/firebase-staging-XXXXX",
    "EncryptionKey={{resolve:secretsmanager:psychic-chat/encryption-staging:SecretString:key}}",
    "StripeSecretKey={{resolve:secretsmanager:psychic-chat/stripe-staging:SecretString:secret_key}}",
    "TermsVersion=2.0",
    "PrivacyVersion=1.1"
]
```

---

## Local Deployment

### Using PowerShell Script (Recommended)

The deployment script automates the entire process:

```powershell
cd infrastructure

# First-time deployment (guided mode)
.\deploy.ps1 -Environment production -Guided

# Subsequent deployments
.\deploy.ps1 -Environment production

# Dry run (validate without deploying)
.\deploy.ps1 -Environment production -DryRun

# Skip build (if already built)
.\deploy.ps1 -Environment production -SkipBuild
```

**Options:**
- `-Environment`: Choose `production`, `staging`, or `development`
- `-Guided`: Interactive setup (recommended for first deployment)
- `-DryRun`: Validate configuration without deploying
- `-SkipBuild`: Skip the build step (faster for config-only changes)

### Manual Deployment

If you prefer to run commands manually:

```powershell
cd infrastructure

# 1. Install dependencies
cd ..\lambdas
npm install --production
cd ..\infrastructure

# 2. Build Lambda functions
sam build --template-file template.yaml

# 3. Deploy (first time - guided)
sam deploy --guided --config-file samconfig-production.toml --config-env default

# 4. Deploy (subsequent times)
sam deploy --config-file samconfig-production.toml --config-env default
```

---

## GitHub Actions Deployment

### Setup GitHub Secrets

Configure the following secrets in your GitHub repository (`Settings > Secrets and variables > Actions`):

#### For Staging Environment:
- `AWS_ROLE_ARN_STAGING`: IAM role ARN for GitHub Actions
- `VPC_ID_STAGING`: VPC ID for staging
- `PRIVATE_SUBNET_IDS_STAGING`: Comma-separated subnet IDs
- `DB_SECRET_ARN_STAGING`: Database secret ARN
- `FIREBASE_SECRET_ARN_STAGING`: Firebase secret ARN

#### For Production Environment:
- `AWS_ROLE_ARN_PRODUCTION`: IAM role ARN for GitHub Actions
- `VPC_ID_PRODUCTION`: VPC ID for production
- `PRIVATE_SUBNET_IDS_PRODUCTION`: Comma-separated subnet IDs
- `DB_SECRET_ARN_PRODUCTION`: Database secret ARN
- `FIREBASE_SECRET_ARN_PRODUCTION`: Firebase secret ARN

### Setup AWS IAM Role for GitHub Actions

Create an IAM role with OIDC trust relationship:

1. **Create Trust Policy** (`github-actions-trust-policy.json`):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
           },
           "StringLike": {
             "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/psychic-chat-poc:*"
           }
         }
       }
     ]
   }
   ```

2. **Create IAM Role**:
   ```bash
   aws iam create-role \
     --role-name GitHubActionsLambdaDeploy \
     --assume-role-policy-document file://github-actions-trust-policy.json
   ```

3. **Attach Policies**:
   ```bash
   aws iam attach-role-policy \
     --role-name GitHubActionsLambdaDeploy \
     --policy-arn arn:aws:iam::aws:policy/AWSCloudFormationFullAccess
   
   aws iam attach-role-policy \
     --role-name GitHubActionsLambdaDeploy \
     --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess
   
   aws iam attach-role-policy \
     --role-name GitHubActionsLambdaDeploy \
     --policy-arn arn:aws:iam::aws:policy/IAMFullAccess
   ```

### Triggering Deployments

**Automatic Deployment:**
- Push to `main` branch → Deploys to production
- Push to `staging` branch → Deploys to staging

**Manual Deployment:**
1. Go to `Actions` tab in GitHub
2. Select `Deploy Lambda Functions`
3. Click `Run workflow`
4. Choose environment and options
5. Click `Run workflow`

---

## Verification

### 1. Verify CloudFormation Stack

```powershell
# List stacks
aws cloudformation list-stacks --query "StackSummaries[?contains(StackName, 'psychic-chat-lambdas')]"

# Get stack details
aws cloudformation describe-stacks --stack-name psychic-chat-lambdas-production
```

### 2. Verify Lambda Functions

```powershell
# List Lambda functions
aws lambda list-functions --query "Functions[?contains(FunctionName, 'production-')]"

# Get specific function details
aws lambda get-function --function-name production-temp-account-cleanup
```

### 3. Check EventBridge Schedules

```powershell
# List rules
aws events list-rules --name-prefix "psychic-chat-lambdas-production"

# Get rule details
aws events describe-rule --name "psychic-chat-lambdas-production-TempAccountCleanup"
```

### 4. Monitor CloudWatch Logs

```powershell
# List log groups
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/production-"

# Tail logs (requires awslogs tool)
aws logs tail /aws/lambda/production-temp-account-cleanup --follow
```

### 5. Test Lambda Invocation

```powershell
# Invoke a Lambda function manually
aws lambda invoke \
  --function-name production-temp-account-cleanup \
  --payload '{}' \
  response.json

# View response
cat response.json
```

---

## Troubleshooting

### Common Issues

#### 1. "Unable to import module"

**Error:**
```
Runtime.ImportModuleError: Unable to import module 'index': No module named 'pg'
```

**Solution:**
- Ensure dependencies are installed: `cd lambdas && npm install --production`
- Rebuild: `sam build --template-file template.yaml`

#### 2. VPC Configuration Errors

**Error:**
```
The provided execution role does not have permissions to call CreateNetworkInterface on EC2
```

**Solution:**
- Ensure the Lambda execution role has `AWSLambdaVPCAccessExecutionRole` policy
- Check the template.yaml has the correct managed policy attached

#### 3. Secrets Manager Access Denied

**Error:**
```
User: arn:aws:sts::ACCOUNT:assumed-role/... is not authorized to perform: secretsmanager:GetSecretValue
```

**Solution:**
- Verify the Lambda execution role has the correct secrets policy
- Check the secret ARN in samconfig files matches the actual secret

#### 4. Database Connection Timeout

**Error:**
```
Connection timeout to database
```

**Solution:**
- Verify Lambda functions are in the same VPC as RDS
- Check security group allows inbound traffic from Lambda security group on port 5432
- Ensure private subnets have NAT Gateway for AWS API access

#### 5. GitHub Actions Deployment Fails

**Error:**
```
Error: Credentials could not be loaded
```

**Solution:**
- Verify OIDC provider is configured in AWS IAM
- Check GitHub secrets are correctly set
- Ensure IAM role trust policy allows your repository

### Debug Commands

```powershell
# View Lambda environment variables
aws lambda get-function-configuration \
  --function-name production-temp-account-cleanup \
  --query "Environment.Variables"

# View recent Lambda errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/production-temp-account-cleanup \
  --filter-pattern "ERROR"

# Check Lambda execution role permissions
aws iam get-role --role-name psychic-chat-lambdas-production-LambdaExecutionRole

# Validate SAM template
sam validate --template-file template.yaml --lint
```

---

## Updating Lambda Functions

When you make changes to Lambda code:

### Local Update
```powershell
cd infrastructure
.\deploy.ps1 -Environment production
```

### Via GitHub Actions
```bash
# Commit and push changes
git add lambdas/
git commit -m "Update Lambda functions"
git push origin main  # Auto-deploys to production
```

---

## Rollback

If you need to rollback a deployment:

```powershell
# List stack events to find previous version
aws cloudformation describe-stack-events \
  --stack-name psychic-chat-lambdas-production \
  --max-items 50

# Rollback using CloudFormation
aws cloudformation cancel-update-stack \
  --stack-name psychic-chat-lambdas-production

# Or update to a previous template version
sam deploy \
  --template-file .aws-sam/build/template.yaml.backup \
  --config-file samconfig-production.toml
```

---

## Clean Up

To remove all Lambda functions and resources:

```powershell
# Delete the CloudFormation stack
aws cloudformation delete-stack --stack-name psychic-chat-lambdas-production

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete --stack-name psychic-chat-lambdas-production

# Optionally delete secrets (BE CAREFUL!)
# aws secretsmanager delete-secret --secret-id psychic-chat/database --force-delete-without-recovery
```

---

## Support

For issues or questions:
1. Check CloudWatch Logs for detailed error messages
2. Review AWS CloudFormation events for stack issues
3. Consult the [AWS SAM documentation](https://docs.aws.amazon.com/serverless-application-model/)
4. Check the project's GitHub Issues

---

## Next Steps

After successful deployment:
1. ✅ Monitor CloudWatch Logs for any errors
2. ✅ Verify EventBridge schedules are running
3. ✅ Test each Lambda function manually
4. ✅ Set up CloudWatch Alarms for failures
5. ✅ Configure SNS notifications for alerts
