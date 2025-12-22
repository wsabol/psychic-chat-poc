import React from 'react';

export function Landing({ onTryFree, onCreateAccount, onSignIn }) {
  return (
        <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'transparent',
      color: 'white',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '600px',
        animation: 'fadeIn 1s ease-in'
      }}>
        <h1 style={{
          fontSize: '3rem',
          marginBottom: '1rem',
          textShadow: '0 0 20px rgba(100, 150, 255, 0.5)',
          fontWeight: 'bold'
        }}>
          ✨ Psychic Chat Oracle ✨
        </h1>

        <p style={{
          fontSize: '1.2rem',
          marginBottom: '2rem',
          lineHeight: '1.6',
          color: '#b0b0ff'
        }}>
          Connect with ancient wisdom. Explore your cosmic destiny through the power of tarot, astrology, and intuitive guidance.
        </p>

        <div style={{
          backgroundColor: 'rgba(30, 30, 60, 0.8)',
          padding: '2rem',
          borderRadius: '10px',
          marginBottom: '2rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(100, 150, 255, 0.3)'
        }}>
          <p style={{
            fontSize: '1rem',
            marginBottom: '1.5rem',
            color: '#d0d0ff'
          }}>
            Experience a free reading from our oracle. No account required.
          </p>

          <div style={{
            display: 'flex',
            gap: '1rem',
            flexDirection: 'column'
          }}>
            <button
              onClick={onTryFree}
              style={{
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#7c63d8',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(124, 99, 216, 0.4)',
                ':hover': {
                  backgroundColor: '#9b84e8',
                  boxShadow: '0 6px 20px rgba(124, 99, 216, 0.6)'
                }
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#9b84e8';
                e.target.style.boxShadow = '0 6px 20px rgba(124, 99, 216, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#7c63d8';
                e.target.style.boxShadow = '0 4px 15px rgba(124, 99, 216, 0.4)';
              }}
            >
              🔮 Try for Free
            </button>

            <button
              onClick={onCreateAccount}
              style={{
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                borderRadius: '8px',
                border: '2px solid #7c63d8',
                backgroundColor: 'transparent',
                color: '#7c63d8',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(124, 99, 216, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              📝 Create Account/Login
            </button>
          </div>
        </div>

        <p style={{
          fontSize: '0.85rem',
          color: '#808080',
          marginTop: '2rem'
        }}>
          Your journey of cosmic discovery awaits...
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
