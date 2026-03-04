/**
 * Email i18n strings — Japanese (ja-JP)
 * Must mirror the structure of en-US.js exactly.
 */
export default {
  accountDeletion: {
    subject: 'アカウント削除の確認 – Psychic Chat',
    heading: '⚠️ アカウント削除リクエスト',
    intro: '<strong>Psychic Chatアカウントを完全に削除する</strong>リクエストを受け付けました。この操作を確認するには、以下の確認コードを入力してください。',
    expiry: 'このコードは<strong>{expiryMinutes}分</strong>で有効期限が切れます。',
    whatHappensTitle: '確認後に起こること：',
    bullet1: '<strong>サブスクリプションは直ちにキャンセル</strong>されます — 新しい請求期間への課金は行われません。',
    bullet2: '<strong>現在のサブスクリプション期間が終了するまで</strong>、アカウントへのフルアクセスを維持できます。',
    bullet3: 'その後、お客様の個人情報はシステムから完全に削除されます。',
    bullet4: 'サブスクリプションの有効期限が切れる前であれば、いつでもこの削除リクエストをキャンセルできます。',
    notYou: 'アカウントの削除を<strong>リクエストしていない</strong>場合は、このメールを無視してください — アカウントはそのまま有効です。',
  },

  twoFactor: {
    subject: '二要素認証コード - Psychic Chat',
    heading: '二要素認証',
    intro: '二要素認証コードは次のとおりです：',
    expiry: 'このコードは{expiryMinutes}分後に有効期限が切れます。',
    notYou: 'このコードをリクエストしていない場合は、このメールを無視してください。',
  },

  verification: {
    subject: 'メールアドレスの確認 - Psychic Chat',
    heading: 'メールアドレスの確認',
    welcome: 'Psychic Chatへようこそ！登録を完了するには、メールアドレスを確認してください。',
    codeIntro: '確認コードは次のとおりです：',
    expiry: 'このコードは{expiryMinutes}分後に有効期限が切れます。',
    notYou: 'このアカウントを作成していない場合は、このメールを無視してください。',
  },

  passwordReset: {
    subject: 'パスワードのリセット - Psychic Chat',
    heading: 'パスワードのリセット',
    intro: 'パスワードのリセットリクエストを受け付けました。このリクエストを行っていない場合は、このメールを無視してください。',
    codeIntro: 'パスワードリセットコードは次のとおりです：',
    expiry: 'このコードは{expiryMinutes}分後に有効期限が切れます。',
    instruction: 'このコードを使用してパスワードをリセットしてください。新しいパスワードの確認が必要です。',
  },

  reengagement: {
    subject6Month: 'お会いできず寂しいです！Psychic Chatアカウントをいつでも再有効化できます',
    subject12Month: '最後のチャンス：Psychic Chatアカウントを再有効化してください',
    headline6Month: 'お会いできず寂しいです！',
    headline12Month: 'アカウントが削除される予定です',
    message6Month: 'アカウント削除をリクエストしてから6ヶ月が経ちました。生活が変わることは理解しています。準備ができたらいつでも戻ってきてください。データは安全に保存されており、いつでも再有効化できます。',
    message12Month: 'アカウント削除をリクエストしてから1年が経ちました。これは、6ヶ月後に永続的なデータ削除が行われる前の最終通知です。アカウントを有効に保ちたい場合は、今すぐ再有効化してください！',
    buttonText: 'アカウントを再有効化する',
    note: '再有効化はすばやく簡単です - すべてのデータが復元され、アカウントが完全にアクティブになります。',
    unsubscribeText: '再エンゲージメントメールの配信停止',
  },

  policyChange: {
    subjectInitial: '重要：{documentName}の更新について',
    subjectReminder: 'リマインダー：要対応 - 更新された{documentName}をご確認ください',
    headerInitial: '📋 重要なアップデート',
    headerReminder: '⚠️ リマインダー',
    heading: '{documentName}を更新しました',
    introInitial: '更新された{documentName}を確認し、同意していただく必要があります。',
    introReminder: '更新された{documentName}を確認し、同意していただく必要があることをお知らせするリマインダーです。',
    urgencyInitial: 'これらの変更を確認して同意するには<strong>30日</strong>（{gracePeriodDate}まで）あります。',
    urgencyReminder: '<strong>⚠️ 残り{daysRemaining}日</strong> - ログインして更新された{documentName}を確認し、同意してください。',
    whatChangedTitle: '変更点は何ですか？',
    defaultDescription: 'お客様により良いサービスを提供し、現行の規制に準拠するために重要な更新を行いました。',
    buttonText: 'ログインして確認・同意する',
    deadlineTitle: '⏰ 重要な期限',
    deadlineBody: '<strong>{gracePeriodDate}まで</strong>にログインして更新された{documentName}に同意する必要があります。この日までに同意しない場合、自動的にログアウトされ、新しい条件に同意するまでアカウントにアクセスできなくなります。',
    whatToDoTitle: '必要な手順',
    step1: 'Psychic Chatアカウントにログインする',
    step2: '更新された{documentName}を確認する',
    step3: 'アカウントの使用を継続するために変更に同意する',
    footerNote: '当社はお客様のプライバシーを大切にし、透明性に取り組んでいます。これらの変更についてご質問がある場合は、サポートチームまでお問い合わせください。',
    docTerms: '利用規約',
    docPrivacy: 'プライバシーポリシー',
    docBoth: '利用規約およびプライバシーポリシー',
  },

  priceChange: {
    subject: '重要：{intervalDisplay}サブスクリプション料金の変更について',
    headerTitle: '💰 サブスクリプション料金の変更',
    heading: '{intervalDisplay}サブスクリプションに関する重要なお知らせ',
    intro: 'サブスクリプション料金の変更についてお知らせします。{intervalDisplay}サブスクリプションの料金は、次回の請求日より変更されます。',
    labelCurrentPrice: '<strong>現在の料金：</strong> ${oldPrice}/{intervalUnit}',
    labelNewPrice: '<strong>新しい料金：</strong> ${newPrice}/{intervalUnit}',
    labelEffectiveDate: '<strong>適用日：</strong> {effectiveDateFormatted}',
    buttonText: '請求詳細を確認する',
    whatMeansTitle: 'お客様への影響',
    whatMeansBody: 'サブスクリプション料金は{effectiveDateFormatted}まで変わりません。その後、更新時には<strong>${newPrice}/{intervalUnit}</strong>の新しい料金が適用されます。この変更により、高品質なサービス、新機能、継続的な改善を提供し続けることができます。',
    timelineTitle: '📅 重要なスケジュール',
    timelineBody: '新しいサブスクリプション料金は{effectiveDateFormatted}より有効になります。それまでは、現在の料金でサブスクリプションをご利用いただけます。{effectiveDateFormatted}以降の更新および新規購入には、自動的に<strong>${newPrice}/{intervalUnit}</strong>の新料金が適用されます。',
    optionsTitle: 'お客様のオプション',
    option1: '<strong>サブスクリプションを継続する：</strong>何もしなくても、サブスクリプションは新しい料金で自動的に継続されます',
    option2: '<strong>請求を確認する：</strong>請求・支払いページでサブスクリプションの詳細をご確認ください',
    option3: '<strong>いつでもキャンセル可能：</strong>新しい料金での継続を希望しない場合は、次回の請求日前にサブスクリプションをキャンセルできます',
    whyTitle: 'なぜ変更するのですか？',
    whyIntro: '当社はユーザーに最高の体験を提供することを目指しています。この料金改定により、以下のことが可能になります：',
    whyBullet1: '新機能と改善の継続的な開発',
    whyBullet2: '高品質なサービスとサポートの維持',
    whyBullet3: 'より優れたインフラと信頼性への投資',
    footerNote: 'Starship Psychicsの大切なメンバーとしてご支援いただきありがとうございます。この変更についてご質問がある場合は、サポートチームまでお気軽にお問い合わせください。',
    intervalMonthly: '月額',
    intervalAnnual: '年額',
    intervalUnitMonth: '月',
    intervalUnitYear: '年',
  },

  subscriptionCancelled: {
    subject: 'サブスクリプションのキャンセル',
    headerTitle: 'サブスクリプションのキャンセル',
    body1: 'Starship Psychicsのサブスクリプションがキャンセルされました。請求期間の終了時にプレミアム機能へのアクセスを失います。',
    body2: 'アカウント設定または以下のリンクからいつでもサブスクリプションを再有効化できます。',
    buttonText: 'サブスクリプションを再有効化する',
    note: 'またのご利用をお待ちしております！ご質問がある場合は、サポートチームまでお問い合わせください。',
  },

  subscriptionExpiring: {
    subject: 'サブスクリプションは{daysRemaining}日後に期限切れになります',
    headerTitle: 'サブスクリプションの期限切れが近づいています',
    body: 'サブスクリプションは{daysRemaining}日後に期限切れになります。サービスが中断されないよう今すぐ更新してください。',
    note: 'サブスクリプションを更新して、すべてのプレミアム機能への無制限アクセスをお楽しみください。',
  },

  paymentFailed: {
    subject: '支払いに失敗しました - 更新が必要です',
    headerTitle: '支払いに失敗しました',
    body: 'Starship Psychicsサブスクリプションの最近の支払いに失敗しました。アプリを引き続きご利用いただくために、お支払い方法を更新してください。',
    buttonText: 'お支払い方法を更新する',
    note: '問題が解決しない場合は、サポートチームまでお問い合わせください。',
    labelAmount: '<strong>金額：</strong>',
  },

  paymentMethodInvalid: {
    subject: 'お支払い方法に問題があります',
    headerTitle: 'お支払い方法を更新する',
    body: '登録されているお支払い方法の有効期限が切れているか、無効です。Starship Psychicsのサブスクリプションを維持するために更新してください。',
    buttonText: 'お支払い方法を更新する',
    note: '有効なお支払い方法がないと、サブスクリプションがキャンセルされる可能性があります。できるだけ早く情報を更新してください。',
  },

  subscriptionCheckFailed: {
    subject: 'サブスクリプションの確認',
    headerTitle: 'サブスクリプションの確認',
    messageDefault: 'サブスクリプションのステータスを確認できません。再度ログインしてください。',
    messageStripeDown: 'Stripeが一時的に利用できません。まもなくサブスクリプションを確認します。',
    messageNoSub: 'アカウントにサブスクリプションが見つかりません。アプリを引き続き使用するには、サブスクリプションを作成してください。',
    note: '問題が解決しない場合は、アカウントにログインしてサブスクリプションのステータスをご確認ください。',
  },

  subscriptionIncomplete: {
    subject: 'サブスクリプションの設定を完了してください',
    headerTitle: 'サブスクリプションの設定を完了する',
    body: 'サブスクリプションの設定が完了していません。アカウントを有効化するには支払いを完了してください。',
    buttonText: '設定を完了する',
    note: 'Starship Psychicsのプレミアム機能にアクセスするには、サブスクリプションの設定を完了する必要があります。',
  },

  subscriptionPastDue: {
    subject: '支払い期限超過 - 要対応',
    headerTitle: '支払い期限超過',
    body: 'サブスクリプションの支払いが期限超過となっています。サービスが中断されないよう、すぐにお支払い方法を更新してください。',
    buttonText: '今すぐ支払いを更新する',
    note: 'お支払い方法への請求を複数回試みました。今すぐ対応してアクセスを復元してください。',
  },
};
