import React from 'react';

/**
 * BirthInfoMissingPrompt Component
 * Professional prompt when user tries to access astrology features
 * without completing their birth information
 */
export function BirthInfoMissingPrompt({ onNavigateToPersonalInfo }) {
  return (
    <div className="birth-info-prompt">
      <div className="prompt-content">
        <div className="prompt-icon">🌙</div>
        <h3 className="prompt-title">Complete Your Birth Chart</h3>
        <p className="prompt-message">
          To unlock personalized astrology readings, we need your birth information including your birth date, time, and location.
        </p>
        
        <div className="prompt-action">
          <button
            onClick={onNavigateToPersonalInfo}
            className="btn-primary"
          >
            Go to Personal Information
          </button>
          <p className="prompt-subtext">
            You'll find this under <strong>My Account → Personal Information</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

export default BirthInfoMissingPrompt;
