import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
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
  const { t } = useTranslation();
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    setFadeIn(true);
  }, []);

  const steps = [
    {
      id: 'create_account',
      number: 1,
      title: t('modal.steps.createAccount.title'),
      icon: '👤',
      description: t('modal.steps.createAccount.description'),
      required: true,
      complete: true, // Always complete for showing users
    },
    {
      id: 'payment_method',
      number: 2,
      title: t('modal.steps.paymentMethod.title'),
      icon: '💳',
      description: t('modal.steps.paymentMethod.description'),
      required: true,
      complete: completedSteps?.payment_method || false,
    },
    {
      id: 'subscription',
      number: 3,
      title: t('modal.steps.subscription.title'),
      icon: '🎯',
      description: t('modal.steps.subscription.description'),
      required: true,
      complete: completedSteps?.subscription || false,
      disabled: !completedSteps?.payment_method, // Disabled until payment method added
    },
    {
      id: 'personal_info',
      number: 4,
      title: t('modal.steps.personalInfo.title'),
      icon: '🌟',
      description: t('modal.steps.personalInfo.description'),
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
        title={t('modal.tooltips.dragMove')}
      >
        <button onClick={onToggleMinimize} className="minimized-button">
          ⬆️ {t('modal.buttons.minimize')}
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
          <h3>{t('modal.title')}</h3>
          <p className="onboarding-subtitle">
            {allRequiredComplete ? t('modal.subtitleComplete') : t('modal.subtitle')}
          </p>
        </div>
        <div className="onboarding-controls">
          <button 
            className="onboarding-minimize"
            onClick={() => onToggleMinimize(true)}
            title={t('modal.buttons.minimize')}
            type="button"
          >
            −
          </button>
          {allRequiredComplete && (
            <button 
              className="onboarding-close"
              onClick={onClose}
              title={t('modal.buttons.close')}
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
            title={step.disabled ? t('modal.tooltips.disabled') : t('modal.tooltips.goToStep', { stepTitle: step.title })}
            type="button"
          >
            <div className="step-icon">{step.icon}</div>
            <div className="step-content">
              <div className="step-title">{step.title}</div>
              <div className="step-desc">{step.description}</div>
              <div className="step-badges">
                {step.required && <span className="step-required">{t('modal.badges.required')}</span>}
                {!step.required && <span className="step-optional">{t('modal.badges.optional')}</span>}
                {step.complete && <span className="step-check">✓</span>}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer message */}
      <div className="onboarding-footer">
        {!allRequiredComplete && (
          <p>{t('modal.footer.incomplete')}</p>
        )}
        {allRequiredComplete && (
          <p>{t('modal.footer.complete')}</p>
        )}
      </div>
    </div>
  );
}
