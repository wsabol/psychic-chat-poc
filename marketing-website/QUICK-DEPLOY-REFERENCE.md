# ⚡ Quick Deploy Reference - Starship Psychics Marketing Website

**Last Updated:** February 2026  
**Deployment Time:** 10-30 minutes  
**Monthly Cost:** $1-5

---

## 🎯 Three-Step Deploy (Fastest Path)

### 1️⃣ Prerequisites (5 min)
```powershell
# Install AWS CLI (Windows)
# Download: https://awscli.amazonaws.com/AWSCLIV2.msi

# Configure credentials
aws configure
# Enter your AWS Access Key, Secret Key, region (us-east-1), output (json)
```

### 2️⃣ Deploy (3 min)
```powershell
# Navigate to marketing website folder
cd marketing-website

# Run deployment script (Windows)
.\deploy.ps1 -BucketName "starshippsychics-marketing" -CreateBucket

# Or for Mac/Linux
chmod +x deploy.sh
./deploy.sh -b starshippsychics-marketing --create-bucket
```

### 3️⃣ Test (2 min)
```
Visit: http://starshippsychics-marketing.s3-website-us-east-1.amazonaws.com
```

✅ **DONE!** Your website is live!

---

## 📋 Available Files & Guides

| File | Purpose | When to Use |
|------|---------|-------------|
| **DEPLOY-TODAY.md** | Complete step-by-step guide | First-time deployment, need detailed instructions |
| **pre-deployment-checklist.md** | Pre-flight checks | Before starting deployment |
| **AWS-DEPLOYMENT-GUIDE.md** | Comprehensive AWS guide | Reference, CloudFront setup, troubleshooting |
| **README.md** | Website overview | Understanding website features |
| **deploy.ps1** | PowerShell deployment script | Automated deployment (Windows) |
| **deploy.sh** | Bash deployment script | Automated deployment (Mac/Linux) |

---

## 🚀 Deployment Commands Cheat Sheet

### First Time (Create Bucket)
```powershell
# Windows
.\deploy.ps1 -BucketName "your-bucket-name" -CreateBucket

# Mac/Linux
./deploy.sh -b your-bucket-name --create-bucket
```

### Update Website
```powershell
# Windows
.\deploy.ps1 -BucketName "your-bucket-name"

# Mac/Linux
./deploy.sh -b your-bucket-name
```

### With CloudFront (After initial setup)
```powershell
# Windows
.\deploy.ps1 -BucketName "your-bucket-name" -DistributionId "E1234567ABC"

# Mac/Linux
./deploy.sh -b your-bucket-name -d E1234567ABC
```

### Different Region
```powershell
# Windows
.\deploy.ps1 -BucketName "your-bucket-name" -Region "us-west-2" -CreateBucket

# Mac/Linux
./deploy.sh -b your-bucket-name -r us-west-2 --create-bucket
```

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| **AWS CLI not found** | Install from https://aws.amazon.com/cli/ |
| **Credentials error** | Run `aws configure` and enter your keys |
| **Bucket name taken** | Try different name (must be globally unique) |
| **Access Denied** | Check bucket policy, verify public access enabled |
| **403 Forbidden** | Verify static website hosting is enabled |
| **Images not loading** | Check file names (case-sensitive), re-upload |
| **Script won't run (Windows)** | `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| **Script won't run (Mac/Linux)** | `chmod +x deploy.sh` |

---

## 🔗 Important URLs

### AWS Resources
- **AWS Console:** https://console.aws.amazon.com
- **S3 Service:** https://s3.console.aws.amazon.com
- **IAM (Credentials):** https://console.aws.amazon.com/iam/
- **CloudFront:** https://console.aws.amazon.com/cloudfront/
- **Certificate Manager:** https://console.aws.amazon.com/acm/

### Documentation
- **AWS CLI Install:** https://aws.amazon.com/cli/
- **S3 Static Hosting:** https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html
- **CloudFront Docs:** https://docs.aws.amazon.com/cloudfront/

---

## 💰 Cost Calculator

### S3 Only (HTTP)
- Storage: $0.023/GB (~$0.10 for typical site)
- Requests: $0.0004 per 1,000 requests (~$0.20 for 500k views)
- Data Transfer: First 100GB free, then $0.09/GB
- **Typical Monthly Total:** $0.50 - $2.00

### S3 + CloudFront (HTTPS)
- S3: ~$0.50
- CloudFront: $0.085/GB for first 10TB (~$1-3 for low traffic)
- SSL Certificate: FREE
- **Typical Monthly Total:** $1.00 - $5.00

### AWS Free Tier (First 12 Months)
- S3: 5GB storage, 20,000 GET requests
- CloudFront: 50GB data transfer out
- Certificate Manager: Always free

---

## 📞 Support Contacts

### AWS Support
- **Console:** Click "?" icon → "Support Center"
- **Forums:** https://repost.aws/
- **Documentation:** https://docs.aws.amazon.com

### Project Guides
- **Quick Start:** DEPLOY-TODAY.md
- **Pre-flight:** pre-deployment-checklist.md
- **Detailed Guide:** AWS-DEPLOYMENT-GUIDE.md

---

## ✅ Post-Deployment Checklist

After deployment, verify:
- [ ] Website loads at S3 URL
- [ ] Logo displays
- [ ] All images load
- [ ] Navigation works
- [ ] Mobile menu functions
- [ ] Contact form displays
- [ ] No console errors (F12)

---

## 🔄 Common Workflows

### Making Website Updates
1. Edit files locally (index.html, styles.css, etc.)
2. Test by opening index.html in browser
3. Run deployment script: `.\deploy.ps1 -BucketName "your-bucket"`
4. Refresh browser (Ctrl+F5 to clear cache)

### Adding New Images
1. Place image in marketing-website folder
2. Reference in HTML: `<img src="your-image.jpg">`
3. Update deploy script to include new file (optional for manual upload)
4. Run deployment script

### Checking AWS Costs
1. Go to: https://console.aws.amazon.com/billing/
2. Click "Bills" to see current month charges
3. Click "Cost Explorer" for detailed breakdown
4. Set up billing alerts: Billing Preferences → Enable alerts

---

## 🎓 Learning Resources

### For Beginners
1. Start with: **DEPLOY-TODAY.md** (Manual Path B)
2. Familiarize with: AWS Console, S3 basics
3. Graduate to: Automated scripts (Path A)
4. Advanced: CloudFront, custom domains, CI/CD

### Best Practices
- ✅ Always test locally before deploying
- ✅ Use version control (Git) for your files
- ✅ Set up billing alerts
- ✅ Enable MFA on AWS account
- ✅ Use specific IAM user (not root account)
- ✅ Keep access keys secure (never commit to Git)

---

## 🔐 Security Reminders

- **AWS Keys:** Never share or commit to Git
- **Bucket Policy:** Only needed files should be public
- **MFA:** Enable on AWS root account
- **IAM:** Use specific user, not root
- **HTTPS:** Add CloudFront for secure connections

---

## 📊 Monitoring Your Site

### Basic Monitoring (Free)
- **S3 Metrics:** S3 Console → Your Bucket → Metrics tab
- **CloudWatch:** AWS Console → CloudWatch → Dashboards
- **Billing:** Billing Console → Cost Explorer

### External Monitoring
- **Google Analytics:** Add tracking code to index.html
- **UptimeRobot:** Free uptime monitoring (uptimerobot.com)
- **Google Search Console:** SEO monitoring

---

## 🌟 Next Steps After Basic Deployment

### Week 1
- [ ] Set up CloudFront for HTTPS
- [ ] Request SSL certificate
- [ ] Configure custom domain
- [ ] Add Google Analytics

### Week 2
- [ ] Set up email handling (Formspree or AWS SES)
- [ ] Create automated deployment (GitHub Actions)
- [ ] Add sitemap.xml for SEO
- [ ] Set up redirects if needed

### Ongoing
- [ ] Monitor costs monthly
- [ ] Update content regularly
- [ ] Back up files (use Git)
- [ ] Review AWS security best practices

---

## 🎯 Key Takeaways

1. **Start Simple:** S3 static hosting first, add features later
2. **Cost-Effective:** $1-5/month for most small sites
3. **Scalable:** Handles traffic spikes automatically
4. **Flexible:** Easy to update, easy to delete
5. **Professional:** Fast, reliable AWS infrastructure

---

## 📱 Quick Access Commands

```powershell
# Check AWS CLI version
aws --version

# Verify credentials
aws sts get-caller-identity

# List your S3 buckets
aws s3 ls

# Check bucket contents
aws s3 ls s3://your-bucket-name

# Manual file upload
aws s3 cp index.html s3://your-bucket-name/

# Download file from bucket
aws s3 cp s3://your-bucket-name/index.html ./downloaded.html
```

---

**Ready to Deploy?** → Start with **DEPLOY-TODAY.md**

**Need to Prepare?** → Check **pre-deployment-checklist.md**

**Want Details?** → Read **AWS-DEPLOYMENT-GUIDE.md**

---

*This is a living document. Update as you learn more about your deployment!*
