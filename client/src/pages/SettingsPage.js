import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { getAuth } from 'firebase/auth';
import DeleteAccountModal from '../components/settings/DeleteAccountModal';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { clearNonEssentialCookies } from '../utils/cookieManager.js';
import { setAnalyticsEnabled } from '../utils/analyticsTracker.js';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

/**
 * SettingsPage - User privacy and data management settings
 * 
 * Settings include:
 * - Download My Data (JSON export)
 * - Enable/Disable cookies
 * - Clear browsing data
 * - Disable anonymous analytics
 * - Allow email communication
 * - Delete my account (with email verification)
 */
export default function SettingsPage({ userId, token, auth, onboarding }) {
  const { t } = useTranslation();
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Settings state
  const [settings, setSettings] = useState({
    cookiesEnabled: true,
    emailEnabled: true,
    pushNotificationsEnabled: true,
    analyticsEnabled: true,
  });

  // Load settings from database
  const loadSettingsFromDatabase = async () => {
    try {
      const response = await fetch(`${API_URL}/user-settings/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
          // Also sync to localStorage for offline use
          localStorage.setItem('cookiesEnabled', data.settings.cookiesEnabled.toString());
          localStorage.setItem('emailEnabled', data.settings.emailEnabled.toString());
          localStorage.setItem('pushNotificationsEnabled', data.settings.pushNotificationsEnabled.toString());
          localStorage.setItem('analyticsEnabled', data.settings.analyticsEnabled.toString());
        }
      }
    } catch (error) {
      logErrorFromCatch('Error loading settings from database:', error);
      // Fall back to localStorage on error
      setSettings({
        cookiesEnabled: localStorage.getItem('cookiesEnabled') !== 'false',
        emailEnabled: localStorage.getItem('emailEnabled') !== 'false',
        pushNotificationsEnabled: localStorage.getItem('pushNotificationsEnabled') !== 'false',
        analyticsEnabled: localStorage.getItem('analyticsEnabled') !== 'false',
      });
    }
  };

  // Get user email from Firebase and load settings from database
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const authInstance = getAuth();
        const currentUser = authInstance.currentUser;
        if (currentUser && currentUser.email) {
          setUserEmail(currentUser.email);
        }

        // Load settings from database
        if (userId && token) {
          await loadSettingsFromDatabase();
        }
      } catch (error) {
        logErrorFromCatch('Error loading user data:', error);
      }
    };

    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, token]);

  // Download My Data
  const handleDownloadData = async () => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_URL}/user/download-data`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(t('settings.downloadError'));
      }

      const data = await response.json();
      
      // Create JSON file and download
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-data-${new Date().toISOString().split('T')[0]}.json`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: t('settings.downloadSuccess') });
    } catch (error) {
      logErrorFromCatch('Download data error:', error);
      setMessage({ type: 'error', text: error.message || t('settings.downloadError') });
    } finally {
      setIsLoading(false);
    }
  };

  // Clear Browsing Data
  const handleClearBrowsingData = async () => {
    if (!window.confirm(t('settings.clearBrowsingConfirm'))) {
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Clear localStorage items
      localStorage.removeItem('chatHistory');
      localStorage.removeItem('lastVisited');
      
      // Clear sessionStorage
      sessionStorage.clear();

      // Clear IndexedDB if it exists
      if (window.indexedDB) {
        const dbs = await window.indexedDB.databases();
        dbs.forEach(db => window.indexedDB.deleteDatabase(db.name));
      }

      // Clear non-essential cookies (same list as cookieManager enforces)
      clearNonEssentialCookies();

      setMessage({ type: 'success', text: t('settings.clearSuccess') });
    } catch (error) {
      logErrorFromCatch('Clear browsing data error:', error);
      setMessage({ type: 'error', text: error.message || t('settings.clearError') });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle settings and save to database
  const handleToggleSetting = async (settingKey) => {
    const newValue = !settings[settingKey];
    const newSettings = { ...settings, [settingKey]: newValue };
    setSettings(newSettings);
    
    // Save to localStorage immediately for offline use
    localStorage.setItem(settingKey, newValue.toString());

    // Apply side-effects immediately so the change takes effect in the
    // current session — not just on the next page load.
    if (settingKey === 'cookiesEnabled' && !newValue) {
      // User just disabled cookies — purge all non-essential cookies right now
      clearNonEssentialCookies();
    }
    if (settingKey === 'analyticsEnabled') {
      // Update the in-memory flag so isAnalyticsEnabled() reflects the new
      // value immediately (localStorage write alone is not enough because
      // _analyticsEnabled in analyticsTracker takes priority once set).
      setAnalyticsEnabled(newValue);
    }
    
    // Save to database asynchronously
    await saveSettingsToDatabase(newSettings);
  };

  // Save settings to database
  const saveSettingsToDatabase = async (settingsToSave) => {
    if (!userId || !token) return;
    
    try {
      const response = await fetch(`${API_URL}/user-settings/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToSave),
      });

      if (!response.ok) {
        const error = await response.json();
        logErrorFromCatch('Error saving settings:', error);
        setMessage({ 
          type: 'error', 
          text: t('settings.saveError') || 'Failed to save settings'
        });
        // Revert changes on error
        await loadSettingsFromDatabase();
        return;
      }

      const data = await response.json();
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: t('settings.saveSuccess') || 'Settings saved successfully'
        });
        // Clear message after 3 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      logErrorFromCatch('Error saving settings to database:', error);
      setMessage({ 
        type: 'error', 
        text: t('settings.saveError') || 'Failed to save settings'
      });
    }
  };

  // Delete Account
  const handleDeleteAccount = async (verificationCode) => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_URL}/api/user/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationCode,
          userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('settings.deleteError'));
      }

      setMessage({ type: 'success', text: t('settings.deleteSuccess') });
      setShowDeleteModal(false);

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      logErrorFromCatch('Delete account error:', error);
      setMessage({ type: 'error', text: error.message || t('settings.deleteError') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-safe-area" style={{ padding: '0.75rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ marginTop: 0, marginBottom: '0.25rem', fontSize: '24px' }}>
            {t('settings.title')}
          </h1>
          <p style={{ color: '#666', marginBottom: 0, fontSize: '13px' }}>
            {t('settings.subtitle')}
          </p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              borderRadius: '6px',
              backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee',
              color: message.type === 'success' ? '#2e7d32' : '#c62828',
              fontSize: '13px',
              border: `1px solid ${message.type === 'success' ? '#81c784' : '#ef5350'}`,
            }}
          >
            {message.text}
          </div>
        )}

        {/* Settings Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Download My Data */}
          <SettingSection
            icon="📥"
            title={t('settings.downloadMyData')}
            description={t('settings.downloadMyDataDescription')}
            action={
              <button
                onClick={handleDownloadData}
                disabled={isLoading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#7c63d8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? t('settings.downloading') : t('settings.download')}
              </button>
            }
          />

          {/* Cookies */}
          <SettingSection
            icon="🍪"
            title={t('settings.cookies')}
            description={t('settings.cookiesDescription')}
            action={
              <ToggleSwitch
                checked={settings.cookiesEnabled}
                onChange={() => handleToggleSetting('cookiesEnabled')}
                enabledLabel={t('settings.enabled')}
                disabledLabel={t('settings.disabled')}
              />
            }
          />

          {/* Clear Browsing Data */}
          <SettingSection
            icon="🗑️"
            title={t('settings.clearBrowsingData')}
            description={t('settings.clearBrowsingDataDescription')}
            action={
              <button
                onClick={handleClearBrowsingData}
                disabled={isLoading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? t('settings.clearingData') : t('settings.clear')}
              </button>
            }
          />

          {/* Anonymous Analytics */}
          <SettingSection
            icon="📊"
            title={t('settings.anonymousAnalytics')}
            description={t('settings.analyticsDescription')}
            action={
              <ToggleSwitch
                checked={settings.analyticsEnabled}
                onChange={() => handleToggleSetting('analyticsEnabled')}
                enabledLabel={t('settings.enabled')}
                disabledLabel={t('settings.disabled')}
              />
            }
          />

          {/* Email Marketing */}
          <SettingSection
            icon="📧"
            title={t('settings.emailCommunication')}
            description={t('settings.emailDescription')}
            action={
              <ToggleSwitch
                checked={settings.emailEnabled}
                onChange={() => handleToggleSetting('emailEnabled')}
                enabledLabel={t('settings.enabled')}
                disabledLabel={t('settings.disabled')}
              />
            }
          />

          {/* Push Notifications */}
          <SettingSection
            icon="🔔"
            title={t('settings.pushNotifications')}
            description={t('settings.pushNotificationsDescription')}
            action={
              <ToggleSwitch
                checked={settings.pushNotificationsEnabled}
                onChange={() => handleToggleSetting('pushNotificationsEnabled')}
                enabledLabel={t('settings.enabled')}
                disabledLabel={t('settings.disabled')}
              />
            }
          />

          {/* Delete Account */}
          <SettingSection
            icon="⚠️"
            title={t('settings.deleteAccount')}
            description={t('settings.deleteAccountDescription')}
            warning={t('settings.deleteAccountWarning')}
            action={
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                {t('settings.deleteAccount')}
              </button>
            }
          />
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          isOpen={showDeleteModal}
          userEmail={userEmail}
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

/**
 * SettingSection - Reusable component for a settings option
 */
function SettingSection({ icon, title, description, warning, action }) {
  return (
    <div
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '18px' }}>{icon}</span>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>{title}</h3>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', color: '#666', fontSize: '12px' }}>
            {description}
          </p>
          {warning && (
            <p style={{ margin: '0.5rem 0 0 0', color: '#d32f2f', fontSize: '12px', fontWeight: 'bold' }}>
              {warning}
            </p>
          )}
        </div>
        <div>{action}</div>
      </div>
    </div>
  );
}

/**
 * ToggleSwitch - On/off toggle component
 */
function ToggleSwitch({ checked, onChange, enabledLabel = 'Enabled', disabledLabel = 'Disabled' }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: '50px',
        height: '26px',
        borderRadius: '13px',
        border: 'none',
        backgroundColor: checked ? '#7c63d8' : '#ccc',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        position: 'relative',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: checked ? '26px' : '3px',
        paddingRight: checked ? '3px' : '26px',
      }}
      title={checked ? enabledLabel : disabledLabel}
    >
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: 'white',
          transition: 'all 0.3s ease',
        }}
      />
    </button>
  );
}
