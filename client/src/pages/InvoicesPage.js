import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import '../styles/responsive.css';
import './MySignPage.css';

export default function InvoicesPage({ userId, token, auth }) {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

        const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // fetchWithTokenRefresh handles Authorization header automatically
      // Do NOT duplicate it here - it will override the fresh token
      const url = `${API_URL}/billing/invoices`;
      
      const response = await fetchWithTokenRefresh(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || response.statusText || 'Unknown error';
        setError(t('invoices.unableToLoad'));
        logErrorFromCatch(new Error(errorMsg), 'invoices', `Server error: ${response.status}`);
        setLoading(false);
        return;
      }

                  const data = await response.json();
      
      // Ensure data is always an array
      const invoiceArray = Array.isArray(data) ? data : (data.data ? data.data : []);
      setInvoices(invoiceArray);
      setLoading(false);
    } catch (err) {
      logErrorFromCatch(err, 'invoices', 'Error loading invoices');
      setError(t('invoices.unableToLoadYour'));
      setLoading(false);
    }
  }, [API_URL, t]); // fetchInvoices depends on these, but useEffect uses empty deps []

                useEffect(() => {
    // Only fetch on component mount (empty dependency array)
    // We intentionally exclude fetchInvoices from deps to prevent infinite loop:
    // fetchInvoices gets recreated on every render due to t and API_URL dependencies,
    // so including it would cause the effect to run repeatedly.
    // This is safe because the effect only needs to run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchInvoices();
  }, []);

  if (loading) {
    return (
      <div className="page-safe-area sign-page">
        <div className="loading-container">
          <p>{t('invoices.loading')}</p>
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
            {t('invoices.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-safe-area sign-page">
      <div className="sign-header">
        <h2 className="heading-primary">📄 {t('invoices.title')}</h2>
        <p className="sign-subtitle">{t('invoices.description')}</p>
      </div>

      {invoices.length === 0 ? (
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '2rem', 
          borderRadius: '8px', 
          textAlign: 'center',
          color: '#666'
        }}>
          <p>{t('invoices.noInvoices')}</p>
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
                  {t('invoices.invoiceNumber')} {invoice.number}
                </h3>
                <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                  <strong>{t('invoices.date')}:</strong> {new Date(invoice.created * 1000).toLocaleDateString()}
                </p>
                {invoice.subtotal !== undefined && invoice.tax !== undefined && invoice.tax > 0 ? (
                  <>
                    <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                      <strong>{t('invoices.subtotal') || 'Subtotal'}:</strong> ${(invoice.subtotal / 100).toFixed(2)}
                    </p>
                    <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                      <strong>{t('invoices.tax') || 'Tax'}:</strong> ${(invoice.tax / 100).toFixed(2)}
                    </p>
                    <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                      <strong>{t('invoices.total') || 'Total'}:</strong> ${(invoice.total / 100).toFixed(2)}
                    </p>
                  </>
                ) : (
                  <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                    <strong>{t('invoices.amount')}:</strong> ${(invoice.amount_due / 100).toFixed(2)}
                  </p>
                )}
                <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                  <strong>{t('invoices.status')}:</strong> {invoice.status}
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
                  {t('invoices.downloadPDF')}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
