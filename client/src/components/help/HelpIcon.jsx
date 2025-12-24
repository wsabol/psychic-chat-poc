import React from 'react';
import './HelpChat.css';

/**
 * HelpIcon - Fixed question mark button
 * Toggles help chat window
 */
export function HelpIcon({ isOpen, onToggle }) {
  return (
    <button
      className={`help-icon ${isOpen ? 'hidden' : ''}`}
      onClick={onToggle}
      title="Get Help"
      aria-label="Help and Questions"
    >
      ?
    </button>
  );
}
