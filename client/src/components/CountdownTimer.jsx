import React, { useState, useEffect } from 'react';

/**
 * Circular countdown timer
 * Shows remaining time with circular progress indicator
 */
export function CountdownTimer({ secondsRemaining, isVisible }) {
    const [displayTime, setDisplayTime] = useState(secondsRemaining);

    useEffect(() => {
        setDisplayTime(secondsRemaining);
    }, [secondsRemaining]);

    if (!isVisible || secondsRemaining <= 0) return null;

    const percentage = (displayTime / 60) * 100; // 60 second total
    const circumference = 2 * Math.PI * 45; // radius = 45
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div style={{
            position: 'relative',
            width: '100px',
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {/* SVG Circle */}
            <svg
                width="100"
                height="100"
                style={{
                    position: 'absolute',
                    transform: 'rotate(-90deg)'
                }}
            >
                {/* Background circle */}
                <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(100, 100, 100, 0.3)"
                    strokeWidth="4"
                />
                {/* Progress circle */}
                <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(124, 99, 216, 0.8)"
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{
                        transition: 'stroke-dashoffset 1s linear'
                    }}
                />
            </svg>

            {/* Time display */}
            <div style={{
                position: 'absolute',
                textAlign: 'center',
                zIndex: 2
            }}>
                <div style={{
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    color: displayTime <= 10 ? '#ff6b6b' : '#7c63d8',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                }}>
                    {displayTime}
                </div>
                <div style={{
                    fontSize: '0.7rem',
                    color: '#999',
                    marginTop: '-2px'
                }}>
                    sec
                </div>
            </div>

            {/* Hover tooltip */}
            <div style={{
                position: 'absolute',
                top: '105px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '0.8rem',
                color: '#999',
                whiteSpace: 'nowrap',
                opacity: 0.8
            }}>
                Oracle responding...
            </div>
        </div>
    );
}
