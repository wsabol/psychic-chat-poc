/**
 * ActionButtons - Analytics action buttons
 */

import React from 'react';
import { styles, getButtonStyle } from '../admin-styles';

export function ActionButtons({
  isLoading,
  hasReport,
  onFetchReport,
  onExportJSON,
  onCleanupOldData,
  onDeleteAllData,
}) {
  return (
    <div style={styles.buttonGroup}>
      <button
        onClick={onFetchReport}
        disabled={isLoading}
        style={getButtonStyle('primary', isLoading)}
      >
        📊 Load Report
      </button>

      <button
        onClick={onExportJSON}
        disabled={!hasReport || isLoading}
        style={getButtonStyle('success', !hasReport || isLoading)}
      >
        💾 Export JSON
      </button>

      <button
        onClick={onCleanupOldData}
        disabled={isLoading}
        style={getButtonStyle('warning', isLoading)}
      >
        🧹 Cleanup (90+ days)
      </button>

      <button
        onClick={onDeleteAllData}
        disabled={isLoading}
        style={getButtonStyle('danger', isLoading)}
      >
        🗑️ Delete All Data
      </button>
    </div>
  );
}
