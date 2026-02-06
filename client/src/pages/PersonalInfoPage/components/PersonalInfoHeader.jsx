/**
 * Header section for Personal Info page
 */
export function PersonalInfoHeader({ t }) {
  return (
    <div className="info-header">
      <h2 className="heading-primary">👤 {t('personalInfo.title')}</h2>
      <p className="info-subtitle">{t('personalInfo.title')}</p>
      <p className="privacy-notice" style={{ 
        fontSize: '0.85rem', 
        color: '#888', 
        marginTop: '0.5rem',
        fontStyle: 'italic'
      }}>
        {t('personalInfo.privacyNotice')}
      </p>
    </div>
  );
}
