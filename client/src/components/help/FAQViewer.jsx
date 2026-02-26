import React, { useState } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import { FAQ_DATA } from '../../data/faq';
import './FAQViewer.css';

/**
 * FAQViewer - Display FAQ with search and category filtering
 */
export function FAQViewer({ onClose, onViewChange }) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedCategory, setSelectedCategory] = useState(null);

  const toggleExpanded = (id) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  // Filter FAQ based on search and category
  const filteredFAQ = FAQ_DATA.filter(category => {
    if (selectedCategory && category.id !== selectedCategory) {
      return false;
    }
    if (!searchTerm) return true;

    const search = searchTerm.toLowerCase();
    return (
      t(category.categoryKey).toLowerCase().includes(search) ||
      category.questions.some(q =>
        t(q.questionKey).toLowerCase().includes(search) ||
        t(q.answerKey).toLowerCase().includes(search)
      )
    );
  });

  return (
    <div className="faq-viewer">
      {/* Header */}
      <div className="faq-header">
        <h2>{t('help.faq.title')}</h2>
        <button onClick={onClose} className="faq-close-btn" title={t('help.controls.back')}>← {t('help.controls.back')}</button>
      </div>

      {/* Search */}
      <div className="faq-search-section">
        <input
          type="text"
          className="faq-search-input"
          placeholder={t('help.faq.searchHint')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Category Filter */}
      <div className="faq-category-filter">
        <button
          className={`faq-category-btn ${selectedCategory === null ? 'active' : ''}`}
          onClick={() => setSelectedCategory(null)}
        >
          {t('help.faq.browseAll')}
        </button>
        {FAQ_DATA.map(cat => (
          <button
            key={cat.id}
            className={`faq-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.icon} {t(cat.categoryKey)}
          </button>
        ))}
      </div>

      {/* FAQ Content */}
      <div className="faq-content">
        {filteredFAQ.length === 0 ? (
          <div className="faq-no-results">
            <p>{t('help.faq.noResults').replace('{search}', searchTerm)}</p>
            <p style={{ fontSize: '12px', color: '#999' }}>{t('help.faq.noResultsHint')}</p>
          </div>
        ) : (
          filteredFAQ.map(category => (
            <div key={category.id} className="faq-category">
              <h3 className="faq-category-title">
                {category.icon} {t(category.categoryKey)}
              </h3>
              <div className="faq-questions">
                {category.questions.map(q => (
                  <div key={q.id} className="faq-item">
                    <button
                      className={`faq-question ${expandedIds.has(q.id) ? 'expanded' : ''}`}
                      onClick={() => toggleExpanded(q.id)}
                    >
                      <span className="faq-question-text">{t(q.questionKey)}</span>
                      <span className="faq-toggle-icon">{expandedIds.has(q.id) ? '▼' : '▶'}</span>
                    </button>
                    {expandedIds.has(q.id) && (
                      <div className="faq-answer">
                        {t(q.answerKey).split('\n').map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="faq-footer">
        <p>{t('help.faq.footer')}</p>
      </div>
    </div>
  );
}
