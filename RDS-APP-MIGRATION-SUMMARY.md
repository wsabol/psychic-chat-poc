# AWS RDS Application Migration Summary

## ✅ Migration Completed Successfully!

Your application has been updated to use AWS RDS instead of the local PostgreSQL database.

---

## 📝 Changes Made

### 1. Environment Files Updated

All `.env` files have been updated with AWS RDS connection details:

#### Files Modified:
- ✅ `.env` (root)
- ✅ `api/.env`
- ✅ `worker/.env`
- ✅ `lambdas/.env`

#### New Configuration:
```env
DATABASE_URL=postgres://postgres:ofnl*********@psychic-db.cw1a2ak00w4x.us-east-1.rds.amazonaws.com:5432/psychic_chat?sslmode=require
DB_HOST=psychic-db.cw1a2ak00w4x.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=ofnl*********
DB_NAME=psychic_chat
DB_SSL=true
```

### 2. Database Name Changed

Changed from `chatbot` to `psychic_chat` throughout the application:

- ✅ `docker-compose.yml` - Worker service DATABASE_URL
- ✅ `docker-compose.yml` - Local db service POSTGRES_DB
- ✅ `api/migrations/encrypt_audit_emails.js` - Default DB_NAME

### 3. Docker Compose Configuration

Updated `docker-compose.yml`:
- Worker service now uses `psychic_chat` database name
- Local PostgreSQL container (for fallback) also uses `psychic_chat`

---

## 🔌 Connection Methods

You have **two options** to connect to AWS RDS:

### Option 1: Direct SSL Connection (Current Setup) ✨ RECOMMENDED

Your `.env` files are configured for **direct SSL connection**:
- Uses `sslmode=require` in DATABASE_URL
- No SSH tunnel needed
- More straightforward for development
- Requires RDS security group to allow your IP address

**Pros:**
- ✅ Simpler setup
- ✅ No need to manage SSH tunnel
- ✅ Easier to troubleshoot

**Cons:**
- ❌ Less secure (direct exposure to internet)
- ❌ Need to update security group when IP changes

### Option 2: SSH Tunnel via Bastion (Alternative)

If you prefer using the SSH tunnel:

1. Start the tunnel:
```powershell
ssh -i "C:\Users\stars\.ssh\psychic-bastion-key.pem" -L 5432:psychic-db.cw1a2ak00w4x.us-east-1.rds.amazonaws.com:5432 -N ec2-user@3.85.225.109
```

2. Update DATABASE_URL in `.env` files to:
```env
DATABASE_URL=postgres://postgres:ofnl*********@localhost:5432/psychic_chat?sslmode=require
```

**Pros:**
- ✅ More secure (encrypted tunnel)
- ✅ No need to expose RDS to internet
- ✅ Best practice for production

**Cons:**
- ❌ Need to keep tunnel running
- ❌ More complex setup
- ❌ Extra step before starting app

---

## 🧪 Testing Your Connection

### Test the RDS Connection

Run the test script to verify everything is working:

```bash
node test-app-rds-connection.js
```

This will test:
1. ✅ Basic database connection
2. ✅ Database name verification (`psychic_chat`)
3. ✅ Check if tables exist
4. ✅ Verify users table access

---

## 🚀 Starting Your Application

### Option 1: Using Docker Compose (Local Development)

If you want to use the **local** PostgreSQL container:
```bash
docker-compose up
```

### Option 2: Using AWS RDS (Your Current Setup)

If you want to use **AWS RDS**:

1. **Make sure the app isn't using the local Docker database**
   - Stop Docker if running: `docker-compose down`
   
2. **Start services individually** (without the db container):
   ```bash
   # Start Redis only
   docker-compose up redis -d
   
   # Start API
   cd api && npm run dev
   
   # Start Worker (in new terminal)
   cd worker && npm run dev
   
   # Start Client (in new terminal)
   cd client && npm start
   ```

3. **Or update docker-compose.yml** to not depend on the local `db` service

---

## 📋 Your Questions Answered

### Q: Should I delete the old DATABASE_URL line?
**A:** ✅ **Already done!** The old localhost DATABASE_URL has been replaced with the RDS connection string.

### Q: Should I exit the SSH tunnel to the database?
**A:** Your choice:
- **Current setup:** You can exit the tunnel. The app is configured for direct SSL connection.
- **If you prefer tunnel:** Keep it running and update DATABASE_URL to use `localhost:5432`

### Q: The app had "chatbot" as the database name. What about that?
**A:** ✅ **Already fixed!** Changed to `psychic_chat` in:
- docker-compose.yml (2 places)
- api/migrations/encrypt_audit_emails.js

---

## 🔧 Troubleshooting

### Connection Fails?

1. **Check RDS Security Group**
   - Ensure your IP is allowed in the RDS security group
   - Port 5432 must be open

2. **Verify Environment Variables**
   ```bash
   # Check if DATABASE_URL is set correctly
   node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"
   ```

3. **Test Direct Connection**
   ```bash
   node test-rds-connection.ps1
   ```

4. **Check SSL Requirements**
   - Your RDS requires SSL (`sslmode=require`)
   - Make sure this is in your DATABASE_URL

### Common Issues

| Issue | Solution |
|-------|----------|
| "ECONNREFUSED" | Check security group, verify RDS is publicly accessible |
| "SSL Required" | Add `?sslmode=require` to DATABASE_URL |
| "Database does not exist" | Verify database name is `psychic_chat` |
| "Authentication failed" | Double-check password in .env file |

---

## 📚 Related Documentation

- `README-RDS-MIGRATION.md` - Complete migration guide
- `RDS-CONNECTION-GUIDE.md` - Detailed connection methods
- `STEP-0-BASTION-SETUP.md` - Bastion host setup
- `troubleshoot-rds-connection.md` - Troubleshooting guide
- `QUICK-REFERENCE-RDS-MIGRATION.md` - Quick reference

---

## ✨ Next Steps

1. ✅ Test the connection: `node test-app-rds-connection.js`
2. ✅ Start your application
3. ✅ Verify data is accessible
4. 🎉 Enjoy your AWS RDS powered app!

---

## 🔒 Security Reminders

- ✅ Never commit `.env` files to git (already in `.gitignore`)
- ✅ Keep your database password secure
- ✅ Regularly rotate RDS credentials
- ✅ Consider using AWS Secrets Manager for production
- ✅ Enable RDS encryption at rest (if not already enabled)
- ✅ Enable automated backups
- ✅ Monitor RDS performance metrics

---

**Migration completed on:** 2026-02-01  
**Database:** psychic_chat  
**RDS Instance:** psychic-db.cw1a2ak00w4x.us-east-1.rds.amazonaws.com  
**Connection Method:** Direct SSL Connection
