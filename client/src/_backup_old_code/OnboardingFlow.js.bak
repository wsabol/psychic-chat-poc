import AstrologyPromptModal from '../modals/AstrologyPromptModal';
import PersonalInfoModal from './PersonalInfoModal';
import HoroscopePage from '../pages/HoroscopePage';
import OnboardingModal from '../modals/OnboardingModal';

/**
 * OnboardingFlow - All onboarding modals and pages in one component
 */
export default function OnboardingFlow({
  // Onboarding state
  showAstrologyPrompt,
  setShowAstrologyPrompt,
  showPersonalInfoModal,
  setShowPersonalInfoModal,
  showHoroscopePage,
  setShowHoroscopePage,
  showFinalModal,
  setShowFinalModal,
  isTemporaryAccount,
  onboardingFirstMessage,
  onboardingHoroscope,
  
  // User data
  userId,
  token,
  auth,
  
  // Handlers
  handleAstrologyPromptNo,
  handleAstrologyPromptYes,
  handlePersonalInfoClose,
  handlePersonalInfoSave,
  handleHoroscopeClose,
  handleSetupAccount,
  handleExit
}) {
  return (
    <>
      {/* Astrology Prompt Modal */}
      <AstrologyPromptModal
        show={showAstrologyPrompt}
        isTemporary={isTemporaryAccount}
        onYes={handleAstrologyPromptYes}
        onNo={handleAstrologyPromptNo}
      />

      {/* Personal Info Modal */}
      <PersonalInfoModal
        userId={userId}
        token={token}
        isOpen={showPersonalInfoModal}
        isTemporaryAccount={isTemporaryAccount}
        onClose={handlePersonalInfoClose}
        onSave={handlePersonalInfoSave}
      />

      {/* Horoscope Page (Full Page, not modal) */}
      {showHoroscopePage && isTemporaryAccount && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2000,
          backgroundColor: '#fff',
          overflow: 'auto'
        }}>
          <button
            onClick={handleHoroscopeClose}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 2001,
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            ✕ Close
          </button>
          <HoroscopePage
            userId={userId}
            token={token}
            auth={auth}
          />
        </div>
      )}

      {/* Final Onboarding Modal (Setup/Exit choice) */}
      <OnboardingModal
        show={showFinalModal}
        isTemporary={isTemporaryAccount}
        onSetupAccount={handleSetupAccount}
        onExit={handleExit}
        onboardingData={{
          firstMessage: onboardingFirstMessage,
          horoscope: onboardingHoroscope
        }}
      />
    </>
  );
}
