# AWS Deployment Guide for Starship Psychics Website

This guide will walk you through deploying your new Starship Psychics marketing website to AWS.

## 📋 Prerequisites

- AWS Account
- AWS CLI installed (optional but recommended)
- Your website files ready

## 🚀 Deployment Options

### Option 1: AWS S3 + CloudFront (Recommended - Simple & Cost-Effective)

This is the easiest and most cost-effective option for a static website.

#### Step 1: Create an S3 Bucket

1. Log into AWS Console
2. Go to **S3** service
3. Click **Create bucket**
4. **Bucket name**: `starshippsychics.com` (must match your domain)
5. **Region**: Choose closest to your audience (e.g., `us-east-1`)
6. **Uncheck** "Block all public access"
7. Acknowledge the warning about public access
8. Click **Create bucket**

#### Step 2: Configure Bucket for Static Website Hosting

1. Select your bucket
2. Go to **Properties** tab
3. Scroll to **Static website hosting**
4. Click **Edit**
5. Enable static website hosting
6. **Index document**: `index.html`
7. **Error document**: `index.html` (for single-page behavior)
8. Click **Save changes**
9. Note the **Bucket website endpoint** URL

#### Step 3: Set Bucket Policy

1. Go to **Permissions** tab
2. Scroll to **Bucket policy**
3. Click **Edit**
4. Paste this policy (replace `starshippsychics.com` with your bucket name):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::starshippsychics.com/*"
        }
    ]
}
```

5. Click **Save changes**

#### Step 4: Upload Website Files

1. Go to **Objects** tab
2. Click **Upload**
3. Click **Add files** and select all your website files:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `StarshipPsychics_Logo.png`
   - Any other images you add
4. Click **Upload**

#### Step 5: Set Up CloudFront (CDN) for HTTPS and Performance

1. Go to **CloudFront** service
2. Click **Create Distribution**
3. **Origin domain**: Select your S3 bucket from dropdown
4. **Origin path**: leave empty
5. **Viewer protocol policy**: Redirect HTTP to HTTPS
6. **Allowed HTTP methods**: GET, HEAD
7. **Cache policy**: CachingOptimized
8. **Alternate domain names (CNAME)**: Add your domain `www.starshippsychics.com` and `starshippsychics.com`
9. **Custom SSL certificate**: Request a certificate (see step 6)
10. **Default root object**: `index.html`
11. Click **Create distribution**

#### Step 6: Set Up SSL Certificate

1. Go to **Certificate Manager** (ACM) in **us-east-1** region (required for CloudFront)
2. Click **Request certificate**
3. Choose **Request a public certificate**
4. **Domain names**: Add both:
   - `starshippsychics.com`
   - `www.starshippsychics.com`
5. **Validation method**: DNS validation (recommended)
6. Click **Request**
7. Follow instructions to add DNS records to your domain registrar

#### Step 7: Configure Domain (Route 53 or Your Registrar)

**If using Route 53:**
1. Go to **Route 53** → **Hosted zones**
2. Select your domain
3. Create two **A records** (Alias):
   - Name: leave blank (for root domain)
   - Type: A
   - Alias: Yes
   - Alias target: Your CloudFront distribution
4. Create another A record:
   - Name: www
   - Type: A
   - Alias: Yes
   - Alias target: Your CloudFront distribution

**If using GoDaddy or another registrar:**
1. Log into your domain registrar
2. Go to DNS management
3. Add CNAME record:
   - Host: www
   - Points to: Your CloudFront distribution URL
4. Add A record (if supported) or use URL forwarding for root domain

### Option 2: AWS Amplify (Easy with CI/CD)

AWS Amplify provides automatic deployments when you push to GitHub.

#### Steps:

1. Push your website to a GitHub repository
2. Go to **AWS Amplify** console
3. Click **New app** → **Host web app**
4. Connect your GitHub repository
5. Select the repository and branch
6. **Build settings**: Amplify will auto-detect (HTML/CSS/JS)
7. Click **Save and deploy**
8. Amplify will deploy your site and give you a URL
9. Add your custom domain in **Domain management**

### Option 3: AWS Elastic Beanstalk (For Dynamic Sites)

If you plan to add server-side functionality later:

1. Create application in Elastic Beanstalk
2. Choose Node.js or Python platform
3. Upload your website files
4. Configure environment

## 💰 Cost Estimates

### S3 + CloudFront (Recommended)
- **S3 Storage**: $0.023 per GB/month (tiny cost for static site)
- **CloudFront**: $0.085 per GB for first 10 TB (very cheap for low traffic)
- **Estimated monthly cost**: $1-5 for a small site with moderate traffic

### AWS Amplify
- **Build minutes**: 1000 free per month
- **Hosting**: $0.15 per GB served + $0.023 per GB stored
- **Estimated monthly cost**: $5-15

## 🔧 AWS CLI Deployment (Optional - For Developers)

If you have AWS CLI configured:

```bash
# Upload files to S3
aws s3 sync . s3://starshippsychics.com --exclude ".git/*" --exclude "*.md"

# Invalidate CloudFront cache (after updates)
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## 📝 Post-Deployment Checklist

- [ ] Website loads correctly at your domain
- [ ] HTTPS is working (green padlock in browser)
- [ ] All images load correctly
- [ ] Mobile navigation works
- [ ] Contact form submission works
- [ ] All links work correctly
- [ ] Test on multiple devices/browsers
- [ ] Set up Google Analytics (optional)
- [ ] Set up AWS CloudWatch for monitoring
- [ ] Configure email forwarding for info@starshippsychics.com

## 🔄 Updating Your Website

### Via S3 Console:
1. Go to your S3 bucket
2. Upload new/modified files
3. If using CloudFront, create invalidation

### Via AWS CLI:
```bash
aws s3 sync . s3://starshippsychics.com
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## 🆘 Troubleshooting

### Website not loading
- Check S3 bucket policy is set to public
- Verify static website hosting is enabled
- Check CloudFront distribution status is "Deployed"

### Images not loading
- Verify image file names match exactly (case-sensitive)
- Check images were uploaded to S3
- Clear browser cache

### HTTPS not working
- Verify SSL certificate is validated
- Check CloudFront alternate domain names
- Verify DNS records point to CloudFront

### Form not sending emails
- Implement AWS SES for email sending
- Or use a third-party form service (Formspree, etc.)

## 📚 Additional Resources

- [AWS S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [AWS Certificate Manager](https://docs.aws.amazon.com/acm/)
- [Route 53 Documentation](https://docs.aws.amazon.com/route53/)

## 🎯 Next Steps

1. Deploy your website to AWS
2. Test thoroughly on all devices
3. Set up monitoring and analytics
4. Configure email handling for contact form
5. Plan content updates and maintenance schedule

---

**Need Help?** Contact AWS Support or refer to the AWS documentation linked above.
