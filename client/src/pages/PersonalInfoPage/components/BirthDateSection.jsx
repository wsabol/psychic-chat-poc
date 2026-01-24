import { FormInput } from '../../../components/forms/FormInput';
import { FormSection } from '../../../components/forms/FormSection';

/**
 * Birth Date and Time section
 */
export function BirthDateSection({ formData, fieldErrors, handleChange, t }) {
  return (
    <FormSection title={t('personalInfo.birthDate')} icon="⏰">
      <div className="form-grid">
        <FormInput
          label={t('personalInfo.birthDate')}
          name="birthDate"
          value={formData.birthDate}
          onChange={handleChange}
          required
          error={fieldErrors.birthDate}
          placeholder="dd-mmm-yyyy (e.g., 09-Feb-1956)"
          hint={t('personalInfo.birthDateHint')}
        />
        <FormInput
          label={t('personalInfo.birthTime')}
          name="birthTime"
          type="time"
          value={formData.birthTime}
          onChange={handleChange}
          optional
          hint={t('personalInfo.birthTimeHint')}
        />
      </div>
    </FormSection>
  );
}
