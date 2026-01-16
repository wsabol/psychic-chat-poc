import React, { useState } from 'react';
import { logErrorFromCatch, logWarning, logCritical } from '../../shared/errorLogger';

/**
 * ErrorLoggerTestHarness - Test component to trigger intentional errors
 * Intentional errors are suppressed from console to avoid clutter
 */
export default function ErrorLoggerTestHarness() {
  const [testMessage, setTestMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const triggerError = async (testType) => {
    setIsLoading(true);
    setTestMessage('');
    
    // Suppress console.error for intentional test errors
    const originalError = console.error;
    console.error = () => {};
    
    try {
      switch (testType) {
        case 'runtime':
          throw new Error('Test Runtime Error - This is a deliberate test error');

        case 'network':
          throw new Error('Network request failed: Unable to reach /api/test-endpoint');

        case 'validation':
          await logWarning({
            service: 'ErrorLoggerTest',
            message: 'Test Validation Warning - User provided invalid email format',
            context: 'Email validation on registration form',
            userIdHash: null
          });
          setTestMessage('✅ Warning logged');
          break;

        case 'critical':
          await logCritical({
            service: 'ErrorLoggerTest',
            errorMessage: 'Test Critical Error - Database connection lost',
            context: 'Critical database failure during transaction',
            userIdHash: null,
            errorStack: new Error().stack
          });
          setTestMessage('✅ Critical error logged');
          break;

        case 'null-pointer':
          const obj = null;
          throw new Error(`Null pointer: Cannot read property 'name' of ${obj}`);

        case 'async':
          await new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Async Test Error - Promise rejected after 1 second'));
            }, 1000);
          });
          break;

        default:
          throw new Error('Unknown test type');
      }
    } catch (error) {
      // Log the error using errorLogger
      await logErrorFromCatch(error, 'ErrorLoggerTest', `Test type: ${testType}`, null, null, 'error');
      setTestMessage(`✅ ${testType} error logged to database`);
    } finally {
      // Restore console.error
      console.error = originalError;
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: '#fff3e0',
      border: '2px solid #ff9800',
      borderRadius: '8px',
      padding: '1.5rem',
      marginTop: '1.5rem',
    }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#e65100' }}>
        🧪 Error Logger Test Harness
      </h3>
      <p style={{ color: '#bf360c', fontSize: '12px', marginTop: 0, marginBottom: '1rem' }}>
        Click buttons below to trigger intentional errors and test the error logging system.
        Errors will be logged to the error_logs table in the database.
      </p>

      {testMessage && (
        <div style={{
          backgroundColor: '#e8f5e9',
          border: '1px solid #81c784',
          borderRadius: '4px',
          padding: '0.75rem',
          marginBottom: '1rem',
          color: '#2e7d32',
          fontSize: '12px',
        }}>
          {testMessage}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.75rem',
      }}>
        <TestButton
          label="🔴 Runtime Error"
          onClick={() => triggerError('runtime')}
          disabled={isLoading}
          description="Trigger a JavaScript runtime error"
        />
        <TestButton
          label="📡 Network Error"
          onClick={() => triggerError('network')}
          disabled={isLoading}
          description="Simulate failed API request"
        />
        <TestButton
          label="⚠️ Warning"
          onClick={() => triggerError('validation')}
          disabled={isLoading}
          description="Log a warning (not an error)"
        />
        <TestButton
          label="🚨 Critical Error"
          onClick={() => triggerError('critical')}
          disabled={isLoading}
          description="Log critical severity error"
        />
        <TestButton
          label="❌ Null Pointer"
          onClick={() => triggerError('null-pointer')}
          disabled={isLoading}
          description="Access undefined property"
        />
        <TestButton
          label="⏳ Async Error"
          onClick={() => triggerError('async')}
          disabled={isLoading}
          description="Promise rejection after 1 sec"
        />
      </div>

      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        fontSize: '11px',
        color: '#666',
      }}>
        <strong>📊 After testing:</strong> Go to the "Error Logs" tab to view logged errors from the database.
        Errors persist in the database and can be queried via SQL.
      </div>
    </div>
  );
}

/**
 * TestButton - Styled test button with tooltip
 */
function TestButton({ label, onClick, disabled, description }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={description}
      style={{
        padding: '0.75rem 1rem',
        backgroundColor: '#ff9800',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '12px',
        fontWeight: 'bold',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s ease',
      }}
      onMouseOver={(e) => {
        if (!disabled) e.target.style.backgroundColor = '#f57c00';
      }}
      onMouseOut={(e) => {
        e.target.style.backgroundColor = '#ff9800';
      }}
    >
      {label}
    </button>
  );
}
