import { FormInput } from '../../../components/forms/FormInput';
import { FormSelect } from '../../../components/forms/FormSelect';
import { FormSection } from '../../../components/forms/FormSection';
import { COUNTRIES } from '../../../data/countries';

/**
 * Birth Location section - Country, Province, City
 */
export function BirthLocationSection({ formData, handleChange, t }) {
  return (
    <FormSection title={t('personalInfo.birthLocation')} icon="📍">
      <div className="form-grid">
        <FormSelect
          label={t('personalInfo.birthCountry')}
          name="birthCountry"
          value={formData.birthCountry}
          onChange={handleChange}
          options={COUNTRIES}
          optional
          placeholder="-- Select Country --"
          hint={t('personalInfo.birthCountryHint')}
        />
        <FormInput
          label={t('personalInfo.birthProvince')}
          name="birthProvince"
          value={formData.birthProvince}
          onChange={handleChange}
          optional
          placeholder="e.g., California"
          hint={t('personalInfo.birthProvinceHint')}
        />
      </div>
      <FormInput
        label={t('personalInfo.birthCity')}
        name="birthCity"
        value={formData.birthCity}
        onChange={handleChange}
        optional
        placeholder="e.g., New York"
        hint={t('personalInfo.birthCityHint')}
      />
    </FormSection>
  );
}
