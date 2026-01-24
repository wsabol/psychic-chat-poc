/**
 * Header section for Personal Info page
 */
export function PersonalInfoHeader({ t }) {
  return (
    <div className="info-header">
      <h2 className="heading-primary">👤 {t('personalInfo.title')}</h2>
      <p className="info-subtitle">{t('personalInfo.title')}</p>
    </div>
  );
}
