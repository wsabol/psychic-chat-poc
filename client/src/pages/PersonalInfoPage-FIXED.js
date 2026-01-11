import { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { getAstrologyFromBirthDate, getZodiacSignFromDate } from '../utils/astroUtils';
import { COUNTRIES } from '../data/countries';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';
import { validateBirthDate } from '../utils/dateValidator';
import { FormInput } from '../components/forms/FormInput';
import { FormSelect } from '../components/forms/FormSelect';
import { FormSection } from '../components/forms/FormSection';
import '../styles/responsive.css';
import './PersonalInfoPage.css';

function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    try {
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        const year = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = String(parts[2]).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[monthIndex];
        if (!month) return dateString;
        return `${day}-${month}-${year}`;
    } catch (e) {
        return dateString;
    }
}

function parseDateForStorage(dateString) {
    if (!dateString) return '';
    try {
        const months = {
            'jan': '01', 'january': '01', 'feb': '02', 'february': '02', 'mar': '03', 'march': '03',
            'apr': '04', 'april': '04', 'may': '05', 'jun': '06', 'june': '06', 'jul': '07', 'july': '07',
            'aug': '08', 'august': '08', 'sep': '09', 'sept': '09', 'september': '09',
            'oct': '10', 'october': '10', 'nov': '11', 'november': '11', 'dec': '12', 'december': '12'
        };
        const parts = dateString.trim().split(/[\s\-\/]+/);
        if (parts.length !== 3) return dateString;
        const day = parseInt(parts[0].trim(), 10);
        const monthStr = parts[1].trim().toLowerCase();
        const month = months[monthStr];
        const year = parseInt(parts[2].trim(), 10);
        if (!month) return dateString;
        const paddedDay = day.toString().padStart(2, '0');
        return `${year}-${month}-${paddedDay}`;
    } catch (e) {
        return dateString;
    }
}

const SEX_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Unspecified'];

export default function PersonalInfoPage({ userId, token, auth, onNavigateToPage, onboarding }) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', birthCountry: '', birthProvince: '',
        birthCity: '', birthDate: '', birthTime: '', sex: '', addressPreference: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
    const isTemporaryAccount = auth?.isTemporaryAccount;

    useEffect(() => {
        fetchPersonalInfo();
    }, [userId, token]);

    const fetchPersonalInfo = async () => {
        try {
            const response = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}`, {
                headers: { 'Authorization': token ? `Bearer ${token}` : '' }
            });
            if (!response.ok) throw new Error('Failed to fetch personal info');
            const data = await response.json();
            if (data && data.first_name) {
                setFormData({
                    firstName: data.first_name || '',
                    lastName: data.last_name || '',
                    email: data.email || (isTemporaryAccount ? 'tempuser@example.com' : ''),
                    birthCountry: data.birth_country || '',
                    birthProvince: data.birth_province || '',
                    birthCity: data.birth_city || '',
                    birthDate: formatDateForDisplay(data.birth_date) || '',
                    birthTime: data.birth_time || '',
                    sex: data.sex || '',
                    addressPreference: data.address_preference || ''
                });
            } else if (isTemporaryAccount) {
                setFormData(prev => ({ ...prev, email: 'tempuser@example.com' }));
            }
        } catch (err) {
            console.error('[PERSONAL-INFO] Error fetching data:', err);
            if (isTemporaryAccount) {
                setFormData(prev => ({ ...prev, email: 'tempuser@example.com' }));
            }
        }
    };

    const savePersonalInfo = async (dataToSend) => {
        const response = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(dataToSend)
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to save personal information');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        const errors = validateFields();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setError(t('personalInfo.errors.missingRequired'));
            return;
        }
        setLoading(true);
        setFieldErrors({});

        try {
            const storageBirthDate = parseDateForStorage(formData.birthDate);
            let astrologyData = null;
            let zodiacSign = null;
            if (storageBirthDate) {
                zodiacSign = getZodiacSignFromDate(storageBirthDate);
                astrologyData = getAstrologyFromBirthDate(storageBirthDate);
            }

            let dataToSend = {
                ...formData,
                birthDate: storageBirthDate,
                zodiacSign: zodiacSign,
                astrologyData: astrologyData
            };

            if (isTemporaryAccount) {
                dataToSend.firstName = dataToSend.firstName || 'Seeker';
                dataToSend.lastName = dataToSend.lastName || 'Soul';
                dataToSend.sex = dataToSend.sex || 'Unspecified';
            }

            await savePersonalInfo(dataToSend);

            // CALL SYNC-CALCULATE WITH PROPER POST REQUEST
            if (isTemporaryAccount && formData.birthCountry && formData.birthProvince && formData.birthCity && formData.birthTime) {
                try {
                    const resp = await fetch(`${API_URL}/astrology/sync-calculate/${userId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': token ? `Bearer ${token}` : ''
                        },
                        body: JSON.stringify({})
                    });
                } catch (err) {
                    console.error('🔮 Error:', err);
                }
            }

            setSuccess(true);

            if (onboarding?.updateOnboardingStep) {
                try {
                    await onboarding.updateOnboardingStep('personal_info');
                } catch (err) {
                    console.error('[PERSONALINFO] Failed to update personal info step:', err);
                }
            }

            if (isTemporaryAccount && onNavigateToPage) {
                setTimeout(() => {
                    onNavigateToPage(5);
                }, 1500);
            } else {
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (err) {
            console.error('[SUBMIT] Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const validateFields = () => {
        const errors = {};
        if (!isTemporaryAccount) {
            if (!formData.firstName.trim()) errors.firstName = t('personalInfo.errors.missingRequired');
            if (!formData.lastName.trim()) errors.lastName = t('personalInfo.errors.missingRequired');
            if (!formData.sex) errors.sex = t('personalInfo.errors.missingRequired');
        }
        if (!formData.email.trim()) errors.email = t('personalInfo.errors.missingRequired');
        if (!formData.birthDate) {
            errors.birthDate = t('personalInfo.errors.invalidBirthDate');
        } else {
            const dateValidation = validateBirthDate(formData.birthDate);
            if (!dateValidation.isValid) errors.birthDate = dateValidation.error;
            else if (!dateValidation.isAdult) errors.birthDate = dateValidation.error;
        }
        return errors;
    };

    return (
        <div className="page-safe-area personal-info-page">
            <div className="info-header">
                <h2 className="heading-primary">👤 {t('personalInfo.title')}</h2>
                <p className="info-subtitle">{t('personalInfo.title')}</p>
            </div>
            {error && <div className="form-error-alert">{error}</div>}
            {success && <div className="form-success-alert">✓ {t('common.saved')}</div>}
            <form onSubmit={handleSubmit} className="info-form">
                <FormSection title={t('personalInfo.title')}>
                    <div className="form-grid">
                        {!isTemporaryAccount && (
                            <>
                                <FormInput label={t('personalInfo.firstName')} name="firstName" value={formData.firstName} onChange={handleChange} required error={fieldErrors.firstName} placeholder="John" />
                                <FormInput label={t('personalInfo.lastName')} name="lastName" value={formData.lastName} onChange={handleChange} required error={fieldErrors.lastName} placeholder="Doe" />
                            </>
                        )}
                        <FormInput label={t('personalInfo.email')} name="email" type="email" value={formData.email} onChange={handleChange} required error={fieldErrors.email} placeholder="you@example.com" hint={isTemporaryAccount ? t('personalInfo.title') : null} />
                    </div>
                </FormSection>
                <FormSection title={t('personalInfo.birthDate')} icon="⏰">
                    <div className="form-grid">
                        <FormInput label={t('personalInfo.birthDate')} name="birthDate" value={formData.birthDate} onChange={handleChange} required error={fieldErrors.birthDate} placeholder="dd-mmm-yyyy (e.g., 09-Feb-1956)" />
                        <FormInput label={t('personalInfo.birthTime')} name="birthTime" type="time" value={formData.birthTime} onChange={handleChange} optional />
                    </div>
                </FormSection>
                <FormSection title={t('personalInfo.birthLocation')} icon="📍">
                    <div className="form-grid">
                        <FormSelect label={t('personalInfo.birthCountry')} name="birthCountry" value={formData.birthCountry} onChange={handleChange} options={COUNTRIES} optional placeholder="-- Select Country --" />
                        <FormInput label={t('personalInfo.birthProvince')} name="birthProvince" value={formData.birthProvince} onChange={handleChange} optional placeholder="e.g., California" />
                    </div>
                    <FormInput label={t('personalInfo.birthCity')} name="birthCity" value={formData.birthCity} onChange={handleChange} optional placeholder="e.g., New York" />
                </FormSection>
                <FormSection title={t('personalInfo.title')} icon="✨">
                    <div className="form-grid">
                        <FormSelect label={t('personalInfo.gender')} name="sex" value={formData.sex} onChange={handleChange} options={SEX_OPTIONS} required={!isTemporaryAccount} optional={isTemporaryAccount} error={fieldErrors.sex} />
                        <FormInput label="How should the oracle address you?" name="addressPreference" value={formData.addressPreference} onChange={handleChange} optional placeholder="e.g., Alex, Sarah" />
                    </div>
                </FormSection>
            </form>
            <button type="submit" onClick={handleSubmit} disabled={loading} className="floating-save-button" title={loading ? 'Processing...' : 'Save Information'}>
                <span className="bubble-icon">{loading ? '⏳' : '💾'}</span>
                <span className="bubble-text">{loading ? t('common.saving') : t('common.save')}</span>
            </button>
            {success && <div className="floating-feedback-bubble floating-success">✓ {t('common.saved')}</div>}
        </div>
    );
}

