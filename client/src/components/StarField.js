import React, { useEffect, useRef } from 'react';

function StarField() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Star array
        const stars = [];
        const numStars = 150;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Initialize stars
        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                z: Math.random() * canvas.width,
                radius: Math.random() * 3.5 + 1,
                opacity: Math.random() * 0.5 + 0.5,
            });
        }

        let animationId;
        const speed = 2;

        function drawStars() {
            // Clear canvas with semi-transparent dark background
            ctx.fillStyle = 'rgba(10, 10, 25, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw and update stars
            for (let i = 0; i < stars.length; i++) {
                const star = stars[i];

                // Move star towards viewer (decrease z)
                star.z -= speed;

                // Reset star if it passes the viewer
                if (star.z <= 0) {
                    star.z = canvas.width;
                    star.x = Math.random() * canvas.width;
                    star.y = Math.random() * canvas.height;
                }

                // Calculate screen position using perspective
                const scale = canvas.width / (star.z + canvas.width);
                const screenX = (star.x - centerX) * scale + centerX;
                const screenY = (star.y - centerY) * scale + centerY;
                const radius = star.radius * scale;

                // Only draw stars that are on screen
                if (screenX > -50 && screenX < canvas.width + 50 && screenY > -50 && screenY < canvas.height + 50) {
                    // Calculate opacity based on z position (closer = brighter)
                    const opacity = (star.z / canvas.width) * star.opacity;

                    // Create glow effect
                    ctx.shadowColor = `rgba(147, 112, 219, ${opacity})`;
                    ctx.shadowBlur = Math.max(1, 5 * scale);

                    // Draw star
                    ctx.fillStyle = `rgba(200, 170, 255, ${opacity})`;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, Math.max(0.5, radius), 0, Math.PI * 2);
                    ctx.fill();

                    // Add twinkling effect
                    if (Math.random() > 0.99) {
                        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
                        ctx.beginPath();
                        ctx.arc(screenX, screenY, Math.max(0.3, radius * 0.5), 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            ctx.shadowColor = 'transparent';
            animationId = requestAnimationFrame(drawStars);
        }

        drawStars();

        // Handle window resize
        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1,
                background: 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)',
            }}
        />
    );
}

export default StarField;
