/**
 * TabButton Component
 * Reusable navigation tab button
 */

import { styles } from '../../../styles/errorLogsStyles.js';

export function TabButton({ label, isActive, onClick }) {
  const baseStyle = { ...styles.tabButton };
  const activeStyle = isActive ? styles.tabButtonActive : styles.tabButtonInactive;

  return (
    <button
      onClick={onClick}
      style={{ ...baseStyle, ...activeStyle }}
    >
      {label}
    </button>
  );
}
