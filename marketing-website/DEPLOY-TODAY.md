# 🚀 Deploy Marketing Website to AWS TODAY

This is your **quick-start guide** to get your Starship Psychics marketing website live on AWS in under 30 minutes!

## ⚡ Quick Prerequisites Check

Before starting, make sure you have:
- [ ] AWS Account (create at https://aws.amazon.com if needed)
- [ ] Credit card on file with AWS
- [ ] 30 minutes of time

## 🎯 Choose Your Deployment Path

### Path A: Automated Script (Easiest - 10 minutes)
**Best for:** Quick deployment with command line

### Path B: AWS Console (Manual - 20 minutes)
**Best for:** If you prefer visual interface or don't have AWS CLI

---

## 🔥 PATH A: Automated Deployment (RECOMMENDED)

### Step 1: Install AWS CLI (5 minutes)

**Windows:**
1. Download: https://awscli.amazonaws.com/AWSCLIV2.msi
2. Run installer
3. Open new PowerShell window
4. Verify: `aws --version`

**Mac/Linux:**
```bash
# Mac with Homebrew
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Step 2: Configure AWS Credentials (2 minutes)

1. Go to AWS Console → IAM → Users → Your User → Security credentials
2. Click "Create access key" → Choose "CLI" → Create
3. Copy your Access Key ID and Secret Access Key
4. Run in terminal:
```bash
aws configure
```
5. Enter:
   - Access Key ID: [paste your key]
   - Secret Access Key: [paste your secret]
   - Default region: us-east-1
   - Default output: json

### Step 3: Run Deployment Script (3 minutes)

**Option 1: First-time deployment (creates bucket)**
```powershell
# Windows PowerShell
cd marketing-website
.\deploy.ps1 -BucketName "starshippsychics-marketing" -CreateBucket
```

```bash
# Mac/Linux
cd marketing-website
chmod +x deploy.sh
./deploy.sh -b starshippsychics-marketing --create-bucket
```

**Option 2: Update existing deployment**
```powershell
# Windows
.\deploy.ps1 -BucketName "starshippsychics-marketing"
```

```bash
# Mac/Linux
./deploy.sh -b starshippsychics-marketing
```

### Step 4: Test Your Website! 🎉

The script will output your website URL:
```
http://starshippsychics-marketing.s3-website-us-east-1.amazonaws.com
```

Open it in your browser!

---

## 🖱️ PATH B: Manual AWS Console Deployment

### Step 1: Create S3 Bucket (5 minutes)

1. **Log into AWS Console**: https://console.aws.amazon.com
2. **Search for "S3"** in the top search bar
3. **Click "Create bucket"**
4. **Bucket Settings:**
   - Bucket name: `starshippsychics-marketing` (must be globally unique)
   - Region: `US East (N. Virginia) us-east-1`
   - **UNCHECK** "Block all public access" ✓ IMPORTANT!
   - Check the warning acknowledgment box
   - Keep all other defaults
5. **Click "Create bucket"**

### Step 2: Enable Static Website Hosting (2 minutes)

1. Click on your new bucket name
2. Go to **"Properties"** tab
3. Scroll down to **"Static website hosting"**
4. Click **"Edit"**
5. Select **"Enable"**
6. Index document: `index.html`
7. Error document: `index.html`
8. Click **"Save changes"**
9. **IMPORTANT:** Copy the "Bucket website endpoint" URL (you'll need this!)

### Step 3: Set Bucket Policy (2 minutes)

1. Go to **"Permissions"** tab
2. Scroll to **"Bucket policy"**
3. Click **"Edit"**
4. Paste this (replace `YOUR-BUCKET-NAME` with your actual bucket name):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```

5. Click **"Save changes"**

### Step 4: Upload Website Files (5 minutes)

1. Go to **"Objects"** tab
2. Click **"Upload"**
3. Click **"Add files"**
4. Select these files from your `marketing-website` folder:
   - ✅ index.html
   - ✅ styles.css
   - ✅ script.js
   - ✅ StarshipPsychics_Logo.png
   - ✅ iStock-1355328450.jpg
   - ✅ knightofcups.jpeg
5. Click **"Upload"**
6. Wait for "Upload succeeded" message
7. Click **"Close"**

### Step 5: Test Your Website! 🎉

Go to the "Bucket website endpoint" URL you copied in Step 2. Your website should be live!

Example: `http://starshippsychics-marketing.s3-website-us-east-1.amazonaws.com`

---

## ✅ Post-Deployment Checklist

- [ ] Website loads correctly
- [ ] Logo appears
- [ ] All images load
- [ ] Navigation works
- [ ] Mobile menu works (test on phone)
- [ ] "Coming Soon" banner is visible
- [ ] Contact form appears
- [ ] Smooth scrolling works

---

## 🔒 Add HTTPS & Custom Domain (Optional - Do Later)

The basic S3 website uses HTTP. To add HTTPS and your custom domain:

### Quick Steps (can be done tomorrow):
1. **Request SSL Certificate** (AWS Certificate Manager - FREE)
2. **Create CloudFront Distribution** (CDN - ~$1-5/month)
3. **Point Your Domain** (Route 53 or your current registrar)

### Run this command after CloudFront setup:
```powershell
# Windows
.\deploy.ps1 -BucketName "starshippsychics-marketing" -DistributionId "YOUR_CLOUDFRONT_ID"
```

**Detailed instructions** are in `AWS-DEPLOYMENT-GUIDE.md`

---

## 💰 Cost Estimate

### Today's Deployment (S3 Only):
- **Setup:** FREE
- **Monthly:** $0.50 - $2.00 for low traffic
- **Traffic:** First 1GB/month is basically free

### With CloudFront (HTTPS):
- **Monthly:** $1 - $5 for typical small site
- **SSL Certificate:** FREE with AWS Certificate Manager

### Total Expected: $1-5/month

---

## 🆘 Troubleshooting

### "Access Denied" Error
- ✅ Check bucket policy is set correctly
- ✅ Verify "Block public access" is OFF
- ✅ Wait 1-2 minutes for changes to propagate

### Website Not Loading
- ✅ Verify static website hosting is enabled
- ✅ Check you're using the correct URL (should include `.s3-website-`)
- ✅ Clear browser cache and try again

### Images Not Showing
- ✅ Verify all files uploaded successfully
- ✅ Check file names match exactly (case-sensitive!)
- ✅ Try uploading images again

### AWS CLI Errors
```powershell
# Windows: Fix execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Reconfigure AWS
aws configure
```

---

## 📞 Need Help?

### Check These First:
1. This guide: `DEPLOY-TODAY.md` (you are here)
2. Detailed guide: `AWS-DEPLOYMENT-GUIDE.md`
3. AWS Documentation: https://docs.aws.amazon.com/s3/

### AWS Support:
- Basic support is FREE with your AWS account
- Use the chat icon in AWS Console

---

## 🎯 What's Next After Deployment?

### Immediate (Today):
- [ ] Share website URL with stakeholders
- [ ] Test on multiple devices
- [ ] Bookmark AWS Console for updates

### This Week:
- [ ] Set up CloudFront for HTTPS
- [ ] Request SSL certificate
- [ ] Configure custom domain
- [ ] Set up Google Analytics (optional)

### Future Updates:
Just re-run the deployment script or re-upload files to S3!

```powershell
# Quick updates (Windows)
cd marketing-website
.\deploy.ps1 -BucketName "starshippsychics-marketing"
```

---

## 🎉 Congratulations!

Your marketing website is now live on AWS! 

**Your website is:**
✅ Publicly accessible  
✅ Fast and reliable  
✅ Scalable to millions of visitors  
✅ Cost-effective (~$1-5/month)  

Share your new URL and celebrate! 🍾

---

## 📋 Deployment Commands Reference

### First Time Deployment:
```powershell
# Windows (from marketing-website folder)
.\deploy.ps1 -BucketName "starshippsychics-marketing" -CreateBucket
```

```bash
# Mac/Linux (from marketing-website folder)
./deploy.sh -b starshippsychics-marketing --create-bucket
```

### Update Existing Website:
```powershell
# Windows
.\deploy.ps1 -BucketName "starshippsychics-marketing"
```

```bash
# Mac/Linux
./deploy.sh -b starshippsychics-marketing
```

### With CloudFront Cache Invalidation:
```powershell
# Windows
.\deploy.ps1 -BucketName "starshippsychics-marketing" -DistributionId "E1234567890ABC"
```

```bash
# Mac/Linux
./deploy.sh -b starshippsychics-marketing -d E1234567890ABC
```

---

**Last Updated:** February 2026  
**Estimated Deployment Time:** 10-30 minutes  
**Monthly Cost:** $1-5  
**Difficulty:** ⭐⭐☆☆☆ (Easy)
