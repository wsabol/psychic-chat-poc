/**
 * Session Management — Admin Component
 *
 * Provides three remote sign-out actions:
 *   1. Revoke by email  — revoke a single user's Firebase sessions
 *   2. Revoke by UID    — same, for when you already have the Firebase UID
 *   3. Revoke all       — mass-revoke every non-admin user (with double-confirm)
 *
 * Once revoked, the affected users are signed out on their very next API call
 * because verifyIdToken now runs with checkRevoked: true on the server.
 */

import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function SessionManagement({ token }) {
  // ── Revoke by email ────────────────────────────────────────────────────────
  const [email, setEmail]           = useState('');
  const [emailResult, setEmailResult] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // ── Revoke by UID ──────────────────────────────────────────────────────────
  const [uid, setUid]               = useState('');
  const [uidResult, setUidResult]   = useState(null);
  const [uidLoading, setUidLoading] = useState(false);

  // ── Revoke all ─────────────────────────────────────────────────────────────
  const [allConfirm, setAllConfirm] = useState('');
  const [allResult, setAllResult]   = useState(null);
  const [allLoading, setAllLoading] = useState(false);

  // ─── Revoke by email ───────────────────────────────────────────────────────
  const handleRevokeByEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailLoading(true);
    setEmailResult(null);
    try {
      const res = await fetch(`${API_URL}/admin/session-management/revoke-by-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      setEmailResult({ ok: res.ok, data });
      if (res.ok) setEmail('');
    } catch (err) {
      setEmailResult({ ok: false, data: { error: err.message } });
    } finally {
      setEmailLoading(false);
    }
  };

  // ─── Revoke by UID ─────────────────────────────────────────────────────────
  const handleRevokeByUid = async (e) => {
    e.preventDefault();
    if (!uid.trim()) return;
    setUidLoading(true);
    setUidResult(null);
    try {
      const res = await fetch(
        `${API_URL}/admin/session-management/revoke-user/${encodeURIComponent(uid.trim())}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        },
      );
      const data = await res.json();
      setUidResult({ ok: res.ok, data });
      if (res.ok) setUid('');
    } catch (err) {
      setUidResult({ ok: false, data: { error: err.message } });
    } finally {
      setUidLoading(false);
    }
  };

  // ─── Revoke all ────────────────────────────────────────────────────────────
  const handleRevokeAll = async () => {
    if (allConfirm !== 'REVOKE ALL') return;
    setAllLoading(true);
    setAllResult(null);
    try {
      const res = await fetch(`${API_URL}/admin/session-management/revoke-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Confirm-Revoke-All': 'REVOKE_ALL_SESSIONS',
        },
      });
      const data = await res.json();
      setAllResult({ ok: res.ok, data });
      if (res.ok) setAllConfirm('');
    } catch (err) {
      setAllResult({ ok: false, data: { error: err.message } });
    } finally {
      setAllLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>🔐 Session Management</h2>
        <p style={styles.subtitle}>
          Remotely revoke Firebase sessions — affected users are signed out on their next API call.
        </p>
      </div>

      {/* ── Revoke by email ───────────────────────────────────────────────── */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Revoke Sessions by Email</h3>
        <p style={styles.cardDesc}>
          Looks up the user's Firebase UID by email address and revokes all their active sessions.
          Use this for the specific accounts you need to sign out immediately.
        </p>
        <form onSubmit={handleRevokeByEmail} style={styles.form}>
          <input
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <button
            type="submit"
            disabled={emailLoading || !email.trim()}
            style={{
              ...styles.button,
              ...styles.buttonWarning,
              ...(emailLoading || !email.trim() ? styles.buttonDisabled : {}),
            }}
          >
            {emailLoading ? 'Revoking…' : '🔒 Revoke Sessions'}
          </button>
        </form>
        {emailResult && (
          <div style={emailResult.ok ? styles.success : styles.error}>
            {emailResult.ok
              ? `✅ ${emailResult.data.message}`
              : `❌ ${emailResult.data.error || emailResult.data.message}`}
          </div>
        )}
      </div>

      {/* ── Revoke by UID ─────────────────────────────────────────────────── */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Revoke Sessions by Firebase UID</h3>
        <p style={styles.cardDesc}>
          Revoke all sessions for a user when you already have their Firebase UID.
        </p>
        <form onSubmit={handleRevokeByUid} style={styles.form}>
          <input
            type="text"
            placeholder="Firebase UID (e.g. abc123xyz)"
            value={uid}
            onChange={e => setUid(e.target.value)}
            style={styles.input}
            required
          />
          <button
            type="submit"
            disabled={uidLoading || !uid.trim()}
            style={{
              ...styles.button,
              ...styles.buttonWarning,
              ...(uidLoading || !uid.trim() ? styles.buttonDisabled : {}),
            }}
          >
            {uidLoading ? 'Revoking…' : '🔒 Revoke Sessions'}
          </button>
        </form>
        {uidResult && (
          <div style={uidResult.ok ? styles.success : styles.error}>
            {uidResult.ok
              ? `✅ ${uidResult.data.message}`
              : `❌ ${uidResult.data.error || uidResult.data.message}`}
          </div>
        )}
      </div>

      {/* ── Revoke all ────────────────────────────────────────────────────── */}
      <div style={{ ...styles.card, ...styles.dangerCard }}>
        <h3 style={styles.cardTitle}>⚠️ Revoke ALL Sessions</h3>
        <p style={styles.cardDesc}>
          Revokes Firebase refresh tokens for <strong>every non-admin user</strong>.
          All users will be signed out on their next API call.
          Type <code>REVOKE ALL</code> in the box below to enable the button.
        </p>
        <div style={styles.form}>
          <input
            type="text"
            placeholder='Type "REVOKE ALL" to confirm'
            value={allConfirm}
            onChange={e => setAllConfirm(e.target.value)}
            style={styles.input}
          />
          <button
            onClick={handleRevokeAll}
            disabled={allLoading || allConfirm !== 'REVOKE ALL'}
            style={{
              ...styles.button,
              ...styles.buttonDanger,
              ...(allLoading || allConfirm !== 'REVOKE ALL' ? styles.buttonDisabled : {}),
            }}
          >
            {allLoading ? 'Revoking all…' : '🔐 Revoke All Sessions'}
          </button>
        </div>
        {allResult && (
          <div style={allResult.ok ? styles.success : styles.error}>
            {allResult.ok ? (
              <>
                ✅ {allResult.data.message}
                {allResult.data.stats && (
                  <span style={{ marginLeft: 12, color: '#666', fontSize: 13 }}>
                    ({allResult.data.stats.revoked} revoked, {allResult.data.stats.failed} failed,{' '}
                    {allResult.data.stats.total} total)
                  </span>
                )}
              </>
            ) : (
              `❌ ${allResult.data.error || allResult.data.message}`
            )}
          </div>
        )}
      </div>

      {/* How it works */}
      <div style={styles.infoBox}>
        <h4 style={styles.infoTitle}>ℹ️ How It Works</h4>
        <ul style={styles.infoList}>
          <li>
            <strong>Instant effect:</strong> Firebase refresh tokens are revoked immediately.
            Because the API uses <code>checkRevoked: true</code>, existing ID tokens are also
            rejected on the very next API call — users do not have to wait for the 1-hour
            natural token expiry.
          </li>
          <li>
            <strong>What the user sees:</strong> On their next action, the app receives a 401,
            fails to refresh the token, clears local storage, and returns them to the Login screen.
          </li>
          <li>
            <strong>Subscription bypass:</strong> When a revoked user logs in again, the
            subscription check runs automatically. If they have no subscription, they are
            blocked and routed back to the subscription screen.
          </li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
  },
  dangerCard: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff5f5',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 0,
    marginBottom: '8px',
  },
  cardDesc: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '16px',
    lineHeight: '1.6',
  },
  form: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  input: {
    flex: '1',
    minWidth: '240px',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  button: {
    padding: '10px 20px',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  buttonWarning: { backgroundColor: '#f59e0b' },
  buttonDanger:  { backgroundColor: '#dc2626' },
  buttonDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  success: {
    marginTop: '12px',
    padding: '10px 14px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '6px',
    fontSize: '14px',
  },
  error: {
    marginTop: '12px',
    padding: '10px 14px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '14px',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #bfdbfe',
  },
  infoTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e40af',
    marginTop: 0,
    marginBottom: '10px',
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#1e40af',
    fontSize: '13px',
    lineHeight: '2',
  },
};
