/**
 * Email i18n strings — French (fr-FR)
 * Must mirror the structure of en-US.js exactly.
 */
export default {
  accountDeletion: {
    subject: 'Vérification de suppression de compte – Psychic Chat',
    heading: '⚠️ Demande de suppression de compte',
    intro: 'Nous avons reçu une demande de <strong>suppression permanente de votre compte Psychic Chat</strong>. Pour confirmer cette action, veuillez saisir le code de vérification ci-dessous.',
    expiry: 'Ce code expire dans <strong>{expiryMinutes} minutes</strong>.',
    whatHappensTitle: 'Ce qui se passe lorsque vous confirmez :',
    bullet1: "Votre <strong>abonnement sera annulé immédiatement</strong> — vous ne serez pas facturé(e) pour une nouvelle période.",
    bullet2: "Vous conserverez un accès complet à votre compte <strong>jusqu'à la fin de votre période d'abonnement actuelle</strong>.",
    bullet3: 'Ensuite, vos informations personnelles seront définitivement supprimées de nos systèmes.',
    bullet4: "Vous pouvez annuler cette demande de suppression à tout moment avant l'expiration de votre abonnement.",
    notYou: "Si vous n'avez <strong>pas</strong> demandé la suppression de votre compte, ignorez cet e-mail — votre compte restera actif.",
  },

  twoFactor: {
    subject: "Code d'authentification à deux facteurs - Psychic Chat",
    heading: 'Authentification à deux facteurs',
    intro: "Votre code d'authentification à deux facteurs est :",
    expiry: 'Ce code expirera dans {expiryMinutes} minutes.',
    notYou: "Si vous n'avez pas demandé ce code, ignorez cet e-mail.",
  },

  verification: {
    subject: 'Vérifiez votre adresse e-mail - Psychic Chat',
    heading: 'Vérifiez votre adresse e-mail',
    welcome: 'Bienvenue sur Psychic Chat ! Veuillez vérifier votre adresse e-mail pour terminer votre inscription.',
    codeIntro: 'Votre code de vérification est :',
    expiry: 'Ce code expirera dans {expiryMinutes} minutes.',
    notYou: "Si vous n'avez pas créé ce compte, ignorez cet e-mail.",
  },

  passwordReset: {
    subject: 'Réinitialiser votre mot de passe - Psychic Chat',
    heading: 'Réinitialiser votre mot de passe',
    intro: "Nous avons reçu une demande de réinitialisation de votre mot de passe. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    codeIntro: 'Votre code de réinitialisation du mot de passe est :',
    expiry: 'Ce code expirera dans {expiryMinutes} minutes.',
    instruction: 'Utilisez ce code pour réinitialiser votre mot de passe. Vous devrez confirmer votre nouveau mot de passe.',
  },

  reengagement: {
    subject6Month: 'Vous nous manquez ! Votre compte Psychic Chat est prêt à être réactivé',
    subject12Month: 'Dernière chance : Réactivez votre compte Psychic Chat',
    headline6Month: 'Vous nous manquez !',
    headline12Month: "Votre compte est sur le point d'être supprimé",
    message6Month: "Cela fait 6 mois que vous avez demandé la suppression de votre compte. Nous comprenons que la vie évolue et nous serions ravis de vous retrouver quand vous le souhaitez. Vos données sont conservées en toute sécurité et peuvent être réactivées à tout moment.",
    message12Month: "Cela fait un an que vous avez demandé la suppression de votre compte. Ceci est votre dernier avis avant la suppression définitive des données dans 6 mois. Si vous souhaitez conserver votre compte actif, réactivez-le maintenant !",
    buttonText: 'Réactiver mon compte',
    note: 'La réactivation est rapide et facile — toutes vos données seront restaurées et votre compte sera entièrement actif.',
    unsubscribeText: 'se désabonner des e-mails de réengagement',
  },

  policyChange: {
    subjectInitial: 'Important : Mises à jour de nos {documentName}',
    subjectReminder: 'Rappel : Action requise - Consultez nos {documentName} mis(es) à jour',
    headerInitial: '📋 Mise à jour importante',
    headerReminder: '⚠️ Rappel',
    heading: 'Nous avons mis à jour nos {documentName}',
    introInitial: 'Vous devez consulter et accepter nos {documentName} mis(es) à jour.',
    introReminder: 'Ceci est un rappel que vous devez consulter et accepter nos {documentName} mis(es) à jour.',
    urgencyInitial: "Vous avez <strong>30 jours</strong> (jusqu'au {gracePeriodDate}) pour consulter et accepter ces modifications.",
    urgencyReminder: '<strong>⚠️ Il reste {daysRemaining} jours</strong> — Connectez-vous pour consulter et accepter les {documentName} mis(es) à jour.',
    whatChangedTitle: "Qu'est-ce qui a changé ?",
    defaultDescription: "Nous avons apporté des mises à jour importantes pour mieux vous servir et maintenir la conformité avec les réglementations en vigueur.",
    buttonText: 'Se connecter pour consulter et accepter',
    deadlineTitle: '⏰ Date limite importante',
    deadlineBody: "<strong>Avant le {gracePeriodDate}</strong>, vous devez vous connecter et accepter les {documentName} mis(es) à jour. Si vous n'acceptez pas avant cette date, vous serez automatiquement déconnecté(e) et ne pourrez plus accéder à votre compte jusqu'à ce que vous acceptiez les nouvelles conditions.",
    whatToDoTitle: 'Ce que vous devez faire',
    step1: 'Connectez-vous à votre compte Psychic Chat',
    step2: 'Consultez les {documentName} mis(es) à jour',
    step3: 'Acceptez les modifications pour continuer à utiliser votre compte',
    footerNote: "Nous respectons votre vie privée et nous nous engageons à être transparents. Si vous avez des questions sur ces modifications, veuillez contacter notre équipe d'assistance.",
    docTerms: "Conditions d'utilisation",
    docPrivacy: 'Politique de confidentialité',
    docBoth: "Conditions d'utilisation et Politique de confidentialité",
  },

  priceChange: {
    subject: "Important : Mise à jour du prix de votre abonnement {intervalDisplay}",
    headerTitle: "💰 Mise à jour du prix de l'abonnement",
    heading: 'Mise à jour importante concernant votre abonnement {intervalDisplay}',
    intro: "Nous vous informons d'une mise à jour de nos tarifs d'abonnement. Le prix de votre abonnement {intervalDisplay} changera lors de votre prochaine date de facturation.",
    labelCurrentPrice: '<strong>Prix actuel :</strong> ${oldPrice}/{intervalUnit}',
    labelNewPrice: '<strong>Nouveau prix :</strong> ${newPrice}/{intervalUnit}',
    labelEffectiveDate: "<strong>Date d'effet :</strong> {effectiveDateFormatted}",
    buttonText: 'Voir les détails de facturation',
    whatMeansTitle: 'Ce que cela signifie pour vous',
    whatMeansBody: "Les prix d'abonnement restent inchangés jusqu'au {effectiveDateFormatted}. Après cette date, les renouvellements refléteront le nouveau prix de <strong>${newPrice}/{intervalUnit}</strong>. Ce changement nous permet de continuer à vous offrir un service de qualité, de nouvelles fonctionnalités et des améliorations continues.",
    timelineTitle: '📅 Calendrier important',
    timelineBody: "Le nouveau prix de l'abonnement entre en vigueur le {effectiveDateFormatted}. D'ici là, vous continuerez à bénéficier de votre abonnement au prix actuel. Les renouvellements et nouveaux achats après le {effectiveDateFormatted} refléteront automatiquement le nouveau prix de <strong>${newPrice}/{intervalUnit}</strong>.",
    optionsTitle: 'Vos options',
    option1: '<strong>Continuer votre abonnement :</strong> Aucune action requise — votre abonnement continuera automatiquement au nouveau prix',
    option2: '<strong>Consulter votre facturation :</strong> Visitez votre page de facturation et paiements pour consulter les détails de votre abonnement',
    option3: "<strong>Annuler à tout moment :</strong> Si vous préférez ne pas continuer au nouveau prix, vous pouvez annuler votre abonnement avant votre prochaine date de facturation",
    whyTitle: 'Pourquoi ce changement ?',
    whyIntro: "Nous nous engageons à offrir la meilleure expérience possible. Cet ajustement de prix nous permet de :",
    whyBullet1: 'Continuer à développer de nouvelles fonctionnalités et améliorations',
    whyBullet2: "Maintenir notre service et notre assistance de haute qualité",
    whyBullet3: "Investir dans une meilleure infrastructure et fiabilité",
    footerNote: "Merci d'être un membre précieux de Starship Psychics. Nous apprécions votre soutien continu. Si vous avez des questions sur ce changement, n'hésitez pas à contacter notre équipe d'assistance.",
    intervalMonthly: 'mensuel',
    intervalAnnual: 'annuel',
    intervalUnitMonth: 'mois',
    intervalUnitYear: 'an',
  },

  subscriptionCancelled: {
    subject: 'Abonnement annulé',
    headerTitle: 'Abonnement annulé',
    body1: "Votre abonnement Starship Psychics a été annulé. Vous perdrez l'accès aux fonctionnalités premium à la fin de votre période de facturation.",
    body2: "Vous pouvez réactiver votre abonnement à tout moment depuis les paramètres de votre compte ou via le lien ci-dessous.",
    buttonText: "Réactiver l'abonnement",
    note: "Nous serions ravis de vous retrouver ! Si vous avez des questions, contactez notre équipe d'assistance.",
  },

  subscriptionExpiring: {
    subject: 'Votre abonnement expire dans {daysRemaining} jours',
    headerTitle: 'Abonnement bientôt expiré',
    body: 'Votre abonnement expire dans {daysRemaining} jours. Renouvelez maintenant pour éviter toute interruption de service.',
    note: "Renouvelez votre abonnement pour continuer à profiter d'un accès illimité à toutes les fonctionnalités premium.",
  },

  paymentFailed: {
    subject: 'Paiement échoué - Mise à jour requise',
    headerTitle: 'Paiement échoué',
    body: "Votre récent paiement pour votre abonnement Starship Psychics a échoué. Veuillez mettre à jour votre mode de paiement pour continuer à utiliser l'application.",
    buttonText: 'Mettre à jour le mode de paiement',
    note: "Si vous continuez à rencontrer des problèmes, contactez notre équipe d'assistance.",
    labelAmount: '<strong>Montant :</strong>',
  },

  paymentMethodInvalid: {
    subject: 'Votre mode de paiement nécessite votre attention',
    headerTitle: 'Mettre à jour le mode de paiement',
    body: 'Le mode de paiement enregistré a expiré ou est invalide. Veuillez le mettre à jour pour maintenir votre abonnement Starship Psychics.',
    buttonText: 'Mettre à jour le mode de paiement',
    note: 'Sans mode de paiement valide, votre abonnement pourrait être annulé. Veuillez mettre à jour vos informations dès que possible.',
  },

  subscriptionCheckFailed: {
    subject: "Vérification de l'abonnement",
    headerTitle: "Vérification de l'abonnement",
    messageDefault: 'Nous ne pouvons pas vérifier le statut de votre abonnement. Veuillez essayer de vous reconnecter.',
    messageStripeDown: 'Stripe est temporairement indisponible. Nous vérifierons votre abonnement sous peu.',
    messageNoSub: "Aucun abonnement trouvé sur votre compte. Veuillez en créer un pour continuer à utiliser l'application.",
    note: "Si vous continuez à rencontrer des problèmes, connectez-vous à votre compte et vérifiez l'état de votre abonnement.",
  },

  subscriptionIncomplete: {
    subject: 'Complétez votre abonnement',
    headerTitle: 'Complétez votre abonnement',
    body: 'La configuration de votre abonnement est incomplète. Veuillez finaliser le paiement pour activer votre compte.',
    buttonText: 'Finaliser la configuration',
    note: 'La configuration de votre abonnement doit être finalisée pour accéder aux fonctionnalités premium de Starship Psychics.',
  },

  appUpdate: {
    subject: 'Starship Psychics a été mis à jour – Téléchargez la dernière version',
    heading: '🚀 Starship Psychics a été mis à jour !',
    greeting: 'De bonnes nouvelles de Starship Psychics !',
    body: "Nous avons travaillé dur pour vous offrir la meilleure expérience de chat psychique possible. L'application Starship Psychics a été mise à jour avec de nouvelles fonctionnalités et améliorations passionnantes — et nous aimerions que vous les essayiez !",
    buttonText: 'Télécharger sur Google Play',
    note: "Appuyez sur le bouton ci-dessus pour télécharger la dernière version depuis le Google Play Store et découvrir tout ce que Starship Psychics a de nouveau à offrir.",
    footerNote: 'Merci d\'être un membre précieux de la communauté Starship Psychics.',
  },

  subscriptionPastDue: {
    subject: 'Paiement en retard - Action requise',
    headerTitle: 'Paiement en retard',
    body: 'Le paiement de votre abonnement est en retard. Veuillez mettre à jour votre mode de paiement immédiatement pour éviter toute interruption de service.',
    buttonText: 'Mettre à jour le paiement maintenant',
    note: 'Nous avons effectué plusieurs tentatives de prélèvement. Veuillez agir maintenant pour rétablir votre accès.',
  },
};
