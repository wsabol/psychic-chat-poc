# Batch 6 - 30 files from comprehensive audit (highest console.error counts)
# Worker + Client files
$files = @(
    "worker/modules/astrology-shell.js",
    "client/src/hooks/billing/usePaymentMethods.js",
    "worker/modules/astrology.js",
    "client/src/pages/subscriptions/hooks/useSubscriptionHandlers.js",
    "worker/processor.js",
    "worker/modules/utils/specialRequestDetector.js",
    "worker/fix-astrology-data.js",
    "client/src/pages/SettingsPage.js",
    "client/src/pages/PreferencesPage/usePreferencesLogic.js",
    "worker/modules/handlers/horoscope-handler.async.js",
    "client/src/utils/dateParser.js",
    "client/src/hooks/useAuthAPI.js",
    "client/src/hooks/auth/useAuthSession.js",
    "client/src/hooks/useRegistrationFlow.js",
    "worker/modules/handlers/horoscope-handler.updated.js",
    "client/src/pages/MoonPhasePage.js",
    "worker/modules/utils/timezoneUtils.js",
    "client/src/hooks/auth/useAuthBilling.js",
    "worker/modules/handlers/horoscope-handler.js",
    "client/src/hooks/useEmailVerification.js",
    "client/src/hooks/auth/useAuthState.js",
    "worker/modules/messages.js",
    "worker/modules/violation/violationRedemption.js",
    "client/src/components/ReAuthModal.js",
    "client/src/pages/AdminPage.js",
    "worker/modules/handlers/cosmic-weather-handler-NEW.js",
    "worker/modules/handlers/cosmic-weather-handler-FIXED.js",
    "client/src/pages/payment-methods/hooks/useFinancialConnections.js",
    "client/src/utils/fetchWithTokenRefresh.js",
    "client/src/hooks/usePersonalInfoAPI.js"
)

& .\BULK_CONSOLE_FIX_V4.ps1 -BatchName "Batch-6-30Files" -Files $files
