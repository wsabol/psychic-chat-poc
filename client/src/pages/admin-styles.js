/**
 * Admin Dashboard Styles - Centralized style definitions
 */

export const styles = {
  pageContainer: {
    padding: '0.75rem',
  },
  contentWrapper: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '1.5rem',
  },
  headerTitle: {
    marginTop: 0,
    marginBottom: '0.5rem',
    fontSize: '24px',
    color: 'white',
  },
  headerSubtitle: {
    color: '#999',
    marginBottom: 0,
    fontSize: '13px',
  },
  tabBar: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    borderBottom: '2px solid #e0e0e0',
  },
  messageContainer: {
    padding: '0.75rem',
    marginBottom: '1rem',
    borderRadius: '6px',
    fontSize: '13px',
  },
  errorMessage: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    border: '1px solid #ef5350',
  },
  successMessage: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    border: '1px solid #81c784',
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  button: {
    padding: '0.75rem 1.5rem',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    transition: 'opacity 0.2s ease',
  },
  buttonPrimary: {
    backgroundColor: '#7c63d8',
  },
  buttonSuccess: {
    backgroundColor: '#4caf50',
  },
  buttonWarning: {
    backgroundColor: '#ff9800',
  },
  buttonDanger: {
    backgroundColor: '#d32f2f',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  reportContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  },
  reportTitle: {
    marginTop: 0,
    fontSize: '18px',
    marginBottom: '1rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  statBox: {
    backgroundColor: '#f5f5f5',
    padding: '1rem',
    borderRadius: '6px',
    textAlign: 'center',
    border: '1px solid #e0e0e0',
  },
  statLabel: {
    margin: '0 0 0.5rem 0',
    color: '#999',
    fontSize: '12px',
  },
  statValue: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  detailsSection: {
    marginBottom: '1rem',
  },
  detailsSummary: {
    cursor: 'pointer',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
  },
  preformatted: {
    backgroundColor: '#f5f5f5',
    padding: '1rem',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '11px',
    maxHeight: '300px',
  },
  preformattedError: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  placeholderContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    padding: '2rem',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    textAlign: 'center',
    color: '#999',
  },
  unauthorized: {
    padding: '2rem',
    textAlign: 'center',
  },
  unauthorizedTitle: {
    fontSize: '24px',
  },
  unauthorizedMessage: {
    color: '#666',
  },
  tip: {
    color: '#999',
    fontSize: '12px',
    marginTop: '1rem',
  },
};

export const getButtonStyle = (variant = 'primary', disabled = false) => {
  const baseStyle = { ...styles.button };
  const variantStyle = {
    primary: styles.buttonPrimary,
    success: styles.buttonSuccess,
    warning: styles.buttonWarning,
    danger: styles.buttonDanger,
  }[variant] || styles.buttonPrimary;

  return {
    ...baseStyle,
    ...variantStyle,
    ...(disabled && styles.buttonDisabled),
  };
};

export const getTabButtonStyle = (isActive) => {
  return {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    color: isActive ? '#7c63d8' : '#999',
    border: 'none',
    borderBottom: isActive ? '3px solid #7c63d8' : '3px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: isActive ? 'bold' : 'normal',
    transition: 'all 0.2s ease',
  };
};
