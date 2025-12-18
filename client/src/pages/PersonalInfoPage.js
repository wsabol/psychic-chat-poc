import { useState, useEffect } from 'react';
import { getAstrologyFromBirthDate, getZodiacSignFromDate } from '../utils/astroUtils';
import { COUNTRIES } from '../data/countries';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';
import { validateBirthDate } from '../utils/dateValidator';
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
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const parts = dateString.trim().split('-');
        if (parts.length !== 3) return dateString;
        
        const day = parts[0].trim().padStart(2, '0');
        const monthStr = parts[1].trim();
        const month = months[monthStr];
        const year = parts[2].trim();
        
        if (!month) {
            return dateString;
        }
        return `${year}-${month}-${day}`;
    } catch (e) {
        return dateString;
    }
}

export default function PersonalInfoPage({ userId, token, auth, onNavigateToPage }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        birthCountry: '',
        birthProvince: '',
        birthCity: '',
        birthDate: '',
        birthTime: '',
        sex: '',
        addressPreference: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
    const isTemporaryAccount = auth?.isTemporaryAccount;

    useEffect(() => {
        fetchPersonalInfo();
    }, [userId, token]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchPersonalInfo = async () => {
        try {
            const response = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}`, { 
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
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
                setFormData(prev => ({
                    ...prev,
                    email: 'tempuser@example.com'
                }));
            }
        } catch (err) {
            console.error('[PERSONAL-INFO] Error fetching data:', err);
            if (isTemporaryAccount) {
                setFormData(prev => ({
                    ...prev,
                    email: 'tempuser@example.com'
                }));
            }
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const validateFields = () => {
        const errors = {};

        if (!isTemporaryAccount) {
            if (!formData.firstName.trim()) {
                errors.firstName = 'First name is required';
            }
            if (!formData.lastName.trim()) {
                errors.lastName = 'Last name is required';
            }
            if (!formData.sex) {
                errors.sex = 'Sex is required';
            }
        }
        
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        }
        if (!formData.birthDate) {
            errors.birthDate = 'Date of birth is required (format: dd-mmm-yyyy, e.g., 09-Feb-1956)';
        } else {
            const dateValidation = validateBirthDate(formData.birthDate);
            if (!dateValidation.isValid) {
                errors.birthDate = dateValidation.error;
            } else if (!dateValidation.isAdult) {
                errors.birthDate = dateValidation.error;
            }
        }

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const errors = validateFields();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setError('Please complete all required fields marked in red');
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
            
            setSuccess(true);
            if (isTemporaryAccount && onNavigateToPage) {
                setTimeout(() => {
                    onNavigateToPage(4);
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

    const hasFieldError = (fieldName) => !!fieldErrors[fieldName];

    return (
        <div className="page-safe-area personal-info-page">
            <div className="info-header">
                <h2 className="heading-primary">👤 Personal Information</h2>
                <p className="info-subtitle">Tell us about yourself so we can personalize your experience</p>
            </div>

            {error && <div className="form-error-alert">{error}</div>}
            {success && <div className="form-success-alert">✓ Saved successfully!</div>}

            <form onSubmit={handleSubmit} className="info-form">
                {/* Basic Information Section */}
                <section className="form-section">
                    <h3 className="heading-secondary">Basic Information</h3>
                    
                    {!isTemporaryAccount && (
                        <div className="form-grid">
                            <div className={`form-group ${hasFieldError('firstName') ? 'form-group-error' : ''}`}>
                                <label className="form-label">
                                    First Name <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                    className={`form-input ${hasFieldError('firstName') ? 'form-input-error' : ''}`}
                                    placeholder="John"
                                />
                                {hasFieldError('firstName') && (
                                    <span className="field-error-message">{fieldErrors.firstName}</span>
                                )}
                            </div>

                            <div className={`form-group ${hasFieldError('lastName') ? 'form-group-error' : ''}`}>
                                <label className="form-label">
                                    Last Name <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                    className={`form-input ${hasFieldError('lastName') ? 'form-input-error' : ''}`}
                                    placeholder="Doe"
                                />
                                {hasFieldError('lastName') && (
                                    <span className="field-error-message">{fieldErrors.lastName}</span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={`form-group ${hasFieldError('email') ? 'form-group-error' : ''}`}>
                        <label className="form-label">
                            Email <span className="required">*</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className={`form-input ${hasFieldError('email') ? 'form-input-error' : ''}`}
                            placeholder="you@example.com"
                        />
                        {hasFieldError('email') && (
                            <span className="field-error-message">{fieldErrors.email}</span>
                        )}
                        {isTemporaryAccount && !hasFieldError('email') && (
                            <p className="form-hint">This temporary email can be changed when you create an account</p>
                        )}
                    </div>
                </section>

                {/* Date & Time of Birth Section */}
                <section className="form-section">
                    <h3 className="heading-secondary">⏰ Date & Time of Birth</h3>
                    
                    <div className="form-grid">
                        <div className={`form-group ${hasFieldError('birthDate') ? 'form-group-error' : ''}`}>
                            <label className="form-label">
                                Date of Birth <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                name="birthDate"
                                value={formData.birthDate}
                                onChange={handleChange}
                                required
                                className={`form-input ${hasFieldError('birthDate') ? 'form-input-error' : ''}`}
                                placeholder="dd-mmm-yyyy (e.g., 09-Feb-1956)"
                            />
                            {hasFieldError('birthDate') && (
                                <span className="field-error-message">{fieldErrors.birthDate}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Time of Birth <span className="optional">(Optional)</span>
                            </label>
                            <input
                                type="time"
                                name="birthTime"
                                value={formData.birthTime}
                                onChange={handleChange}
                                className="form-input"
                            />
                        </div>
                    </div>
                </section>

                {/* Place of Birth Section */}
                <section className="form-section">
                    <h3 className="heading-secondary">📍 Place of Birth</h3>
                    
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">
                                Country <span className="optional">(Optional)</span>
                            </label>
                            <select
                                name="birthCountry"
                                value={formData.birthCountry}
                                onChange={handleChange}
                                className="form-input form-select"
                            >
                                <option value="">-- Select Country --</option>
                                {COUNTRIES.map((country, idx) => (
                                    <option key={idx} value={country}>{country}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                State / Province <span className="optional">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                name="birthProvince"
                                value={formData.birthProvince}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g., California"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            City <span className="optional">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            name="birthCity"
                            value={formData.birthCity}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="e.g., New York"
                        />
                    </div>
                </section>

                {/* Additional Information Section */}
                <section className="form-section">
                    <h3 className="heading-secondary">✨ Additional Information</h3>
                    
                    <div className="form-grid">
                        <div className={`form-group ${hasFieldError('sex') ? 'form-group-error' : ''}`}>
                            <label className="form-label">
                                Sex {!isTemporaryAccount && <span className="required">*</span>} {isTemporaryAccount && <span className="optional">(Optional)</span>}
                            </label>
                            <select
                                name="sex"
                                value={formData.sex}
                                onChange={handleChange}
                                required={!isTemporaryAccount}
                                className={`form-input form-select ${hasFieldError('sex') ? 'form-input-error' : ''}`}
                            >
                                <option value="">Select...</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Non-binary">Non-binary</option>
                                <option value="Prefer not to say">Prefer not to say</option>
                                <option value="Unspecified">Unspecified</option>
                            </select>
                            {hasFieldError('sex') && (
                                <span className="field-error-message">{fieldErrors.sex}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                How should the oracle address you? <span className="optional">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                name="addressPreference"
                                value={formData.addressPreference}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g., Alex, Sarah"
                            />
                        </div>
                    </div>
                </section>
            </form>

            {/* Floating Save Button Bubble */}
            <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading}
                className="floating-save-button"
                title={loading ? 'Processing...' : 'Save Information'}
            >
                <span className="bubble-icon">{loading ? '⏳' : '💾'}</span>
                <span className="bubble-text">{loading ? 'Saving...' : 'Save'}</span>
            </button>

            {/* Floating Success Bubble */}
            {success && (
                <div className="floating-feedback-bubble floating-success">
                    ✓ Saved!
                </div>
            )}
        </div>
    );
}
