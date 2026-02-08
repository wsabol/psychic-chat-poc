// ===================================
// Starship Psychics Website JavaScript
// ===================================

// Mobile Navigation Toggle
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking on a nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// Smooth Scrolling for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navbarHeight = document.querySelector('.navbar').offsetHeight;
            const targetPosition = target.offsetTop - navbarHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Navbar Background Change on Scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(26, 32, 44, 0.98)';
    } else {
        navbar.style.background = 'rgba(26, 32, 44, 0.95)';
    }
});

// ===================================
// Contact Form Handling with AJAX
// ===================================
// Handle both forms to prevent redirect and show success message on page

// Home Contact Form
const homeContactForm = document.getElementById('homeContactForm');
if (homeContactForm) {
    homeContactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('homeSubmitBtn');
        const messageDiv = document.getElementById('homeFormMessage');
        const formData = new FormData(this);
        
        // Disable button and show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        messageDiv.style.display = 'none';
        
        try {
            const response = await fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                // Show success message
                messageDiv.className = 'form-message success';
                messageDiv.textContent = '✨ Thank you! Your message has been sent successfully. We\'ll get back to you soon!';
                messageDiv.style.display = 'block';
                
                // Reset form
                this.reset();
                
                // Track conversion for Google Ads
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'conversion', {'send_to': 'AW-17907083191/Gk-pCPytn_MbELfP4dpC'});
                }
            } else {
                throw new Error('Form submission failed');
            }
        } catch (error) {
            // Show error message
            messageDiv.className = 'form-message error';
            messageDiv.textContent = '❌ Oops! Something went wrong. Please try again or email us directly at info@starshippsychics.com';
            messageDiv.style.display = 'block';
        } finally {
            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message ✨';
        }
    });
}

// Contact Form (bottom of page)
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('contactSubmitBtn');
        const messageDiv = document.getElementById('contactFormMessage');
        const formData = new FormData(this);
        
        // Disable button and show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        messageDiv.style.display = 'none';
        
        try {
            const response = await fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                // Show success message
                messageDiv.className = 'form-message success';
                messageDiv.textContent = '✨ Thank you! Your message has been sent successfully. We\'ll get back to you soon!';
                messageDiv.style.display = 'block';
                
                // Reset form
                this.reset();
                
                // Track conversion for Google Ads
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'conversion', {'send_to': 'AW-17907083191/Gk-pCPytn_MbELfP4dpC'});
                }
            } else {
                throw new Error('Form submission failed');
            }
        } catch (error) {
            // Show error message
            messageDiv.className = 'form-message error';
            messageDiv.textContent = '❌ Oops! Something went wrong. Please try again or email us directly at info@starshippsychics.com';
            messageDiv.style.display = 'block';
        } finally {
            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message';
        }
    });
}

// Add animation on scroll for elements
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards, testimonials, and other elements
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.feature-card, .testimonial-card, .contact-item');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Add current year to footer
const currentYear = new Date().getFullYear();
const footerBottom = document.querySelector('.footer-bottom p');
if (footerBottom) {
    footerBottom.textContent = `© ${currentYear} Starship Psychics. All rights reserved.`;
}

// Track clicks on "Get Notified" button
const notifyButtons = document.querySelectorAll('.banner-cta, .btn-primary');
notifyButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        // You can add analytics tracking here
    });
});

// Optional: Add particles or cosmic effect to hero section
// This creates a starry background effect
function createStars() {
    const heroSection = document.querySelector('.hero-section');
    if (!heroSection) return;
    
    const starsContainer = document.createElement('div');
    starsContainer.className = 'stars-container';
    starsContainer.style.position = 'absolute';
    starsContainer.style.top = '0';
    starsContainer.style.left = '0';
    starsContainer.style.width = '100%';
    starsContainer.style.height = '100%';
    starsContainer.style.overflow = 'hidden';
    starsContainer.style.pointerEvents = 'none';
    
    // Create multiple stars
    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.position = 'absolute';
        star.style.width = '2px';
        star.style.height = '2px';
        star.style.background = 'white';
        star.style.borderRadius = '50%';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animation = `twinkle ${2 + Math.random() * 3}s infinite`;
        star.style.opacity = Math.random();
        starsContainer.appendChild(star);
    }
    
    heroSection.insertBefore(starsContainer, heroSection.firstChild);
    
    // Add twinkle animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes twinkle {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// Initialize stars effect
createStars();

// Handle external links
document.querySelectorAll('a[href^="http"]').forEach(link => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
});

