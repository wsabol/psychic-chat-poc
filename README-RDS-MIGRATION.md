# RDS Migration Complete Guide

Complete step-by-step guide for migrating your PostgreSQL database to AWS RDS.

## 📚 Documentation Overview

This migration has 5 guides to help you:

1. **STEP-0-BASTION-SETUP.md** ⬅️ **START HERE**
   - Set up bastion host (jump server)
   - Create SSH key pair
   - Configure security groups
   - Test connections

2. **RDS-CONNECTION-GUIDE.md**
   - Detailed connection methods
   - SSH tunnel setup
   - Troubleshooting
   - Windows/Linux/Mac instructions

3. **QUICK-REFERENCE-RDS-MIGRATION.md**
   - Quick command reference
   - Common issues
   - One-liners for experienced users

4. **rds-migration-steps.ps1** (Windows)
   - Automated PowerShell script
   - Handles entire migration process

5. **rds-migration-steps.sh** (Linux/Mac)
   - Automated bash script
   - Handles entire migration process

---

## 🚀 Quick Start (3 Steps)

### Step 0: Setup Bastion Host (First Time Only)
👉 Follow **STEP-0-BASTION-SETUP.md**

Summary:
1. Create EC2 key pair in AWS Console
2. Create security group for bastion
3. Launch t2.micro EC2 instance in public subnet
4. Test SSH connection
5. Update RDS security group

**Time:** ~15 minutes  
**Cost:** Free tier or ~$0.01/hour

### Step 1: Prepare Migration Script
```powershell
# Open the migration script
notepad rds-migration-steps.ps1

# Update these values:
$BASTION_KEY_PATH = "C:\Users\stars\.ssh\psychic-chat-bastion-key.pem"
$BASTION_IP = "YOUR_BASTION_PUBLIC_IP"
$RDS_ENDPOINT = "YOUR_RDS_ENDPOINT"
$RDS_PASSWORD = "YOUR_RDS_PASSWORD"
```

**Time:** ~2 minutes

### Step 2: Run Migration
```powershell
cd C:\Users\stars\OneDrive\Documents\psychic-chat-poc
.\rds-migration-steps.ps1
```

**Time:** ~5-10 minutes (depending on database size)

---

## 📋 Prerequisites Checklist

Before you start, make sure you have:

### AWS Resources
- [ ] AWS Account with admin access
- [ ] VPC created (`psychic-chat-vpc`)
- [ ] Public subnet in VPC
- [ ] Private subnet in VPC
- [ ] RDS PostgreSQL instance created (or ready to create)
- [ ] RDS instance in "Available" state

### Local Machine
- [ ] Windows 10/11 with PowerShell
- [ ] PostgreSQL client installed
  ```powershell
  # Check if installed:
  psql --version
  
  # If not, download from:
  # https://www.postgresql.org/download/windows/
  ```
- [ ] SSH client (built into Windows 10/11)
- [ ] Database backup created
  ```powershell
  pg_dump psychic_chat > backup.sql
  ```

### Information Ready
- [ ] RDS endpoint address
- [ ] RDS master username (usually `postgres`)
- [ ] RDS master password
- [ ] VPC ID
- [ ] Public subnet ID
- [ ] Your current public IP address

---

## 🎯 Step-by-Step Process

### Phase 1: Setup Infrastructure (One-Time)

```
┌─────────────────────────────────────────┐
│ 1. Create EC2 Key Pair                  │
│    ↓                                     │
│ 2. Create Bastion Security Group        │
│    ↓                                     │
│ 3. Launch Bastion Host (t2.micro)       │
│    ↓                                     │
│ 4. Test SSH Connection                  │
│    ↓                                     │
│ 5. Update RDS Security Group            │
└─────────────────────────────────────────┘
```

**Follow:** STEP-0-BASTION-SETUP.md  
**Time:** 15 minutes  
**Cost:** Free tier or ~$0.01/hour

### Phase 2: Migrate Database

```
┌─────────────────────────────────────────┐
│ 1. Edit rds-migration-steps.ps1         │
│    ↓                                     │
│ 2. Run the script                        │
│    ↓                                     │
│ 3. Script creates SSH tunnel             │
│    ↓                                     │
│ 4. Script connects to RDS                │
│    ↓                                     │
│ 5. Script imports backup.sql            │
│    ↓                                     │
│ 6. Script verifies migration             │
└─────────────────────────────────────────┘
```

**Time:** 5-10 minutes  
**Automatic:** Yes

### Phase 3: Verify & Update

```
┌─────────────────────────────────────────┐
│ 1. Verify data imported correctly        │
│    ↓                                     │
│ 2. Update API .env file                  │
│    ↓                                     │
│ 3. Test application locally              │
│    ↓                                     │
│ 4. Update Lambda environment variables   │
│    ↓                                     │
│ 5. Deploy and test                       │
└─────────────────────────────────────────┘
```

**Time:** 10-15 minutes  
**Manual:** Yes

---

## 💻 For Experienced Users

If you're comfortable with AWS, here's the condensed version:

```powershell
# 1. Create bastion
aws ec2 create-key-pair --key-name psychic-chat-bastion-key --query 'KeyMaterial' --output text > ~/.ssh/psychic-chat-bastion-key.pem
aws ec2 run-instances --image-id ami-0c55b159cbfafe1f0 --instance-type t2.micro --key-name psychic-chat-bastion-key --security-group-ids sg-xxxxx --subnet-id subnet-xxxxx --associate-public-ip-address

# 2. Get info
$BASTION_IP = aws ec2 describe-instances --filters "Name=tag:Name,Values=psychic-chat-bastion" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
$RDS_ENDPOINT = aws rds describe-db-instances --db-instance-identifier psychic-chat-db --query 'DBInstances[0].Endpoint.Address' --output text

# 3. Update RDS security group
aws ec2 authorize-security-group-ingress --group-id <rds-sg> --protocol tcp --port 5432 --source-group <bastion-sg>

# 4. Create tunnel & migrate
ssh -i ~/.ssh/psychic-chat-bastion-key.pem -L 5433:$RDS_ENDPOINT:5432 ec2-user@$BASTION_IP -N -f
$env:PGPASSWORD = "your-password"
psql -h localhost -p 5433 -U postgres -d postgres -c "CREATE DATABASE psychic_chat;"
Get-Content backup.sql | psql -h localhost -p 5433 -U postgres -d psychic_chat
```

---

## 🔧 Common Issues & Solutions

### Issue: "psql: command not found"
**Solution:** Install PostgreSQL client
```powershell
# Download from: https://www.postgresql.org/download/windows/
# Or via Chocolatey:
choco install postgresql
```

### Issue: "Permission denied (publickey)"
**Solution:** Fix SSH key permissions
- Right-click .pem file → Properties → Security → Advanced
- Remove all users except yourself
- Grant only "Read" permission

### Issue: "Connection timed out"
**Solution:** Check security groups
- Bastion SG: Allows SSH (22) from your IP
- RDS SG: Allows PostgreSQL (5432) from bastion SG

### Issue: "Could not connect to server"
**Solution:** Verify tunnel is running
```powershell
Get-NetTCPConnection -LocalPort 5433
```

---

## 📊 Architecture Diagram

```
┌─────────────────────┐
│  Your Computer      │
│  (Windows)          │
│                     │
│  - PostgreSQL Client│
│  - SSH Tunnel       │
└──────────┬──────────┘
           │
           │ SSH Tunnel (port 22)
           │ Port Forward: 5433 → 5432
           │
           ▼
┌─────────────────────┐
│  Bastion Host       │
│  (EC2 - Public)     │
│                     │
│  - t2.micro         │
│  - Amazon Linux 2   │
│  - Public IP        │
└──────────┬──────────┘
           │
           │ PostgreSQL (port 5432)
           │
           ▼
┌─────────────────────┐
│  RDS Instance       │
│  (Private Subnet)   │
│                     │
│  - PostgreSQL 15    │
│  - db.t3.micro      │
│  - No public IP     │
└─────────────────────┘
```

---

## 💰 Cost Breakdown

| Resource | Type | Cost |
|----------|------|------|
| Bastion Host | t2.micro | $8.50/month (or Free Tier) |
| RDS Instance | db.t3.micro | ~$15/month |
| Storage | 20 GB gp3 | ~$2.30/month |
| Data Transfer | Minimal | ~$1/month |
| **Total** | | **~$27/month** |

### Cost Saving Tips:
- Use Free Tier (12 months) if eligible
- Stop bastion when not needed (~$0.01/hour when running)
- Use smaller RDS instance for dev/test
- Delete bastion after migration (use VPN for admin tasks)

---

## 🔐 Security Best Practices

1. **Restrict SSH Access**
   - Only allow your IP in bastion security group
   - Update when your IP changes

2. **Use Strong Passwords**
   - RDS master password: 16+ characters
   - Store in AWS Secrets Manager

3. **Enable Encryption**
   - RDS encryption at rest: Enabled
   - Encryption in transit: SSL required

4. **Monitor Access**
   - Enable CloudWatch logs
   - Set up alerts for failed login attempts

5. **Minimal Exposure**
   - Stop bastion when not needed
   - Use AWS Systems Manager Session Manager (no public IP)

---

## 📝 Post-Migration Tasks

After successful migration:

### 1. Update Environment Variables

**Local (.env):**
```env
DB_HOST=localhost  # For testing via tunnel
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=your-rds-password
DB_NAME=psychic_chat
```

**Lambda/Production:**
```env
DB_HOST=psychic-chat-db.xxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-rds-password
DB_NAME=psychic_chat
```

### 2. Test Application
```powershell
# Keep tunnel open
# In another terminal:
cd api
npm start

# Test endpoints
curl http://localhost:3000/health
```

### 3. Update Lambda
- Update environment variables in AWS Console
- Or use AWS CLI:
```powershell
aws lambda update-function-configuration \
  --function-name psychic-chat-api \
  --environment "Variables={DB_HOST=your-rds-endpoint,DB_PORT=5432,DB_USER=postgres,DB_NAME=psychic_chat}"
```

### 4. Enable Backups
- Verify automated backups are enabled (7 days)
- Test restore procedure
- Document backup/restore process

### 5. Clean Up (Optional)
```powershell
# Stop bastion to save costs
aws ec2 stop-instances --instance-ids i-xxxxx

# Or terminate if no longer needed
aws ec2 terminate-instances --instance-ids i-xxxxx
```

---

## 🆘 Getting Help

### Documentation
- **STEP-0-BASTION-SETUP.md** - Bastion setup guide
- **RDS-CONNECTION-GUIDE.md** - Detailed connection guide
- **QUICK-REFERENCE-RDS-MIGRATION.md** - Quick reference

### AWS Resources
- [RDS Documentation](https://docs.aws.amazon.com/rds/)
- [EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [VPC Documentation](https://docs.aws.amazon.com/vpc/)

### Troubleshooting
- Check CloudWatch logs
- Review security group rules
- Verify network connectivity
- Test each component individually

---

## ✅ Success Criteria

You've successfully migrated when:

- [ ] Can connect to RDS via tunnel
- [ ] All tables imported correctly
- [ ] Row counts match local database
- [ ] Application can query RDS
- [ ] No errors in application logs
- [ ] Lambda can connect to RDS
- [ ] End-to-end functionality works

---

## 🎉 You're Ready!

**Start with:** STEP-0-BASTION-SETUP.md

Good luck with your migration! 🚀
