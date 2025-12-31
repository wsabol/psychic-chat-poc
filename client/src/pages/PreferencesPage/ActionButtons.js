import React from 'react';

export default function ActionButtons({
  saving,
  onSubmit,
  onCancel,
  getString
}) {
  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      marginTop: '2rem'
    }}>
      <button
        type="submit"
        disabled={saving}
        onClick={onSubmit}
        style={{
          flex: 1,
          padding: '12px',
          backgroundColor: '#9370db',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: saving ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          transition: 'background-color 0.3s'
        }}
        onMouseEnter={(e) => !saving && (e.target.style.backgroundColor = '#7b5bb5')}
        onMouseLeave={(e) => (e.target.style.backgroundColor = '#9370db')}
      >
        {saving ? getString('common.saving') : getString('common.save')}
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{
          flex: 1,
          padding: '12px',
          backgroundColor: '#ddd',
          color: '#333',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          transition: 'background-color 0.3s'
        }}
        onMouseEnter={(e) => (e.target.style.backgroundColor = '#ccc')}
        onMouseLeave={(e) => (e.target.style.backgroundColor = '#ddd')}
      >
        {getString('common.cancel')}
      </button>
    </div>
  );
}
