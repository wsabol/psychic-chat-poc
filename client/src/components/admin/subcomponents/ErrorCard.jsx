/**
 * ErrorCard Component
 * Display a single critical error with details and action button
 */

import { styles } from '../../../styles/errorLogsStyles.js';

export function ErrorCard({ error, onResolve }) {
  return (
    <div style={styles.errorCard}>
      <div style={styles.errorCardHeader}>
        <div>
          <h4 style={styles.errorCardTitle}>
            {error.service}
          </h4>
          <p style={styles.errorCardMessage}>
            {error.error_message}
          </p>
        </div>
        <button
          onClick={onResolve}
          style={styles.markResolvedButton}
        >
          ✅ Mark Resolved
        </button>
      </div>
      <div style={styles.errorCardDetails}>
        <div>
          <strong>Time:</strong> {new Date(error.created_at).toLocaleString()}
        </div>
        <div>
          <strong>User:</strong> {error.user_id_hash ? error.user_id_hash.substring(0, 8) + '...' : 'Anonymous'}
        </div>
        {error.context && (
          <div>
            <strong>Context:</strong> {error.context}
          </div>
        )}
      </div>
    </div>
  );
}
