import React from 'react';
import VerificationCard from './VerificationCard';

/**
 * VerificationDisplay - Read-only view of all verification methods
 */
export default function VerificationDisplay({ 
  userEmail, 
  phoneNumber, 
  recoveryPhone, 
  recoveryEmail,
  methods,
  onEdit 
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Primary Email */}
      <VerificationCard 
        title="Primary Email" 
        value={userEmail} 
        isVerified={true}
      />

      {/* Phone Number */}
      <VerificationCard 
        title="Phone Number" 
        value={phoneNumber} 
        isVerified={methods?.phoneVerified}
      />

      {/* Recovery Phone */}
      <VerificationCard 
        title="Recovery Phone (Backup)" 
        value={recoveryPhone}
      />

      {/* Recovery Email */}
      <VerificationCard 
        title="Recovery Email" 
        value={recoveryEmail}
        isVerified={methods?.recoveryEmailVerified}
      />

      {/* Edit Button */}
      <button
        onClick={onEdit}
        style={{
          alignSelf: 'flex-start',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#7c63d8',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        ✏️ Edit Verification Methods
      </button>
    </div>
  );
}
