import React, { useEffect, useRef } from 'react';

const AnimatedBackground = ({ className = '' }) => {
        const canvasRef = useRef(null);

        useEffect(() => {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                let animationId;
                let particles = [];

                const resize = () => {
                        canvas.width = window.innerWidth;
                        canvas.height = window.innerHeight;
                };

                const createParticles = () => {
                        particles = [];
                        const particleCount = Math.floor((canvas.width * canvas.height) / 15000);

                        for (let i = 0; i < particleCount; i++) {
                                particles.push({
                                        x: Math.random() * canvas.width,
                                        y: Math.random() * canvas.height,
                                        vx: (Math.random() - 0.5) * 0.5,
                                        vy: (Math.random() - 0.5) * 0.5,
                                        radius: Math.random() * 2 + 1,
                                        opacity: Math.random() * 0.5 + 0.2,
                                        color: Math.random() > 0.5 ? '#6366f1' : '#818cf8'
                                });
                        }
                };

                const drawParticles = () => {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        // Draw connections
                        particles.forEach((p1, i) => {
                                particles.slice(i + 1).forEach(p2 => {
                                        const dx = p1.x - p2.x;
                                        const dy = p1.y - p2.y;
                                        const distance = Math.sqrt(dx * dx + dy * dy);

                                        if (distance < 150) {
                                                ctx.beginPath();
                                                ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 * (1 - distance / 150)})`;
                                                ctx.lineWidth = 1;
                                                ctx.moveTo(p1.x, p1.y);
                                                ctx.lineTo(p2.x, p2.y);
                                                ctx.stroke();
                                        }
                                });
                        });

                        // Draw particles
                        particles.forEach(p => {
                                ctx.beginPath();
                                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                                ctx.fillStyle = p.color;
                                ctx.globalAlpha = p.opacity;
                                ctx.fill();
                                ctx.globalAlpha = 1;

                                // Update position
                                p.x += p.vx;
                                p.y += p.vy;

                                // Bounce off edges
                                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                        });

                        animationId = requestAnimationFrame(drawParticles);
                };

                resize();
                createParticles();
                drawParticles();

                window.addEventListener('resize', () => {
                        resize();
                        createParticles();
                });

                return () => {
                        cancelAnimationFrame(animationId);
                        window.removeEventListener('resize', resize);
                };
        }, []);

        return (
                <canvas
                        ref={canvasRef}
                        className={`fixed inset-0 pointer-events-none ${className}`}
                        style={{ zIndex: 0 }}
                />
        );
};

export default AnimatedBackground;
