/**
 * TabButton - Navigation tab button
 */

import React from 'react';
import { getTabButtonStyle } from '../admin-styles';

export function TabButton({ label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={getTabButtonStyle(isActive)}
    >
      {label}
    </button>
  );
}
