import React, { useState, useEffect } from 'react';
import './OnboardingModal.css';

/**
 * OnboardingModal - Guided 4-step onboarding for new users
 * 
 * Steps:
 * 1. Create Account ✅
 * 2. Payment Method (required)
 * 3. Subscription (required)
 * 4. Personal Information (required)
 * 
 * All 4 steps must be completed to access the app.
 */
export default function OnboardingModal({
  currentStep,
  completedSteps,
  onNavigateToStep,
  onClose,
  isMinimized,
  onToggleMinimize,
  isDragging,
  position,
  onStartDrag
}) {
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    setFadeIn(true);
  }, []);

  const steps = [
    {
      id: 'create_account',
      number: 1,
      title: 'Create Account',
      icon: '👤',
      description: 'Account created',
      required: true,
      complete: true, // Always complete for showing users
    },
    {
      id: 'payment_method',
      number: 2,
      title: 'Payment Method',
      icon: '💳',
      description: 'Add payment method',
      required: true,
      complete: completedSteps?.payment_method || false,
    },
    {
      id: 'subscription',
      number: 3,
      title: 'Subscription',
      icon: '🎯',
      description: 'Purchase subscription',
      required: true,
      complete: completedSteps?.subscription || false,
      disabled: !completedSteps?.payment_method, // Disabled until payment method added
    },
    {
      id: 'personal_info',
      number: 4,
      title: 'Get Acquainted',
      icon: '🌟',
      description: 'Personal information',
      required: true,
      complete: completedSteps?.personal_info || false,
      disabled: !completedSteps?.subscription,
    },

  ];

  if (isMinimized) {
    return (
      <div 
        className="onboarding-minimized"
        style={{
          left: position?.x || '20px',
          top: position?.y || '20px',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={onStartDrag}
        title="Drag to move, click to expand"
      >
        <button onClick={onToggleMinimize} className="minimized-button">
          ⬆️ Onboarding
        </button>
      </div>
    );
  }

  const allRequiredComplete = completedSteps?.payment_method && completedSteps?.subscription && completedSteps?.personal_info;

  return (
    <div 
      className={`onboarding-modal-wrapper ${fadeIn ? 'fade-in' : ''}`}
      style={{
        left: position?.x || '20px',
        top: position?.y || '20px',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Header with drag handle and minimize */}
      <div className="onboarding-header" onMouseDown={onStartDrag}>
        <div className="onboarding-title-section">
          <h3>🚀 Onboarding Progress</h3>
          <p className="onboarding-subtitle">
            {allRequiredComplete ? '✨ Required steps complete!' : 'Complete required steps to access the app'}
          </p>
        </div>
        <div className="onboarding-controls">
          <button 
            className="onboarding-minimize"
            onClick={() => onToggleMinimize(true)}
            title="Minimize"
            type="button"
          >
            −
          </button>
          {allRequiredComplete && (
            <button 
              className="onboarding-close"
              onClick={onClose}
              title="Close and go to Chat"
              type="button"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="onboarding-steps">
        {steps.map((step) => (
          <button
            key={step.id}
            className={`onboarding-step ${step.complete ? 'complete' : ''} ${step.disabled ? 'disabled' : ''} ${step.required ? 'required' : 'optional'}`}
            onClick={() => !step.disabled && onNavigateToStep(step.id)}
            disabled={step.disabled}
            title={step.disabled ? 'Complete previous steps first' : `Go to ${step.title}`}
            type="button"
          >
            <div className="step-icon">{step.icon}</div>
            <div className="step-content">
              <div className="step-title">{step.title}</div>
              <div className="step-desc">{step.description}</div>
              <div className="step-badges">
                {step.required && <span className="step-required">Required</span>}
                {!step.required && <span className="step-optional">Optional</span>}
                {step.complete && <span className="step-check">✓</span>}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer message */}
      <div className="onboarding-footer">
        {!allRequiredComplete && (
          <p>Complete all steps to start using the app</p>
        )}
        {allRequiredComplete && (
          <p>✨ Onboarding complete! Enjoy the app</p>
        )}
      </div>
    </div>
  );
}
