import React, { useState } from 'react';
import { FAQ_DATA } from '../../data/faq';
import './FAQViewer.css';

/**
 * FAQViewer - Display FAQ with search and category filtering
 */
export function FAQViewer({ onClose }) {
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
      category.category.toLowerCase().includes(search) ||
      category.questions.some(q => 
        q.question.toLowerCase().includes(search) || 
        q.answer.toLowerCase().includes(search)
      )
    );
  });

  return (
    <div className="faq-viewer">
      {/* Header */}
      <div className="faq-header">
        <h2>📚 Frequently Asked Questions</h2>
        <button onClick={onClose} className="faq-close-btn" title="Close">✕</button>
      </div>

      {/* Search */}
      <div className="faq-search-section">
        <input
          type="text"
          className="faq-search-input"
          placeholder="Search FAQ... (e.g., 'payment', '2FA', 'horoscope')"
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
          All
        </button>
        {FAQ_DATA.map(cat => (
          <button
            key={cat.id}
            className={`faq-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.icon} {cat.category}
          </button>
        ))}
      </div>

      {/* FAQ Content */}
      <div className="faq-content">
        {filteredFAQ.length === 0 ? (
          <div className="faq-no-results">
            <p>No results found for "{searchTerm}"</p>
            <p style={{ fontSize: '12px', color: '#999' }}>Try different keywords or browse all categories</p>
          </div>
        ) : (
          filteredFAQ.map(category => (
            <div key={category.id} className="faq-category">
              <h3 className="faq-category-title">
                {category.icon} {category.category}
              </h3>
              <div className="faq-questions">
                {category.questions.map(q => (
                  <div key={q.id} className="faq-item">
                    <button
                      className={`faq-question ${expandedIds.has(q.id) ? 'expanded' : ''}`}
                      onClick={() => toggleExpanded(q.id)}
                    >
                      <span className="faq-question-text">{q.question}</span>
                      <span className="faq-toggle-icon">{expandedIds.has(q.id) ? '▼' : '▶'}</span>
                    </button>
                    {expandedIds.has(q.id) && (
                      <div className="faq-answer">
                        {q.answer.split('\n').map((line, idx) => (
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
        <p>Can't find what you're looking for? Use the Help Chat to ask a question!</p>
      </div>
    </div>
  );
}
