# 🌐 Deploy to www.starshippsychics.com - Custom Domain Setup

**Target Domain:** www.starshippsychics.com  
**Time Required:** 45-60 minutes (includes DNS propagation)  
**Prerequisites:** Domain already owned/registered

---

## 📋 What You Need

- [ ] AWS Account configured
- [ ] Domain: starshippsychics.com (registered and you have DNS access)
- [ ] AWS CLI installed (optional but recommended)
- [ ] 1 hour for initial setup + DNS propagation time

---

## 🚀 Deployment Steps Overview

1. **Create S3 Bucket** (5 min)
2. **Upload Website Files** (5 min)
3. **Request SSL Certificate** (10 min)
4. **Create CloudFront Distribution** (10 min)
5. **Configure DNS** (5 min)
6. **Wait for DNS Propagation** (15-60 min)
7. **Test & Verify** (5 min)

**Total Active Time:** ~40 minutes  
**Total Wait Time:** 15-60 minutes (DNS propagation)

---

## 🎯 STEP 1: Create S3 Bucket (5 minutes)

### Option A: Using Deployment Script (Automated)

```powershell
# Windows PowerShell (from marketing-website folder)
cd marketing-website
.\deploy.ps1 -BucketName "www.starshippsychics.com" -CreateBucket
```

```bash
# Mac/Linux (from marketing-website folder)
cd marketing-website
chmod +x deploy.sh
./deploy.sh -b www.starshippsychics.com --create-bucket
```

### Option B: Manual via AWS Console

1. Go to: https://console.aws.amazon.com/s3/
2. Click **"Create bucket"**
3. **Bucket name:** `www.starshippsychics.com`
4. **Region:** `us-east-1` (N. Virginia)
5. **Block Public Access:** UNCHECK all boxes ⚠️
6. Acknowledge the warning
7. Click **"Create bucket"**

#### Configure Static Website Hosting:
1. Click on your bucket
2. Go to **Properties** tab
3. Scroll to **Static website hosting** → Click **Edit**
4. Select **Enable**
5. Index document: `index.html`
6. Error document: `index.html`
7. Click **Save changes**

#### Set Bucket Policy:
1. Go to **Permissions** tab
2. Scroll to **Bucket policy** → Click **Edit**
3. Paste this:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::www.starshippsychics.com/*"
        }
    ]
}
```

4. Click **Save changes**

---

## 📁 STEP 2: Upload Website Files (5 minutes)

### Option A: Using Script (Already done if you used script in Step 1)

If you didn't use the script in Step 1, run:

```powershell
# Windows
.\deploy.ps1 -BucketName "www.starshippsychics.com"
```

### Option B: Manual Upload

1. In S3 Console, click on your bucket
2. Go to **Objects** tab
3. Click **Upload** → **Add files**
4. Select all files from `marketing-website` folder:
   - index.html
   - styles.css
   - script.js
   - StarshipPsychics_Logo.png
   - iStock-1355328450.jpg
   - knightofcups.jpeg
5. Click **Upload**

---

## 🔒 STEP 3: Request SSL Certificate (10 minutes)

**IMPORTANT:** Certificate MUST be in **us-east-1** region for CloudFront!

1. Go to:   
2. Verify you're in **US East (N. Virginia) us-east-1** region (top right)
3. Click **"Request certificate"**
4. Select **"Request a public certificate"** → Next

### Certificate Details:
5. **Domain names:** Add BOTH:
   ```
   starshippsychics.com
   www.starshippsychics.com
   ```
   Click "Add another name to this certificate" to add the second domain

6. **Validation method:** Choose **DNS validation** (recommended)
7. **Key algorithm:** RSA 2048 (default)
8. Click **"Request"**

### Validate Certificate:

9. You'll see your certificate with status "Pending validation"
10. Click on the certificate ID
11. You'll see validation records for both domains
12. Click **"Create records in Route 53"** if using Route 53 OR
13. Copy the CNAME records to add to your DNS provider manually

#### If Using Route 53:
- Click **"Create records in Route 53"** button
- AWS will automatically add the DNS records
- Click **"Create records"**
- Wait 5-10 minutes for validation

#### If Using Another DNS Provider (GoDaddy, Namecheap, etc.):
For EACH domain, you'll see records like:
```
Name: _abc123def.starshippsychics.com
Type: CNAME
Value: _xyz789abc.acm-validations.aws.
```

Add these CNAME records to your DNS provider:
1. Log into your domain registrar (GoDaddy, Namecheap, etc.)
2. Go to DNS Management
3. Add new CNAME record:
   - **Name/Host:** `_abc123def` (copy from AWS, remove domain part)
   - **Type:** CNAME
   - **Value:** (copy full value from AWS)
   - **TTL:** 3600 or default
4. Repeat for both domains
5. Wait 5-30 minutes for validation

**🔍 Check Status:** Refresh the certificate page. Status should change to "Issued"

---

## ☁️ STEP 4: Create CloudFront Distribution (10 minutes)

1. Go to: https://console.aws.amazon.com/cloudfront/
2. Click **"Create distribution"**

### Origin Settings:
3. **Origin domain:** Select your S3 bucket from dropdown
   - Choose: `www.starshippsychics.com.s3.amazonaws.com`
   - Or manually enter: `www.starshippsychics.com.s3-website-us-east-1.amazonaws.com`

4. **Origin path:** Leave empty

5. **Name:** (auto-filled, leave as is)

### Default Cache Behavior:
6. **Viewer protocol policy:** Select **"Redirect HTTP to HTTPS"**
7. **Allowed HTTP methods:** GET, HEAD (default)
8. **Cache policy:** CachingOptimized

### Settings:
9. **Alternate domain names (CNAMEs):** Add BOTH:
   ```
   www.starshippsychics.com
   starshippsychics.com
   ```
   (Click "Add item" to add second domain)

10. **Custom SSL certificate:** Select your certificate from dropdown
    - Should show: `starshippsychics.com (and 1 more)`

11. **Default root object:** `index.html`

12. **Description:** (optional) `Starship Psychics Marketing Website`

13. Click **"Create distribution"**

### Copy Distribution Info:
14. **IMPORTANT:** Copy the **Distribution domain name**
    - Example: `d1234567890abc.cloudfront.net`
    - You'll need this for DNS configuration!

15. **IMPORTANT:** Copy the **Distribution ID**
    - Example: `E1234567890ABC`
    - You'll need this for future deployments!

**⏳ Wait Time:** CloudFront deployment takes 5-15 minutes. Status will change from "Deploying" to "Enabled"

---

## 🌍 STEP 5: Configure DNS (5 minutes)

You need to point your domain to CloudFront.

### If Using AWS Route 53:

1. Go to: https://console.aws.amazon.com/route53/
2. Click **"Hosted zones"** → Select `starshippsychics.com`
3. Click **"Create record"**

**Record 1 - Root Domain (starshippsychics.com):**
- Record name: (leave empty)
- Record type: A
- Toggle **"Alias"** to ON
- Route traffic to: **Alias to CloudFront distribution**
- Choose distribution: Select your CloudFront distribution
- Click **"Create records"**

**Record 2 - WWW subdomain:**
- Click **"Create record"** again
- Record name: `www`
- Record type: A
- Toggle **"Alias"** to ON
- Route traffic to: **Alias to CloudFront distribution**
- Choose distribution: Select your CloudFront distribution
- Click **"Create records"**

### If Using Another DNS Provider (GoDaddy, Namecheap, etc.):

1. Log into your domain registrar
2. Go to DNS Management for starshippsychics.com

**Add/Update these records:**

**Record 1 - WWW:**
```
Type: CNAME
Name/Host: www
Value: d1234567890abc.cloudfront.net (your CloudFront domain)
TTL: 3600 or default
```

**Record 2 - Root Domain:**
Check if your provider supports ALIAS or ANAME records:
- **If YES:** Use ALIAS/ANAME pointing to CloudFront domain
- **If NO:** Use URL forwarding to redirect `starshippsychics.com` → `www.starshippsychics.com`

**Example for GoDaddy:**
1. DNS Management → Add → CNAME
   - Name: www
   - Value: d1234567890abc.cloudfront.net
   - TTL: 1 Hour
2. For root domain, use Forwarding:
   - Forward `starshippsychics.com` to `https://www.starshippsychics.com`
   - Type: Permanent (301)

---

## ⏳ STEP 6: Wait for DNS Propagation (15-60 minutes)

DNS changes can take time to propagate worldwide:
- **Minimum:** 5-15 minutes
- **Typical:** 30-60 minutes
- **Maximum:** Up to 48 hours (rare)

### Check Propagation Status:

**Online Tools:**
- https://dnschecker.org/ - Check DNS propagation globally
- https://www.whatsmydns.net/ - Alternative checker

**Command Line:**
```powershell
# Windows
nslookup www.starshippsychics.com

# Mac/Linux
dig www.starshippsychics.com
```

**What to Look For:**
- www.starshippsychics.com should resolve to CloudFront distribution
- You should see IP addresses in the response

---

## ✅ STEP 7: Test & Verify (5 minutes)

### Test Your Website:

1. **Visit your website:**
   - https://www.starshippsychics.com
   - https://starshippsychics.com (should redirect to www)

2. **Check HTTPS:**
   - Look for green padlock 🔒 in browser
   - Certificate should be valid
   - No security warnings

3. **Test Functionality:**
   - [ ] Logo loads
   - [ ] All images display
   - [ ] Navigation works
   - [ ] Mobile menu functions
   - [ ] Smooth scrolling works
   - [ ] Contact form displays
   - [ ] "Coming Soon" banner visible

4. **Test Redirects:**
   - HTTP → HTTPS redirect works
   - starshippsychics.com → www.starshippsychics.com (if configured)

5. **Mobile Test:**
   - Open on phone or use browser dev tools
   - Test responsive design
   - Verify all features work

### Troubleshooting:

**Site Not Loading:**
- Wait longer for DNS propagation (check dnschecker.org)
- Verify CloudFront distribution status is "Enabled"
- Clear browser cache (Ctrl+Shift+Delete)

**SSL Certificate Error:**
- Verify certificate status is "Issued" in ACM
- Check certificate includes both domains
- Verify you selected correct certificate in CloudFront

**Images Not Loading:**
- Check browser console (F12) for errors
- Verify all files uploaded to S3
- Create CloudFront invalidation (see below)

---

## 🔄 Future Updates to Your Website

### Method 1: Using Deployment Script (Recommended)

```powershell
# Windows - Update website and invalidate CloudFront cache
cd marketing-website
.\deploy.ps1 -BucketName "www.starshippsychics.com" -DistributionId "E1234567890ABC"
```

```bash
# Mac/Linux
./deploy.sh -b www.starshippsychics.com -d E1234567890ABC
```

Replace `E1234567890ABC` with your actual Distribution ID!

### Method 2: Manual Update

1. Update files in S3 bucket
2. Create CloudFront cache invalidation:
   ```powershell
   aws cloudfront create-invalidation --distribution-id E1234567890ABC --paths "/*"
   ```
   Or via Console:
   - Go to CloudFront → Your Distribution
   - Click **Invalidations** tab
   - Click **Create invalidation**
   - Paths: `/*`
   - Click **Create invalidation**

---

## 💰 Cost Breakdown

### Monthly Costs for www.starshippsychics.com:

- **S3 Storage:** ~$0.10 (small site)
- **S3 Requests:** ~$0.20 (low traffic)
- **CloudFront:** $1-3 (first 1TB free tier)
- **SSL Certificate:** FREE
- **Route 53 (if used):** $0.50/month per hosted zone
- **Data Transfer:** First 100GB/month free

**Total Expected:** $2-5/month for low-moderate traffic

---

## 📋 Post-Deployment Checklist

- [ ] Website loads at https://www.starshippsychics.com
- [ ] SSL certificate is valid (green padlock)
- [ ] HTTP redirects to HTTPS
- [ ] All images and assets load
- [ ] Mobile version works correctly
- [ ] Navigation and interactions work
- [ ] DNS fully propagated (check dnschecker.org)
- [ ] CloudFront distribution status: Enabled
- [ ] Saved CloudFront Distribution ID for future updates
- [ ] Tested from multiple devices/browsers

---

## 📝 Important Information to Save

**Bucket Name:** `www.starshippsychics.com`

**CloudFront Distribution ID:** `E_____________` (fill in your actual ID)

**CloudFront Domain:** `d____________.cloudfront.net` (fill in actual domain)

**Certificate ARN:** (in ACM console if needed)

**Update Command:**
```powershell
.\deploy.ps1 -BucketName "www.starshippsychics.com" -DistributionId "E_____________"
```

---

## 🎉 Success!

Your marketing website is now live at:
### ✨ https://www.starshippsychics.com ✨

**What You Achieved:**
- ✅ Custom domain with your brand
- ✅ HTTPS/SSL security (green padlock)
- ✅ Global CDN (fast loading worldwide)
- ✅ Professional hosting on AWS
- ✅ Scalable infrastructure
- ✅ Cost-effective (~$2-5/month)

Share your new website and celebrate! 🎊

---

## 🆘 Need Help?

### Common Issues:

**DNS Not Propagating:**
- Wait 1-2 hours
- Clear browser cache
- Try from different network/device
- Check dnschecker.org

**Certificate Validation Stuck:**
- Verify CNAME records added correctly
- Check DNS propagation of validation records
- Wait 30 minutes and refresh

**CloudFront Errors:**
- Check S3 bucket policy allows public access
- Verify static website hosting enabled
- Check origin domain is correct

### Support Resources:
- AWS Support: https://console.aws.amazon.com/support/
- DNS Checker: https://dnschecker.org/
- SSL Checker: https://www.sslshopper.com/ssl-checker.html

---

**Deployment Date:** _________________

**CloudFront Distribution ID:** _________________

**Notes:** 
_____________________________________________
_____________________________________________

---

*Save this guide for reference and future updates!*
