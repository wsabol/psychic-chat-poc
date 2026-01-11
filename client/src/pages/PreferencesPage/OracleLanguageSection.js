import React from 'react';
import { getBaseLanguageForOracle } from '../../utils/oracleLanguageMapper';

export default function OracleLanguageSection({ oracleLanguage, onLanguageChange, getString }) {
  const oracleLanguageGroups = {
    'English': [
      { code: 'en-US', label: 'English - US' },
      { code: 'en-GB', label: 'English - British' }
    ],
    'Spanish': [
      { code: 'es-ES', label: 'Spanish - Spain' },
      { code: 'es-MX', label: 'Spanish - Mexico' },
      { code: 'es-DO', label: 'Spanish - Dominican Republic' }
    ],
    'French': [
      { code: 'fr-FR', label: 'French - France' },
      { code: 'fr-CA', label: 'French - Canada' }
    ],
    'German': [
      { code: 'de-DE', label: 'German - Germany' }
    ],
    'Italian': [
      { code: 'it-IT', label: 'Italian - Italy' }
    ],
    'Japanese': [
      { code: 'ja-JP', label: 'Japanese - Japan' }
    ],
    'Portuguese': [
      { code: 'pt-BR', label: 'Portuguese - Brazil' }
    ],
    'Chinese': [
      { code: 'zh-CN', label: 'Chinese - Simplified' }
    ]
  };

  const allOptions = Object.values(oracleLanguageGroups).flat();
  
  // Validate oracle language, default to en-US
  const finalOracleLanguage = (oracleLanguage && allOptions.some(opt => opt.code === oracleLanguage)) 
    ? oracleLanguage 
    : 'en-US';
    
  const selectedLabel = allOptions.find(opt => opt.code === finalOracleLanguage)?.label || 'English - US';

  const handleLanguageChange = (e) => {
    const selectedOracleCode = e.target.value;
    const selectedOption = allOptions.find(opt => opt.code === selectedOracleCode);
    
    if (selectedOption) {
      // Get the base page language for this oracle variant
      const basePageLanguage = getBaseLanguageForOracle(selectedOracleCode);
      
      // Update BOTH oracle language AND base page language in single call
      onLanguageChange(selectedOracleCode, basePageLanguage);
    }
  };

  return (
    <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #eee' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333', fontSize: '16px' }}>
        🌍 Language & Oracle Variant
      </label>
      
      <div style={{ fontSize: '14px', fontWeight: '500', color: '#555', marginBottom: '0.75rem', padding: '8px 12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        Currently selected: <strong style={{ color: '#333' }}>{selectedLabel}</strong>
      </div>

      <select
        value={finalOracleLanguage}
        onChange={handleLanguageChange}
        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', backgroundColor: '#fff', cursor: 'pointer' }}
      >
        {Object.entries(oracleLanguageGroups).map(([group, options]) => (
          <optgroup key={group} label={group}>
            {options.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      
      <p style={{ fontSize: '12px', color: '#999', marginTop: '0.5rem' }}>
        Page UI will use the base language (e.g., Spanish for Spanish-Mexico). Oracles respond in your selected variant.
      </p>
    </div>
  );
}
