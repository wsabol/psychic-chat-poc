/**
 * Email i18n strings — German (de-DE)
 * Must mirror the structure of en-US.js exactly.
 */
export default {
  accountDeletion: {
    subject: 'Bestätigung der Kontolöschung – Psychic Chat',
    heading: '⚠️ Anfrage zur Kontolöschung',
    intro: 'Wir haben eine Anfrage erhalten, <strong>Ihr Psychic Chat-Konto dauerhaft zu löschen</strong>. Um diese Aktion zu bestätigen, geben Sie bitte den unten stehenden Bestätigungscode ein.',
    expiry: 'Dieser Code läuft in <strong>{expiryMinutes} Minuten</strong> ab.',
    whatHappensTitle: 'Was passiert, wenn Sie bestätigen:',
    bullet1: 'Ihr <strong>Abonnement wird sofort gekündigt</strong> — es wird Ihnen kein neuer Abrechnungszeitraum berechnet.',
    bullet2: 'Sie behalten vollen Zugriff auf Ihr Konto <strong>bis zum Ende Ihres aktuellen Abonnementzeitraums</strong>.',
    bullet3: 'Danach werden Ihre persönlichen Daten dauerhaft aus unseren Systemen entfernt.',
    bullet4: 'Sie können diese Löschanfrage jederzeit vor Ablauf Ihres Abonnements stornieren.',
    notYou: 'Wenn Sie die Löschung Ihres Kontos <strong>nicht</strong> beantragt haben, ignorieren Sie diese E-Mail — Ihr Konto bleibt aktiv.',
  },

  twoFactor: {
    subject: 'Zwei-Faktor-Authentifizierungscode - Psychic Chat',
    heading: 'Zwei-Faktor-Authentifizierung',
    intro: 'Ihr Zwei-Faktor-Authentifizierungscode lautet:',
    expiry: 'Dieser Code läuft in {expiryMinutes} Minuten ab.',
    notYou: 'Wenn Sie diesen Code nicht angefordert haben, ignorieren Sie diese E-Mail.',
  },

  verification: {
    subject: 'E-Mail-Adresse bestätigen - Psychic Chat',
    heading: 'E-Mail-Adresse bestätigen',
    welcome: 'Willkommen bei Psychic Chat! Bitte bestätigen Sie Ihre E-Mail-Adresse, um die Registrierung abzuschließen.',
    codeIntro: 'Ihr Bestätigungscode lautet:',
    expiry: 'Dieser Code läuft in {expiryMinutes} Minuten ab.',
    notYou: 'Wenn Sie dieses Konto nicht erstellt haben, ignorieren Sie diese E-Mail.',
  },

  passwordReset: {
    subject: 'Passwort zurücksetzen - Psychic Chat',
    heading: 'Passwort zurücksetzen',
    intro: 'Wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten. Wenn Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.',
    codeIntro: 'Ihr Code zum Zurücksetzen des Passworts lautet:',
    expiry: 'Dieser Code läuft in {expiryMinutes} Minuten ab.',
    instruction: 'Verwenden Sie diesen Code, um Ihr Passwort zurückzusetzen. Sie müssen Ihr neues Passwort bestätigen.',
  },

  reengagement: {
    subject6Month: 'Wir vermissen Sie! Ihr Psychic Chat-Konto kann reaktiviert werden',
    subject12Month: 'Letzte Chance: Reaktivieren Sie Ihr Psychic Chat-Konto',
    headline6Month: 'Wir vermissen Sie!',
    headline12Month: 'Ihr Konto wird bald gelöscht',
    message6Month: 'Es sind 6 Monate vergangen, seit Sie die Löschung Ihres Kontos beantragt haben. Wir verstehen, dass sich das Leben verändert, und würden Sie gerne wieder willkommen heißen, wann immer Sie bereit sind. Ihre Daten sind sicher gespeichert und können jederzeit reaktiviert werden.',
    message12Month: 'Es ist ein Jahr vergangen, seit Sie die Kontolöschung beantragt haben. Dies ist Ihre letzte Benachrichtigung, bevor in 6 Monaten eine dauerhafte Datenlöschung erfolgt. Wenn Sie Ihr Konto aktiv behalten möchten, reaktivieren Sie es jetzt!',
    buttonText: 'Mein Konto reaktivieren',
    note: 'Die Reaktivierung ist schnell und einfach – alle Ihre Daten werden wiederhergestellt und Ihr Konto wird vollständig aktiv sein.',
    unsubscribeText: 'von Reaktivierungs-E-Mails abmelden',
  },

  policyChange: {
    subjectInitial: 'Wichtig: Aktualisierungen unserer {documentName}',
    subjectReminder: 'Erinnerung: Handlungsbedarf – Aktualisierte {documentName} überprüfen',
    headerInitial: '📋 Wichtige Aktualisierung',
    headerReminder: '⚠️ Erinnerung',
    heading: 'Wir haben unsere {documentName} aktualisiert',
    introInitial: 'Sie müssen unsere aktualisierte {documentName} überprüfen und akzeptieren.',
    introReminder: 'Dies ist eine Erinnerung daran, dass Sie unsere aktualisierte {documentName} überprüfen und akzeptieren müssen.',
    urgencyInitial: 'Sie haben <strong>30 Tage</strong> (bis zum {gracePeriodDate}), um diese Änderungen zu überprüfen und zu akzeptieren.',
    urgencyReminder: '<strong>⚠️ Noch {daysRemaining} Tage</strong> – Bitte melden Sie sich an, um die aktualisierte {documentName} zu überprüfen und zu akzeptieren.',
    whatChangedTitle: 'Was hat sich geändert?',
    defaultDescription: 'Wir haben wichtige Aktualisierungen vorgenommen, um Sie besser bedienen und die Einhaltung aktueller Vorschriften gewährleisten zu können.',
    buttonText: 'Anmelden, um zu überprüfen und zu akzeptieren',
    deadlineTitle: '⏰ Wichtige Frist',
    deadlineBody: '<strong>Bis zum {gracePeriodDate}</strong> müssen Sie sich anmelden und die aktualisierte {documentName} akzeptieren. Wenn Sie bis zu diesem Datum nicht akzeptieren, werden Sie automatisch abgemeldet und können erst wieder auf Ihr Konto zugreifen, wenn Sie die neuen Bedingungen akzeptiert haben.',
    whatToDoTitle: 'Was Sie tun müssen',
    step1: 'Melden Sie sich bei Ihrem Psychic Chat-Konto an',
    step2: 'Überprüfen Sie die aktualisierte {documentName}',
    step3: 'Akzeptieren Sie die Änderungen, um Ihr Konto weiter nutzen zu können',
    footerNote: 'Wir schätzen Ihre Privatsphäre und sind der Transparenz verpflichtet. Wenn Sie Fragen zu diesen Änderungen haben, wenden Sie sich bitte an unser Support-Team.',
    docTerms: 'Nutzungsbedingungen',
    docPrivacy: 'Datenschutzrichtlinie',
    docBoth: 'Nutzungsbedingungen und Datenschutzrichtlinie',
  },

  priceChange: {
    subject: 'Wichtig: Preisanpassung für Ihr {intervalDisplay}-Abonnement',
    headerTitle: '💰 Preisanpassung für Abonnement',
    heading: 'Wichtige Aktualisierung zu Ihrem {intervalDisplay}-Abonnement',
    intro: 'Wir schreiben Ihnen, um Sie über eine Änderung unserer Abonnementpreise zu informieren. Der Preis Ihres {intervalDisplay}-Abonnements ändert sich zum nächsten Abrechnungsdatum.',
    labelCurrentPrice: '<strong>Aktueller Preis:</strong> ${oldPrice}/{intervalUnit}',
    labelNewPrice: '<strong>Neuer Preis:</strong> ${newPrice}/{intervalUnit}',
    labelEffectiveDate: '<strong>Gültig ab:</strong> {effectiveDateFormatted}',
    buttonText: 'Abrechnungsdetails anzeigen',
    whatMeansTitle: 'Was das für Sie bedeutet',
    whatMeansBody: 'Die Abonnementpreise bleiben bis zum {effectiveDateFormatted} unverändert. Danach werden bei Verlängerungen der neue Preis von <strong>${newPrice}/{intervalUnit}</strong> berechnet. Diese Änderung ermöglicht es uns, Ihnen weiterhin einen hochwertigen Service, neue Funktionen und kontinuierliche Verbesserungen zu bieten.',
    timelineTitle: '📅 Wichtiger Zeitplan',
    timelineBody: 'Der neue Abonnementpreis tritt am {effectiveDateFormatted} in Kraft. Bis dahin genießen Sie Ihr Abonnement weiterhin zum aktuellen Preis. Verlängerungen und neue Käufe nach dem {effectiveDateFormatted} spiegeln automatisch den neuen Preis von <strong>${newPrice}/{intervalUnit}</strong> wider.',
    optionsTitle: 'Ihre Optionen',
    option1: '<strong>Abonnement fortsetzen:</strong> Keine Aktion erforderlich – Ihr Abonnement wird automatisch zum neuen Preis fortgesetzt',
    option2: '<strong>Abrechnung überprüfen:</strong> Besuchen Sie Ihre Abrechnungs- und Zahlungsseite, um Ihre Abonnementdetails zu prüfen',
    option3: '<strong>Jederzeit kündigen:</strong> Wenn Sie nicht zum neuen Preis fortfahren möchten, können Sie Ihr Abonnement vor dem nächsten Abrechnungsdatum kündigen',
    whyTitle: 'Warum diese Änderung?',
    whyIntro: 'Wir sind bestrebt, unseren Nutzern das bestmögliche Erlebnis zu bieten. Diese Preisanpassung hilft uns dabei:',
    whyBullet1: 'Neue Funktionen und Verbesserungen weiter zu entwickeln',
    whyBullet2: 'Unseren hochwertigen Service und Support aufrechtzuerhalten',
    whyBullet3: 'In bessere Infrastruktur und Zuverlässigkeit zu investieren',
    footerNote: 'Vielen Dank, dass Sie ein geschätztes Mitglied von Starship Psychics sind. Wir schätzen Ihre anhaltende Unterstützung. Wenn Sie Fragen zu dieser Änderung haben, zögern Sie nicht, unser Support-Team zu kontaktieren.',
    intervalMonthly: 'monatlich',
    intervalAnnual: 'jährlich',
    intervalUnitMonth: 'Monat',
    intervalUnitYear: 'Jahr',
  },

  subscriptionCancelled: {
    subject: 'Abonnement gekündigt',
    headerTitle: 'Abonnement gekündigt',
    body1: 'Ihr Starship Psychics-Abonnement wurde gekündigt. Sie verlieren den Zugriff auf Premium-Funktionen am Ende Ihres Abrechnungszeitraums.',
    body2: 'Sie können Ihr Abonnement jederzeit über Ihre Kontoeinstellungen oder den untenstehenden Link reaktivieren.',
    buttonText: 'Abonnement reaktivieren',
    note: 'Wir würden Sie gerne zurückgewinnen! Wenn Sie Fragen haben, wenden Sie sich bitte an unser Support-Team.',
  },

  subscriptionExpiring: {
    subject: 'Ihr Abonnement läuft in {daysRemaining} Tagen ab',
    headerTitle: 'Abonnement läuft bald ab',
    body: 'Ihr Abonnement läuft in {daysRemaining} Tagen ab. Verlängern Sie jetzt, um Unterbrechungen des Dienstes zu vermeiden.',
    note: 'Verlängern Sie Ihr Abonnement, um weiterhin unbegrenzten Zugriff auf alle Premium-Funktionen zu genießen.',
  },

  paymentFailed: {
    subject: 'Zahlung fehlgeschlagen – Aktualisierung erforderlich',
    headerTitle: 'Zahlung fehlgeschlagen',
    body: 'Ihre letzte Zahlung für Ihr Starship Psychics-Abonnement ist fehlgeschlagen. Bitte aktualisieren Sie Ihre Zahlungsmethode, um die App weiter nutzen zu können.',
    buttonText: 'Zahlungsmethode aktualisieren',
    note: 'Wenn das Problem weiterhin besteht, wenden Sie sich bitte an unser Support-Team.',
    labelAmount: '<strong>Betrag:</strong>',
  },

  paymentMethodInvalid: {
    subject: 'Zahlungsmethode benötigt Aufmerksamkeit',
    headerTitle: 'Zahlungsmethode aktualisieren',
    body: 'Ihre hinterlegte Zahlungsmethode ist abgelaufen oder ungültig. Bitte aktualisieren Sie diese, um Ihr Starship Psychics-Abonnement aufrechtzuerhalten.',
    buttonText: 'Zahlungsmethode aktualisieren',
    note: 'Ohne eine gültige Zahlungsmethode könnte Ihr Abonnement gekündigt werden. Bitte aktualisieren Sie Ihre Daten so schnell wie möglich.',
  },

  subscriptionCheckFailed: {
    subject: 'Abonnementüberprüfung',
    headerTitle: 'Abonnementüberprüfung',
    messageDefault: 'Wir können Ihren Abonnementstatus nicht überprüfen. Bitte versuchen Sie, sich erneut anzumelden.',
    messageStripeDown: 'Stripe ist vorübergehend nicht verfügbar. Wir werden Ihr Abonnement in Kürze überprüfen.',
    messageNoSub: 'Kein Abonnement für Ihr Konto gefunden. Bitte erstellen Sie eines, um die App weiter nutzen zu können.',
    note: 'Wenn das Problem weiterhin besteht, melden Sie sich in Ihrem Konto an und überprüfen Sie Ihren Abonnementstatus.',
  },

  subscriptionIncomplete: {
    subject: 'Abonnement abschließen',
    headerTitle: 'Abonnement abschließen',
    body: 'Ihre Abonnementeinrichtung ist unvollständig. Schließen Sie die Zahlung ab, um Ihr Konto zu aktivieren.',
    buttonText: 'Einrichtung abschließen',
    note: 'Ihre Abonnementeinrichtung muss abgeschlossen werden, um auf die Premium-Funktionen von Starship Psychics zugreifen zu können.',
  },

  subscriptionPastDue: {
    subject: 'Zahlung überfällig – Handlungsbedarf',
    headerTitle: 'Zahlung überfällig',
    body: 'Ihre Abonnementzahlung ist überfällig. Bitte aktualisieren Sie sofort Ihre Zahlungsmethode, um Unterbrechungen des Dienstes zu vermeiden.',
    buttonText: 'Zahlung jetzt aktualisieren',
    note: 'Wir haben mehrere Versuche unternommen, Ihre Zahlungsmethode zu belasten. Bitte handeln Sie jetzt, um Ihren Zugang wiederherzustellen.',
  },
};
