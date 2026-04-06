/**
 * Email i18n strings — Spanish (es-ES)
 * Must mirror the structure of en-US.js exactly.
 */
export default {
  accountDeletion: {
    subject: 'Verificación de eliminación de cuenta – Psychic Chat',
    heading: '⚠️ Solicitud de eliminación de cuenta',
    intro: 'Recibimos una solicitud para <strong>eliminar permanentemente su cuenta de Psychic Chat</strong>. Para confirmar esta acción, ingrese el código de verificación a continuación.',
    expiry: 'Este código expira en <strong>{expiryMinutes} minutos</strong>.',
    whatHappensTitle: 'Qué sucede cuando confirma:',
    bullet1: 'Su <strong>suscripción se cancelará de inmediato</strong> — no se le cobrará ningún período de facturación nuevo.',
    bullet2: 'Conservará acceso completo a su cuenta <strong>hasta el final de su período de suscripción actual</strong>.',
    bullet3: 'Después de eso, su información personal se eliminará permanentemente de nuestros sistemas.',
    bullet4: 'Puede cancelar esta solicitud de eliminación en cualquier momento antes de que venza su suscripción.',
    notYou: 'Si usted <strong>no</strong> solicitó eliminar su cuenta, ignore este correo electrónico — su cuenta permanecerá activa.',
  },

  twoFactor: {
    subject: 'Código de autenticación de dos factores - Psychic Chat',
    heading: 'Autenticación de dos factores',
    intro: 'Su código de autenticación de dos factores es:',
    expiry: 'Este código expirará en {expiryMinutes} minutos.',
    notYou: 'Si no solicitó este código, ignore este correo electrónico.',
  },

  verification: {
    subject: 'Verifique su correo electrónico - Psychic Chat',
    heading: 'Verifique su correo electrónico',
    welcome: '¡Bienvenido a Psychic Chat! Verifique su dirección de correo electrónico para completar el registro.',
    codeIntro: 'Su código de verificación es:',
    expiry: 'Este código expirará en {expiryMinutes} minutos.',
    notYou: 'Si no creó esta cuenta, ignore este correo electrónico.',
  },

  passwordReset: {
    subject: 'Restablecer su contraseña - Psychic Chat',
    heading: 'Restablecer su contraseña',
    intro: 'Recibimos una solicitud para restablecer su contraseña. Si no realizó esta solicitud, ignore este correo electrónico.',
    codeIntro: 'Su código para restablecer la contraseña es:',
    expiry: 'Este código expirará en {expiryMinutes} minutos.',
    instruction: 'Use este código para restablecer su contraseña. Deberá confirmar su nueva contraseña.',
  },

  reengagement: {
    subject6Month: '¡Te echamos de menos! Tu cuenta de Psychic Chat está lista para reactivarse',
    subject12Month: 'Última oportunidad: Reactiva tu cuenta de Psychic Chat',
    headline6Month: '¡Te echamos de menos!',
    headline12Month: 'Tu cuenta está a punto de eliminarse',
    message6Month: 'Han pasado 6 meses desde que solicitaste eliminar tu cuenta. Entendemos que la vida cambia y nos encantaría darte la bienvenida de nuevo cuando estés listo. Tus datos están guardados de forma segura y pueden reactivarse en cualquier momento.',
    message12Month: 'Ha pasado un año desde que solicitaste la eliminación de tu cuenta. Este es tu aviso final antes de que se produzca la eliminación permanente de datos en 6 meses. Si deseas mantener tu cuenta activa, ¡reactívala ahora!',
    buttonText: 'Reactivar mi cuenta',
    note: 'Reactivar es rápido y fácil: todos tus datos se restaurarán y tu cuenta estará completamente activa.',
    unsubscribeText: 'cancelar suscripción a correos de reactivación',
  },

  policyChange: {
    subjectInitial: 'Importante: Actualizaciones a nuestro(a) {documentName}',
    subjectReminder: 'Recordatorio: Acción requerida - Revise el(la) {documentName} actualizado(a)',
    headerInitial: '📋 Actualización importante',
    headerReminder: '⚠️ Recordatorio',
    heading: 'Hemos actualizado nuestro(a) {documentName}',
    introInitial: 'Debe revisar y aceptar nuestro(a) {documentName} actualizado(a).',
    introReminder: 'Este es un recordatorio de que debe revisar y aceptar nuestro(a) {documentName} actualizado(a).',
    urgencyInitial: 'Tiene <strong>30 días</strong> (hasta el {gracePeriodDate}) para revisar y aceptar estos cambios.',
    urgencyReminder: '<strong>⚠️ Quedan {daysRemaining} días</strong> - Inicie sesión para revisar y aceptar el(la) {documentName} actualizado(a).',
    whatChangedTitle: '¿Qué cambió?',
    defaultDescription: 'Realizamos actualizaciones importantes para servirle mejor y mantener el cumplimiento de las normativas vigentes.',
    buttonText: 'Iniciar sesión para revisar y aceptar',
    deadlineTitle: '⏰ Fecha límite importante',
    deadlineBody: '<strong>Antes del {gracePeriodDate}</strong>, debe iniciar sesión y aceptar el(la) {documentName} actualizado(a). Si no acepta antes de esta fecha, se cerrará su sesión automáticamente y no podrá acceder a su cuenta hasta que acepte los nuevos términos.',
    whatToDoTitle: 'Qué debe hacer',
    step1: 'Inicie sesión en su cuenta de Psychic Chat',
    step2: 'Revise el(la) {documentName} actualizado(a)',
    step3: 'Acepte los cambios para continuar usando su cuenta',
    footerNote: 'Valoramos su privacidad y estamos comprometidos con la transparencia. Si tiene alguna pregunta sobre estos cambios, comuníquese con nuestro equipo de soporte.',
    docTerms: 'Términos de servicio',
    docPrivacy: 'Política de privacidad',
    docBoth: 'Términos de servicio y Política de privacidad',
  },

  priceChange: {
    subject: 'Importante: Actualización del precio de su suscripción {intervalDisplay}',
    headerTitle: '💰 Actualización de precio de suscripción',
    heading: 'Actualización importante sobre su suscripción {intervalDisplay}',
    intro: 'Le escribimos para informarle de una actualización en los precios de nuestra suscripción. El precio de su suscripción {intervalDisplay} cambiará en su próxima fecha de facturación.',
    labelCurrentPrice: '<strong>Precio actual:</strong> ${oldPrice}/{intervalUnit}',
    labelNewPrice: '<strong>Precio nuevo:</strong> ${newPrice}/{intervalUnit}',
    labelEffectiveDate: '<strong>Fecha efectiva:</strong> {effectiveDateFormatted}',
    buttonText: 'Ver detalles de facturación',
    whatMeansTitle: 'Qué significa esto para usted',
    whatMeansBody: 'Los precios de suscripción no cambiarán hasta el {effectiveDateFormatted}. A partir de esa fecha, las renovaciones reflejarán el nuevo precio de <strong>${newPrice}/{intervalUnit}</strong>. Este cambio nos permite seguir brindándole un servicio de calidad, nuevas funciones y mejoras continuas.',
    timelineTitle: '📅 Cronograma importante',
    timelineBody: 'El nuevo precio de suscripción entra en vigor el {effectiveDateFormatted}. Hasta entonces, seguirá disfrutando de su suscripción al precio actual. Las renovaciones y nuevas compras realizadas después del {effectiveDateFormatted} reflejarán automáticamente el nuevo precio de <strong>${newPrice}/{intervalUnit}</strong>.',
    optionsTitle: 'Sus opciones',
    option1: '<strong>Continuar su suscripción:</strong> No es necesaria ninguna acción — su suscripción continuará automáticamente al nuevo precio',
    option2: '<strong>Revisar su facturación:</strong> Visite su página de facturación y pagos para revisar los detalles de su suscripción',
    option3: '<strong>Cancelar en cualquier momento:</strong> Si prefiere no continuar al nuevo precio, puede cancelar su suscripción antes de su próxima fecha de facturación',
    whyTitle: '¿Por qué este cambio?',
    whyIntro: 'Estamos comprometidos a ofrecer la mejor experiencia posible. Este ajuste de precio nos ayuda a:',
    whyBullet1: 'Continuar desarrollando nuevas funciones y mejoras',
    whyBullet2: 'Mantener nuestro servicio y soporte de alta calidad',
    whyBullet3: 'Invertir en mejor infraestructura y confiabilidad',
    footerNote: 'Gracias por ser un miembro valioso de Starship Psychics. Apreciamos su apoyo continuo. Si tiene alguna pregunta sobre este cambio, no dude en contactar a nuestro equipo de soporte.',
    intervalMonthly: 'mensual',
    intervalAnnual: 'anual',
    intervalUnitMonth: 'mes',
    intervalUnitYear: 'año',
  },

  subscriptionCancelled: {
    subject: 'Suscripción cancelada',
    headerTitle: 'Suscripción cancelada',
    body1: 'Su suscripción de Starship Psychics ha sido cancelada. Perderá acceso a las funciones premium al final de su período de facturación.',
    body2: 'Puede reactivar su suscripción en cualquier momento desde la configuración de su cuenta o el enlace a continuación.',
    buttonText: 'Reactivar suscripción',
    note: '¡Nos encantaría tenerle de vuelta! Si tiene alguna pregunta, comuníquese con nuestro equipo de soporte.',
  },

  subscriptionExpiring: {
    subject: 'Su suscripción vence en {daysRemaining} días',
    headerTitle: 'Suscripción por vencer',
    body: 'Su suscripción vence en {daysRemaining} días. Renueve ahora para evitar interrupciones del servicio.',
    note: 'Renueve su suscripción para continuar disfrutando de acceso ilimitado a todas las funciones premium.',
  },

  paymentFailed: {
    subject: 'Pago fallido - Actualización requerida',
    headerTitle: 'Pago fallido',
    body: 'Su pago reciente por su suscripción de Starship Psychics falló. Actualice su método de pago para continuar usando la aplicación.',
    buttonText: 'Actualizar método de pago',
    note: 'Si continúa teniendo problemas, comuníquese con nuestro equipo de soporte.',
    labelAmount: '<strong>Monto:</strong>',
  },

  paymentMethodInvalid: {
    subject: 'El método de pago necesita atención',
    headerTitle: 'Actualizar método de pago',
    body: 'El método de pago registrado ha caducado o no es válido. Actualícelo para mantener su suscripción de Starship Psychics.',
    buttonText: 'Actualizar método de pago',
    note: 'Sin un método de pago válido, su suscripción podría cancelarse. Actualice su información lo antes posible.',
  },

  subscriptionCheckFailed: {
    subject: 'Verificación de suscripción',
    headerTitle: 'Verificación de suscripción',
    messageDefault: 'No podemos verificar el estado de su suscripción. Intente iniciar sesión de nuevo.',
    messageStripeDown: 'Stripe no está disponible temporalmente. Verificaremos su suscripción en breve.',
    messageNoSub: 'No se encontró ninguna suscripción en su cuenta. Cree una para continuar usando la aplicación.',
    note: 'Si continúa teniendo problemas, inicie sesión en su cuenta y verifique el estado de su suscripción.',
  },

  subscriptionIncomplete: {
    subject: 'Complete su suscripción',
    headerTitle: 'Complete su suscripción',
    body: 'La configuración de su suscripción está incompleta. Complete el pago para activar su cuenta.',
    buttonText: 'Completar configuración',
    note: 'Debe completar la configuración de su suscripción para acceder a las funciones premium de Starship Psychics.',
  },

  appUpdate: {
    subject: 'Starship Psychics se ha actualizado – Descarga la última versión',
    heading: '🚀 ¡Starship Psychics se ha actualizado!',
    greeting: '¡Noticias emocionantes de Starship Psychics!',
    body: 'Hemos trabajado arduamente para brindarte la mejor experiencia de chat psíquico posible. La aplicación Starship Psychics se ha actualizado con nuevas e interesantes funciones y mejoras. ¡Nos encantaría que las probaras!',
    releaseNotesLabel: 'Novedades:',
    buttonText: 'Descargar en Google Play',
    note: 'Toca el botón de arriba para descargar la última versión desde Google Play Store y experimentar todo lo nuevo que Starship Psychics tiene para ofrecer.',
    footerNote: 'Gracias por ser un valioso miembro de la comunidad de Starship Psychics.',
  },

  subscriptionPastDue: {
    subject: 'Pago vencido - Acción requerida',
    headerTitle: 'Pago vencido',
    body: 'El pago de su suscripción está vencido. Actualice su método de pago de inmediato para evitar interrupciones del servicio.',
    buttonText: 'Actualizar pago ahora',
    note: 'Hemos realizado varios intentos de cobro. Tome acción ahora para restaurar su acceso.',
  },
};
