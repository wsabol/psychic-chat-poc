import React, { useState, useEffect } from 'react';
import '../styles/AuthModals.css';

const SecurityModal = ({ userId, token, onClose }) => {
  const [twoFASettings, setTwoFASettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [enabled, setEnabled] = useState(true);
  const [method, setMethod] = useState('sms');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [backupPhoneNumber, setBackupPhoneNumber] = useState('');

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  // Load 2FA settings
  useEffect(() => {
    loadTwoFASettings();
  }, []);

  const loadTwoFASettings = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/2fa-settings/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTwoFASettings(data.settings);
        setEnabled(data.settings.enabled);
        setMethod(data.settings.method || 'sms');
        setPhoneNumber(data.settings.phone_number || '');
        setBackupPhoneNumber(data.settings.backup_phone_number || '');
      } else {
        setError('Failed to load 2FA settings');
      }
    } catch (err) {
      setError('Failed to load settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (enabled && !phoneNumber.trim()) {
      setError('Phone number is required when 2FA is enabled');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/auth/2fa-settings/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled,
          method,
          phoneNumber: phoneNumber || undefined,
          backupPhoneNumber: backupPhoneNumber || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setTwoFASettings(data.settings);
        setSuccess('2FA settings updated successfully');
                    setEditMode(false);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
};

  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthLabel = () => {
    const labels = [
      { label: 'Very Weak', color: '#ff4444' },
      { label: 'Weak', color: '#ff9944' },
      { label: 'Fair', color: '#ffdd44' },
      { label: 'Good', color: '#99dd44' },
      { label: 'Strong', color: '#44aa44' }
    ];
    return labels[passwordStrength] || labels[0];
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordStrength < 4) {
      setPasswordError('Password does not meet strength requirements');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (!currentPassword.trim()) {
      setPasswordError('Current password is required');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/change-password/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          newPasswordConfirm
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess('Password changed successfully');
        setShowPasswordForm(false);
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
        setPasswordStrength(0);
        setTimeout(() => setPasswordSuccess(''), 3000);
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setPasswordError('Failed to change password: ' + err.message);
    } finally {
      setPasswordLoading(false);
    }
};

  const modalOverlayStyle = {
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
  };

  const modalContentStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose} style={modalOverlayStyle}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={modalContentStyle}>
          <p>Loading security settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={modalOverlayStyle}>
      <div className="modal-content security-modal" onClick={(e) => e.stopPropagation()} style={modalContentStyle}>
        <button className="modal-close" onClick={onClose}>×</button>

        <h2>Account Security</h2>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="security-section">
          <h3>Two-Factor Authentication (2FA)</h3>

          {!editMode ? (
            <>
              <div className="setting-item">
                <div className="setting-label">
                  <strong>Status:</strong>
                  <span className={`status-badge ${enabled ? 'enabled' : 'disabled'}`}>
                    {enabled ? '✓ Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              {enabled && (
                <>
                  <div className="setting-item">
                    <strong>Method:</strong>
                    <span>{method === 'sms' ? 'Text Message (SMS)' : 'Email'}</span>
                  </div>

                  <div className="setting-item">
                    <strong>Phone Number:</strong>
                    <span>{phoneNumber || 'Not set'}</span>
                  </div>

                  {backupPhoneNumber && (
                    <div className="setting-item">
                      <strong>Backup Phone:</strong>
                      <span>{backupPhoneNumber}</span>
                    </div>
                  )}
                </>
              )}

              <p className="security-info">
                Two-factor authentication adds an extra layer of security to your account.
                When enabled, you'll need to enter a code sent to your phone in addition to your password when logging in.
              </p>

              <button
                className="btn-secondary"
                onClick={() => setEditMode(true)}
              >
                Edit Settings
              </button>
            </>
          ) : (
            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    disabled={saving}
                  />
                  <span>Enable Two-Factor Authentication</span>
                </label>
              </div>

              {enabled && (
                <>
                  <div className="form-group">
                    <label>Authentication Method</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          value="sms"
                          checked={method === 'sms'}
                          onChange={(e) => setMethod(e.target.value)}
                          disabled={saving}
                        />
                        <span>Text Message (SMS)</span>
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          value="email"
                          checked={method === 'email'}
                          onChange={(e) => setMethod(e.target.value)}
                          disabled={saving}
                        />
                        <span>Email</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Primary Phone Number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="(123) 456-7890 or +1234567890"
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label>Backup Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={backupPhoneNumber}
                      onChange={(e) => setBackupPhoneNumber(e.target.value)}
                      placeholder="(123) 456-7890 or +1234567890"
                      disabled={saving}
                    />
                    <small>If your primary phone is unavailable</small>
                  </div>
                </>
              )}

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditMode(false);
                    if (twoFASettings) {
                      setEnabled(twoFASettings.enabled);
                      setMethod(twoFASettings.method || 'sms');
                      setPhoneNumber(twoFASettings.phone_number || '');
                      setBackupPhoneNumber(twoFASettings.backup_phone_number || '');
                    }
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="security-section">
          <h3>Password</h3>

          {!showPasswordForm ? (
            <>
              <p>Keep your account secure by changing your password regularly.</p>
              <button
                className="btn-secondary"
                onClick={() => setShowPasswordForm(true)}
              >
                Change Password
              </button>
            </>
          ) : (
            <form onSubmit={handleChangePassword}>
              {passwordError && <div className="error-message">{passwordError}</div>}
              {passwordSuccess && <div className="success-message">{passwordSuccess}</div>}

              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  disabled={passwordLoading}
                  autoComplete="current-password"
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    checkPasswordStrength(e.target.value);
                  }}
                  placeholder="Enter your new password"
                  disabled={passwordLoading}
                  autoComplete="new-password"
                />
                <div className="password-strength">
                  <div className="strength-bar">
                    <div
                      className="strength-fill"
                      style={{
                        width: `${(passwordStrength / 4) * 100}%`,
                        backgroundColor: getPasswordStrengthLabel().color
                      }}
                    ></div>
                  </div>
                  <span style={{ color: getPasswordStrengthLabel().color }}>
                    {getPasswordStrengthLabel().label}
                  </span>
                </div>
                <div className="password-requirements" style={{ fontSize: '12px', marginTop: '0.5rem' }}>
                  <p style={{ margin: '0.25rem 0' }}>Password must contain:</p>
                  <ul style={{ margin: '0.25rem 0', paddingLeft: '1.5rem' }}>
                    <li style={{ color: newPassword.length >= 8 ? '#44aa44' : '#999' }}>
                      {newPassword.length >= 8 ? '✓' : '✗'} At least 8 characters
                    </li>
                    <li style={{ color: /[A-Z]/.test(newPassword) ? '#44aa44' : '#999' }}>
                      {/[A-Z]/.test(newPassword) ? '✓' : '✗'} One uppercase letter
                    </li>
                    <li style={{ color: /[0-9]/.test(newPassword) ? '#44aa44' : '#999' }}>
                      {/[0-9]/.test(newPassword) ? '✓' : '✗'} One number
                    </li>
                    <li style={{ color: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? '#44aa44' : '#999' }}>
                      {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? '✓' : '✗'} One special character
                    </li>
                  </ul>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="Re-enter your new password"
                  disabled={passwordLoading}
                  autoComplete="new-password"
                />
                {newPassword && newPasswordConfirm && newPassword === newPasswordConfirm && (
                  <span style={{ color: '#44aa44', fontSize: '12px' }}>✓ Passwords match</span>
                )}
                {newPassword && newPasswordConfirm && newPassword !== newPasswordConfirm && (
                  <span style={{ color: '#ff4444', fontSize: '12px' }}>✗ Passwords do not match</span>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={passwordLoading || passwordStrength < 4 || newPassword !== newPasswordConfirm}
                >
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setNewPasswordConfirm('');
                    setPasswordStrength(0);
                    setPasswordError('');
                  }}
                  disabled={passwordLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="security-section security-tips">
          <h3>Security Tips</h3>
          <ul>
            <li>Keep your phone number updated in case you need to recover your account</li>
            <li>Use a strong, unique password that you don't use elsewhere</li>
            <li>Don't share your 2FA codes with anyone</li>
            <li>Enable 2FA for the highest level of account protection</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SecurityModal;

