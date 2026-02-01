# Step 0: Bastion Host Setup

This guide walks you through setting up a bastion host (jump server) to access your RDS instance.

## What is a Bastion Host?

A bastion host is a server that sits in your public subnet and acts as a secure gateway to access resources in your private subnets (like your RDS database). It's the only entry point to your private network.

## Prerequisites
- AWS Account with appropriate permissions
- VPC with public and private subnets created
- RDS instance in private subnet (or ready to create)

---

## Step 1: Create EC2 Key Pair

### Via AWS Console:

1. **Navigate to EC2:**
   - Open AWS Console
   - Search for "EC2" or go to: https://console.aws.amazon.com/ec2/

2. **Create Key Pair:**
   - In left sidebar, click **"Key Pairs"** (under Network & Security)
   - Click **"Create key pair"** button
   
3. **Configure Key Pair:**
   ```
   Name: psychic-chat-bastion-key
   Key pair type: RSA
   Private key file format: .pem (for OpenSSH)
   ```
   
4. **Download:**
   - Click **"Create key pair"**
   - The .pem file will automatically download
   - **IMPORTANT:** Save this file - you cannot download it again!

5. **Move Key to SSH Directory:**
   ```powershell
   # Create .ssh directory if it doesn't exist
   New-Item -ItemType Directory -Force -Path C:\Users\stars\.ssh
   
   # Move the downloaded key
   Move-Item -Path "$env:USERPROFILE\Downloads\psychic-chat-bastion-key.pem" -Destination "C:\Users\stars\.ssh\psychic-chat-bastion-key.pem"
   ```

6. **Set Permissions (Windows):**
   - Right-click on `C:\Users\stars\.ssh\psychic-chat-bastion-key.pem`
   - Properties > Security > Advanced
   - Click "Disable inheritance" > "Convert inherited permissions into explicit permissions"
   - **REMOVE these:**
     - ❌ SYSTEM
     - ❌ Administrators (Starship\Administrators)
   - **KEEP only:**
     - ✅ starshiptechnology1@gmail.com (your Microsoft account)
   - Click on `starshiptechnology1@gmail.com` and ensure it has **ONLY "Read"** permission
     - Uncheck: Full control, Modify, Write
     - Check: Read only
   - Click OK

### Via AWS CLI:

```bash
# Create key pair and save to file
aws ec2 create-key-pair --key-name psychic-chat-bastion-key --query 'KeyMaterial' --output text > C:\Users\stars\.ssh\psychic-chat-bastion-key.pem

# Note: You'll still need to set permissions manually on Windows
```

---

## Step 2: Create Bastion Host Security Group

### Via AWS Console:

1. **Navigate to Security Groups:**
   - EC2 > Network & Security > Security Groups
   - Click **"Create security group"**

2. **Basic Details:**
   ```
   Security group name: psychic-chat-bastion-sg
   Description: Security group for bastion host
   VPC: psychic-chat-vpc (select your VPC)
   ```

3. **Inbound Rules:**
   Click **"Add rule"**:
   ```
   Type: SSH
   Protocol: TCP
   Port: 22
   Source: My IP (or Custom: your-ip-address/32)
   Description: SSH from my IP
   ```
   
   **IMPORTANT:** Restrict to your IP for security!

4. **Outbound Rules:**
   Default (All traffic) is fine, or restrict to:
   ```
   Type: HTTPS
   Port: 443
   Destination: 0.0.0.0/0
   Description: Package updates
   
   Type: PostgreSQL
   Port: 5432
   Destination: <RDS-security-group-id>
   Description: Access to RDS
   ```

5. **Click "Create security group"**

### Via AWS CLI:

```bash
# Get your public IP
$MY_IP = (Invoke-WebRequest -Uri "https://api.ipify.org").Content

# Create security group
aws ec2 create-security-group --group-name psychic-chat-bastion-sg --description "Bastion host security group" --vpc-id vpc-xxxxx

# Add SSH inbound rule
aws ec2 authorize-security-group-ingress --group-id sg-xxxxx --protocol tcp --port 22 --cidr "$MY_IP/32"
```

---

## Step 3: Launch Bastion Host EC2 Instance

### Via AWS Console:

1. **Launch Instance:**
   - EC2 Dashboard > Click **"Launch Instance"**

2. **Name and Tags:**
   ```
   Name: psychic-chat-bastion
   ```

3. **Choose AMI (Amazon Machine Image):**
   ```
   Select: Amazon Linux 2023 kernel-6.1 AMI
   
   You'll see two kernel versions:
   - Amazon Linux 2023 kernel-6.1 AMI ✅ Choose this one (LTS - Long Term Support)
   - Amazon Linux 2023 kernel-6.12 AMI (newer, but 6.1 is more stable)
   
   Architecture: 64-bit (x86_64) - NOT ARM
   
   Look for the "Free tier eligible" badge
   ```

4. **Instance Type:**
   ```
   t2.micro (Free tier eligible)
   or
   t3.micro (Better performance, still cheap)
   ```

5. **Key Pair:**
   ```
   Select: psychic-chat-bastion-key (the one you just created)
   ```

6. **Network Settings:**
   Click **"Edit"**:
   ```
   VPC: psychic-chat-vpc
   Subnet: Public subnet (us-east-1a or your public subnet)
   Auto-assign public IP: Enable
   Firewall (security groups): Select existing security group
   Security groups: psychic-chat-bastion-sg
   ```

7. **Storage:**
   ```
   8 GB gp3 (default is fine)
   ```

8. **Advanced Details:**
   
   **You can SKIP this section** - just click "Launch instance" at the bottom
   
   **Optional:** If you want to automatically install PostgreSQL client on the bastion when it starts:
   - Scroll down to "User data" section
   - Click to expand "Advanced details"
   - In the "User data" text box, paste:
   ```bash
   #!/bin/bash
   yum update -y
   amazon-linux-extras install postgresql14 -y
   ```
   
   **What does this do?** This script runs automatically when the bastion starts, installing PostgreSQL client. You can skip this and install it manually later if needed (see Step 6).
   
   **Recommendation:** Skip this for now. You don't need PostgreSQL on the bastion - only on your local Windows machine.

9. **Review and Launch:**
   - Click **"Launch instance"**
   - Wait for instance state to become "Running"

10. **Get Public IP:**
    - Select your instance
    - Copy the "Public IPv4 address" (e.g., 54.123.45.67)

### Via AWS CLI:

```bash
# Launch instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t2.micro \
  --key-name psychic-chat-bastion-key \
  --security-group-ids sg-xxxxx \
  --subnet-id subnet-xxxxx \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=psychic-chat-bastion}]'
```

---

## Step 4: Test Bastion Connection

### Windows (PowerShell or CMD):

```powershell
# Test SSH connection
ssh -i C:\Users\stars\.ssh\psychic-chat-bastion-key.pem ec2-user@<bastion-public-ip>

# If successful, you'll see:
# [ec2-user@ip-xxx-xxx-xxx-xxx ~]$

# Type 'exit' to logout
```

### Common Issues:

**"Permission denied (publickey)"**
- Check key file permissions (see Step 1)
- Verify you're using correct username (`ec2-user` for Amazon Linux)

**"Connection timed out"**
- Check security group allows SSH from your IP
- Verify bastion is in public subnet
- Ensure public IP is assigned

**"Host key verification failed"**
```powershell
# Remove old host key and try again
Remove-Item C:\Users\stars\.ssh\known_hosts -ErrorAction SilentlyContinue
```

---

## Step 5: Update RDS Security Group

Your RDS instance needs to allow connections from the bastion host.

### Via AWS Console:

1. **Find RDS Security Group:**
   - RDS > Databases > [your-db] > Connectivity & security > VPC security groups

2. **Edit Inbound Rules:**
   - Click the security group link
   - Click **"Edit inbound rules"**
   - Click **"Add rule"**:
   ```
   Type: PostgreSQL
   Protocol: TCP
   Port: 5432
   Source: Custom > sg-xxxxx (psychic-chat-bastion-sg)
   Description: Access from bastion host
   ```
   - Click **"Save rules"**

### Via AWS CLI:

```bash
# Add rule to RDS security group
aws ec2 authorize-security-group-ingress \
  --group-id <rds-security-group-id> \
  --protocol tcp \
  --port 5432 \
  --source-group <bastion-security-group-id>
```

---

## Step 6: Install PostgreSQL Client (Optional - on Bastion)

If you want to run commands directly from the bastion host:

```bash
# SSH into bastion
ssh -i C:\Users\stars\.ssh\psychic-chat-bastion-key.pem ec2-user@<bastion-public-ip>

# Install PostgreSQL client
sudo yum update -y
sudo amazon-linux-extras install postgresql14 -y

# Verify installation
psql --version
```

---

## Step 7: Get Ready for Migration

Now collect all the information you need:

### 1. Bastion Information:
```powershell
# Get bastion public IP
aws ec2 describe-instances --filters "Name=tag:Name,Values=psychic-chat-bastion" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
```

### 2. RDS Information:
```powershell
# Get RDS endpoint
aws rds describe-db-instances --db-instance-identifier psychic-chat-db --query 'DBInstances[0].Endpoint.Address' --output text

# Get RDS status
aws rds describe-db-instances --db-instance-identifier psychic-chat-db --query 'DBInstances[0].DBInstanceStatus' --output text
```

### 3. Update Migration Script:

Edit `rds-migration-steps.ps1`:

```powershell
notepad C:\Users\stars\OneDrive\Documents\psychic-chat-poc\rds-migration-steps.ps1
```

Update these values:
```powershell
$BASTION_KEY_PATH = "C:\Users\stars\.ssh\psychic-chat-bastion-key.pem"
$BASTION_IP = "54.123.45.67"  # Your bastion public IP
$RDS_ENDPOINT = "psychic-chat-db.xxxxx.us-east-1.rds.amazonaws.com"  # Your RDS endpoint
$RDS_PASSWORD = "your-rds-master-password"  # Password you set when creating RDS
```

---

## Step 8: Verification Checklist

Before running the migration script, verify:

- [ ] Bastion host is running (State: running)
- [ ] Bastion has public IP assigned
- [ ] Can SSH into bastion from your computer
- [ ] SSH key file (.pem) is in correct location
- [ ] SSH key has correct permissions
- [ ] RDS instance is available (Status: available)
- [ ] RDS security group allows bastion (port 5432)
- [ ] Bastion security group allows your IP (port 22)
- [ ] Have RDS endpoint address
- [ ] Know RDS master password
- [ ] PostgreSQL client installed on local machine
- [ ] backup.sql file exists in project directory

### Quick Test:

```powershell
# 1. Test SSH to bastion
ssh -i C:\Users\stars\.ssh\psychic-chat-bastion-key.pem ec2-user@<bastion-ip> "echo 'Bastion connection successful!'"

# 2. Test if bastion can reach RDS
ssh -i C:\Users\stars\.ssh\psychic-chat-bastion-key.pem ec2-user@<bastion-ip> "timeout 5 bash -c '</dev/tcp/<rds-endpoint>/5432' && echo 'RDS is reachable' || echo 'Cannot reach RDS'"
```

---

## Step 9: Run the Migration

You're now ready! 

```powershell
cd C:\Users\stars\OneDrive\Documents\psychic-chat-poc
.\rds-migration-steps.ps1
```

---

## Architecture Overview

```
Your Computer (Windows)
    |
    | SSH (port 22)
    |
    v
Bastion Host (Public Subnet)
    |
    | PostgreSQL (port 5432)
    |
    v
RDS Instance (Private Subnet)
```

---

## Cost Estimate

- **Bastion Host (t2.micro):** ~$8.50/month (or free if within Free Tier)
- **Alternative:** Terminate bastion when not needed, only pay for hours used (~$0.0116/hour)

### To Stop Bastion (Save Costs):

```powershell
# Stop instance
aws ec2 stop-instances --instance-ids i-xxxxx

# Start when needed
aws ec2 start-instances --instance-ids i-xxxxx
```

---

## Security Best Practices

1. **Restrict SSH Access:**
   - Only allow SSH from your IP
   - Use AWS Systems Manager Session Manager instead of SSH (more secure)

2. **Use Key Pairs:**
   - Never use password authentication
   - Rotate keys periodically

3. **Monitor Access:**
   - Enable CloudWatch logging
   - Set up alerts for unauthorized access attempts

4. **Minimal Software:**
   - Only install necessary packages
   - Keep OS updated

5. **Terminate When Not Needed:**
   - Stop or terminate bastion after migration
   - Use AWS Systems Manager for admin tasks

---

## Alternative: AWS Systems Manager Session Manager

For even better security (no SSH keys needed):

1. Create IAM role with `AmazonSSMManagedInstanceCore` policy
2. Attach role to bastion instance
3. Connect via AWS Console or CLI:
   ```powershell
   aws ssm start-session --target i-xxxxx
   ```

This eliminates the need to expose port 22 to the internet!

---

## Next Steps

Once you've completed this setup:
1. Run `rds-migration-steps.ps1` to migrate your database
2. Test your application with RDS
3. Update Lambda environment variables
4. (Optional) Stop or terminate bastion to save costs

## Troubleshooting Resources

- [AWS Bastion Host Best Practices](https://aws.amazon.com/solutions/implementations/linux-bastion/)
- [EC2 Key Pair Documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html)
- [VPC Security Groups](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html)
