import React from 'react';
import './Footer.css';

/**
 * Footer - Sticky footer component with copyright notice
 * Displays dynamic year that updates January 1st automatically
 */
export default function Footer() {
  // Dynamic year - automatically updates on January 1st
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="app-footer">
      <p className="footer-text">
        © Copyright {currentYear} - Starship Psychics LLC. All rights reserved.
      </p>
    </footer>
  );
}
