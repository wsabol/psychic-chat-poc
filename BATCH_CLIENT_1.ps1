# Batch CLIENT_1: Files 1-30 of 90
$Files = @(
    "client/build/static/js/main.de4829ef.js",
    "client/src/components/AdminTabs/ViolationReportTab.jsx",
    "client/src/components/AstrologyModal.js",
    "client/src/components/CardDisplay.js",
    "client/src/components/ChatHistory.js",
    "client/src/components/ComplianceUpdateModal.jsx",
    "client/src/components/ConsentModal.jsx",
    "client/src/components/ErrorBoundary.js",
    "client/src/components/help/DocumentViewer.jsx",
    "client/src/components/help/HelpChatWindow.jsx",
    "client/src/components/LanguageSwitcher.jsx",
    "client/src/components/MySignModal.js",
    "client/src/components/ReAuthModal.js",
    "client/src/components/security/DevicesTab.js",
    "client/src/components/security/EmailTab.js",
    "client/src/components/security/PasskeyTab.js",
    "client/src/components/security/PasswordTab.js",
    "client/src/components/security/PhoneTab.js",
    "client/src/components/security/SessionPrivacyTab.js",
    "client/src/components/security/TwoFactorAuthTab.js",
    "client/src/components/security/verification/hooks/use2FASettings.js",
    "client/src/components/security/verification/TrustCurrentDeviceSection.jsx",
    "client/src/components/security/verification/TrustedDevicesSection.jsx",
    "client/src/components/settings/DeleteAccountModal.js",
    "client/src/components/WelcomeMessage.jsx",
    "client/src/config/stripe.js",
    "client/src/context/AuthContext.jsx"
)

& .\BULK_CONSOLE_FIX_V10_CORRECTED.ps1 -Files $Files -BatchName "CLIENT_BATCH_1"
