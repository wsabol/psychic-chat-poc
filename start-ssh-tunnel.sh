# Start SSH Tunnel to AWS RDS via Bastion Host
# 
# Your RDS instance is in a PRIVATE SUBNET and is NOT publicly accessible.
# This SSH tunnel is REQUIRED to connect to the database from your local machine.
#
# Usage: .\start-ssh-tunnel.ps1

echo ""
echo "🔐 Starting SSH Tunnel to AWS RDS..." -ForegroundColor Cyan
echo ""
echo "ℹ️  Your RDS is in a private subnet (IP: 10.0.138.223)" -ForegroundColor Yellow
echo "   This tunnel forwards localhost:5432 → RDS:5432 via bastion host" -ForegroundColor Yellow
echo ""
echo "RDS Endpoint:  psychic-db.cw1a2ak00w4x.us-east-1.rds.amazonaws.com" -ForegroundColor Gray
echo "Bastion Host:  44.200.210.231" -ForegroundColor Gray
echo "Local Port:    5433" -ForegroundColor Gray
echo ""
echo "⚠️  Keep this window open while using the app!" -ForegroundColor Yellow
echo "   Press Ctrl+C to stop the tunnel" -ForegroundColor Yellow
echo ""
echo "Starting tunnel..." -ForegroundColor Green

# Start the SSH tunnel
# -i: SSH key file
# -L: Local port forwarding (local:5432 → remote:5432)
# -N: Don't execute remote commands, just forward ports
# ec2-user: Default user for Amazon Linux 2

ssh -i "./psychic-chat-bastion-key.pem" \
    -L 5433:psychic-db.cw1a2ak00w4x.us-east-1.rds.amazonaws.com:5432 \
    -N ec2-user@44.200.210.231

echo ""
echo "❌ Tunnel closed" -ForegroundColor Red
