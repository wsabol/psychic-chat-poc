/**
 * Email i18n strings — Chinese, Simplified (zh-CN)
 * Must mirror the structure of en-US.js exactly.
 */
export default {
  accountDeletion: {
    subject: '账户删除验证 – Psychic Chat',
    heading: '⚠️ 账户删除请求',
    intro: '我们收到了<strong>永久删除您的 Psychic Chat 账户</strong>的请求。要确认此操作，请输入以下验证码。',
    expiry: '此验证码将在 <strong>{expiryMinutes} 分钟</strong>后过期。',
    whatHappensTitle: '确认后将发生的情况：',
    bullet1: '您的<strong>订阅将立即取消</strong>——您将不会被收取任何新的计费周期费用。',
    bullet2: '您将在<strong>当前订阅期结束之前</strong>保留对账户的完整访问权限。',
    bullet3: '此后，您的个人信息将从我们的系统中永久删除。',
    bullet4: '您可以在订阅到期前随时取消此删除请求。',
    notYou: '如果您<strong>未</strong>申请删除账户，请忽略此邮件——您的账户将保持活跃状态。',
  },

  twoFactor: {
    subject: '双重身份验证码 - Psychic Chat',
    heading: '双重身份验证',
    intro: '您的双重身份验证码是：',
    expiry: '此验证码将在 {expiryMinutes} 分钟后过期。',
    notYou: '如果您未申请此验证码，请忽略此邮件。',
  },

  verification: {
    subject: '验证您的电子邮件 - Psychic Chat',
    heading: '验证您的电子邮件',
    welcome: '欢迎使用 Psychic Chat！请验证您的电子邮件地址以完成注册。',
    codeIntro: '您的验证码是：',
    expiry: '此验证码将在 {expiryMinutes} 分钟后过期。',
    notYou: '如果您未创建此账户，请忽略此邮件。',
  },

  passwordReset: {
    subject: '重置您的密码 - Psychic Chat',
    heading: '重置您的密码',
    intro: '我们收到了重置您密码的请求。如果您未提出此请求，请忽略此邮件。',
    codeIntro: '您的密码重置码是：',
    expiry: '此验证码将在 {expiryMinutes} 分钟后过期。',
    instruction: '使用此验证码重置您的密码。您需要确认新密码。',
  },

  reengagement: {
    subject6Month: '我们想念您！您的 Psychic Chat 账户随时可以重新激活',
    subject12Month: '最后机会：重新激活您的 Psychic Chat 账户',
    headline6Month: '我们想念您！',
    headline12Month: '您的账户即将被删除',
    message6Month: '距您申请删除账户已过去 6 个月。我们理解生活会发生变化，随时欢迎您回来。您的数据已安全存储，可随时重新激活。',
    message12Month: '距您申请删除账户已过去一年。这是在 6 个月后永久删除数据之前的最终通知。如果您希望保留账户，请立即重新激活！',
    buttonText: '重新激活我的账户',
    note: '重新激活快速简便——您的所有数据将被恢复，账户将完全激活。',
    unsubscribeText: '取消订阅重新激活邮件',
  },

  policyChange: {
    subjectInitial: '重要：我们的{documentName}更新',
    subjectReminder: '提醒：需要采取行动 - 查看更新的{documentName}',
    headerInitial: '📋 重要更新',
    headerReminder: '⚠️ 提醒',
    heading: '我们已更新{documentName}',
    introInitial: '您需要查看并接受我们更新的{documentName}。',
    introReminder: '这是提醒您需要查看并接受我们更新的{documentName}。',
    urgencyInitial: '您有 <strong>30 天</strong>（截至 {gracePeriodDate}）来查看并接受这些更改。',
    urgencyReminder: '<strong>⚠️ 剩余 {daysRemaining} 天</strong> - 请登录以查看并接受更新的{documentName}。',
    whatChangedTitle: '发生了哪些变化？',
    defaultDescription: '我们进行了重要更新，以便更好地为您服务并符合现行法规。',
    buttonText: '登录以查看并接受',
    deadlineTitle: '⏰ 重要截止日期',
    deadlineBody: '<strong>在 {gracePeriodDate} 之前</strong>，您必须登录并接受更新的{documentName}。如果您在此日期之前未接受，您将被自动登出，并且在接受新条款之前无法访问您的账户。',
    whatToDoTitle: '您需要做什么',
    step1: '登录您的 Psychic Chat 账户',
    step2: '查看更新的{documentName}',
    step3: '接受更改以继续使用您的账户',
    footerNote: '我们重视您的隐私，并致力于保持透明。如果您对这些更改有任何疑问，请联系我们的支持团队。',
    docTerms: '服务条款',
    docPrivacy: '隐私政策',
    docBoth: '服务条款和隐私政策',
  },

  priceChange: {
    subject: '重要：您的{intervalDisplay}订阅价格更新',
    headerTitle: '💰 订阅价格更新',
    heading: '关于您的{intervalDisplay}订阅的重要更新',
    intro: '我们致函通知您订阅价格的调整。您的{intervalDisplay}订阅价格将在下次计费日期发生变更。',
    labelCurrentPrice: '<strong>当前价格：</strong> ${oldPrice}/{intervalUnit}',
    labelNewPrice: '<strong>新价格：</strong> ${newPrice}/{intervalUnit}',
    labelEffectiveDate: '<strong>生效日期：</strong> {effectiveDateFormatted}',
    buttonText: '查看账单详情',
    whatMeansTitle: '这对您意味着什么',
    whatMeansBody: '订阅价格在 {effectiveDateFormatted} 之前保持不变。此后，续订将反映<strong>${newPrice}/{intervalUnit}</strong>的新价格。此次调整使我们能够继续为您提供优质服务、新功能和持续改进。',
    timelineTitle: '📅 重要时间表',
    timelineBody: '新订阅价格自 {effectiveDateFormatted} 起生效。在此之前，您将继续以当前价格享受订阅。{effectiveDateFormatted} 之后的续订和新购买将自动反映<strong>${newPrice}/{intervalUnit}</strong>的新价格。',
    optionsTitle: '您的选择',
    option1: '<strong>继续订阅：</strong>无需任何操作——您的订阅将以新价格自动续订',
    option2: '<strong>查看账单：</strong>访问您的账单与付款页面以查看订阅详情',
    option3: '<strong>随时取消：</strong>如果您不想以新价格继续，可以在下次计费日期前取消订阅',
    whyTitle: '为什么要进行此次调整？',
    whyIntro: '我们致力于为用户提供最佳体验。此次价格调整有助于我们：',
    whyBullet1: '继续开发新功能和改进',
    whyBullet2: '维持高质量的服务和支持',
    whyBullet3: '投资于更好的基础设施和可靠性',
    footerNote: '感谢您成为 Starship Psychics 的尊贵会员。我们感谢您的持续支持。如果您对此次变更有任何疑问，请随时联系我们的支持团队。',
    intervalMonthly: '月度',
    intervalAnnual: '年度',
    intervalUnitMonth: '月',
    intervalUnitYear: '年',
  },

  subscriptionCancelled: {
    subject: '订阅已取消',
    headerTitle: '订阅已取消',
    body1: '您的 Starship Psychics 订阅已取消。您将在计费期结束时失去对高级功能的访问权限。',
    body2: '您可以随时通过账户设置或以下链接重新激活订阅。',
    buttonText: '重新激活订阅',
    note: '我们期待您的回归！如有任何疑问，请联系我们的支持团队。',
  },

  subscriptionExpiring: {
    subject: '您的订阅将在 {daysRemaining} 天后到期',
    headerTitle: '订阅即将到期',
    body: '您的订阅将在 {daysRemaining} 天后到期。请立即续订以避免服务中断。',
    note: '续订您的订阅，继续享受所有高级功能的无限访问权限。',
  },

  paymentFailed: {
    subject: '付款失败 - 需要更新',
    headerTitle: '付款失败',
    body: '您最近为 Starship Psychics 订阅的付款失败。请更新您的付款方式以继续使用应用。',
    buttonText: '更新付款方式',
    note: '如果问题持续存在，请联系我们的支持团队。',
    labelAmount: '<strong>金额：</strong>',
  },

  paymentMethodInvalid: {
    subject: '付款方式需要关注',
    headerTitle: '更新付款方式',
    body: '您存档的付款方式已过期或无效。请更新以维持您的 Starship Psychics 订阅。',
    buttonText: '更新付款方式',
    note: '没有有效的付款方式，您的订阅可能会被取消。请尽快更新您的信息。',
  },

  subscriptionCheckFailed: {
    subject: '订阅验证',
    headerTitle: '订阅验证',
    messageDefault: '我们无法验证您的订阅状态。请尝试重新登录。',
    messageStripeDown: 'Stripe 暂时不可用。我们将很快验证您的订阅。',
    messageNoSub: '您的账户上未找到订阅。请创建订阅以继续使用该应用。',
    note: '如果问题持续存在，请登录您的账户并检查订阅状态。',
  },

  subscriptionIncomplete: {
    subject: '完成您的订阅',
    headerTitle: '完成您的订阅',
    body: '您的订阅设置未完成。请完成付款以激活您的账户。',
    buttonText: '完成设置',
    note: '您需要完成订阅设置才能访问 Starship Psychics 的高级功能。',
  },

  appUpdate: {
    subject: 'Starship Psychics 已更新 – 下载最新版本',
    heading: '🚀 Starship Psychics 已更新！',
    greeting: '来自 Starship Psychics 的好消息！',
    body: '我们一直在努力为您提供最佳的灵媒聊天体验。Starship Psychics 应用程序已在 Google Play 商店更新，带来了令人兴奋的新功能和改进，我们很乐意让您尝试！',
    releaseNotesLabel: '新功能：',
    buttonText: '在 Google Play 上下载',
    note: '点击上方按钮，从 Google Play 商店下载最新版本，体验 Starship Psychics 的所有新功能。',
    footerNote: '感谢您成为 Starship Psychics 社区的宝贵成员。',
  },

  subscriptionPastDue: {
    subject: '付款逾期 - 需要采取行动',
    headerTitle: '付款逾期',
    body: '您的订阅付款已逾期。请立即更新您的付款方式以避免服务中断。',
    buttonText: '立即更新付款',
    note: '我们已多次尝试从您的付款方式扣款。请立即采取行动以恢复您的访问权限。',
  },
};
