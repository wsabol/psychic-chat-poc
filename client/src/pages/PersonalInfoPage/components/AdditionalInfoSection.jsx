import { FormSelect } from '../../../components/forms/FormSelect';
import { FormSection } from '../../../components/forms/FormSection';
import { SEX_OPTIONS } from '../../../utils/personalInfoUtils';

/**
 * Additional Information section - Gender/Sex
 */
export function AdditionalInfoSection({ formData, fieldErrors, isTemporaryAccount, handleChange, t }) {
  return (
    <FormSection title={t('personalInfo.title')} icon="✨">
      <div className="form-grid">
        <FormSelect
          label={t('personalInfo.gender')}
          name="sex"
          value={formData.sex}
          onChange={handleChange}
          options={SEX_OPTIONS}
          required={!isTemporaryAccount}
          optional={isTemporaryAccount}
          error={fieldErrors.sex}
        />
      </div>
    </FormSection>
  );
}
