// ===================================
// Starship Psychics Website JavaScript
// ===================================

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION  —  hamburger toggle + close-on-link-click
// ─────────────────────────────────────────────────────────────────────────────

function initNav() {
    const hamburger = document.getElementById('hamburger');
    const navMenu   = document.getElementById('navMenu');
    if (!hamburger || !navMenu) return;

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    navMenu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// Darken navbar slightly on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    navbar.style.background = window.scrollY > 50
        ? 'rgba(26, 32, 44, 0.98)'
        : 'rgba(26, 32, 44, 0.95)';
});

// ─────────────────────────────────────────────────────────────────────────────
// SMOOTH SCROLLING  —  event delegation handles both static and in-page anchors
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('click', function (e) {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;
    const targetSelector = anchor.getAttribute('href');
    if (targetSelector === '#') return;
    const target = document.querySelector(targetSelector);
    if (target) {
        e.preventDefault();
        const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 0;
        window.scrollTo({ top: target.offsetTop - navbarHeight, behavior: 'smooth' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER YEAR  —  keep copyright current automatically
// ─────────────────────────────────────────────────────────────────────────────

function initFooterYear() {
    const yearSpan = document.getElementById('footer-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTERNAL LINKS  —  open in new tab safely
// ─────────────────────────────────────────────────────────────────────────────

function initExternalLinks() {
    document.querySelectorAll('a[href^="http"]').forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SCROLL-IN ANIMATIONS  —  feature cards, testimonials, contact items
// ─────────────────────────────────────────────────────────────────────────────

function initScrollAnimations() {
    if (!('IntersectionObserver' in window)) return; // graceful degradation

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity   = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target); // animate once only
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -80px 0px' });

    document.querySelectorAll('.feature-card, .testimonial-card, .contact-item').forEach(el => {
        el.style.opacity    = '0';
        el.style.transform  = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// STAR FIELD  —  decorative twinkling stars on the hero section
// ─────────────────────────────────────────────────────────────────────────────

function createStars() {
    const heroSection = document.querySelector('.hero-section');
    if (!heroSection) return;

    const container = document.createElement('div');
    Object.assign(container.style, {
        position: 'absolute', top: '0', left: '0',
        width: '100%', height: '100%',
        overflow: 'hidden', pointerEvents: 'none'
    });

    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        Object.assign(star.style, {
            position: 'absolute', width: '2px', height: '2px',
            background: 'white', borderRadius: '50%',
            left: Math.random() * 100 + '%',
            top:  Math.random() * 100 + '%',
            animation: `twinkle ${2 + Math.random() * 3}s infinite`,
            opacity: String(Math.random())
        });
        container.appendChild(star);
    }
    heroSection.insertBefore(container, heroSection.firstChild);

    if (!document.getElementById('twinkle-style')) {
        const style = document.createElement('style');
        style.id = 'twinkle-style';
        style.textContent = `@keyframes twinkle{0%,100%{opacity:.2}50%{opacity:1}}`;
        document.head.appendChild(style);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT FORMS  —  AJAX submission, success / error feedback
// ─────────────────────────────────────────────────────────────────────────────

async function submitForm(form, submitBtnId, messageDivId, successText, successCallback) {
    const submitBtn  = document.getElementById(submitBtnId);
    const messageDiv = document.getElementById(messageDivId);
    if (!submitBtn || !messageDiv) return;

    const originalText = submitBtn.textContent;
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Sending...';
    messageDiv.style.display = 'none';

    try {
        if (typeof fetch === 'undefined') { form.submit(); return; }

        const response = await fetch(form.action, {
            method: 'POST', body: new FormData(form),
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            messageDiv.className     = 'form-message success';
            messageDiv.textContent   = successText;
            messageDiv.style.display = 'block';
            form.reset();
            if (typeof successCallback === 'function') successCallback();
        } else {
            throw new Error('Submission failed');
        }
    } catch {
        messageDiv.className     = 'form-message error';
        messageDiv.textContent   = '❌ Oops! Something went wrong. Please try again or email us directly at info@starshippsychics.com';
        messageDiv.style.display = 'block';
    } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = originalText;
    }
}

const SUCCESS_MSG = '✨ Thank you! Your message has been sent successfully. We\'ll get back to you soon!';
const ADS_CONVERSION = () => {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'conversion', { 'send_to': 'AW-17907083191/Gk-pCPytn_MbELfP4dpC' });
    }
};

const homeContactForm = document.getElementById('homeContactForm');
if (homeContactForm) {
    homeContactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        submitForm(this, 'homeSubmitBtn', 'homeFormMessage', SUCCESS_MSG, ADS_CONVERSION);
    });
}

const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        submitForm(this, 'contactSubmitBtn', 'contactFormMessage', SUCCESS_MSG, ADS_CONVERSION);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOTSTRAP  —  run everything once the DOM is ready
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initFooterYear();
    initExternalLinks();
    initScrollAnimations();
    createStars(); // no-op on pages without .hero-section
});
