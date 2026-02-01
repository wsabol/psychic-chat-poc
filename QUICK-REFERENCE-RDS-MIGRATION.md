# Quick Reference: RDS Migration via Bastion Host

## Prerequisites Checklist
- [ ] RDS instance created and available
- [ ] Bastion host EC2 instance running in public subnet
- [ ] SSH key pair (.pem file) downloaded
- [ ] PostgreSQL client installed locally
- [ ] Backup file created: `backup.sql`
- [ ] RDS endpoint, username, and password ready

## One-Time Setup

### 1. Get Your RDS Endpoint
```bash
# AWS Console: RDS > Databases > [your-db] > Connectivity & security > Endpoint
# Or via CLI:
aws rds describe-db-instances --db-instance-identifier psychic-chat-db --query 'DBInstances[0].Endpoint.Address' --output text
```

### 2. Get Your Bastion Host Public IP
```bash
# AWS Console: EC2 > Instances > [bastion-instance] > Public IPv4 address
# Or via CLI:
aws ec2 describe-instances --filters "Name=tag:Name,Values=psychic-chat-bastion" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
```

### 3. Configure Security Groups

**Bastion Security Group:**
- Inbound: SSH (22) from your IP
- Outbound: PostgreSQL (5432) to RDS security group

**RDS Security Group:**
- Inbound: PostgreSQL (5432) from Bastion security group
- Inbound: PostgreSQL (5432) from Lambda security group

## Quick Migration (3 Commands)

### Windows (PowerShell)
```powershell
# 1. Open PowerShell and navigate to project directory
cd C:\Users\stars\OneDrive\Documents\psychic-chat-poc

# 2. Edit the PowerShell script with your values
notepad rds-migration-steps.ps1

# 3. Run the migration
.\rds-migration-steps.ps1
```

### Linux/Mac (Bash)
```bash
# 1. Make script executable
chmod +x rds-migration-steps.sh

# 2. Edit the script with your values
nano rds-migration-steps.sh

# 3. Run the migration
./rds-migration-steps.sh
```

## Manual Migration Steps

### Windows (PowerShell)

```powershell
# Terminal 1: Create SSH Tunnel
ssh -i C:\Users\stars\.ssh\psychic-chat-bastion.pem -L 5433:your-rds-endpoint:5432 ec2-user@bastion-ip -N

# Terminal 2: Import Database
$env:PGPASSWORD = "your-rds-password"
psql -h localhost -p 5433 -U postgres -d postgres -c "CREATE DATABASE psychic_chat;"
Get-Content backup.sql | psql -h localhost -p 5433 -U postgres -d psychic_chat

# Verify
psql -h localhost -p 5433 -U postgres -d psychic_chat -c "SELECT COUNT(*) FROM users;"
```

### Linux/Mac (Bash)

```bash
# Terminal 1: Create SSH Tunnel
ssh -i ~/.ssh/psychic-chat-bastion.pem -L 5433:your-rds-endpoint:5432 ec2-user@bastion-ip -N

# Terminal 2: Import Database
export PGPASSWORD="your-rds-password"
psql -h localhost -p 5433 -U postgres -d postgres -c "CREATE DATABASE psychic_chat;"
psql -h localhost -p 5433 -U postgres -d psychic_chat < backup.sql

# Verify
psql -h localhost -p 5433 -U postgres -d psychic_chat -c "SELECT COUNT(*) FROM users;"
```

## Test Connection

```bash
# Via tunnel (local testing)
psql -h localhost -p 5433 -U postgres -d psychic_chat -c "SELECT version();"

# Direct from AWS (Lambda will use this)
psql -h your-rds-endpoint -p 5432 -U postgres -d psychic_chat -c "SELECT version();"
```

## Update Environment Variables

### Local Testing (.env)
```env
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=your-rds-password
DB_NAME=psychic_chat
```

### Production/Lambda (.env)
```env
DB_HOST=your-rds-endpoint.xxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-rds-password
DB_NAME=psychic_chat
```

## Troubleshooting

### Issue: "Connection refused"
```bash
# Check if tunnel is running
# Windows:
Get-NetTCPConnection -LocalPort 5433

# Linux/Mac:
lsof -i :5433

# Check if RDS is available
aws rds describe-db-instances --db-instance-identifier psychic-chat-db --query 'DBInstances[0].DBInstanceStatus'
```

### Issue: "Authentication failed"
- Verify RDS password is correct
- Reset password: AWS Console > RDS > Databases > [your-db] > Modify > New master password

### Issue: "Permission denied (publickey)"
```bash
# Windows: Fix SSH key permissions
# Right-click .pem file > Properties > Security > Advanced
# Remove all users except yourself (Read only)

# Linux/Mac:
chmod 400 ~/.ssh/psychic-chat-bastion.pem
```

### Issue: "Timeout connecting to RDS"
- Verify security group allows Bastion -> RDS on port 5432
- Check RDS is in correct VPC and subnet
- Ensure RDS is in "Available" state

## Closing the SSH Tunnel

### Windows
```powershell
# Find process using port 5433
Get-NetTCPConnection -LocalPort 5433 | Select-Object OwningProcess
Stop-Process -Id <process-id>

# Or use Task Manager to end SSH process
```

### Linux/Mac
```bash
# Find and kill process
lsof -ti :5433 | xargs kill

# Or use Ctrl+C in the tunnel terminal
```

## AWS CLI Helpers

```bash
# List all RDS instances
aws rds describe-db-instances --query 'DBInstances[*].[DBInstanceIdentifier,Endpoint.Address,DBInstanceStatus]' --output table

# Check security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxx --query 'SecurityGroups[0].IpPermissions'

# Test connection from bastion (after SSH into bastion)
telnet your-rds-endpoint 5432
```

## Post-Migration Checklist
- [ ] Data imported successfully
- [ ] Table counts match local database
- [ ] Can query data via tunnel
- [ ] API connects successfully to RDS
- [ ] Lambda environment variables updated
- [ ] Application tested end-to-end
- [ ] Backups configured (7 days retention)
- [ ] CloudWatch monitoring enabled
- [ ] Close SSH tunnel when not needed

## Files Created
- `RDS-CONNECTION-GUIDE.md` - Comprehensive guide
- `rds-migration-steps.ps1` - Windows automated script
- `rds-migration-steps.sh` - Linux/Mac automated script
- `QUICK-REFERENCE-RDS-MIGRATION.md` - This file
