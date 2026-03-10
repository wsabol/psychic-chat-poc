import React from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useSearchParams, useLocation } from 'react-router-dom';
import { getLegalDocumentPath } from '../utils/legalDocumentUtils';
import './PoliciesPage.css';

/**
 * Whether this browser can display a PDF document inside an <iframe> natively.
 *
 * navigator.pdfViewerEnabled is the modern standard:
 *   true  – Chrome ≥89, Edge ≥89, Firefox ≥99 with built-in PDF viewer active
 *   false – DuckDuckGo (Android WebView) and other browsers that download
 *           PDFs instead of rendering them inline
 *   undefined – older / less-common browsers (we assume capable and try)
 *
 * Amazon Silk (Kindle Fire) is Chromium-based and may report pdfViewerEnabled
 * as true, but it has no PDF viewer — it downloads PDFs to the file system.
 * We detect Silk via user-agent and send it to the Google Docs Viewer path.
 */
const _ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const _isSilk = /\bSilk\b/i.test(_ua);   // Amazon Kindle Fire / Silk browser
const PDF_INLINE_SUPPORTED =
  typeof navigator !== 'undefined' &&
  navigator.pdfViewerEnabled !== false &&
  !_isSilk;

/**
 * PoliciesPage
 *
 * Displays the official Terms of Service or Privacy Policy PDF exactly as
 * published in /client/public — title, version number, every word intact.
 *
 * Routing modes:
 *   /policies?type=terms    → Terms of Service
 *   /policies?type=privacy  → Privacy Policy   (default: terms)
 *
 *   /Terms_of_Service-*.pdf → Terms of Service   (fallback: old SW served index.html)
 *   /privacy-*.pdf          → Privacy Policy     (fallback: old SW served index.html)
 *
 * In the fallback case the PDF path in the iframe still points at the same
 * PDF file.  Once the updated service worker (denylist: [/\.pdf$/i]) is active
 * the iframe will fetch the real PDF from S3/CloudFront without any intercept.
 *
 * For browsers that cannot display PDFs inline (DuckDuckGo, Amazon Silk) the
 * document is routed through Google Docs Viewer, which renders it as HTML.
 */
export function PoliciesPage() {
  const { language } = useTranslation();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Derive policy type from query-param OR directly from the PDF filename in
  // the pathname (handles the old-SW fallback path in App.jsx).
  let policyType;
  if (/\.pdf$/i.test(location.pathname)) {
    policyType = location.pathname.toLowerCase().includes('privacy') ? 'privacy' : 'terms';
  } else {
    policyType = searchParams.get('type') === 'privacy' ? 'privacy' : 'terms';
  }

  const isTerms = policyType === 'terms';

  const pdfPath = getLegalDocumentPath(policyType, language);
  const title = isTerms ? 'Terms of Service' : 'Privacy Policy';

  // ── Fallback for browsers that cannot render PDFs inline ───────────────
  // Amazon Silk and similar browsers have no built-in PDF viewer — a direct
  // link to the PDF just triggers a background download with no visible
  // result.  Instead, route through Google Docs Viewer which converts the PDF
  // to renderable HTML and works in any Chromium-based browser.
  //
  // Google Docs Viewer requires a publicly-accessible absolute URL, so we
  // prepend window.location.origin.  This works correctly in production
  // (CloudFront domain) where the PDF is publicly reachable.
  if (!PDF_INLINE_SUPPORTED) {
    const absolutePdfUrl = `${window.location.origin}${pdfPath}`;
    const docsViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(absolutePdfUrl)}&embedded=true`;
    return (
      <div className="policies-page-wrapper">
        <div className="policies-pdf-container">
          <div className="policies-pdf-header">
            <h1>{title}</h1>
          </div>
          <iframe
            className="policies-pdf-frame"
            src={docsViewerUrl}
            title={title}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="policies-page-wrapper">
      <div className="policies-pdf-container">
        <div className="policies-pdf-header">
          <h1>{title}</h1>
        </div>
        <iframe
          className="policies-pdf-frame"
          src={pdfPath}
          title={title}
        />
      </div>
    </div>
  );
}

export default PoliciesPage;
