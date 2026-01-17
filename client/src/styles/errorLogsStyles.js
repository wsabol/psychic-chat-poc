/**
 * Error Logs Report Styling Constants
 * Centralized theme and style objects for consistency
 */

export const colors = {
  critical: '#d32f2f',
  critical_bg: '#ffebee',
  critical_border: '#ef5350',
  warning: '#e65100',
  warning_bg: '#fff3e0',
  success: '#2e7d32',
  success_bg: '#e8f5e9',
  success_border: '#81c784',
  primary: '#7c63d8',
  text_dark: '#333',
  text_light: '#666',
  text_muted: '#999',
  border_light: '#eee',
  border_medium: '#ddd',
  border_dark: '#e0e0e0',
  bg_light: '#f9f9f9',
  bg_white: '#ffffff',
  bg_header: '#f5f5f5',
  error_text: '#c62828',
};

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  xxl: '2rem',
};

export const borderRadius = {
  sm: '3px',
  md: '4px',
  lg: '6px',
};

export const fontSize = {
  xs: '10px',
  sm: '11px',
  md: '12px',
  lg: '13px',
  xl: '16px',
};

export const styles = {
  container: {
    marginTop: spacing.xl,
  },

  tabsContainer: {
    display: 'flex',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    borderBottom: `2px solid ${colors.border_dark}`,
  },

  headerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  headerTitle: {
    margin: 0,
    fontSize: fontSize.xl,
    color: 'white',
  },

  refreshButton: {
    padding: `${spacing.sm} ${spacing.lg}`,
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },

  errorMessage: {
    backgroundColor: colors.critical_bg,
    border: `1px solid ${colors.critical_border}`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    color: colors.error_text,
    fontSize: fontSize.md,
  },

  loadingContainer: {
    textAlign: 'center',
    padding: spacing.xxl,
    color: colors.text_muted,
  },

  errorCardsGrid: {
    display: 'grid',
    gap: spacing.lg,
  },

  errorCard: {
    backgroundColor: colors.critical_bg,
    border: `1px solid ${colors.critical_border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },

  errorCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: spacing.sm,
  },

  errorCardTitle: {
    margin: `0 0 ${spacing.xs} 0`,
    color: colors.error_text,
    fontSize: fontSize.lg,
  },

  errorCardMessage: {
    margin: `0 0 ${spacing.sm} 0`,
    color: colors.critical,
    fontSize: fontSize.md,
  },

  markResolvedButton: {
    padding: `${spacing.sm} ${spacing.lg}`,
    backgroundColor: colors.success,
    color: 'white',
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    fontSize: fontSize.sm,
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },

  errorCardDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: spacing.lg,
    fontSize: fontSize.sm,
    color: colors.text_light,
  },

  emptyState: {
    backgroundColor: colors.success_bg,
    border: `1px solid ${colors.success_border}`,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    textAlign: 'center',
    color: colors.success,
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: colors.bg_white,
  },

  tableHeader: {
    backgroundColor: colors.bg_header,
    borderBottom: `2px solid ${colors.border_medium}`,
  },

  tableHeaderCell: {
    padding: spacing.md,
    textAlign: 'left',
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },

  tableBody: {
    borderBottom: `1px solid ${colors.border_light}`,
  },

  tableBodyCell: {
    padding: spacing.md,
    fontSize: fontSize.md,
  },

  severityBadge: {
    display: 'inline-block',
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.sm,
    fontSize: fontSize.xs,
    fontWeight: 'bold',
  },

  severityBadgeCritical: {
    backgroundColor: colors.critical_bg,
    color: colors.error_text,
  },

  severityBadgeWarning: {
    backgroundColor: colors.warning_bg,
    color: colors.warning,
  },

  severityBadgeSuccess: {
    backgroundColor: colors.success_bg,
    color: colors.success,
  },

  tableContainer: {
    overflowX: 'auto',
  },

  tabButton: {
    padding: `${spacing.md} ${spacing.lg}`,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: `3px solid transparent`,
    cursor: 'pointer',
    fontSize: fontSize.lg,
    fontWeight: 'normal',
  },

  tabButtonActive: {
    color: colors.critical,
    borderBottomColor: colors.critical,
    fontWeight: 'bold',
  },

  tabButtonInactive: {
    color: colors.text_muted,
  },
};
