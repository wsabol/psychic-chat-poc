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

// Contact Form Handler
const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Disable submit button to prevent double submission
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        
        // Get form data
        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            message: document.getElementById('message').value.trim()
        };
        
        // Basic validation
        if (!formData.name || !formData.email || !formData.message) {
            formMessage.textContent = 'Please fill in all fields.';
            formMessage.className = 'form-message error';
            formMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
            return;
        }
        
        // Show loading message
        formMessage.textContent = 'Sending message...';
        formMessage.className = 'form-message';
        formMessage.style.display = 'block';
        
        try {
            // Create mailto link with form data
            const subject = encodeURIComponent('Contact Form Submission from ' + formData.name);
            const body = encodeURIComponent(
                `Name: ${formData.name}\n` +
                `Email: ${formData.email}\n\n` +
                `Message:\n${formData.message}\n\n` +
                `---\nSent from starshippsychics.com contact form`
            );
            const mailtoLink = `mailto:info@starshippsychics.com?subject=${subject}&body=${body}`;
            
            // Open mailto link
            window.location.href = mailtoLink;
            
            // Show success message
            formMessage.textContent = 'Opening your email client... Please send the pre-filled message or email us directly at info@starshippsychics.com';
            formMessage.className = 'form-message success';
            
            // Reset form after a delay
            setTimeout(() => {
                contactForm.reset();
            }, 2000);
            
            // Hide message after 10 seconds
            setTimeout(() => {
                formMessage.style.display = 'none';
            }, 10000);
            
        } catch (error) {
            console.error('Contact form error:', error);
            // Show error message
            formMessage.textContent = error.message || 'Sorry, there was an error sending your message. Please email us directly at info@starshippsychics.com';
            formMessage.className = 'form-message error';
            
            // Hide error message after 10 seconds
            setTimeout(() => {
                formMessage.style.display = 'none';
            }, 10000);
        } finally {
            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
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

