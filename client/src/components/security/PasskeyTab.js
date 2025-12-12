import React, { useState, useEffect } from 'react';

/**
 * PasskeyTab - Manage passkeys using Firebase JustPass.me Extension
 */
export default function PasskeyTab({ userId, token, apiUrl }) {
  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPasskeys();
  }, [userId]);

  const loadPasskeys = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiUrl}/security/passkeys/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load passkeys');
      
      const data = await response.json();
      setPasskeys(data.passkeys || []);
    } catch (err) {
      console.error('[PASSKEY] Error loading passkeys:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPasskey = async () => {
    try {
      setLoading(true);
      // This would be handled by JustPass.me Firebase Extension
      // The extension provides a UI component for adding passkeys
      
      // For now, show a placeholder
      alert('Passkey creation will be handled by Firebase JustPass.me Extension');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePasskey = async (passkeyId) => {
    if (!window.confirm('Remove this passkey? You can add it again later.')) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/security/passkeys/${userId}/${passkeyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to remove passkey');
      setPasskeys(passkeys.filter(p => p.id !== passkeyId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading passkeys...</div>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Passkeys</h2>
      <p style={{ color: '#666' }}>
        Passkeys are a more secure way to sign in. They use your device's fingerprint or face recognition.
      </p>

      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#d32f2f',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={handleAddPasskey}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#7c63d8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          + Add Passkey
        </button>
      </div>

      {passkeys.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#999'
        }}>
          <p>No passkeys set up yet.</p>
          <p style={{ fontSize: '14px' }}>Add a passkey to make signing in faster and more secure.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {passkeys.map(passkey => (
            <div
              key={passkey.id}
              style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>🔐 {passkey.name}</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  Added: {new Date(passkey.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleRemovePasskey(passkey.id)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#1565c0'
      }}>
        <strong>💡 Tip:</strong> Passkeys use industry-standard security standards (FIDO2/WebAuthn) and are powered by Firebase's JustPass.me extension.
      </div>
    </div>
  );
}
