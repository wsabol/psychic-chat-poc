import React from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useSearchParams, useLocation } from 'react-router-dom';
import { getLegalDocumentPath } from '../utils/legalDocumentUtils';
import './PoliciesPage.css';

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
