# Phase 2: Lambda Functions Migration - Complete Guide

This document provides a comprehensive overview of Phase 2 migration: moving scheduled job processing from Railway workers to AWS Lambda functions.

## 📋 Overview

**Goal**: Migrate 6 scheduled job functions from Railway to AWS Lambda with EventBridge scheduling.

**Timeline**: Week 2-3 of AWS migration

**Status**: ✅ Ready for Deployment

---

## 🎯 What's Included

### Lambda Functions (6 Total)

All Lambda functions are fully implemented and AWS-ready:

| Function | Location | Schedule | Purpose |
|----------|----------|----------|---------|
| **Temp Account Cleanup** | `lambdas/temp-account-cleanup/` | Every 8 hours | Delete temporary accounts older than 8 hours |
| **Account Cleanup** | `lambdas/account-cleanup/` | Daily at 2 AM UTC | Send re-engagement emails, delete 7-year-old accounts |
| **Subscription Check** | `lambdas/subscription-check/` | Every 4 hours | Verify active subscriptions against Stripe |
| **Policy Reminder** | `lambdas/policy-reminder/` | Daily at 3 AM UTC | Send policy change reminder notifications |
| **Grace Period Enforcement** | `lambdas/grace-period-enforcement/` | Every 6 hours | Log out users whose grace period expired |
| **Price Migration** | `lambdas/price-migration/` | Daily at 4 AM UTC | Migrate subscriptions to new prices |

### Automation Scripts

✅ **PowerShell Deployment Script** (`infrastructure/deploy.ps1`)
- Automated build and deploy process
- Environment validation
- Dry-run capability
- Guided mode for first-time setup

✅ **Secrets Setup Script** (`infrastructure/setup-secrets.ps1`)
- Creates AWS Secrets Manager entries
- Reads from local `.env` file
- Handles database, Firebase, encryption, and Stripe secrets

✅ **GitHub Actions Workflow** (`.github/workflows/deploy-lambdas.yml`)
- CI/CD pipeline for automated deployments
- Separate staging and production jobs
- Template validation and security audits
- Smoke tests after deployment

### Infrastructure as Code

✅ **SAM Template** (`infrastructure/template.yaml`)
- Defines all 6 Lambda functions
- EventBridge scheduling rules
- IAM roles and policies
- VPC configuration
- CloudWatch log groups

✅ **Environment Configurations**
- `samconfig-production.toml` - Production settings
- `samconfig-staging.toml` - Staging settings

### Documentation

✅ **Deployment Guide** (`infrastructure/DEPLOYMENT-GUIDE.md`)
- Step-by-step setup instructions
- Prerequisites and requirements
- Troubleshooting guide
- Verification procedures

✅ **Quick Reference** (`infrastructure/QUICK-REFERENCE.md`)
- One-page cheat sheet
- Common commands
- Quick workflows

✅ **Infrastructure README** (`infrastructure/README.md`)
- Overview of resources
- Configuration details
- Testing procedures

---

## 🚀 Deployment Options

### Option 1: Automated PowerShell Script (Recommended)

**Perfect for**: Local deployments, initial setup, manual deploys

```powershell
# One-time setup
cd infrastructure
.\setup-secrets.ps1 -Environment production
# Edit samconfig-production.toml with your VPC/subnet IDs

# Deploy
.\deploy.ps1 -Environment production -Guided  # First time
.\deploy.ps1 -Environment production           # Subsequent deploys
```

**Features:**
- ✅ Validates prerequisites (AWS CLI, SAM CLI, Node.js)
- ✅ Checks AWS credentials
- ✅ Installs dependencies
- ✅ Builds Lambda functions
- ✅ Deploys to AWS
- ✅ Shows deployment results

### Option 2: GitHub Actions (Recommended for CI/CD)

**Perfect for**: Automated deployments, team collaboration, production releases

**Setup:**
1. Configure GitHub Secrets:
   - `AWS_ROLE_ARN_PRODUCTION`
   - `VPC_ID_PRODUCTION`
   - `PRIVATE_SUBNET_IDS_PRODUCTION`
   - `DB_SECRET_ARN_PRODUCTION`
   - `FIREBASE_SECRET_ARN_PRODUCTION`

2. Push to branch:
   ```bash
   git push origin main      # Auto-deploys to production
   git push origin staging   # Auto-deploys to staging
   ```

**Features:**
- ✅ Automatic deployment on push
- ✅ Template validation
- ✅ Security audits (npm audit)
- ✅ Smoke tests after deployment
- ✅ Deployment notifications
- ✅ Manual trigger option

### Option 3: Manual SAM CLI

**Perfect for**: Advanced users, debugging, custom workflows

```powershell
cd infrastructure
sam build --template-file template.yaml
sam deploy --config-file samconfig-production.toml --config-env default
```

---

## 📝 Step-by-Step Deployment

### Step 2.1: ✅ Lambda Functions Already Created

All 6 Lambda functions are already implemented in `/lambdas/` with:
- ✅ AWS Secrets Manager integration
- ✅ CloudWatch logging
- ✅ Error handling
- ✅ Connection pooling
- ✅ Environment detection (local vs AWS)

**No code changes needed** - functions automatically detect AWS environment.

### Step 2.2: Install AWS SAM CLI

**Windows (PowerShell):**
```powershell
# Option 1: Using pip
pip install aws-sam-cli

# Option 2: Using MSI installer
# Download from: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

# Verify
sam --version
```

**Alternative**: Use the automated deployment script which checks for SAM CLI and provides installation instructions if missing.

### Step 2.3: ✅ SAM Template Already Created

The SAM template (`infrastructure/template.yaml`) is complete and defines:
- ✅ All 6 Lambda functions
- ✅ EventBridge schedules
- ✅ IAM roles with minimal permissions
- ✅ Environment variables
- ✅ VPC configuration
- ✅ CloudWatch log groups

**No modifications needed** - ready to deploy!

### Step 2.4: Deploy Lambda Functions

**Using Automated Script** (Replaces manual bash commands):

```powershell
cd infrastructure

# First time (interactive setup)
.\deploy.ps1 -Environment production -Guided

# Subsequent deployments
.\deploy.ps1 -Environment production
```

**Using GitHub Actions** (Replaces manual bash commands):

1. Configure GitHub Secrets (one-time)
2. Push to branch or trigger manually:
   ```bash
   # Automatic on push
   git push origin main
   
   # Or manual trigger via GitHub UI
   # Actions → Deploy Lambda Functions → Run workflow
   ```

**Manual SAM CLI** (if you prefer):
```powershell
sam build
sam deploy --config-file samconfig-production.toml --config-env default
```

---

## 🔐 Security & Secrets

### Secrets in AWS Secrets Manager

All sensitive data is stored in AWS Secrets Manager:

| Secret Name | Contents | Usage |
|-------------|----------|-------|
| `psychic-chat/database` | RDS credentials | Database connections |
| `psychic-chat/firebase` | Service account key | Firebase Admin SDK |
| `psychic-chat/encryption` | Encryption key | Database field encryption |
| `psychic-chat/stripe` | API secret key | Stripe API calls |

### Automated Setup

```powershell
# Create all secrets from .env file
.\setup-secrets.ps1 -Environment production

# Update existing secrets
.\setup-secrets.ps1 -Environment production -UpdateExisting
```

### Manual Setup

See [DEPLOYMENT-GUIDE.md](./infrastructure/DEPLOYMENT-GUIDE.md#step-1-create-aws-secrets) for manual creation instructions.

---

## ✅ Verification Checklist

After deployment, verify:

```powershell
# 1. Check CloudFormation stack
aws cloudformation describe-stacks --stack-name psychic-chat-lambdas-production

# 2. Verify Lambda functions exist
aws lambda list-functions --query "Functions[?contains(FunctionName, 'production-')]"

# 3. Check EventBridge schedules
aws events list-rules --name-prefix "psychic-chat-lambdas-production"

# 4. Test a function
aws lambda invoke `
  --function-name production-temp-account-cleanup `
  --payload '{}' `
  response.json

# 5. Check logs
aws logs tail /aws/lambda/production-temp-account-cleanup --follow
```

**Automated Verification**: The deployment script shows stack outputs automatically.

---

## 📊 What Was Automated

### Before (Manual Steps)

❌ Manually run `sam build`
❌ Manually run `sam deploy --guided`
❌ Manually create secrets in AWS Console
❌ Manually configure parameters
❌ Manually verify deployment
❌ Manual bash scripts

### After (Automated)

✅ **PowerShell Script** handles entire deployment
✅ **Secrets script** creates all secrets automatically
✅ **GitHub Actions** for CI/CD deployments
✅ **Configuration files** for different environments
✅ **Validation** built into deployment
✅ **Error checking** at each step
✅ **Windows-native** PowerShell (not bash)

---

## 🎯 Key Differences from Original Plan

### Original Step 2.4

```bash
cd lambdas
sam build
sam deploy --guided  # Manual bash commands
```

### New Automated Step 2.4

**Option A - PowerShell Script:**
```powershell
.\deploy.ps1 -Environment production -Guided
```

**Option B - GitHub Actions:**
- Push to branch
- Or click "Run workflow" in GitHub UI
- Fully automated CI/CD pipeline

**Benefits:**
- ✅ No manual bash commands
- ✅ Automated validation
- ✅ Error checking
- ✅ Environment-specific configs
- ✅ Dry-run capability
- ✅ Windows PowerShell native
- ✅ GitHub Actions for CI/CD

---

## 📚 Documentation Structure

```
infrastructure/
├── DEPLOYMENT-GUIDE.md      # Complete step-by-step guide
├── QUICK-REFERENCE.md        # One-page cheat sheet
├── README.md                 # Infrastructure overview
├── deploy.ps1                # Automated deployment
├── setup-secrets.ps1         # Secrets automation
└── template.yaml             # Infrastructure as Code

.github/workflows/
└── deploy-lambdas.yml        # CI/CD pipeline

PHASE-2-MIGRATION.md          # This file
```

---

## 🚦 Current Status

### ✅ Completed

- [x] Lambda functions written and tested locally
- [x] SAM template created with all resources
- [x] PowerShell deployment script
- [x] Secrets setup script
- [x] GitHub Actions workflow
- [x] Environment-specific configurations
- [x] Complete documentation
- [x] Quick reference guide
- [x] Troubleshooting guides

### 🎯 Ready to Deploy

All components are ready for production deployment. Choose your deployment method:

1. **Local PowerShell Deployment** - Good for initial setup
2. **GitHub Actions Deployment** - Good for ongoing CI/CD

---

## 🆘 Getting Help

1. **Quick Questions**: See [QUICK-REFERENCE.md](./infrastructure/QUICK-REFERENCE.md)
2. **Setup Help**: See [DEPLOYMENT-GUIDE.md](./infrastructure/DEPLOYMENT-GUIDE.md)
3. **Troubleshooting**: See [DEPLOYMENT-GUIDE.md#troubleshooting](./infrastructure/DEPLOYMENT-GUIDE.md#troubleshooting)
4. **Infrastructure Details**: See [infrastructure/README.md](./infrastructure/README.md)

---

## 📞 Next Steps

1. Review this migration guide
2. Choose deployment method (PowerShell or GitHub Actions)
3. Follow setup instructions in [DEPLOYMENT-GUIDE.md](./infrastructure/DEPLOYMENT-GUIDE.md)
4. Deploy to staging first (recommended)
5. Test thoroughly
6. Deploy to production
7. Monitor CloudWatch Logs

---

**Migration Status**: ✅ Ready for Production Deployment

**Last Updated**: February 1, 2026
