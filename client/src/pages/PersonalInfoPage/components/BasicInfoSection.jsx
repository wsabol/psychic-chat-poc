import { FormInput } from '../../../components/forms/FormInput';
import { FormSection } from '../../../components/forms/FormSection';

/**
 * Basic information section - Familiar Name (how the oracle should address the user)
 */
export function BasicInfoSection({ formData, handleChange, t }) {
  return (
    <FormSection title={t('personalInfo.sections.basic')}>
      <div className="form-grid">
        <FormInput
          label={t('personalInfo.familiarName.label')}
          name="addressPreference"
          value={formData.addressPreference}
          onChange={handleChange}
          optional
          placeholder={t('personalInfo.familiarName.placeholder')}
          hint={t('personalInfo.familiarName.hint')}
        />
      </div>
    </FormSection>
  );
}
