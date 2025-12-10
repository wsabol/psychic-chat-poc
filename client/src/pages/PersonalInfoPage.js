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

    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
    const isTemporaryAccount = auth?.isTemporaryAccount;

    // Load personal info on mount
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
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!isTemporaryAccount) {
            if (!formData.firstName.trim()) {
                setError('First name is required');
                setLoading(false);
                return;
            }
            if (!formData.lastName.trim()) {
                setError('Last name is required');
                setLoading(false);
                return;
            }
            if (!formData.sex) {
                setError('Sex is required');
                setLoading(false);
                return;
            }
        }
        
        if (!formData.email.trim()) {
            setError('Email is required');
            setLoading(false);
            return;
        }
        if (!formData.birthDate) {
            setError('Date of birth is required (format: dd-mmm-yyyy, e.g., 09-Feb-1956)');
            setLoading(false);
            return;
        }

        // ✅ Validate birth date format and check age
        const dateValidation = validateBirthDate(formData.birthDate);
        if (!dateValidation.isValid) {
            setError(dateValidation.error);
            setLoading(false);
            return;
        }

        // ✅ Check if user is 18+
        if (!dateValidation.isAdult) {
            setError(dateValidation.error);
            setLoading(false);
            return;
        }

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
                    console.log('[PERSONAL-INFO] Navigating to Horoscope page');
                    onNavigateToPage(4);
                }, 1500);
            } else {
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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
                            <div className="form-group">
                                <label className="form-label">
                                    First Name <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                    className="form-input"
                                    placeholder="John"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Last Name <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                    className="form-input"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">
                            Email <span className="required">*</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="form-input"
                            placeholder="you@example.com"
                        />
                        {isTemporaryAccount && (
                            <p className="form-hint">This temporary email can be changed when you create an account</p>
                        )}
                    </div>
                </section>

                {/* Date & Time of Birth Section - MOVED BEFORE Place of Birth */}
                <section className="form-section">
                    <h3 className="heading-secondary">⏰ Date & Time of Birth</h3>
                    
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">
                                Date of Birth <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                name="birthDate"
                                value={formData.birthDate}
                                onChange={handleChange}
                                required
                                className="form-input"
                                placeholder="dd-mmm-yyyy (e.g., 09-Feb-1956)"
                            />
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
                        <div className="form-group">
                            <label className="form-label">
                                Sex {!isTemporaryAccount && <span className="required">*</span>} {isTemporaryAccount && <span className="optional">(Optional)</span>}
                            </label>
                            <select
                                name="sex"
                                value={formData.sex}
                                onChange={handleChange}
                                required={!isTemporaryAccount}
                                className="form-input form-select"
                            >
                                <option value="">Select...</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Non-binary">Non-binary</option>
                                <option value="Prefer not to say">Prefer not to say</option>
                                <option value="Unspecified">Unspecified</option>
                            </select>
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

                {/* Form Actions */}
                <div className="form-actions">
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                    >
                        {loading ? 'Saving...' : 'Save Information'}
                    </button>
                </div>
            </form>
        </div>
    );
}
