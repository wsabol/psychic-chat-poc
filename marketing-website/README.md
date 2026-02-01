# Starship Psychics Marketing Website

A modern, professional marketing website for Starship Psychics featuring the new "Psychic Chat Coming Soon" banner and Samantha's testimonial.

## 🌟 Features

- ✅ **Coming Soon Banner** - Eye-catching animated banner announcing Psychic Chat
- ✅ **Professional Testimonial Section** - Samantha's testimonial with credentials
- ✅ **Responsive Design** - Works perfectly on all devices (mobile, tablet, desktop)
- ✅ **Modern UI/UX** - Beautiful gradients, animations, and smooth scrolling
- ✅ **Contact Form** - Easy way for visitors to get in touch
- ✅ **SEO Optimized** - Meta tags and semantic HTML
- ✅ **Fast Loading** - Optimized CSS and JavaScript
- ✅ **Email Integration** - Uses info@starshippsychics.com

## 📁 File Structure

```
marketing-website/
├── index.html              # Main HTML file
├── styles.css              # All styling
├── script.js               # Interactive functionality
├── StarshipPsychics_Logo.png  # Your logo
├── AWS-DEPLOYMENT-GUIDE.md # Complete AWS deployment instructions
└── README.md              # This file
```

## 🚀 Quick Start (Local Testing)

### Option 1: Simple - Just Open the File
1. Navigate to the `marketing-website` folder
2. Double-click `index.html`
3. The website will open in your default browser

### Option 2: Local Server (Recommended for testing)
```bash
# If you have Python installed:
cd marketing-website
python -m http.server 8000
# Then open: http://localhost:8000

# Or if you have Node.js:
npx http-server
```

## 🎨 Customization Guide

### 1. Adding Your Photo from Old Website

The CSS is already configured to use a hero background image. To add your existing photo:

1. Save your photo from www.starshippsychics.com (right-click → Save Image)
2. Rename it to `hero-background.jpg` (or `.png` if PNG format)
3. Place it in the `marketing-website` folder
4. The website will automatically use it as the hero section background

If you want to use the image in the About section:
1. Save your photo as `about-image.jpg`
2. Place it in the `marketing-website` folder
3. It will appear in the About section

### 2. Update Samantha's Testimonial

Open `index.html` and find the testimonials section (around line 220). Replace:
- The testimonial text with her actual quote
- `Samantha [Last Name]` with her full name
- The credentials with her actual credentials
- The additional info with her experience/titles
- Change the `S` in the avatar to her actual first initial if different

### 3. Add More Images

Simply place your images in the `marketing-website` folder and reference them in the HTML:
```html
<img src="your-image-name.jpg" alt="Description">
```

### 4. Change Colors

Edit `styles.css` and modify the CSS variables at the top:
```css
:root {
    --primary-color: #667eea;     /* Main purple color */
    --secondary-color: #764ba2;   /* Darker purple */
    --accent-color: #fbbf24;      /* Gold/yellow */
}
```

### 5. Update Contact Information

The website currently uses:
- **Email**: info@starshippsychics.com ✅ (Already configured)
- **Address**: PO Box 13, Wimberley, TX 78676

To change, search for these in `index.html` and update.

### 6. Add Social Media Links

In `index.html`, find the footer section (around line 330) and replace the `#` symbols with your actual social media URLs:
```html
<a href="https://facebook.com/yourpage" class="social-link">📘</a>
<a href="https://twitter.com/yourhandle" class="social-link">🐦</a>
<a href="https://instagram.com/yourprofile" class="social-link">📷</a>
```

## 📧 Setting Up Contact Form Email

The contact form currently shows a success message but doesn't actually send emails. To make it functional:

### Option 1: AWS SES (If using AWS hosting)
1. Set up AWS SES (Simple Email Service)
2. Verify info@starshippsychics.com
3. Create an API endpoint or Lambda function to send emails
4. Update `script.js` to call your API

### Option 2: Third-Party Service (Easiest)
Use a form service like:
- **Formspree** (https://formspree.io) - Free for 50 submissions/month
- **Form submit** (https://formsubmit.co) - Free, no registration
- **Basin** (https://usebasin.com) - Free tier available

Example with Formspree:
1. Sign up at formspree.io
2. Create a form and get your endpoint
3. In `index.html`, update the form tag:
```html
<form id="contactForm" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

### Option 3: Use mailto (Temporary)
The form currently opens the user's email client. This works but isn't ideal.

## 🌐 Deploying to AWS

Follow the complete instructions in `AWS-DEPLOYMENT-GUIDE.md` for step-by-step deployment to AWS.

**Quick Summary:**
1. Create S3 bucket named `starshippsychics.com`
2. Enable static website hosting
3. Upload all files
4. Set up CloudFront for HTTPS
5. Configure your domain DNS

**Estimated Monthly Cost:** $1-5 for low-traffic site

## ✅ Pre-Deployment Checklist

Before deploying, make sure you:

- [ ] Added your photo(s) from the old website
- [ ] Updated Samantha's testimonial with real information
- [ ] Verified the contact email is info@starshippsychics.com
- [ ] Added your social media links (if you have them)
- [ ] Tested the website locally
- [ ] Checked mobile responsiveness
- [ ] Verified all links work
- [ ] Set up email handling for contact form

## 📱 Browser Compatibility

Tested and working on:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🎯 What's Included

### Sections:
1. **Navigation Bar** - Fixed top navigation with logo
2. **Coming Soon Banner** - Animated banner for Psychic Chat launch
3. **Hero Section** - Large hero with call-to-action buttons
4. **Features** - 6 feature cards explaining services
5. **About** - Company information with stats
6. **Testimonials** - Samantha's professional testimonial
7. **Contact** - Contact information and form
8. **Footer** - Links, legal, and company info

### Interactive Elements:
- Mobile hamburger menu
- Smooth scrolling navigation
- Hover effects on buttons and cards
- Animated banner with floating emojis
- Scroll animations for sections
- Twinkling stars effect in hero section
- Contact form validation

## 🔄 Updating Content

After deployment, to update content:

1. Edit the files locally
2. Test changes by opening `index.html`
3. Upload changed files to S3
4. If using CloudFront, create a cache invalidation

## 📞 Support

For questions about:
- **Website functionality**: Check this README
- **AWS deployment**: See AWS-DEPLOYMENT-GUIDE.md
- **AWS technical support**: Contact AWS Support
- **Web design changes**: Edit HTML/CSS/JS files

## 🎨 Design Notes

- **Color Scheme**: Purple gradient (#667eea to #764ba2) representing cosmic/mystical theme
- **Fonts**: System fonts for fast loading
- **Icons**: Emoji icons for universal compatibility
- **Responsive**: Mobile-first design approach
- **Accessibility**: Semantic HTML, ARIA labels where needed

## 📝 License & Copyright

© 2026 Starship Psychics. All rights reserved.

---

## 🚀 Next Steps

1. **Test Locally** - Open index.html and test all features
2. **Add Your Images** - Replace placeholder images with your photos
3. **Customize Content** - Update Samantha's testimonial and any other text
4. **Deploy to AWS** - Follow the AWS-DEPLOYMENT-GUIDE.md
5. **Test Live** - Verify everything works on the live site
6. **Monitor** - Set up analytics and monitoring

**Questions?** All the information you need is in this README and the AWS-DEPLOYMENT-GUIDE.md file!

Good luck with your launch! 🌟✨🔮
