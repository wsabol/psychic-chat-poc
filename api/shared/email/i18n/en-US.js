/**
 * Email i18n strings — English (en-US)
 * Source of truth for all email template text.
 * All other locale files must mirror this structure exactly.
 */
export default {
  accountDeletion: {
    subject: 'Account Deletion Verification – Psychic Chat',
    heading: '⚠️ Account Deletion Request',
    intro: 'We received a request to <strong>permanently delete your Psychic Chat account</strong>. To confirm this action, please enter the verification code below.',
    expiry: 'This code expires in <strong>{expiryMinutes} minutes</strong>.',
    whatHappensTitle: 'What happens when you confirm:',
    bullet1: 'Your <strong>subscription will be cancelled immediately</strong> — you will not be charged for any new billing period.',
    bullet2: 'You will retain full access to your account <strong>until the end of your current subscription period</strong>.',
    bullet3: 'After that, your personal information will be permanently removed from our systems.',
    bullet4: 'You may cancel this deletion request any time before your subscription expires.',
    notYou: 'If you did <strong>not</strong> request to delete your account, please ignore this email — your account will remain active.',
  },

  twoFactor: {
    subject: 'Two-Factor Authentication Code - Psychic Chat',
    heading: 'Two-Factor Authentication',
    intro: 'Your two-factor authentication code is:',
    expiry: 'This code will expire in {expiryMinutes} minutes.',
    notYou: 'If you did not request this code, please ignore this email.',
  },

  verification: {
    subject: 'Verify Your Email - Psychic Chat',
    heading: 'Verify Your Email',
    welcome: 'Welcome to Psychic Chat! Please verify your email address to complete registration.',
    codeIntro: 'Your verification code is:',
    expiry: 'This code will expire in {expiryMinutes} minutes.',
    notYou: 'If you did not create this account, please ignore this email.',
  },

  passwordReset: {
    subject: 'Reset Your Password - Psychic Chat',
    heading: 'Reset Your Password',
    intro: 'We received a request to reset your password. If you did not make this request, please ignore this email.',
    codeIntro: 'Your password reset code is:',
    expiry: 'This code will expire in {expiryMinutes} minutes.',
    instruction: 'Use this code to reset your password. You will need to confirm your new password.',
  },

  reengagement: {
    subject6Month: 'We Miss You! Your Psychic Chat Account is Ready to Reactivate',
    subject12Month: 'Last Chance: Reactivate Your Psychic Chat Account',
    headline6Month: 'We Miss You!',
    headline12Month: 'Your Account is About to Be Deleted',
    message6Month: "It's been 6 months since you requested to delete your account. We understand life changes, and we'd love to welcome you back whenever you're ready. Your data is safely stored and can be reactivated at any time.",
    message12Month: "It's been a year since you requested account deletion. This is your final notice before permanent data deletion occurs in 6 months. If you'd like to keep your account active, simply reactivate it now!",
    buttonText: 'Reactivate My Account',
    note: 'Reactivating is quick and easy - all your data will be restored and your account will be fully active.',
    unsubscribeText: 'unsubscribe from re-engagement emails',
  },

  policyChange: {
    subjectInitial: 'Important: Updates to Our {documentName}',
    subjectReminder: 'Reminder: Action Required - Review Updated {documentName}',
    headerInitial: '📋 Important Update',
    headerReminder: '⚠️ Reminder',
    heading: "We've Updated Our {documentName}",
    introInitial: 'You need to review and accept our updated {documentName}.',
    introReminder: 'This is a reminder that you need to review and accept our updated {documentName}.',
    urgencyInitial: 'You have <strong>30 days</strong> (until {gracePeriodDate}) to review and accept these changes.',
    urgencyReminder: '<strong>⚠️ {daysRemaining} days remaining</strong> - Please log in to review and accept the updated {documentName}.',
    whatChangedTitle: "What's Changed?",
    defaultDescription: "We've made important updates to better serve you and maintain compliance with current regulations.",
    buttonText: 'Log In to Review & Accept',
    deadlineTitle: '⏰ Important Deadline',
    deadlineBody: '<strong>By {gracePeriodDate}</strong>, you must log in and accept the updated {documentName}. If you do not accept by this date, you will be automatically logged out and unable to access your account until you accept the new terms.',
    whatToDoTitle: 'What You Need to Do',
    step1: 'Log in to your Psychic Chat account',
    step2: 'Review the updated {documentName}',
    step3: 'Accept the changes to continue using your account',
    footerNote: 'We value your privacy and are committed to transparency. If you have any questions about these changes, please contact our support team.',
    docTerms: 'Terms of Service',
    docPrivacy: 'Privacy Policy',
    docBoth: 'Terms of Service and Privacy Policy',
  },

  priceChange: {
    subject: 'Important: Your {intervalDisplay} Subscription Price Update',
    headerTitle: '💰 Subscription Price Update',
    heading: 'Important Update About Your {intervalDisplay} Subscription',
    intro: "We're writing to inform you of an update to our subscription pricing. Your {intervalDisplay} subscription price will change on your next billing date.",
    labelCurrentPrice: '<strong>Current Price:</strong> ${oldPrice}/{intervalUnit}',
    labelNewPrice: '<strong>New Price:</strong> ${newPrice}/{intervalUnit}',
    labelEffectiveDate: '<strong>Effective Date:</strong> {effectiveDateFormatted}',
    buttonText: 'View Billing Details',
    whatMeansTitle: 'What This Means For You',
    whatMeansBody: 'Subscription prices remain unchanged until {effectiveDateFormatted}. After which, subscription renewals will reflect the new price of <strong>${newPrice}/{intervalUnit}</strong>. This change allows us to continue providing you with quality service, new features, and ongoing improvements to your experience.',
    timelineTitle: '📅 Important Timeline',
    timelineBody: "The new subscription price becomes effective {effectiveDateFormatted}. Until then, you'll continue to enjoy your current or renewed subscription at the current price. Renewals and new purchases after {effectiveDateFormatted} will automatically reflect the new price of <strong>${newPrice}/{intervalUnit}</strong>.",
    optionsTitle: 'Your Options',
    option1: '<strong>Continue Your Subscription:</strong> No action needed - your subscription will automatically continue at the new price',
    option2: '<strong>Review Your Billing:</strong> Visit your Billing & Payments page to review your subscription details',
    option3: '<strong>Cancel Anytime:</strong> If you prefer not to continue at the new price, you can cancel your subscription before your next billing date',
    whyTitle: 'Why This Change?',
    whyIntro: "We're committed to delivering the best possible experience for our users. This price adjustment helps us:",
    whyBullet1: 'Continue developing new features and improvements',
    whyBullet2: 'Maintain our high-quality service and support',
    whyBullet3: 'Invest in better infrastructure and reliability',
    footerNote: "Thank you for being a valued member of Starship Psychics. We appreciate your continued support. If you have any questions about this change, please don't hesitate to contact our support team.",
    intervalMonthly: 'monthly',
    intervalAnnual: 'annual',
    intervalUnitMonth: 'month',
    intervalUnitYear: 'year',
  },

  subscriptionCancelled: {
    subject: 'Subscription Cancelled',
    headerTitle: 'Subscription Cancelled',
    body1: 'Your Starship Psychics subscription has been cancelled. You will lose access to premium features at the end of your billing period.',
    body2: 'You can reactivate your subscription anytime through your account settings or the link below.',
    buttonText: 'Reactivate Subscription',
    note: "We'd love to have you back! If you have any questions, please reach out to our support team.",
  },

  subscriptionExpiring: {
    subject: 'Your Subscription Expires in {daysRemaining} Days',
    headerTitle: 'Subscription Expiring Soon',
    body: 'Your subscription expires in {daysRemaining} days. Renew now to avoid service interruption.',
    note: 'Renew your subscription to continue enjoying unlimited access to all premium features.',
  },

  paymentFailed: {
    subject: 'Payment Failed - Update Required',
    headerTitle: 'Payment Failed',
    body: 'Your recent payment for your Starship Psychics subscription failed. Please update your payment method to continue using the app.',
    buttonText: 'Update Payment Method',
    note: 'If you continue to experience issues, please contact our support team.',
    labelAmount: '<strong>Amount:</strong>',
  },

  paymentMethodInvalid: {
    subject: 'Payment Method Needs Attention',
    headerTitle: 'Update Payment Method',
    body: 'Your payment method on file has expired or is invalid. Please update it to maintain your Starship Psychics subscription.',
    buttonText: 'Update Payment Method',
    note: 'Without a valid payment method, your subscription may be cancelled. Please update your information as soon as possible.',
  },

  subscriptionCheckFailed: {
    subject: 'Subscription Verification',
    headerTitle: 'Subscription Verification',
    messageDefault: 'We are unable to verify your subscription status. Please try logging in again.',
    messageStripeDown: 'Stripe is temporarily unavailable. We will verify your subscription shortly.',
    messageNoSub: 'No subscription found on your account. Please create one to continue using the app.',
    note: 'If you continue to experience issues, please log in to your account and check your subscription status.',
  },

  subscriptionIncomplete: {
    subject: 'Complete Your Subscription',
    headerTitle: 'Complete Your Subscription',
    body: 'Your subscription setup is incomplete. Please complete the payment to activate your account.',
    buttonText: 'Complete Setup',
    note: 'Your subscription setup needs to be completed to access Starship Psychics premium features.',
  },

  appUpdate: {
    subject: 'Starship Psychics Has Been Updated – Download the Latest Version',
    heading: '🚀 Starship Psychics Has Been Updated!',
    greeting: 'Exciting news from Starship Psychics!',
    body: "We've been working hard to bring you the best possible psychic chat experience. The Starship Psychics app has been updated with exciting new features and improvements — and we'd love for you to try them!",
    buttonText: 'Download on Google Play',
    note: 'Tap the button above to download the latest version from the Google Play Store and experience everything new Starship Psychics has to offer.',
    footerNote: 'Thank you for being a valued member of the Starship Psychics community.',
  },

  subscriptionPastDue: {
    subject: 'Payment Overdue - Action Required',
    headerTitle: 'Payment Overdue',
    body: 'Your subscription payment is overdue. Please update your payment method immediately to avoid service interruption.',
    buttonText: 'Update Payment Now',
    note: "We've made several attempts to charge your payment method. Please take action now to restore your access.",
  },
};
