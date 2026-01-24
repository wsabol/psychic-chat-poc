import { FormInput } from '../../../components/forms/FormInput';
import { FormSection } from '../../../components/forms/FormSection';

/**
 * Basic information section - Name and Email
 */
export function BasicInfoSection({ formData, fieldErrors, isTemporaryAccount, handleChange, t }) {
  return (
    <FormSection title={t('personalInfo.title')}>
      <div className="form-grid">
        {!isTemporaryAccount && (
          <>
            <FormInput
              label={t('personalInfo.firstName')}
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              error={fieldErrors.firstName}
              placeholder="John"
            />
            <FormInput
              label={t('personalInfo.lastName')}
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              error={fieldErrors.lastName}
              placeholder="Doe"
            />
          </>
        )}
        <FormInput
          label={t('personalInfo.email')}
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          error={fieldErrors.email}
          placeholder="you@example.com"
        />
      </div>
    </FormSection>
  );
}
