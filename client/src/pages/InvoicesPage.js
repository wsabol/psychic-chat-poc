import { useState, useCallback, useEffect } from 'react';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';
import '../styles/responsive.css';
import './MySignPage.css';

export default function InvoicesPage({ userId, token, auth }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithTokenRefresh(`${API_URL}/billing/invoices`, { 
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (!response.ok) {
        setError('Unable to load invoices. Please try again.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setInvoices(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error('[INVOICES] Error loading invoices:', err);
      setError('Unable to load your invoices. Please try again.');
      setLoading(false);
    }
  }, [userId, token, API_URL]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  if (loading) {
    return (
      <div className="page-safe-area sign-page">
        <div className="loading-container">
          <p>Loading your invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-safe-area sign-page">
        <div className="error-container">
          <p className="error-message">⚠️ {error}</p>
          <button onClick={fetchInvoices} className="btn-secondary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-safe-area sign-page">
      <div className="sign-header">
        <h2 className="heading-primary">📄 Invoices</h2>
        <p className="sign-subtitle">Your billing history and invoices</p>
      </div>

      {invoices.length === 0 ? (
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '2rem', 
          borderRadius: '8px', 
          textAlign: 'center',
          color: '#666'
        }}>
          <p>No invoices to display yet. Your invoices will appear here when you make purchases.</p>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                  Invoice #{invoice.number}
                </h3>
                <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                  <strong>Date:</strong> {new Date(invoice.created).toLocaleDateString()}
                </p>
                <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                  <strong>Amount:</strong> ${(invoice.amount_due / 100).toFixed(2)}
                </p>
                <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                  <strong>Status:</strong> {invoice.status}
                </p>
              </div>
              {invoice.pdf_url && (
                <a
                  href={invoice.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#7c63d8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textDecoration: 'none'
                  }}
                >
                  Download PDF
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
