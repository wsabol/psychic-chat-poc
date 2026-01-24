import { FormInput } from '../../../components/forms/FormInput';
import { FormSelect } from '../../../components/forms/FormSelect';
import { FormSection } from '../../../components/forms/FormSection';
import { SEX_OPTIONS } from '../../../utils/personalInfoUtils';

/**
 * Additional Information section - Gender and Address Preference
 */
export function AdditionalInfoSection({ formData, fieldErrors, isTemporaryAccount, handleChange, onLastFieldKeyDown, t }) {
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
        <FormInput
          label="How should the oracle address you?"
          name="addressPreference"
          value={formData.addressPreference}
          onChange={handleChange}
          onKeyDown={onLastFieldKeyDown}
          optional
          placeholder="e.g., Alex, Sarah"
        />
      </div>
    </FormSection>
  );
}
