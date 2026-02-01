# Connecting to RDS via Bastion Host

## Overview
Since your RDS instance is in a private subnet with no public access, you need to connect through a bastion host (jump server) in the public subnet.

## Prerequisites
- Bastion host EC2 instance running in a public subnet
- SSH key pair (.pem file) for the bastion host
- RDS endpoint information
- PostgreSQL client installed locally

## Method 1: SSH Tunnel (Recommended)

### Step 1: Set Up SSH Tunnel
Create an SSH tunnel from your local machine through the bastion host to RDS:

```bash
# Basic syntax
ssh -i /path/to/your-key.pem -L 5433:<rds-endpoint>:5432 ec2-user@<bastion-public-ip> -N

# Example:
ssh -i ~/.ssh/psychic-chat-bastion.pem -L 5433:psychic-chat-db.xxxxx.us-east-1.rds.amazonaws.com:5432 ec2-user@54.123.45.67 -N
```

**Explanation:**
- `-i`: Specifies your SSH key file
- `-L 5433:<rds-endpoint>:5432`: Creates local port forwarding
  - `5433`: Local port on your machine
  - `<rds-endpoint>`: Your RDS instance endpoint
  - `5432`: PostgreSQL port on RDS
- `ec2-user@<bastion-public-ip>`: Bastion host connection
- `-N`: Don't execute remote commands (tunnel only)

### Step 2: Connect to RDS Through Tunnel
Open a **new terminal window** (keep the SSH tunnel running) and connect:

```bash
# Export data (if not already done)
pg_dump psychic_chat > backup.sql

# Connect to RDS via tunnel
psql -h localhost -p 5433 -U postgres -d postgres

# Or import directly
psql -h localhost -p 5433 -U postgres -d psychic_chat < backup.sql
```

### Step 3: Create Database and Import
```sql
-- If database doesn't exist
CREATE DATABASE psychic_chat;
\q
```

```bash
# Import the backup
psql -h localhost -p 5433 -U postgres -d psychic_chat < backup.sql
```

## Method 2: Connect Directly from Bastion Host

### Step 1: Copy Backup File to Bastion
```bash
# Copy backup.sql to bastion host
scp -i /path/to/your-key.pem backup.sql ec2-user@<bastion-public-ip>:~/backup.sql
```

### Step 2: SSH into Bastion
```bash
ssh -i /path/to/your-key.pem ec2-user@<bastion-public-ip>
```

### Step 3: Install PostgreSQL Client (if not installed)
```bash
# On Amazon Linux 2
sudo yum update -y
sudo amazon-linux-extras install postgresql14 -y

# Or on Ubuntu
sudo apt-get update
sudo apt-get install postgresql-client -y
```

### Step 4: Connect to RDS and Import
```bash
# From bastion host
psql -h <rds-endpoint> -U postgres -d postgres

# Create database if needed
CREATE DATABASE psychic_chat;
\q

# Import data
psql -h <rds-endpoint> -U postgres -d psychic_chat < ~/backup.sql
```

## Security Group Configuration

### Bastion Host Security Group
**Inbound Rules:**
- SSH (22) from your IP address: `<your-ip>/32`

**Outbound Rules:**
- PostgreSQL (5432) to RDS security group
- HTTPS (443) for package updates

### RDS Security Group
**Inbound Rules:**
- PostgreSQL (5432) from Bastion security group
- PostgreSQL (5432) from Lambda security group

## Getting Your RDS Endpoint

```bash
# Via AWS CLI
aws rds describe-db-instances --db-instance-identifier <your-db-identifier> --query 'DBInstances[0].Endpoint.Address' --output text

# Or from AWS Console:
# RDS > Databases > [your-database] > Connectivity & security > Endpoint
```

## Troubleshooting

### Connection Refused
```bash
# Check security groups allow traffic
# Verify RDS is in "Available" state
# Confirm bastion can reach RDS:
telnet <rds-endpoint> 5432
```

### Authentication Failed
```bash
# Reset RDS master password in AWS Console
# RDS > Databases > [your-database] > Modify > New master password
```

### SSH Key Permissions Error
```bash
# Fix key permissions (Linux/Mac)
chmod 400 /path/to/your-key.pem

# Windows: Right-click .pem file > Properties > Security > Advanced
# Remove all users except yourself with Read permission only
```

## Testing Connection from Local API

After migration, update your `.env` file:

```env
DB_HOST=localhost  # When using SSH tunnel
DB_PORT=5433       # Local tunnel port
DB_USER=postgres
DB_PASSWORD=<your-rds-password>
DB_NAME=psychic_chat
```

Or for direct RDS connection (from Lambda/EC2):
```env
DB_HOST=<rds-endpoint>
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<your-rds-password>
DB_NAME=psychic_chat
```

## Quick Reference Commands

```bash
# 1. Create SSH tunnel (Terminal 1)
ssh -i ~/.ssh/key.pem -L 5433:rds-endpoint:5432 ec2-user@bastion-ip -N

# 2. Import database (Terminal 2)
psql -h localhost -p 5433 -U postgres -d psychic_chat < backup.sql

# 3. Test connection
psql -h localhost -p 5433 -U postgres -d psychic_chat -c "SELECT COUNT(*) FROM users;"
```

## Windows-Specific Instructions

### Using PuTTY for SSH Tunnel

1. **Convert .pem to .ppk:**
   - Open PuTTYgen
   - Load .pem file
   - Save private key as .ppk

2. **Configure PuTTY Tunnel:**
   - Session: Enter bastion IP
   - Connection > SSH > Auth: Browse to .ppk file
   - Connection > SSH > Tunnels:
     - Source port: `5433`
     - Destination: `<rds-endpoint>:5432`
     - Click "Add"
   - Click "Open"

3. **Connect via localhost:5433**

### Using Windows OpenSSH
Windows 10/11 has built-in OpenSSH:

```cmd
# Open PowerShell or CMD
ssh -i C:\path\to\key.pem -L 5433:<rds-endpoint>:5432 ec2-user@<bastion-ip> -N
```

## Next Steps After Migration

1. ✅ Verify all data imported correctly
2. ✅ Test application connections
3. ✅ Update Lambda environment variables
4. ✅ Set up automated backups
5. ✅ Configure CloudWatch monitoring
6. ✅ Remove local database dependency
