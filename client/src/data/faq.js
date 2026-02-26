/**
 * FAQ Data for Psychic Chat App
 * Organized by category.
 *
 * All text fields (categoryKey, questionKey, answerKey) are i18n translation
 * keys resolved at render-time via the t() function from TranslationContext.
 * Icons are emoji and do not require translation.
 */

export const FAQ_DATA = [
  {
    id: 'getting-started',
    categoryKey: 'faq.getting-started.category',
    icon: '🚀',
    questions: [
      {
        id: 'what-is-psychic-chat',
        questionKey: 'faq.getting-started.what-is-psychic-chat.question',
        answerKey:   'faq.getting-started.what-is-psychic-chat.answer',
      },
      {
        id: 'how-do-i-get-started',
        questionKey: 'faq.getting-started.how-do-i-get-started.question',
        answerKey:   'faq.getting-started.how-do-i-get-started.answer',
      },
      {
        id: 'do-i-need-birth-time',
        questionKey: 'faq.getting-started.do-i-need-birth-time.question',
        answerKey:   'faq.getting-started.do-i-need-birth-time.answer',
      },
      {
        id: 'is-app-free',
        questionKey: 'faq.getting-started.is-app-free.question',
        answerKey:   'faq.getting-started.is-app-free.answer',
      },
    ],
  },
  {
    id: 'chat-features',
    categoryKey: 'faq.chat-features.category',
    icon: '💬',
    questions: [
      {
        id: 'how-to-chat',
        questionKey: 'faq.chat-features.how-to-chat.question',
        answerKey:   'faq.chat-features.how-to-chat.answer',
      },
      {
        id: 'what-can-i-ask',
        questionKey: 'faq.chat-features.what-can-i-ask.question',
        answerKey:   'faq.chat-features.what-can-i-ask.answer',
      },
      {
        id: 'chat-history',
        questionKey: 'faq.chat-features.chat-history.question',
        answerKey:   'faq.chat-features.chat-history.answer',
      },
      {
        id: 'premium-chat',
        questionKey: 'faq.chat-features.premium-chat.question',
        answerKey:   'faq.chat-features.premium-chat.answer',
      },
    ],
  },
  {
    id: 'personal-info',
    categoryKey: 'faq.personal-info.category',
    icon: '👤',
    questions: [
      {
        id: 'update-personal-info',
        questionKey: 'faq.personal-info.update-personal-info.question',
        answerKey:   'faq.personal-info.update-personal-info.answer',
      },
      {
        id: 'birth-location',
        questionKey: 'faq.personal-info.birth-location.question',
        answerKey:   'faq.personal-info.birth-location.answer',
      },
      {
        id: 'change-birth-info',
        questionKey: 'faq.personal-info.change-birth-info.question',
        answerKey:   'faq.personal-info.change-birth-info.answer',
      },
      {
        id: 'data-privacy',
        questionKey: 'faq.personal-info.data-privacy.question',
        answerKey:   'faq.personal-info.data-privacy.answer',
      },
      {
        id: 'skip-onboarding',
        questionKey: 'faq.personal-info.skip-onboarding.question',
        answerKey:   'faq.personal-info.skip-onboarding.answer',
      },
      {
        id: 'free-trial-zodiac-picker',
        questionKey: 'faq.personal-info.free-trial-zodiac-picker.question',
        answerKey:   'faq.personal-info.free-trial-zodiac-picker.answer',
      },
    ],
  },
  {
    id: 'birth-chart',
    categoryKey: 'faq.birth-chart.category',
    icon: '♈',
    questions: [
      {
        id: 'what-is-birth-chart',
        questionKey: 'faq.birth-chart.what-is-birth-chart.question',
        answerKey:   'faq.birth-chart.what-is-birth-chart.answer',
      },
      {
        id: 'sun-moon-rising',
        questionKey: 'faq.birth-chart.sun-moon-rising.question',
        answerKey:   'faq.birth-chart.sun-moon-rising.answer',
      },
      {
        id: 'view-birth-chart',
        questionKey: 'faq.birth-chart.view-birth-chart.question',
        answerKey:   'faq.birth-chart.view-birth-chart.answer',
      },
      {
        id: 'accurate-chart',
        questionKey: 'faq.birth-chart.accurate-chart.question',
        answerKey:   'faq.birth-chart.accurate-chart.answer',
      },
      {
        id: 'zodiac-wheel',
        questionKey: 'faq.birth-chart.zodiac-wheel.question',
        answerKey:   'faq.birth-chart.zodiac-wheel.answer',
      },
    ],
  },
  {
    id: 'onboarding',
    categoryKey: 'faq.onboarding.category',
    icon: '🎯',
    questions: [
      {
        id: 'what-is-onboarding',
        questionKey: 'faq.onboarding.what-is-onboarding.question',
        answerKey:   'faq.onboarding.what-is-onboarding.answer',
      },
      {
        id: 'can-skip-onboarding',
        questionKey: 'faq.onboarding.can-skip-onboarding.question',
        answerKey:   'faq.onboarding.can-skip-onboarding.answer',
      },
    ],
  },
  {
    id: 'horoscope',
    categoryKey: 'faq.horoscope.category',
    icon: '🔮',
    questions: [
      {
        id: 'what-is-horoscope',
        questionKey: 'faq.horoscope.what-is-horoscope.question',
        answerKey:   'faq.horoscope.what-is-horoscope.answer',
      },
      {
        id: 'view-horoscope',
        questionKey: 'faq.horoscope.view-horoscope.question',
        answerKey:   'faq.horoscope.view-horoscope.answer',
      },
      {
        id: 'horoscope-accuracy',
        questionKey: 'faq.horoscope.horoscope-accuracy.question',
        answerKey:   'faq.horoscope.horoscope-accuracy.answer',
      },
      {
        id: 'different-signs',
        questionKey: 'faq.horoscope.different-signs.question',
        answerKey:   'faq.horoscope.different-signs.answer',
      },
    ],
  },
  {
    id: 'moon-cosmic',
    categoryKey: 'faq.moon-cosmic.category',
    icon: '🌙',
    questions: [
      {
        id: 'moon-phase-meaning',
        questionKey: 'faq.moon-cosmic.moon-phase-meaning.question',
        answerKey:   'faq.moon-cosmic.moon-phase-meaning.answer',
      },
      {
        id: 'moon-phase-today',
        questionKey: 'faq.moon-cosmic.moon-phase-today.question',
        answerKey:   'faq.moon-cosmic.moon-phase-today.answer',
      },
      {
        id: 'cosmic-weather',
        questionKey: 'faq.moon-cosmic.cosmic-weather.question',
        answerKey:   'faq.moon-cosmic.cosmic-weather.answer',
      },
      {
        id: 'use-cosmic-weather',
        questionKey: 'faq.moon-cosmic.use-cosmic-weather.question',
        answerKey:   'faq.moon-cosmic.use-cosmic-weather.answer',
      },
    ],
  },
  {
    id: 'preferences',
    categoryKey: 'faq.preferences.category',
    icon: '⚙️',
    questions: [
      {
        id: 'change-language',
        questionKey: 'faq.preferences.change-language.question',
        answerKey:   'faq.preferences.change-language.answer',
      },
      {
        id: 'oracle-response-type',
        questionKey: 'faq.preferences.oracle-response-type.question',
        answerKey:   'faq.preferences.oracle-response-type.answer',
      },
      {
        id: 'voice-settings',
        questionKey: 'faq.preferences.voice-settings.question',
        answerKey:   'faq.preferences.voice-settings.answer',
      },
    ],
  },
  {
    id: 'account-security',
    categoryKey: 'faq.account-security.category',
    icon: '🔐',
    questions: [
      {
        id: 'change-password',
        questionKey: 'faq.account-security.change-password.question',
        answerKey:   'faq.account-security.change-password.answer',
      },
      {
        id: 'enable-2fa',
        questionKey: 'faq.account-security.enable-2fa.question',
        answerKey:   'faq.account-security.enable-2fa.answer',
      },
      {
        id: 'trust-device',
        questionKey: 'faq.account-security.trust-device.question',
        answerKey:   'faq.account-security.trust-device.answer',
      },
      {
        id: 'manage-devices',
        questionKey: 'faq.account-security.manage-devices.question',
        answerKey:   'faq.account-security.manage-devices.answer',
      },
      {
        id: 'forgot-password',
        questionKey: 'faq.account-security.forgot-password.question',
        answerKey:   'faq.account-security.forgot-password.answer',
      },
    ],
  },
  {
    id: 'billing',
    categoryKey: 'faq.billing.category',
    icon: '💳',
    questions: [
      {
        id: 'payment-method',
        questionKey: 'faq.billing.payment-method.question',
        answerKey:   'faq.billing.payment-method.answer',
      },
      {
        id: 'update-payment',
        questionKey: 'faq.billing.update-payment.question',
        answerKey:   'faq.billing.update-payment.answer',
      },
      {
        id: 'remove-payment',
        questionKey: 'faq.billing.remove-payment.question',
        answerKey:   'faq.billing.remove-payment.answer',
      },
      {
        id: 'subscription-plans',
        questionKey: 'faq.billing.subscription-plans.question',
        answerKey:   'faq.billing.subscription-plans.answer',
      },
      {
        id: 'change-subscription',
        questionKey: 'faq.billing.change-subscription.question',
        answerKey:   'faq.billing.change-subscription.answer',
      },
      {
        id: 'cancel-subscription',
        questionKey: 'faq.billing.cancel-subscription.question',
        answerKey:   'faq.billing.cancel-subscription.answer',
      },
      {
        id: 'view-invoices',
        questionKey: 'faq.billing.view-invoices.question',
        answerKey:   'faq.billing.view-invoices.answer',
      },
      {
        id: 'billing-problem',
        questionKey: 'faq.billing.billing-problem.question',
        answerKey:   'faq.billing.billing-problem.answer',
      },
    ],
  },
  {
    id: 'privacy',
    categoryKey: 'faq.privacy.category',
    icon: '🔒',
    questions: [
      {
        id: 'data-privacy-policy',
        questionKey: 'faq.privacy.data-privacy-policy.question',
        answerKey:   'faq.privacy.data-privacy-policy.answer',
      },
      {
        id: 'delete-account',
        questionKey: 'faq.privacy.delete-account.question',
        answerKey:   'faq.privacy.delete-account.answer',
      },
      {
        id: 'data-export',
        questionKey: 'faq.privacy.data-export.question',
        answerKey:   'faq.privacy.data-export.answer',
      },
      {
        id: 'read-terms-privacy',
        questionKey: 'faq.privacy.read-terms-privacy.question',
        answerKey:   'faq.privacy.read-terms-privacy.answer',
      },
    ],
  },
  {
    id: 'technical',
    categoryKey: 'faq.technical.category',
    icon: '⚙️',
    questions: [
      {
        id: 'app-compatibility',
        questionKey: 'faq.technical.app-compatibility.question',
        answerKey:   'faq.technical.app-compatibility.answer',
      },
      {
        id: 'app-not-loading',
        questionKey: 'faq.technical.app-not-loading.question',
        answerKey:   'faq.technical.app-not-loading.answer',
      },
      {
        id: 'slow-performance',
        questionKey: 'faq.technical.slow-performance.question',
        answerKey:   'faq.technical.slow-performance.answer',
      },
      {
        id: 'sync-issues',
        questionKey: 'faq.technical.sync-issues.question',
        answerKey:   'faq.technical.sync-issues.answer',
      },
    ],
  },
  {
    id: 'support',
    categoryKey: 'faq.support.category',
    icon: '❓',
    questions: [
      {
        id: 'contact-support',
        questionKey: 'faq.support.contact-support.question',
        answerKey:   'faq.support.contact-support.answer',
      },
      {
        id: 'bug-report',
        questionKey: 'faq.support.bug-report.question',
        answerKey:   'faq.support.bug-report.answer',
      },
      {
        id: 'feature-request',
        questionKey: 'faq.support.feature-request.question',
        answerKey:   'faq.support.feature-request.answer',
      },
      {
        id: 'feedback',
        questionKey: 'faq.support.feedback.question',
        answerKey:   'faq.support.feedback.answer',
      },
    ],
  },
];
