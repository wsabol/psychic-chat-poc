#!/bin/bash
# RDS Migration Script
# This script helps you migrate your PostgreSQL database to AWS RDS via bastion host

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== RDS Migration Helper ===${NC}"
echo ""

# Configuration - UPDATE THESE VALUES
BASTION_KEY_PATH="~/.ssh/psychic-chat-bastion.pem"
BASTION_IP="YOUR_BASTION_IP_HERE"
RDS_ENDPOINT="YOUR_RDS_ENDPOINT_HERE"
RDS_USER="postgres"
RDS_PASSWORD="YOUR_RDS_PASSWORD_HERE"
RDS_DATABASE="psychic_chat"
LOCAL_PORT="5433"
BACKUP_FILE="backup.sql"

echo -e "${YELLOW}Configuration:${NC}"
echo "Bastion IP: $BASTION_IP"
echo "RDS Endpoint: $RDS_ENDPOINT"
echo "RDS Database: $RDS_DATABASE"
echo "Local Port: $LOCAL_PORT"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: PostgreSQL client (psql) is not installed${NC}"
    echo "Install it with: brew install postgresql (Mac) or apt-get install postgresql-client (Linux)"
    exit 1
fi

# Check if SSH key exists
if [ ! -f "${BASTION_KEY_PATH/#\~/$HOME}" ]; then
    echo -e "${RED}Error: SSH key not found at $BASTION_KEY_PATH${NC}"
    echo "Please update BASTION_KEY_PATH in this script"
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${YELLOW}Warning: Backup file not found. Creating backup now...${NC}"
    pg_dump psychic_chat > backup.sql
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backup created successfully${NC}"
    else
        echo -e "${RED}Error: Failed to create backup${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Backup file exists${NC}"
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Function to check if SSH tunnel is running
check_tunnel() {
    lsof -i :$LOCAL_PORT &> /dev/null
    return $?
}

# Function to create SSH tunnel
create_tunnel() {
    echo -e "${YELLOW}Creating SSH tunnel...${NC}"
    echo "Running: ssh -i $BASTION_KEY_PATH -L $LOCAL_PORT:$RDS_ENDPOINT:5432 ec2-user@$BASTION_IP -N -f"
    
    ssh -i "${BASTION_KEY_PATH/#\~/$HOME}" -L $LOCAL_PORT:$RDS_ENDPOINT:5432 ec2-user@$BASTION_IP -N -f
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ SSH tunnel created successfully${NC}"
        sleep 2
        return 0
    else
        echo -e "${RED}Error: Failed to create SSH tunnel${NC}"
        return 1
    fi
}

# Function to close SSH tunnel
close_tunnel() {
    echo -e "${YELLOW}Closing SSH tunnel...${NC}"
    PID=$(lsof -ti :$LOCAL_PORT)
    if [ ! -z "$PID" ]; then
        kill $PID
        echo -e "${GREEN}✓ Tunnel closed${NC}"
    fi
}

# Main migration steps
echo -e "${GREEN}=== Starting Migration ===${NC}"
echo ""

# Step 1: Create SSH tunnel
echo -e "${YELLOW}Step 1: Creating SSH tunnel to RDS${NC}"
if check_tunnel; then
    echo -e "${YELLOW}Tunnel already exists on port $LOCAL_PORT${NC}"
    read -p "Close and recreate? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        close_tunnel
        create_tunnel
    fi
else
    create_tunnel
fi

if ! check_tunnel; then
    echo -e "${RED}Error: Tunnel is not running${NC}"
    exit 1
fi

echo ""

# Step 2: Test connection
echo -e "${YELLOW}Step 2: Testing connection to RDS${NC}"
PGPASSWORD=$RDS_PASSWORD psql -h localhost -p $LOCAL_PORT -U $RDS_USER -d postgres -c "SELECT version();" &> /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Connection successful${NC}"
else
    echo -e "${RED}Error: Cannot connect to RDS${NC}"
    echo "Please check:"
    echo "  - RDS endpoint is correct"
    echo "  - RDS password is correct"
    echo "  - Security groups allow bastion -> RDS on port 5432"
    close_tunnel
    exit 1
fi

echo ""

# Step 3: Create database (if needed)
echo -e "${YELLOW}Step 3: Creating database (if not exists)${NC}"
PGPASSWORD=$RDS_PASSWORD psql -h localhost -p $LOCAL_PORT -U $RDS_USER -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$RDS_DATABASE'" | grep -q 1

if [ $? -ne 0 ]; then
    echo "Creating database $RDS_DATABASE..."
    PGPASSWORD=$RDS_PASSWORD psql -h localhost -p $LOCAL_PORT -U $RDS_USER -d postgres -c "CREATE DATABASE $RDS_DATABASE;"
    echo -e "${GREEN}✓ Database created${NC}"
else
    echo -e "${GREEN}✓ Database already exists${NC}"
fi

echo ""

# Step 4: Import backup
echo -e "${YELLOW}Step 4: Importing backup to RDS${NC}"
echo "This may take a few minutes..."

PGPASSWORD=$RDS_PASSWORD psql -h localhost -p $LOCAL_PORT -U $RDS_USER -d $RDS_DATABASE < $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup imported successfully${NC}"
else
    echo -e "${RED}Error: Failed to import backup${NC}"
    close_tunnel
    exit 1
fi

echo ""

# Step 5: Verify migration
echo -e "${YELLOW}Step 5: Verifying migration${NC}"

# Count tables
TABLE_COUNT=$(PGPASSWORD=$RDS_PASSWORD psql -h localhost -p $LOCAL_PORT -U $RDS_USER -d $RDS_DATABASE -tc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo "Tables found: $TABLE_COUNT"

# Count users (if users table exists)
USER_COUNT=$(PGPASSWORD=$RDS_PASSWORD psql -h localhost -p $LOCAL_PORT -U $RDS_USER -d $RDS_DATABASE -tc "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
if [ ! -z "$USER_COUNT" ]; then
    echo "Users in database: $USER_COUNT"
fi

echo ""
echo -e "${GREEN}=== Migration Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Test your application with the new RDS endpoint"
echo "2. Update environment variables:"
echo "   DB_HOST=$RDS_ENDPOINT"
echo "   DB_PORT=5432"
echo "   DB_USER=$RDS_USER"
echo "   DB_NAME=$RDS_DATABASE"
echo "3. Close the SSH tunnel when done: kill \$(lsof -ti :$LOCAL_PORT)"
echo ""
echo -e "${YELLOW}Keep the tunnel open for testing, or close it with:${NC}"
echo "kill \$(lsof -ti :$LOCAL_PORT)"
