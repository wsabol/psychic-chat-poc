/**
 * Shared styles for Violation Report components
 * Centralizes styling logic for consistency and maintainability
 */

export const styles = {
  // Main container
  container: {
    padding: '1.5rem',
  },

  // Messages
  messageBox: (type) => ({
    padding: '0.75rem',
    marginBottom: '1rem',
    borderRadius: '6px',
    backgroundColor: type === 'error' ? '#ffebee' : '#e8f5e9',
    color: type === 'error' ? '#c62828' : '#2e7d32',
    fontSize: '13px',
    border: type === 'error' ? '1px solid #ef5350' : '1px solid #81c784',
  }),

  // Buttons
  buttonContainer: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },

  button: (isDisabled) => ({
    padding: '0.75rem 1.5rem',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    opacity: isDisabled ? 0.6 : 1,
  }),

  // Report container
  reportContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  },

  reportTitle: {
    marginTop: 0,
    fontSize: '18px',
    marginBottom: '1.5rem',
  },

  // Summary stats grid
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },

  // Details sections
  detailsSection: {
    marginBottom: '1.5rem',
    marginTop: '1.5rem',
  },

  detailsSummary: {
    cursor: 'pointer',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    fontSize: '16px',
  },

  // Table styles
  tableContainer: {
    backgroundColor: '#f5f5f5',
    padding: '1rem',
    borderRadius: '6px',
    marginTop: '1rem',
    overflowX: 'auto',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },

  tableHeaderCell: {
    padding: '0.5rem',
    textAlign: 'center',
    borderBottom: '2px solid #ddd',
  },

  tableHeaderCellLeft: {
    padding: '0.5rem',
    textAlign: 'left',
    borderBottom: '2px solid #ddd',
  },

  tableCell: {
    padding: '0.5rem',
    textAlign: 'center',
    borderBottom: '1px solid #eee',
  },

  tableCellLeft: {
    padding: '0.5rem',
    textAlign: 'left',
    borderBottom: '1px solid #eee',
    fontWeight: 'bold',
  },

  // Grid layouts
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  },

  smallCardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.75rem',
  },

  // Cards
  card: (bgColor = '#f5f5f5') => ({
    backgroundColor: bgColor,
    padding: '1rem',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
  }),

  warningCard: {
    backgroundColor: '#ffebee',
    padding: '1rem',
    borderRadius: '6px',
    borderLeft: '4px solid #d32f2f',
  },

  fpCard: {
    backgroundColor: '#fff3e0',
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #ffb74d',
  },

  // Text
  heading: {
    margin: '0 0 0.75rem 0',
    fontWeight: 'bold',
    fontSize: '12px',
  },

  subtext: {
    margin: '0.25rem 0',
    fontSize: '11px',
    color: '#666',
  },

  footer: {
    color: '#999',
    fontSize: '12px',
    marginTop: '1.5rem',
  },

  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    padding: '2rem',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    textAlign: 'center',
    color: '#999',
  },

  // Severity colors
  severityColor: (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return '#d32f2f';
      case 'HIGH':
        return '#ff6f00';
      default:
        return '#ff9800';
    }
  },

  // Stat box
  statBox: (color) => ({
    backgroundColor: '#f5f5f5',
    padding: '1rem',
    borderRadius: '6px',
    textAlign: 'center',
    border: `2px solid ${color || '#e0e0e0'}`,
  }),

  statLabel: {
    margin: '0 0 0.5rem 0',
    color: '#999',
    fontSize: '11px',
  },

  statValue: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 'bold',
  },
};
