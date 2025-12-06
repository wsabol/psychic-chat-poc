import React from 'react';

/**
 * CircleTimer - Circular countdown timer display
 * Shows remaining seconds in a visual clock-like circle
 */
export default function CircleTimer({ timeRemaining, totalTime = 60 }) {
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (timeRemaining / totalTime) * circumference;
  const percentage = Math.round((timeRemaining / totalTime) * 100);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: '2rem'
    }}>
      <div style={{
        position: 'relative',
        width: '120px',
        height: '120px'
      }}>
        {/* SVG circle */}
        <svg
          width="120"
          height="120"
          style={{
            transform: 'rotate(-90deg)',
            filter: 'drop-shadow(0 4px 12px rgba(124, 99, 216, 0.3))'
          }}
        >
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="rgba(124, 99, 216, 0.2)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="#7c63d8"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1s linear',
              transformOrigin: '60px 60px'
            }}
          />
        </svg>

        {/* Center text */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#7c63d8',
            lineHeight: '1'
          }}>
            {timeRemaining}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#7c63d8',
            marginTop: '0.25rem',
            opacity: 0.8
          }}>
            seconds
          </div>
        </div>
      </div>
    </div>
  );
}
