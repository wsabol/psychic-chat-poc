import React, { useState, useEffect } from 'react';
import { getAstrologyFromBirthDate, getZodiacSignFromDate } from '../utils/astroUtils';

// Helper function to format date from YYYY-MM-DD to dd-mmm-yyyy
function formatDateForDisplay(dateString) {
    // dateString expected to be YYYY-MM-DD — parse manually to avoid timezone shifts
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
        console.error('formatDateForDisplay error', e, dateString);
        return dateString;
    }
}

// Helper function to parse date from dd-mmm-yyyy to YYYY-MM-DD
function parseDateForStorage(dateString) {
    if (!dateString) return '';
    try {
        const months = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
        const parts = dateString.trim().split('-');
        if (parts.length !== 3) return dateString;
        
        const day = parts[0].trim().padStart(2, '0');
        const monthStr = parts[1].trim();
        const month = months[monthStr];
        const year = parts[2].trim();
        
        if (!month) {
            console.error(`Invalid month: ${monthStr}`);
            return dateString;
        }
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error('Date parsing error:', e, dateString);
        return dateString;
    }
}

function PersonalInfoModal({ userId, isOpen, onClose, onSave }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        birthCountry: '',
        birthProvince: '',
        birthCity: '',
        birthDate: '',
        birthTime: '',
        birthTimezone: '',
        sex: '',
        addressPreference: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

    useEffect(() => {
        if (isOpen) {
            fetchPersonalInfo();
            setSuccess(false);
        }
    }, [isOpen, userId]);

    const fetchPersonalInfo = async () => {
        try {
            const response = await fetch(`${API_URL}/user-profile/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch personal info');
            const data = await response.json();
            if (data && data.first_name) {
                setFormData({
                    firstName: data.first_name || '',
                    lastName: data.last_name || '',
                    email: data.email || '',
                    birthCountry: data.birth_country || '',
                    birthProvince: data.birth_province || '',
                    birthCity: data.birth_city || '',
                    birthDate: formatDateForDisplay(data.birth_date) || '',
                    birthTime: data.birth_time || '',
                    birthTimezone: data.birth_timezone || '',
                    sex: data.sex || '',
                    addressPreference: data.address_preference || ''
                });
            }
        } catch (err) {
            console.error('Error fetching personal info:', err);
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

        // Validate required fields
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
        if (!formData.sex) {
            setError('Sex is required');
            setLoading(false);
            return;
        }

        try {
            // Convert date format from display format to storage format
            const storageBirthDate = parseDateForStorage(formData.birthDate);
            
            // Get astrology data if birth date is provided
            let astrologyData = null;
            let zodiacSign = null;
            if (storageBirthDate) {
                zodiacSign = getZodiacSignFromDate(storageBirthDate);
                astrologyData = getAstrologyFromBirthDate(storageBirthDate);
            }

            const dataToSend = {
                ...formData,
                birthDate: storageBirthDate,
                zodiacSign: zodiacSign,
                astrologyData: astrologyData
            };

            const response = await fetch(`${API_URL}/user-profile/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend)
            });

            if (!response.ok) throw new Error('Failed to save personal information');
            
            // Trigger astrology calculation if birth data is complete
            if (formData.birthCountry && formData.birthCity && formData.birthDate && formData.birthTime) {
                try {
                    await fetch(`${API_URL}/user-astrology/calculate/${userId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    console.log('[PersonalInfoModal] Triggered astrology calculation');
                } catch (e) {
                    console.warn('[PersonalInfoModal] Could not trigger astrology calculation:', e);
                }
            }
            
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            if (onSave) {
                onSave();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Personal Information</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {error && <p style={{ color: 'red', marginBottom: '1rem' }}>Error: {error}</p>}
                {success && <p style={{ color: 'green', marginBottom: '1rem' }}>✓ Saved successfully!</p>}

                <form onSubmit={handleSubmit}>
                    {/* PERSONAL INFO SECTION - FIRST */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>First Name <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Last Name <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Email <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        />
                    </div>

                    {/* LOCATION SECTION - AFTER EMAIL */}
                    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>📍 Place of Birth</h3>
                        
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Country <span style={{ color: '#999', fontSize: '12px' }}>(Optional)</span></label>
                            <input
                                type="text"
                                name="birthCountry"
                                value={formData.birthCountry}
                                onChange={handleChange}
                                placeholder="e.g., United States, Canada, Japan"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>State / Province <span style={{ color: '#999', fontSize: '12px' }}>(Optional)</span></label>
                            <input
                                type="text"
                                name="birthProvince"
                                value={formData.birthProvince}
                                onChange={handleChange}
                                placeholder="e.g., California, Ontario, Tokyo"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>City <span style={{ color: '#999', fontSize: '12px' }}>(Optional)</span></label>
                            <input
                                type="text"
                                name="birthCity"
                                value={formData.birthCity}
                                onChange={handleChange}
                                placeholder="e.g., New York, Toronto, Tokyo"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    {/* BIRTH TIME SECTION - AFTER LOCATION */}
                    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>⏰ Time & Date of Birth</h3>
                        
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Date of Birth <span style={{ color: 'red' }}>*</span></label>
                            <input
                                type="text"
                                name="birthDate"
                                value={formData.birthDate}
                                onChange={handleChange}
                                placeholder="dd-mmm-yyyy (e.g., 09-Feb-1956)"
                                required
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Time of Birth <span style={{ color: '#999', fontSize: '12px' }}>(Optional - for accurate rising/moon signs)</span></label>
                            <input
                                type="time"
                                name="birthTime"
                                value={formData.birthTime}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Timezone <span style={{ color: '#999', fontSize: '12px' }}>(Auto-detected from location, or override)</span></label>
                            <input
                                type="text"
                                name="birthTimezone"
                                value={formData.birthTimezone}
                                onChange={handleChange}
                                placeholder="e.g., America/New_York, Europe/London"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '12px' }}
                            />
                            <p style={{ marginTop: '0.25rem', fontSize: '11px', color: '#666' }}>Leave blank to auto-detect from country/city</p>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Sex <span style={{ color: 'red' }}>*</span></label>
                        <select
                            name="sex"
                            value={formData.sex}
                            onChange={handleChange}
                            required
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        >
                            <option value="">Select...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Non-binary">Non-binary</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>How should the oracle address you? <span style={{ color: '#999', fontSize: '12px' }}>(Optional)</span></label>
                        <input
                            type="text"
                            name="addressPreference"
                            value={formData.addressPreference}
                            onChange={handleChange}
                            placeholder="e.g., Alex, Sarah, Your Majesty, etc."
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                backgroundColor: '#9370db',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold'
                            }}
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                backgroundColor: '#ddd',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default PersonalInfoModal;
