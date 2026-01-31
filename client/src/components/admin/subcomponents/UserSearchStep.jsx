/**
 * User Search Step Component
 * Step 1: Find user by email address
 */

import React from 'react';
import styles from '../LegalDataRequests.module.css';

/**
 * @param {Object} props
 * @param {string} props.email - Email input value
 * @param {function} props.setEmail - Email setter function
 * @param {function} props.onSubmit - Form submit handler
 * @param {boolean} props.isLoading - Loading state
 * @param {Object|null} props.userInfo - Found user information
 */
export function UserSearchStep({ email, setEmail, onSubmit, isLoading, userInfo }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Step 1: Find User by Email</h3>
      <form onSubmit={onSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>User Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className={styles.input}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !email}
          className={`${styles.button} ${styles.primaryButton}`}
          style={{
            opacity: (isLoading || !email) ? 0.6 : 1,
            cursor: (isLoading || !email) ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '🔍 Searching...' : '🔍 Find User'}
        </button>
      </form>

      {userInfo && <UserInfoDisplay userInfo={userInfo} />}
    </div>
  );
}

/**
 * User Information Display Component
 */
function UserInfoDisplay({ userInfo }) {
  return (
    <div className={styles.userInfoBox}>
      <h4 className={styles.userInfoTitle}>User Information</h4>
      <div className={styles.infoGrid}>
        <InfoRow label="User ID" value={userInfo.user_id} />
        <InfoRow label="Email" value={userInfo.email} />
        <InfoRow label="Name" value={`${userInfo.first_name} ${userInfo.last_name}`} />
        <InfoRow label="Subscription" value={userInfo.subscription_status || 'N/A'} />
        <InfoRow label="Suspended" value={userInfo.is_suspended ? 'Yes' : 'No'} />
        <InfoRow label="Created" value={new Date(userInfo.created_at).toLocaleDateString()} />
      </div>
    </div>
  );
}

/**
 * Info Row Component
 */
function InfoRow({ label, value }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}:</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}

export default UserSearchStep;
