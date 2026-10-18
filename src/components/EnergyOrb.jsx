import React, { useEffect, useRef } from 'react';
import './EnergyOrb.css';

/**
 * EnergyOrb Component
 * A living, organic, multimodal AI energy orb rendered with HTML5 Canvas & procedural fluid particles.
 * Colors: Cyan, Teal, Ice-Blue, White (NO purple or pink).
 * States: 'idle' | 'listening' | 'thinking' | 'speaking'
 */
export default function EnergyOrb({ state = 'idle', audioLevel = 0, onClick }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Handle high DPI displays
    const size = 320;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Particle swarm configuration
    const particleCount = 65;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 40 + Math.random() * 60,
        speed: (0.008 + Math.random() * 0.015) * (Math.random() > 0.5 ? 1 : -1),
        size: 1.5 + Math.random() * 2.5,
        opacity: 0.3 + Math.random() * 0.6,
        pulseOffset: Math.random() * Math.PI * 2,
        colorType: Math.random() > 0.6 ? 'white' : Math.random() > 0.3 ? 'cyan' : 'teal'
      });
    }

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;

      // Dynamics based on state
      let speedMultiplier = 1;
      let waveAmplitude = 8;
      let coreGlowIntensity = 0.5;
      let ringScale = 1;

      if (state === 'idle') {
        speedMultiplier = 0.8;
        waveAmplitude = 6 + Math.sin(time * 1.5) * 2;
        coreGlowIntensity = 0.45 + Math.sin(time * 2) * 0.1;
      } else if (state === 'listening') {
        speedMultiplier = 1.6;
        waveAmplitude = 14 + (audioLevel * 18);
        coreGlowIntensity = 0.65 + (audioLevel * 0.3);
        ringScale = 1.05 + (audioLevel * 0.15);
      } else if (state === 'thinking') {
        speedMultiplier = 2.4;
        waveAmplitude = 12 + Math.sin(time * 8) * 6;
        coreGlowIntensity = 0.85 + Math.sin(time * 6) * 0.15;
      } else if (state === 'speaking') {
        speedMultiplier = 1.8;
        const speechCadence = (Math.abs(Math.sin(time * 4)) * 8) + (audioLevel * 16);
        waveAmplitude = 10 + speechCadence;
        coreGlowIntensity = 0.72 + (audioLevel * 0.28);
        ringScale = 1.03 + (audioLevel * 0.12);
      }

      // 1. Draw outer ambient atmospheric glow (Ice Blue / Cyan)
      const ambientGrad = ctx.createRadialGradient(
        centerX, centerY, 30,
        centerX, centerY, 130 * ringScale
      );
      if (state === 'thinking') {
        ambientGrad.addColorStop(0, 'rgba(203, 238, 255, 0.45)');
        ambientGrad.addColorStop(0.5, 'rgba(112, 214, 255, 0.2)');
        ambientGrad.addColorStop(1, 'rgba(0, 242, 254, 0)');
      } else if (state === 'listening') {
        ambientGrad.addColorStop(0, 'rgba(0, 229, 201, 0.5)');
        ambientGrad.addColorStop(0.5, 'rgba(0, 242, 254, 0.25)');
        ambientGrad.addColorStop(1, 'rgba(0, 229, 201, 0)');
      } else {
        ambientGrad.addColorStop(0, 'rgba(0, 242, 254, 0.35)');
        ambientGrad.addColorStop(0.5, 'rgba(0, 200, 220, 0.15)');
        ambientGrad.addColorStop(1, 'rgba(0, 242, 254, 0)');
      }
      ctx.fillStyle = ambientGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 130 * ringScale, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw organic morphing waveform rings
      const numRings = 3;
      for (let r = 0; r < numRings; r++) {
        ctx.beginPath();
        const baseRadius = 55 + r * 22;
        const points = 60;
        const ringTime = time * speedMultiplier * (r % 2 === 0 ? 1 : -1) + (r * 1.5);

        for (let i = 0; i <= points; i++) {
          const theta = (i / points) * Math.PI * 2;
          // Harmonic wave distortion
          const wave1 = Math.sin(theta * 4 + ringTime) * waveAmplitude * 0.5;
          const wave2 = Math.cos(theta * 6 - ringTime * 1.2) * (waveAmplitude * 0.3);
          const currentR = baseRadius + wave1 + wave2;

          const x = centerX + Math.cos(theta) * currentR;
          const y = centerY + Math.sin(theta) * currentR;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        // Ring stroke styling
        ctx.lineWidth = 1.5 + (r === 1 ? 1 : 0);
        if (r === 0) {
          ctx.strokeStyle = `rgba(0, 242, 254, ${0.4 + coreGlowIntensity * 0.3})`;
        } else if (r === 1) {
          ctx.strokeStyle = `rgba(0, 229, 201, ${0.3 + coreGlowIntensity * 0.25})`;
        } else {
          ctx.strokeStyle = `rgba(112, 214, 255, ${0.25 + coreGlowIntensity * 0.2})`;
        }
        ctx.stroke();
      }

      // 3. Draw flowing neural particles
      particles.forEach((p) => {
        p.angle += p.speed * speedMultiplier;
        const currentPulsingRadius = p.radius + Math.sin(time * 3 + p.pulseOffset) * (waveAmplitude * 0.4);
        const px = centerX + Math.cos(p.angle) * currentPulsingRadius;
        const py = centerY + Math.sin(p.angle) * currentPulsingRadius;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);

        let pColor;
        if (p.colorType === 'white') {
          pColor = `rgba(255, 255, 255, ${p.opacity})`;
        } else if (p.colorType === 'teal') {
          pColor = `rgba(0, 229, 201, ${p.opacity})`;
        } else {
          pColor = `rgba(0, 242, 254, ${p.opacity})`;
        }
        ctx.fillStyle = pColor;
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      });

      // 4. Central Molten Core (Bright Cyan & Ice White)
      const coreRadius = (32 + Math.sin(time * 3) * 3) * ringScale;
      const coreGrad = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, coreRadius
      );
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.35, 'rgba(203, 238, 255, 0.95)');
      coreGrad.addColorStop(0.7, 'rgba(0, 242, 254, 0.7)');
      coreGrad.addColorStop(1, 'rgba(0, 229, 201, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner singularity sparkle
      ctx.beginPath();
      ctx.arc(centerX, centerY, 7 + Math.sin(time * 5) * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, audioLevel]);

  return (
    <div
      className={`energy-orb-container state-${state}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={`AI Energy Orb (${state.toUpperCase()}) - Click to interact`}
    >
      {/* Outer Gyroscopic Rings */}
      <div className="orb-ring ring-1" />
      <div className="orb-ring ring-2" />
      <div className="orb-ring ring-3" />

      {/* Main Procedural Energy Canvas */}
      <canvas ref={canvasRef} className="orb-canvas" />

      {/* Glow Aura Layer */}
      <div className="orb-glow-aura" />

      {/* State Indicator Floating Tag */}
      <div className="orb-status-pill">
        <span className={`status-dot ${state}`} />
        <span className="orb-status-text">{state.toUpperCase()}</span>
      </div>
    </div>
  );
}
