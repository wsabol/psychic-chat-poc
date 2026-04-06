/**
 * Email i18n strings — Italian (it-IT)
 * Must mirror the structure of en-US.js exactly.
 */
export default {
  accountDeletion: {
    subject: 'Verifica eliminazione account – Psychic Chat',
    heading: '⚠️ Richiesta di eliminazione account',
    intro: 'Abbiamo ricevuto una richiesta per <strong>eliminare definitivamente il tuo account Psychic Chat</strong>. Per confermare questa azione, inserisci il codice di verifica qui sotto.',
    expiry: 'Questo codice scade tra <strong>{expiryMinutes} minuti</strong>.',
    whatHappensTitle: 'Cosa succede quando confermi:',
    bullet1: 'Il tuo <strong>abbonamento verrà annullato immediatamente</strong> — non ti verrà addebitato nessun nuovo periodo di fatturazione.',
    bullet2: 'Manterrai pieno accesso al tuo account <strong>fino alla fine del tuo periodo di abbonamento corrente</strong>.',
    bullet3: 'Successivamente, le tue informazioni personali verranno rimosse definitivamente dai nostri sistemi.',
    bullet4: 'Puoi annullare questa richiesta di eliminazione in qualsiasi momento prima della scadenza del tuo abbonamento.',
    notYou: 'Se <strong>non</strong> hai richiesto l\'eliminazione del tuo account, ignora questa email — il tuo account rimarrà attivo.',
  },

  twoFactor: {
    subject: 'Codice di autenticazione a due fattori - Psychic Chat',
    heading: 'Autenticazione a due fattori',
    intro: 'Il tuo codice di autenticazione a due fattori è:',
    expiry: 'Questo codice scadrà tra {expiryMinutes} minuti.',
    notYou: 'Se non hai richiesto questo codice, ignora questa email.',
  },

  verification: {
    subject: 'Verifica la tua email - Psychic Chat',
    heading: 'Verifica la tua email',
    welcome: 'Benvenuto su Psychic Chat! Verifica il tuo indirizzo email per completare la registrazione.',
    codeIntro: 'Il tuo codice di verifica è:',
    expiry: 'Questo codice scadrà tra {expiryMinutes} minuti.',
    notYou: 'Se non hai creato questo account, ignora questa email.',
  },

  passwordReset: {
    subject: 'Reimposta la tua password - Psychic Chat',
    heading: 'Reimposta la tua password',
    intro: 'Abbiamo ricevuto una richiesta per reimpostare la tua password. Se non hai effettuato questa richiesta, ignora questa email.',
    codeIntro: 'Il tuo codice per reimpostare la password è:',
    expiry: 'Questo codice scadrà tra {expiryMinutes} minuti.',
    instruction: 'Usa questo codice per reimpostare la tua password. Dovrai confermare la nuova password.',
  },

  reengagement: {
    subject6Month: 'Ci manchi! Il tuo account Psychic Chat è pronto per essere riattivato',
    subject12Month: 'Ultima possibilità: Riattiva il tuo account Psychic Chat',
    headline6Month: 'Ci manchi!',
    headline12Month: 'Il tuo account sta per essere eliminato',
    message6Month: 'Sono passati 6 mesi da quando hai richiesto l\'eliminazione del tuo account. Capiamo che la vita cambia e saremo felici di darti di nuovo il benvenuto quando sarai pronto. I tuoi dati sono conservati in modo sicuro e possono essere riattivati in qualsiasi momento.',
    message12Month: 'È passato un anno da quando hai richiesto l\'eliminazione dell\'account. Questo è il tuo avviso finale prima che avvenga l\'eliminazione permanente dei dati tra 6 mesi. Se desideri mantenere il tuo account attivo, riattivalo ora!',
    buttonText: 'Riattiva il mio account',
    note: 'La riattivazione è rapida e semplice: tutti i tuoi dati verranno ripristinati e il tuo account sarà completamente attivo.',
    unsubscribeText: 'annulla l\'iscrizione alle email di riattivazione',
  },

  policyChange: {
    subjectInitial: 'Importante: Aggiornamenti al/alla nostro/a {documentName}',
    subjectReminder: 'Promemoria: Azione richiesta - Esamina il/la {documentName} aggiornato/a',
    headerInitial: '📋 Aggiornamento importante',
    headerReminder: '⚠️ Promemoria',
    heading: 'Abbiamo aggiornato il/la nostro/a {documentName}',
    introInitial: 'Devi esaminare e accettare il/la nostro/a {documentName} aggiornato/a.',
    introReminder: 'Questo è un promemoria che devi esaminare e accettare il/la nostro/a {documentName} aggiornato/a.',
    urgencyInitial: 'Hai <strong>30 giorni</strong> (fino al {gracePeriodDate}) per esaminare e accettare queste modifiche.',
    urgencyReminder: '<strong>⚠️ {daysRemaining} giorni rimanenti</strong> - Accedi per esaminare e accettare il/la {documentName} aggiornato/a.',
    whatChangedTitle: 'Cosa è cambiato?',
    defaultDescription: 'Abbiamo apportato aggiornamenti importanti per servirti meglio e mantenere la conformità con le normative vigenti.',
    buttonText: 'Accedi per esaminare e accettare',
    deadlineTitle: '⏰ Scadenza importante',
    deadlineBody: '<strong>Entro il {gracePeriodDate}</strong>, devi accedere e accettare il/la {documentName} aggiornato/a. Se non accetti entro questa data, verrai disconnesso automaticamente e non potrai accedere al tuo account finché non accetti i nuovi termini.',
    whatToDoTitle: 'Cosa devi fare',
    step1: 'Accedi al tuo account Psychic Chat',
    step2: 'Esamina il/la {documentName} aggiornato/a',
    step3: 'Accetta le modifiche per continuare a utilizzare il tuo account',
    footerNote: 'Apprezziamo la tua privacy e siamo impegnati nella trasparenza. Se hai domande su queste modifiche, contatta il nostro team di supporto.',
    docTerms: 'Termini di servizio',
    docPrivacy: 'Informativa sulla privacy',
    docBoth: 'Termini di servizio e Informativa sulla privacy',
  },

  priceChange: {
    subject: 'Importante: Aggiornamento del prezzo del tuo abbonamento {intervalDisplay}',
    headerTitle: '💰 Aggiornamento prezzo abbonamento',
    heading: 'Aggiornamento importante sul tuo abbonamento {intervalDisplay}',
    intro: 'Ti scriviamo per informarti di un aggiornamento ai prezzi del nostro abbonamento. Il prezzo del tuo abbonamento {intervalDisplay} cambierà alla prossima data di fatturazione.',
    labelCurrentPrice: '<strong>Prezzo attuale:</strong> ${oldPrice}/{intervalUnit}',
    labelNewPrice: '<strong>Nuovo prezzo:</strong> ${newPrice}/{intervalUnit}',
    labelEffectiveDate: '<strong>Data di entrata in vigore:</strong> {effectiveDateFormatted}',
    buttonText: 'Visualizza i dettagli di fatturazione',
    whatMeansTitle: 'Cosa significa per te',
    whatMeansBody: 'I prezzi degli abbonamenti rimarranno invariati fino al {effectiveDateFormatted}. Successivamente, i rinnovi rifletteranno il nuovo prezzo di <strong>${newPrice}/{intervalUnit}</strong>. Questa modifica ci consente di continuare a offrirti un servizio di qualità, nuove funzionalità e miglioramenti continui.',
    timelineTitle: '📅 Cronologia importante',
    timelineBody: 'Il nuovo prezzo dell\'abbonamento entra in vigore il {effectiveDateFormatted}. Nel frattempo, continuerai a godere del tuo abbonamento al prezzo attuale. I rinnovi e i nuovi acquisti effettuati dopo il {effectiveDateFormatted} rifletteranno automaticamente il nuovo prezzo di <strong>${newPrice}/{intervalUnit}</strong>.',
    optionsTitle: 'Le tue opzioni',
    option1: '<strong>Continua il tuo abbonamento:</strong> Nessuna azione richiesta - il tuo abbonamento continuerà automaticamente al nuovo prezzo',
    option2: '<strong>Esamina la tua fatturazione:</strong> Visita la tua pagina Fatturazione e pagamenti per rivedere i dettagli del tuo abbonamento',
    option3: '<strong>Disdici in qualsiasi momento:</strong> Se preferisci non continuare al nuovo prezzo, puoi annullare il tuo abbonamento prima della prossima data di fatturazione',
    whyTitle: 'Perché questa modifica?',
    whyIntro: 'Siamo impegnati a offrire la migliore esperienza possibile ai nostri utenti. Questo adeguamento del prezzo ci aiuta a:',
    whyBullet1: 'Continuare a sviluppare nuove funzionalità e miglioramenti',
    whyBullet2: 'Mantenere il nostro servizio e supporto di alta qualità',
    whyBullet3: 'Investire in infrastrutture migliori e maggiore affidabilità',
    footerNote: 'Grazie per essere un membro stimato di Starship Psychics. Apprezziamo il tuo continuo supporto. Se hai domande su questa modifica, non esitare a contattare il nostro team di supporto.',
    intervalMonthly: 'mensile',
    intervalAnnual: 'annuale',
    intervalUnitMonth: 'mese',
    intervalUnitYear: 'anno',
  },

  subscriptionCancelled: {
    subject: 'Abbonamento annullato',
    headerTitle: 'Abbonamento annullato',
    body1: 'Il tuo abbonamento a Starship Psychics è stato annullato. Perderai l\'accesso alle funzionalità premium alla fine del tuo periodo di fatturazione.',
    body2: 'Puoi riattivare il tuo abbonamento in qualsiasi momento tramite le impostazioni del tuo account o il link qui sotto.',
    buttonText: 'Riattiva abbonamento',
    note: 'Ci piacerebbe averti di nuovo! Se hai domande, contatta il nostro team di supporto.',
  },

  subscriptionExpiring: {
    subject: 'Il tuo abbonamento scade tra {daysRemaining} giorni',
    headerTitle: 'Abbonamento in scadenza',
    body: 'Il tuo abbonamento scade tra {daysRemaining} giorni. Rinnova ora per evitare interruzioni del servizio.',
    note: 'Rinnova il tuo abbonamento per continuare a godere di accesso illimitato a tutte le funzionalità premium.',
  },

  paymentFailed: {
    subject: 'Pagamento non riuscito - Aggiornamento richiesto',
    headerTitle: 'Pagamento non riuscito',
    body: 'Il pagamento recente per il tuo abbonamento Starship Psychics non è andato a buon fine. Aggiorna il tuo metodo di pagamento per continuare a utilizzare l\'app.',
    buttonText: 'Aggiorna metodo di pagamento',
    note: 'Se il problema persiste, contatta il nostro team di supporto.',
    labelAmount: '<strong>Importo:</strong>',
  },

  paymentMethodInvalid: {
    subject: 'Il metodo di pagamento richiede attenzione',
    headerTitle: 'Aggiorna metodo di pagamento',
    body: 'Il metodo di pagamento registrato è scaduto o non è valido. Aggiornalo per mantenere il tuo abbonamento Starship Psychics.',
    buttonText: 'Aggiorna metodo di pagamento',
    note: 'Senza un metodo di pagamento valido, il tuo abbonamento potrebbe essere annullato. Aggiorna le tue informazioni il prima possibile.',
  },

  subscriptionCheckFailed: {
    subject: 'Verifica abbonamento',
    headerTitle: 'Verifica abbonamento',
    messageDefault: 'Non siamo in grado di verificare lo stato del tuo abbonamento. Prova ad accedere di nuovo.',
    messageStripeDown: 'Stripe è temporaneamente non disponibile. Verificheremo il tuo abbonamento a breve.',
    messageNoSub: 'Nessun abbonamento trovato sul tuo account. Creane uno per continuare a utilizzare l\'app.',
    note: 'Se il problema persiste, accedi al tuo account e controlla lo stato del tuo abbonamento.',
  },

  subscriptionIncomplete: {
    subject: 'Completa il tuo abbonamento',
    headerTitle: 'Completa il tuo abbonamento',
    body: 'La configurazione del tuo abbonamento è incompleta. Completa il pagamento per attivare il tuo account.',
    buttonText: 'Completa la configurazione',
    note: 'La configurazione del tuo abbonamento deve essere completata per accedere alle funzionalità premium di Starship Psychics.',
  },

  appUpdate: {
    subject: "Starship Psychics è stato aggiornato – Scarica l'ultima versione",
    heading: '🚀 Starship Psychics è stato aggiornato!',
    greeting: 'Notizie entusiasmanti da Starship Psychics!',
    body: "Abbiamo lavorato duramente per offrirti la migliore esperienza di chat psichica possibile. L'app Starship Psychics è stata aggiornata con nuove e interessanti funzionalità e miglioramenti — ci piacerebbe che tu le provassi!",
    releaseNotesLabel: 'Novità:',
    buttonText: 'Scarica su Google Play',
    note: "Tocca il pulsante qui sopra per scaricare l'ultima versione dal Google Play Store e scoprire tutte le novità di Starship Psychics.",
    footerNote: 'Grazie per essere un membro prezioso della comunità di Starship Psychics.',
  },

  subscriptionPastDue: {
    subject: 'Pagamento scaduto - Azione richiesta',
    headerTitle: 'Pagamento scaduto',
    body: 'Il pagamento del tuo abbonamento è scaduto. Aggiorna immediatamente il tuo metodo di pagamento per evitare interruzioni del servizio.',
    buttonText: 'Aggiorna pagamento ora',
    note: 'Abbiamo effettuato diversi tentativi di addebito sul tuo metodo di pagamento. Agisci ora per ripristinare il tuo accesso.',
  },
};
