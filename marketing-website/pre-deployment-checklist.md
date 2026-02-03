# 📋 Pre-Deployment Checklist for Starship Psychics Marketing Website

Complete this checklist before deploying to ensure everything is ready!

## ✅ AWS Prerequisites

- [ ] **AWS Account Created**
  - Sign up at: https://aws.amazon.com
  - Credit card on file
  - Account verified and active

- [ ] **IAM User with Permissions**
  - User has `AmazonS3FullAccess` policy
  - OR Administrator access
  - Access keys created (for CLI deployment)

- [ ] **Domain Name Ready (Optional for initial deployment)**
  - Domain purchased/registered
  - Access to DNS settings
  - Note: You can deploy WITHOUT a domain first!

## 🖥️ Technical Setup

### Option A: Automated Deployment
- [ ] **AWS CLI Installed**
  - Windows: Download from https://awscli.amazonaws.com/AWSCLIV2.msi
  - Mac: `brew install awscli`
  - Linux: See AWS docs
  - Verify with: `aws --version`

- [ ] **AWS Credentials Configured**
  - Run: `aws configure`
  - Enter Access Key ID
  - Enter Secret Access Key
  - Set region to: `us-east-1`
  - Test with: `aws sts get-caller-identity`

### Option B: Manual Console Deployment
- [ ] **AWS Console Access**
  - Can log into https://console.aws.amazon.com
  - Know your username/password
  - MFA set up (if enabled)

## 📁 Website Files Ready

Navigate to your `marketing-website` folder and verify all files exist:

- [ ] **index.html** - Main website file
- [ ] **styles.css** - Styling file
- [ ] **script.js** - JavaScript functionality
- [ ] **StarshipPsychics_Logo.png** - Company logo
- [ ] **iStock-1355328450.jpg** - Hero image
- [ ] **knightofcups.jpeg** - Tarot card image

### Optional Files (add if you have them):
- [ ] **favicon.ico** - Browser tab icon
- [ ] **robots.txt** - SEO configuration
- [ ] **sitemap.xml** - SEO sitemap

## 🎨 Content Review

Open `index.html` in a browser and verify:

- [ ] **Company Information**
  - [ ] Logo displays correctly
  - [ ] Company name is correct
  - [ ] Contact email: info@starshippsychics.com
  - [ ] Address: PO Box 13, Wimberley, TX 78676

- [ ] **"Coming Soon" Banner**
  - [ ] Banner is visible
  - [ ] Text is correct: "Psychic Chat Coming Soon!"
  - [ ] Animation works

- [ ] **Hero Section**
  - [ ] Headline is compelling
  - [ ] Buttons are functional
  - [ ] Background looks good

- [ ] **Features Section**
  - [ ] All 6 features are listed
  - [ ] Icons display correctly
  - [ ] Text is accurate

- [ ] **About Section**
  - [ ] Company description is accurate
  - [ ] Stats are correct
  - [ ] Mission statement reflects your brand

- [ ] **Testimonials Section**
  - [ ] Samantha's testimonial is present
  - [ ] Update with real testimonial if available
  - [ ] Credentials are accurate

- [ ] **Contact Section**
  - [ ] Contact form displays
  - [ ] Email address is correct
  - [ ] Physical address is correct

- [ ] **Footer**
  - [ ] Copyright year: 2026
  - [ ] All links work
  - [ ] Social media links (update if you have them)

## 📱 Testing

- [ ] **Desktop Testing**
  - [ ] Open index.html in Chrome
  - [ ] Test in Firefox
  - [ ] Test in Safari (if on Mac)
  - [ ] All links work
  - [ ] Navigation smooth scrolling works
  - [ ] No console errors (F12 → Console tab)

- [ ] **Mobile Testing**
  - [ ] Test on actual phone OR
  - [ ] Use browser dev tools (F12 → Toggle device toolbar)
  - [ ] Hamburger menu opens/closes
  - [ ] All sections are readable
  - [ ] Buttons are tappable
  - [ ] Images load correctly

- [ ] **Cross-Browser Check**
  - [ ] Chrome/Edge ✓
  - [ ] Firefox ✓
  - [ ] Safari ✓
  - [ ] Mobile browsers ✓

## 💼 Business Decisions

- [ ] **Bucket Naming**
  - Decided on bucket name: `________________________`
  - Suggestion: `starshippsychics-marketing`
  - Must be globally unique, lowercase, no spaces

- [ ] **Region Selection**
  - Chosen AWS region: `________________________`
  - Recommendation: `us-east-1` (N. Virginia)
  - Closest to your primary audience

- [ ] **Deployment Timeline**
  - Target date: `________________________`
  - Time allocated: 30-60 minutes
  - Someone available to test immediately after

## 📧 Email Configuration (Optional for v1)

- [ ] **Contact Form Backend**
  - Decision: Start with client-side OR set up backend?
  - Options considered:
    - [ ] Keep simple for now (mailto fallback)
    - [ ] Set up Formspree (free tier)
    - [ ] Set up AWS SES + Lambda (later)
  
  **Recommendation:** Deploy first, add email handling later!

## 🔒 Security Considerations

- [ ] **Public Access Confirmed**
  - Understand website will be publicly accessible
  - No sensitive data in files
  - No hardcoded passwords/keys in code

- [ ] **AWS Security**
  - MFA enabled on AWS account (recommended)
  - Access keys stored securely
  - IAM user has appropriate permissions only

## 💰 Budget Approval

- [ ] **Cost Awareness**
  - Estimated monthly cost: $1-5
  - AWS Free Tier understood (first year benefits)
  - Credit card will be charged monthly
  - Billing alerts set up (recommended)

- [ ] **Set Up Billing Alert**
  - Go to: AWS Console → Billing → Billing Preferences
  - Enable: "Receive Billing Alerts"
  - Create CloudWatch alarm for > $10/month

## 📝 Documentation Reviewed

- [ ] **Read deployment guides**
  - [ ] DEPLOY-TODAY.md (quick start)
  - [ ] AWS-DEPLOYMENT-GUIDE.md (detailed)
  - [ ] README.md (website overview)

- [ ] **Scripts Ready**
  - [ ] deploy.ps1 (Windows PowerShell)
  - [ ] deploy.sh (Mac/Linux Bash)
  - Scripts tested locally (aws --version works)

## 🎯 Deployment Method Chosen

Choose ONE:

- [ ] **Method A: Automated Script** (Recommended)
  - AWS CLI installed and configured
  - Script permissions set (chmod +x deploy.sh for Mac/Linux)
  - Ready to run deployment command

- [ ] **Method B: Manual Console**
  - AWS Console bookmark saved
  - S3 service located
  - Ready to follow manual steps

## ⏰ Day-of-Deployment Readiness

- [ ] **Time Blocked**
  - 30-60 minutes available
  - No meetings/interruptions
  - Computer charged/plugged in

- [ ] **Access Confirmed**
  - Internet connection stable
  - AWS Console accessible
  - AWS CLI working (if using scripts)
  - Files accessible in marketing-website folder

- [ ] **Support Resources**
  - AWS documentation bookmarked
  - Deployment guides open and ready
  - Phone/device for mobile testing ready

## 🚀 Ready to Deploy?

### All checks must be complete:

**Required (Minimum):**
- [ ] AWS account active
- [ ] Website files present
- [ ] Deployment method chosen
- [ ] 30 minutes available
- [ ] Bucket name decided

**Recommended:**
- [ ] AWS CLI configured (for automated deployment)
- [ ] Website tested locally
- [ ] Billing alert set up
- [ ] Mobile device ready for testing

### If all required items are checked:
✅ **YOU'RE READY TO DEPLOY!**

Proceed to **DEPLOY-TODAY.md** and follow your chosen path!

### If any required items are NOT checked:
⚠️ **Complete them first**, then return here.

---

## 📞 Pre-Deployment Questions?

### Common Questions:

**Q: Can I deploy without a custom domain?**  
A: YES! You'll get an S3 URL like: `http://bucket-name.s3-website-us-east-1.amazonaws.com`

**Q: Do I need HTTPS right away?**  
A: NO! You can add CloudFront + HTTPS later. Deploy to S3 first!

**Q: What if I don't have AWS CLI?**  
A: Use the manual console method (Path B in DEPLOY-TODAY.md)

**Q: How much will this really cost?**  
A: For a small marketing site with moderate traffic: $1-5/month

**Q: Can I take it down if I change my mind?**  
A: YES! Delete the S3 bucket and you're done. No ongoing charges.

**Q: What if something breaks?**  
A: Static sites rarely "break." Files are just files. Easy to fix!

---

## ✅ Checklist Complete!

Date completed: `_________________`

Completed by: `_________________`

Ready to deploy: **YES** / NO

Next step: **Open DEPLOY-TODAY.md and choose your deployment path!**

---

**Good luck with your deployment! 🚀✨**
