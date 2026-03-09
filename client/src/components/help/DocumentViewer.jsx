import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import { getLegalDocumentPath } from '../../utils/legalDocumentUtils';
import './DocumentViewer.css';

/**
 * DocumentViewer
 *
 * Displays the official Terms of Service or Privacy Policy PDF
 * exactly as it exists in /client/public — no re-rendered content,
 * no JSON, just the real PDF in an iframe.
 *
 * WHY fetch() + blob URL instead of <iframe src={pdfPath}>?
 * ──────────────────────────────────────────────────────────
 * On production (S3 + CloudFront + service worker) an <iframe> that points
 * directly to a same-origin PDF path creates a *navigation* request
 * (request.mode === 'navigate').  The Workbox NavigationRoute — which exists
 * to serve the React app shell for SPA routing — can intercept that navigation
 * before the PDF-specific NetworkOnly route has a chance to handle it, and
 * returns the cached index.html instead of the PDF.  The result: the whole
 * React app renders inside the iframe instead of the document.
 *
 * By calling fetch() first (a cors/same-origin request, NOT a navigation
 * request), we bypass the NavigationRoute entirely.  The PDF NetworkOnly
 * Workbox route handles the fetch, the real PDF bytes come back from S3, we
 * turn them into a blob: URL, and point the iframe at that.  A blob: URL is
 * served directly by the browser — the service worker never touches it —
 * so the PDF always displays correctly in both development and production.
 *
 * Props:
 *   title    – Display title shown in the header
 *   docType  – 'terms' | 'privacy'
 *   onBack   – Called when the user clicks Back / ✕
 *   onAccept – Optional. When provided, shows an "Accept" footer.
 *              Called when the user confirms acceptance.
 */
export function DocumentViewer({ title, docType, onBack, onAccept }) {
  const { t, language } = useTranslation();
  const [accepted, setAccepted] = useState(false);

  // blob: URL created from the fetched PDF bytes; null while loading
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Resolve the correct language-matched PDF path from /public
  const pdfPath = getLegalDocumentPath(docType, language);

  const displayTitle =
    title ||
    (docType === 'terms' ? 'Terms of Service' : 'Privacy Policy');

  // ── Fetch PDF → blob URL ────────────────────────────────────────────────
  // fetch() sends a cors/same-origin request (not a navigation), so the
  // Workbox NavigationRoute never intercepts it.  The PDF NetworkOnly route
  // handles it, the raw bytes come back, and we create a local blob: URL.
  // The iframe then renders the blob: URL, which the browser handles
  // entirely locally without any service-worker involvement.
  useEffect(() => {
    const controller = new AbortController();
    let currentBlobUrl = null;

    setLoading(true);
    setError(null);
    setBlobUrl(null);

    fetch(pdfPath, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} loading ${pdfPath}`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return; // component unmounted mid-fetch
        currentBlobUrl = URL.createObjectURL(blob);
        setBlobUrl(currentBlobUrl);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return; // intentional cancel on unmount
        console.error('[DocumentViewer] Failed to load PDF:', err);
        setError(err.message);
        setLoading(false);
      });

    return () => {
      controller.abort();
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    };
  }, [pdfPath]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleAccept = () => {
    setAccepted(true);
    if (onAccept) onAccept();
    onBack();
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="help-document-viewer">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="help-viewer-header">
        <h2>{displayTitle}</h2>
        <div className="help-viewer-controls">
          <button
            onClick={onBack}
            className="help-back-button"
            title={t('help.controls.back') || 'Back'}
          >
            ← {t('help.controls.back') || 'Back'}
          </button>
          <button
            onClick={onBack}
            className="help-close-button"
            title={t('help.controls.close') || 'Close'}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── PDF ───────────────────────────────────────────────────── */}
      <div className="help-viewer-content" tabIndex={0}>

        {loading && (
          <div className="pdf-loading">Loading document…</div>
        )}

        {error && (
          <div className="pdf-error">
            <p>Unable to load document.</p>
            <a href={pdfPath} target="_blank" rel="noopener noreferrer">
              Open in new tab ↗
            </a>
          </div>
        )}

        {blobUrl && (
          <iframe
            className="pdf-viewer"
            src={blobUrl}
            title={displayTitle}
          />
        )}

      </div>

      {/* ── Footer: Accept button (when onAccept is provided) ──────── */}
      {onAccept && (
        <div className="policy-viewer-footer">
          <button
            className="policy-accept-btn"
            onClick={handleAccept}
            disabled={accepted}
          >
            {accepted ? '✓ Accepted' : '✓ I Have Read and Accept'}
          </button>
          <button className="policy-close-btn" onClick={onBack}>
            Close Without Accepting
          </button>
        </div>
      )}

    </div>
  );
}

export default DocumentViewer;
