/**
 * Alert messages for form errors and success
 */
export function FormAlerts({ error, success, t }) {
  return (
    <>
      {error && <div className="form-error-alert">{error}</div>}
      {success && <div className="form-success-alert">✓ {t('common.saved')}</div>}
    </>
  );
}
