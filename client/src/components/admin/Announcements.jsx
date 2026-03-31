/**
 * Announcements — Admin Component
 *
 * Lets admins send broadcast emails to all registered users.
 *
 * Current announcement types:
 *   • App Update — "Starship Psychics has been updated, download on Google Play"
 *                  Sent in each user's preferred language (8 locales).
 *
 * Workflow:
 *   1. Click "Preview (Dry Run)" to see how many users would receive the email.
 *   2. Type the confirmation phrase and click "Send to All Users" to do the live blast.
 */

import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.starshippsychicsmobile';

export default function Announcements({ token }) {
  const [dryRunResult, setDryRunResult]   = useState(null);
  const [sendResult, setSendResult]       = useState(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [sendLoading, setSendLoading]     = useState(false);
  const [confirmText, setConfirmText]     = useState('');

  // ─── Dry run ───────────────────────────────────────────────────────────────
  const handleDryRun = async () => {
    setDryRunLoading(true);
    setDryRunResult(null);
    setSendResult(null);
    try {
      const res = await fetch(`${API_URL}/admin/announcements/send-app-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun: true }),
      });
      const data = await res.json();
      setDryRunResult({ ok: res.ok, data });
    } catch (err) {
      setDryRunResult({ ok: false, data: { error: err.message } });
    } finally {
      setDryRunLoading(false);
    }
  };

  // ─── Live send ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (confirmText !== 'SEND TO ALL') return;
    setSendLoading(true);
    setSendResult(null);
    try {
      const res = await fetch(`${API_URL}/admin/announcements/send-app-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Confirm-Send-All': 'SEND_TO_ALL_USERS',
        },
        body: JSON.stringify({ dryRun: false }),
      });
      const data = await res.json();
      setSendResult({ ok: res.ok, data });
      if (res.ok) setConfirmText('');
    } catch (err) {
      setSendResult({ ok: false, data: { error: err.message } });
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>📣 Announcements</h2>
        <p style={styles.subtitle}>
          Broadcast emails to all registered users. Each email is sent in the user's preferred
          language (English, German, Spanish, French, Italian, Japanese, Portuguese, Chinese).
        </p>
      </div>

      {/* ── App Update Email ─────────────────────────────────────────────── */}
      <div style={styles.card}>
        {/* Card header */}
        <div style={styles.cardHeader}>
          <span style={styles.badge}>📱 Mobile App</span>
          <h3 style={styles.cardTitle}>App Update Notification</h3>
        </div>

        {/* Preview of what the email says */}
        <div style={styles.previewBox}>
          <p style={styles.previewLabel}>Email preview (English):</p>
          <p style={styles.previewSubject}>
            <strong>Subject:</strong> Starship Psychics Has Been Updated – Download the Latest
            Version
          </p>
          <p style={styles.previewBody}>
            "We've been working hard to bring you the best possible psychic chat experience.
            The Starship Psychics app has been updated with exciting new features and
            improvements — and we'd love for you to try them!"
          </p>
          <p style={styles.previewBody}>
            <strong>Button:</strong>{' '}
            <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer" style={styles.link}>
              Download on Google Play ↗
            </a>
          </p>
        </div>

        {/* Recipients — dry run */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Step 1 — Check recipient count</h4>
          <p style={styles.sectionDesc}>
            Run a dry run to see how many users would receive this email without actually sending.
          </p>
          <button
            onClick={handleDryRun}
            disabled={dryRunLoading}
            style={{
              ...styles.button,
              ...styles.buttonSecondary,
              ...(dryRunLoading ? styles.buttonDisabled : {}),
            }}
          >
            {dryRunLoading ? '🔄 Counting…' : '🔍 Preview (Dry Run)'}
          </button>
          {dryRunResult && (
            <div style={dryRunResult.ok ? styles.info : styles.error}>
              {dryRunResult.ok
                ? `👥 ${dryRunResult.data.totalEligibleUsers} registered user(s) would receive this email.`
                : `❌ ${dryRunResult.data.error || dryRunResult.data.message}`}
            </div>
          )}
        </div>

        {/* Confirmation + live send */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Step 2 — Send to all users</h4>
          <p style={styles.sectionDesc}>
            Type <code>SEND TO ALL</code> below then click the send button. This will email
            every user who has completed onboarding, in their own language.
          </p>
          <div style={styles.confirmRow}>
            <input
              type="text"
              placeholder='Type "SEND TO ALL" to confirm'
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              style={styles.input}
            />
            <button
              onClick={handleSend}
              disabled={sendLoading || confirmText !== 'SEND TO ALL'}
              style={{
                ...styles.button,
                ...styles.buttonPrimary,
                ...(sendLoading || confirmText !== 'SEND TO ALL' ? styles.buttonDisabled : {}),
              }}
            >
              {sendLoading ? '📨 Sending…' : '📨 Send to All Users'}
            </button>
          </div>
          {sendResult && (
            <div style={sendResult.ok ? styles.success : styles.error}>
              {sendResult.ok ? (
                <span>
                  ✅ {sendResult.data.message}
                  {sendResult.data.stats && (
                    <span style={styles.statsText}>
                      &nbsp;— {sendResult.data.stats.sent} sent,{' '}
                      {sendResult.data.stats.skipped} skipped,{' '}
                      {sendResult.data.stats.failed} failed
                      {' '}(of {sendResult.data.stats.total} total)
                    </span>
                  )}
                </span>
              ) : (
                `❌ ${sendResult.data.error || sendResult.data.message}`
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div style={styles.infoBox}>
        <h4 style={styles.infoTitle}>ℹ️ Notes</h4>
        <ul style={styles.infoList}>
          <li>Only users who have <strong>completed onboarding</strong> receive the email.</li>
          <li>
            Admin accounts are <strong>excluded</strong> from all email blasts.
          </li>
          <li>
            Each user receives the email in their <strong>preferred language</strong> as set in
            their app preferences. Users with no preference receive the English version.
          </li>
          <li>
            Supported languages: English, German, Spanish, French, Italian, Japanese,
            Portuguese (Brazil), Chinese (Simplified).
          </li>
          <li>
            All sends are recorded in the <strong>audit log</strong> with per-user
            sent/failed/skipped counts.
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
    lineHeight: '1.6',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
  },
  badge: {
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
  },
  previewBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '24px',
  },
  previewLabel: {
    fontSize: '11px',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
    marginTop: 0,
  },
  previewSubject: {
    fontSize: '14px',
    color: '#374151',
    margin: '0 0 8px 0',
  },
  previewBody: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 6px 0',
    lineHeight: '1.6',
    fontStyle: 'italic',
  },
  link: {
    color: '#4f46e5',
  },
  section: {
    borderTop: '1px solid #f3f4f6',
    paddingTop: '20px',
    marginTop: '20px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 6px 0',
  },
  sectionDesc: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 14px 0',
    lineHeight: '1.6',
  },
  confirmRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  input: {
    flex: '1',
    minWidth: '220px',
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
  buttonPrimary:   { backgroundColor: '#4f46e5' },
  buttonSecondary: { backgroundColor: '#6b7280' },
  buttonDisabled:  { opacity: 0.5, cursor: 'not-allowed' },
  statsText: {
    fontSize: '13px',
    color: '#374151',
  },
  success: {
    marginTop: '12px',
    padding: '10px 14px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '6px',
    fontSize: '14px',
  },
  info: {
    marginTop: '12px',
    padding: '10px 14px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
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
