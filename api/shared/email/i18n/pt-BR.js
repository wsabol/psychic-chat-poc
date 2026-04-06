/**
 * Email i18n strings — Portuguese, Brazil (pt-BR)
 * Must mirror the structure of en-US.js exactly.
 */
export default {
  accountDeletion: {
    subject: 'Verificação de exclusão de conta – Psychic Chat',
    heading: '⚠️ Solicitação de exclusão de conta',
    intro: 'Recebemos uma solicitação para <strong>excluir permanentemente sua conta do Psychic Chat</strong>. Para confirmar esta ação, insira o código de verificação abaixo.',
    expiry: 'Este código expira em <strong>{expiryMinutes} minutos</strong>.',
    whatHappensTitle: 'O que acontece quando você confirmar:',
    bullet1: 'Sua <strong>assinatura será cancelada imediatamente</strong> — você não será cobrado por nenhum novo período de cobrança.',
    bullet2: 'Você manterá acesso total à sua conta <strong>até o final do seu período de assinatura atual</strong>.',
    bullet3: 'Após isso, suas informações pessoais serão removidas permanentemente de nossos sistemas.',
    bullet4: 'Você pode cancelar esta solicitação de exclusão a qualquer momento antes que sua assinatura expire.',
    notYou: 'Se você <strong>não</strong> solicitou a exclusão da sua conta, ignore este e-mail — sua conta permanecerá ativa.',
  },

  twoFactor: {
    subject: 'Código de autenticação de dois fatores - Psychic Chat',
    heading: 'Autenticação de dois fatores',
    intro: 'Seu código de autenticação de dois fatores é:',
    expiry: 'Este código expirará em {expiryMinutes} minutos.',
    notYou: 'Se você não solicitou este código, ignore este e-mail.',
  },

  verification: {
    subject: 'Verifique seu e-mail - Psychic Chat',
    heading: 'Verifique seu e-mail',
    welcome: 'Bem-vindo ao Psychic Chat! Verifique seu endereço de e-mail para concluir o cadastro.',
    codeIntro: 'Seu código de verificação é:',
    expiry: 'Este código expirará em {expiryMinutes} minutos.',
    notYou: 'Se você não criou esta conta, ignore este e-mail.',
  },

  passwordReset: {
    subject: 'Redefinir sua senha - Psychic Chat',
    heading: 'Redefinir sua senha',
    intro: 'Recebemos uma solicitação para redefinir sua senha. Se você não fez esta solicitação, ignore este e-mail.',
    codeIntro: 'Seu código de redefinição de senha é:',
    expiry: 'Este código expirará em {expiryMinutes} minutos.',
    instruction: 'Use este código para redefinir sua senha. Você precisará confirmar sua nova senha.',
  },

  reengagement: {
    subject6Month: 'Sentimos sua falta! Sua conta do Psychic Chat está pronta para ser reativada',
    subject12Month: 'Última chance: Reative sua conta do Psychic Chat',
    headline6Month: 'Sentimos sua falta!',
    headline12Month: 'Sua conta está prestes a ser excluída',
    message6Month: 'Já faz 6 meses desde que você solicitou a exclusão da sua conta. Entendemos que a vida muda, e adoraríamos recebê-lo de volta quando estiver pronto. Seus dados estão armazenados com segurança e podem ser reativados a qualquer momento.',
    message12Month: 'Já faz um ano desde que você solicitou a exclusão da conta. Este é seu aviso final antes que a exclusão permanente de dados ocorra em 6 meses. Se você deseja manter sua conta ativa, reative-a agora!',
    buttonText: 'Reativar minha conta',
    note: 'Reativar é rápido e fácil - todos os seus dados serão restaurados e sua conta ficará totalmente ativa.',
    unsubscribeText: 'cancelar inscrição nos e-mails de reengajamento',
  },

  policyChange: {
    subjectInitial: 'Importante: Atualizações em nosso(a) {documentName}',
    subjectReminder: 'Lembrete: Ação necessária - Revise o(a) {documentName} atualizado(a)',
    headerInitial: '📋 Atualização importante',
    headerReminder: '⚠️ Lembrete',
    heading: 'Atualizamos nosso(a) {documentName}',
    introInitial: 'Você precisa revisar e aceitar nosso(a) {documentName} atualizado(a).',
    introReminder: 'Este é um lembrete de que você precisa revisar e aceitar nosso(a) {documentName} atualizado(a).',
    urgencyInitial: 'Você tem <strong>30 dias</strong> (até {gracePeriodDate}) para revisar e aceitar essas alterações.',
    urgencyReminder: '<strong>⚠️ {daysRemaining} dias restantes</strong> - Faça login para revisar e aceitar o(a) {documentName} atualizado(a).',
    whatChangedTitle: 'O que mudou?',
    defaultDescription: 'Fizemos atualizações importantes para melhor atendê-lo e manter a conformidade com as regulamentações atuais.',
    buttonText: 'Entrar para revisar e aceitar',
    deadlineTitle: '⏰ Prazo importante',
    deadlineBody: '<strong>Até {gracePeriodDate}</strong>, você deve fazer login e aceitar o(a) {documentName} atualizado(a). Se você não aceitar até esta data, será desconectado automaticamente e não poderá acessar sua conta até aceitar os novos termos.',
    whatToDoTitle: 'O que você precisa fazer',
    step1: 'Faça login na sua conta do Psychic Chat',
    step2: 'Revise o(a) {documentName} atualizado(a)',
    step3: 'Aceite as alterações para continuar usando sua conta',
    footerNote: 'Valorizamos sua privacidade e estamos comprometidos com a transparência. Se tiver alguma dúvida sobre essas alterações, entre em contato com nossa equipe de suporte.',
    docTerms: 'Termos de Serviço',
    docPrivacy: 'Política de Privacidade',
    docBoth: 'Termos de Serviço e Política de Privacidade',
  },

  priceChange: {
    subject: 'Importante: Atualização de preço da sua assinatura {intervalDisplay}',
    headerTitle: '💰 Atualização de preço da assinatura',
    heading: 'Atualização importante sobre sua assinatura {intervalDisplay}',
    intro: 'Estamos entrando em contato para informá-lo sobre uma atualização em nossos preços de assinatura. O preço da sua assinatura {intervalDisplay} será alterado na sua próxima data de cobrança.',
    labelCurrentPrice: '<strong>Preço atual:</strong> ${oldPrice}/{intervalUnit}',
    labelNewPrice: '<strong>Novo preço:</strong> ${newPrice}/{intervalUnit}',
    labelEffectiveDate: '<strong>Data de vigência:</strong> {effectiveDateFormatted}',
    buttonText: 'Ver detalhes de cobrança',
    whatMeansTitle: 'O que isso significa para você',
    whatMeansBody: 'Os preços de assinatura permanecem inalterados até {effectiveDateFormatted}. A partir dessa data, as renovações refletirão o novo preço de <strong>${newPrice}/{intervalUnit}</strong>. Essa mudança nos permite continuar oferecendo um serviço de qualidade, novos recursos e melhorias contínuas.',
    timelineTitle: '📅 Cronograma importante',
    timelineBody: 'O novo preço de assinatura entra em vigor em {effectiveDateFormatted}. Até lá, você continuará desfrutando da sua assinatura pelo preço atual. Renovações e novas compras após {effectiveDateFormatted} refletirão automaticamente o novo preço de <strong>${newPrice}/{intervalUnit}</strong>.',
    optionsTitle: 'Suas opções',
    option1: '<strong>Continuar sua assinatura:</strong> Nenhuma ação necessária - sua assinatura continuará automaticamente pelo novo preço',
    option2: '<strong>Revisar sua cobrança:</strong> Visite sua página de Cobrança e Pagamentos para revisar os detalhes da sua assinatura',
    option3: '<strong>Cancelar a qualquer momento:</strong> Se preferir não continuar pelo novo preço, você pode cancelar sua assinatura antes da próxima data de cobrança',
    whyTitle: 'Por que essa mudança?',
    whyIntro: 'Estamos comprometidos em oferecer a melhor experiência possível para nossos usuários. Esse ajuste de preço nos ajuda a:',
    whyBullet1: 'Continuar desenvolvendo novos recursos e melhorias',
    whyBullet2: 'Manter nosso serviço e suporte de alta qualidade',
    whyBullet3: 'Investir em melhor infraestrutura e confiabilidade',
    footerNote: 'Obrigado por ser um membro valioso do Starship Psychics. Agradecemos seu apoio contínuo. Se tiver alguma dúvida sobre essa mudança, não hesite em entrar em contato com nossa equipe de suporte.',
    intervalMonthly: 'mensal',
    intervalAnnual: 'anual',
    intervalUnitMonth: 'mês',
    intervalUnitYear: 'ano',
  },

  subscriptionCancelled: {
    subject: 'Assinatura cancelada',
    headerTitle: 'Assinatura cancelada',
    body1: 'Sua assinatura do Starship Psychics foi cancelada. Você perderá acesso aos recursos premium no final do seu período de cobrança.',
    body2: 'Você pode reativar sua assinatura a qualquer momento pelas configurações da sua conta ou pelo link abaixo.',
    buttonText: 'Reativar assinatura',
    note: 'Adoraríamos tê-lo de volta! Se tiver alguma dúvida, entre em contato com nossa equipe de suporte.',
  },

  subscriptionExpiring: {
    subject: 'Sua assinatura expira em {daysRemaining} dias',
    headerTitle: 'Assinatura expirando em breve',
    body: 'Sua assinatura expira em {daysRemaining} dias. Renove agora para evitar interrupção do serviço.',
    note: 'Renove sua assinatura para continuar desfrutando de acesso ilimitado a todos os recursos premium.',
  },

  paymentFailed: {
    subject: 'Pagamento falhou - Atualização necessária',
    headerTitle: 'Pagamento falhou',
    body: 'Seu pagamento recente pela assinatura do Starship Psychics falhou. Atualize seu método de pagamento para continuar usando o aplicativo.',
    buttonText: 'Atualizar método de pagamento',
    note: 'Se continuar com problemas, entre em contato com nossa equipe de suporte.',
    labelAmount: '<strong>Valor:</strong>',
  },

  paymentMethodInvalid: {
    subject: 'Método de pagamento precisa de atenção',
    headerTitle: 'Atualizar método de pagamento',
    body: 'O método de pagamento cadastrado expirou ou é inválido. Atualize-o para manter sua assinatura do Starship Psychics.',
    buttonText: 'Atualizar método de pagamento',
    note: 'Sem um método de pagamento válido, sua assinatura poderá ser cancelada. Atualize suas informações o quanto antes.',
  },

  subscriptionCheckFailed: {
    subject: 'Verificação de assinatura',
    headerTitle: 'Verificação de assinatura',
    messageDefault: 'Não conseguimos verificar o status da sua assinatura. Tente fazer login novamente.',
    messageStripeDown: 'O Stripe está temporariamente indisponível. Verificaremos sua assinatura em breve.',
    messageNoSub: 'Nenhuma assinatura encontrada na sua conta. Crie uma para continuar usando o aplicativo.',
    note: 'Se continuar com problemas, faça login na sua conta e verifique o status da sua assinatura.',
  },

  subscriptionIncomplete: {
    subject: 'Conclua sua assinatura',
    headerTitle: 'Conclua sua assinatura',
    body: 'A configuração da sua assinatura está incompleta. Conclua o pagamento para ativar sua conta.',
    buttonText: 'Concluir configuração',
    note: 'A configuração da sua assinatura precisa ser concluída para acessar os recursos premium do Starship Psychics.',
  },

  appUpdate: {
    subject: 'Starship Psychics foi atualizado – Baixe a última versão',
    heading: '🚀 Starship Psychics foi atualizado!',
    greeting: 'Novidades empolgantes do Starship Psychics!',
    body: 'Trabalhamos muito para oferecer a melhor experiência de chat psíquico possível. O aplicativo Starship Psychics foi atualizado com novos recursos e melhorias empolgantes — adoraríamos que você os experimentasse!',
    releaseNotesLabel: 'Novidades:',
    buttonText: 'Baixar no Google Play',
    note: 'Toque no botão acima para baixar a versão mais recente na Google Play Store e experimentar tudo de novo que o Starship Psychics tem a oferecer.',
    footerNote: 'Obrigado por ser um membro valioso da comunidade Starship Psychics.',
  },

  subscriptionPastDue: {
    subject: 'Pagamento em atraso - Ação necessária',
    headerTitle: 'Pagamento em atraso',
    body: 'O pagamento da sua assinatura está em atraso. Atualize seu método de pagamento imediatamente para evitar interrupção do serviço.',
    buttonText: 'Atualizar pagamento agora',
    note: 'Fizemos várias tentativas de cobrar seu método de pagamento. Tome uma atitude agora para restaurar seu acesso.',
  },
};
