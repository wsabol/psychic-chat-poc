# Troubleshooting RDS Connection

You're getting "Cannot connect to RDS" - let's diagnose the issue step by step.

## Step 1: Verify RDS is Running

Go to AWS Console > RDS > Databases

Check your database:
- **Status:** Should be "Available" (not "Stopped" or "Creating")
- **Endpoint:** Verify it matches: `psychic-db.cw1a2ak00w4x.us-east-1.rds.amazonaws.com`
- **Port:** Should be 5432

## Step 2: Verify RDS Password

The script is using password: `postgres`

Is this the correct master password you set when creating the RDS instance?
- If NO: Update the password in `rds-migration-steps.ps1` line 9
- If you don't remember: Reset the password in AWS Console (RDS > Databases > Modify)

## Step 3: Check Security Groups

### RDS Security Group

1. AWS Console > RDS > Databases > [your-database]
2. Click on "Connectivity & security" tab
3. Under "Security", click on the VPC security group link
4. Check "Inbound rules":

**Required rule:**
```
Type: PostgreSQL
Protocol: TCP
Port: 5432
Source: sg-xxxxx (the bastion security group ID)
Description: Access from bastion host
```

### Find Bastion Security Group ID

1. AWS Console > EC2 > Instances
2. Select "psychic-chat-bastion"
3. Look for "Security groups" - copy the security group ID (sg-xxxxx)

### Add Rule if Missing

1. Go to RDS security group
2. Click "Edit inbound rules"
3. Click "Add rule"
4. Type: PostgreSQL
5. Source: Custom > paste bastion security group ID
6. Click "Save rules"

## Step 4: Test from Bastion Host Directly

Let's test if the bastion can reach RDS:

```powershell
ssh -i C:\Users\stars\.ssh\psychic-chat-bastion-key.pem ec2-user@44.200.210.231
```

Once connected to bastion, run:

```bash
# Test if RDS port is reachable
telnet psychic-db.cw1a2ak00w4x.us-east-1.rds.amazonaws.com 5432

# Or use nc (netcat)
nc -zv psychic-db.cw1a2ak00w4x.us-east-1.rds.amazonaws.com 5432
```

**Expected output:**
- "Connected to..." = Good! Network is working
- "Connection refused" or "timeout" = Security group issue

Type `exit` to leave bastion.

## Step 5: Check VPC Configuration

Both bastion and RDS must be in the same VPC:

1. AWS Console > EC2 > Instances > psychic-chat-bastion
   - Note the VPC ID

2. AWS Console > RDS > Databases > [your-database]
   - Note the VPC ID

**They must match!**

## Step 6: Verify Endpoint is Correct

```powershell
# Get RDS endpoint via AWS CLI
aws rds describe-db-instances --query "DBInstances[*].[DBInstanceIdentifier,Endpoint.Address,DBInstanceStatus]" --output table
```

This will show all your RDS instances and their endpoints.

## Step 7: Manual Connection Test

Try connecting manually with verbose output:

```powershell
# In your PowerShell (with tunnel running)
$env:PGPASSWORD = "postgres"
psql -h localhost -p 5433 -U postgres -d postgres -v
```

This will show more detailed error messages.

## Common Issues & Solutions

### Issue: "Connection timed out"
**Cause:** Security group not allowing traffic
**Fix:** Add rule allowing port 5432 from bastion security group

### Issue: "password authentication failed"
**Cause:** Wrong password
**Fix:** 
1. AWS Console > RDS > Databases > [your-db] > Modify
2. New master password
3. Apply immediately

### Issue: "could not translate host name"
**Cause:** Wrong endpoint
**Fix:** Copy correct endpoint from AWS Console

### Issue: "Connection refused"
**Cause:** RDS not running or wrong port
**Fix:** Check RDS status is "Available"

## Quick Checklist

- [ ] RDS status is "Available"
- [ ] RDS endpoint matches script configuration
- [ ] RDS password is correct
- [ ] RDS security group allows port 5432 from bastion security group
- [ ] Bastion and RDS are in same VPC
- [ ] Can telnet to RDS:5432 from bastion host

## Next Steps

After fixing the issue, run the migration script again:

```powershell
.\rds-migration-steps.ps1
```

## Get Help Commands

```powershell
# List all RDS instances
aws rds describe-db-instances --query "DBInstances[*].[DBInstanceIdentifier,Endpoint.Address,DBInstanceStatus,VpcId]" --output table

# List all security groups
aws ec2 describe-security-groups --query "SecurityGroups[*].[GroupId,GroupName,VpcId]" --output table

# Get bastion security group
aws ec2 describe-instances --filters "Name=tag:Name,Values=psychic-chat-bastion" --query "Reservations[0].Instances[0].SecurityGroups[*].[GroupId,GroupName]" --output table

# Get RDS security groups
aws rds describe-db-instances --db-instance-identifier psychic-chat-db --query "DBInstances[0].VpcSecurityGroups[*].[VpcSecurityGroupId,Status]" --output table
```
