import React, { useState, useMemo } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useSearchParams } from 'react-router-dom';
import './PoliciesPage.css';

/**
 * PoliciesPage - Displays Terms of Service or Privacy Policy
 * Content is fetched from translation files for multi-language support
 * URL params: ?type=terms or ?type=privacy (default: terms)
 */
export function PoliciesPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [expandedSections, setExpandedSections] = useState(new Set());

  // Get policy type from URL params
  const policyType = searchParams.get('type') || 'terms';
  const isTerms = policyType === 'terms';

  // Get policy content from translations
  const policy = useMemo(() => {
    const key = isTerms ? 'policies.termsOfService' : 'policies.privacyPolicy';
    return t(key) || {};
  }, [isTerms, t]);

  // Toggle section expansion
  const toggleSection = (index) => {
    const newExpanded = new Set(expandedSections);
    newExpanded.has(index) ? newExpanded.delete(index) : newExpanded.add(index);
    setExpandedSections(newExpanded);
  };

  // Expand all sections
  const expandAll = () => {
    const all = new Set(policy.sections?.map((_, i) => i) || []);
    setExpandedSections(all);
  };

  // Collapse all sections
  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  if (!policy.sections) {
    return (
      <div className="policies-page-wrapper">
        <div className="policies-container">
          <div className="loading">Loading policy...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="policies-page-wrapper">
      <div className="policies-container">
        {/* Header */}
        <div className="policies-header">
          <div className="policies-title-section">
            <h1>{policy.title || isTerms ? 'Terms of Service' : 'Privacy Policy'}</h1>
            <div className="policies-meta">
              <p>
                <strong>{t('policies.' + (isTerms ? 'termsOfService' : 'privacyPolicy') + '.versionLabel') || 'Version'}:</strong> {policy.version}
              </p>
              <p>
                <strong>{t('policies.' + (isTerms ? 'termsOfService' : 'privacyPolicy') + '.effectiveDateLabel') || 'Effective Date'}:</strong> {policy.effectiveDate}
              </p>
              <p>
                <strong>{t('policies.' + (isTerms ? 'termsOfService' : 'privacyPolicy') + '.lastUpdatedLabel') || 'Last Updated'}:</strong> {policy.lastUpdated}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="policies-controls">
            <button 
              className="btn btn-secondary"
              onClick={expandAll}
              title="Expand all sections"
            >
              ▼ Expand All
            </button>
            <button 
              className="btn btn-secondary"
              onClick={collapseAll}
              title="Collapse all sections"
            >
              ▶ Collapse All
            </button>
          </div>
        </div>

        {/* Content - Expandable Sections */}
        <div className="policies-content">
          {policy.sections.map((section, idx) => (
            <div key={idx} className="policy-section">
              <button 
                className="section-header"
                onClick={() => toggleSection(idx)}
                aria-expanded={expandedSections.has(idx)}
              >
                <span className="section-toggle">
                  {expandedSections.has(idx) ? '▼' : '▶'}
                </span>
                <span className="section-title">{section.title}</span>
              </button>
              
              {expandedSections.has(idx) && (
                <div className="section-body">
                  <p>{section.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="policies-footer">
          <p>
            {isTerms 
              ? 'By using this Service, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.'
              : 'By using this Service, you consent to the data collection and processing practices described in this Privacy Policy.'}
          </p>
          <p>
            Questions? Contact: <a href="mailto:legal@starshippsychics.com">legal@starshippsychics.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default PoliciesPage;
