import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface SplashScreenProps {
  onEnter: () => void;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  pulseSpeed: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onEnter }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const animFrameIdRef = useRef<number | null>(null);

  const handleEnter = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    // Trigger audio context unlock immediately upon user gesture
    onEnter();
    // Smooth transition removal after fade-out finishes
    setTimeout(() => {
      setIsMounted(false);
    }, 1000);
  }, [isExiting, onEnter]);

  // Keyboard shortcut (Enter or Space) to enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEnter]);

  // Canvas Bokeh and Oscilloscope animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Color palette: Electric blue, cyan, and cosmic deep blue
    const colorChoices = [
      '0, 150, 255',   // Electric Blue
      '6, 182, 212',   // Cyan
      '99, 102, 241',  // Cosmic Indigo
      '14, 165, 233',  // Sky Blue
      '67, 56, 202',   // Deep Cosmic Royal Blue
    ];

    // Initialize 20 large, soft, defocused bokeh particles
    const particles: Particle[] = [];
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      const baseAlpha = 0.12 + Math.random() * 0.16;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 100 + Math.random() * 180, // Large circles for bokeh blur
        vx: (Math.random() - 0.5) * 0.35, // Slow organic movement
        vy: (Math.random() - 0.5) * 0.35,
        color: colorChoices[Math.floor(Math.random() * colorChoices.length)],
        alpha: baseAlpha,
        baseAlpha,
        pulseSpeed: 0.005 + Math.random() * 0.015,
      });
    }

    let startTime = performance.now();

    const render = () => {
      const now = performance.now();
      const elapsed = (now - startTime) * 0.001; // in seconds

      // Deep pure black background
      ctx.fillStyle = '#020308';
      ctx.fillRect(0, 0, width, height);

      // 1. RENDER BOKEH DEFOCUSED FLOATING CIRCLES
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap or bounce gently
        if (p.x < -p.radius) p.x = width + p.radius;
        if (p.x > width + p.radius) p.x = -p.radius;
        if (p.y < -p.radius) p.y = height + p.radius;
        if (p.y > height + p.radius) p.y = -p.radius;

        // Subtle pulsation in alpha
        p.alpha = p.baseAlpha + Math.sin(elapsed * p.pulseSpeed * 60) * 0.04;

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        gradient.addColorStop(0, `rgba(${p.color}, ${Math.max(0.02, p.alpha)})`);
        gradient.addColorStop(0.5, `rgba(${p.color}, ${Math.max(0.01, p.alpha * 0.4)})`);
        gradient.addColorStop(1, `rgba(${p.color}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. RENDER REAL-TIME LUMINOUS OSCILLOSCOPE BEHIND TITLE
      const centerY = height * 0.46; // Aligned with the title's vertical center
      const centerX = width * 0.5;

      // Primary Glowing Neon Cyan Wave
      ctx.save();
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 24;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      for (let x = 0; x <= width; x += 3) {
        // Gaussian envelope to concentrate waveform power behind the center title
        const distFromCenter = Math.abs(x - centerX);
        const envelope = Math.exp(-Math.pow(distFromCenter / (width * 0.38), 2));

        // Multi-frequency harmonic synthesis
        const wave1 = Math.sin(x * 0.009 + elapsed * 2.2) * (52 * envelope);
        const wave2 = Math.sin(x * 0.022 - elapsed * 3.4) * (20 * envelope);
        const wave3 = Math.sin(x * 0.004 + elapsed * 0.9) * (14 * envelope);

        const y = centerY + wave1 + wave2 + wave3;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();

      // Secondary Delicate Cosmic Indigo Harmonic Wave
      ctx.save();
      ctx.shadowColor = '#818cf8';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.55)';
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      for (let x = 0; x <= width; x += 3) {
        const distFromCenter = Math.abs(x - centerX);
        const envelope = Math.exp(-Math.pow(distFromCenter / (width * 0.42), 2));

        const wave1 = Math.sin(x * 0.015 - elapsed * 1.8) * (38 * envelope);
        const wave2 = Math.sin(x * 0.035 + elapsed * 2.8) * (15 * envelope);

        const y = centerY + wave1 + wave2;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();

      // Third Ethereal High-Frequency Cyan Pulse
      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.0;

      ctx.beginPath();
      for (let x = 0; x <= width; x += 4) {
        const distFromCenter = Math.abs(x - centerX);
        const envelope = Math.exp(-Math.pow(distFromCenter / (width * 0.32), 2));
        const wave = Math.sin(x * 0.045 + elapsed * 4.5) * (18 * envelope);

        const y = centerY + wave;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  if (!isMounted) return null;

  return (
    <div
      id="splash-screen-container"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020308] overflow-hidden transition-opacity duration-1000 ease-in-out select-none ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Interactive Canvas (Bokeh Particles & Luminous Oscilloscope) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none"
      />

      {/* Atmospheric Vignette overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(2,3,8,0.7)_100%)] pointer-events-none" />

      {/* Central Foreground Composition */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-8 max-w-5xl w-full">
        {/* Subtle sub-badge above title */}
        <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] tracking-widest uppercase shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Dimensión Matemática & Acústica</span>
        </div>

        {/* Title Container with Author Signature */}
        <div className="relative w-full flex flex-col items-center">
          {/* Main Title: Astrofirma Sonora */}
          <h1
            id="splash-title"
            className="font-['Cinzel',serif] text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-wider md:tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white via-sky-100 to-sky-300 drop-shadow-[0_0_40px_rgba(56,189,248,0.55)] leading-tight"
          >
            Astrofirma Sonora
          </h1>

          {/* Author Signature: slightly shifted to the right with a subtle italic cursive slope */}
          <div className="w-full flex justify-end pr-4 sm:pr-12 md:pr-24 lg:pr-32 mt-1 md:mt-2">
            <div className="transform -rotate-3 transition-transform hover:rotate-0 duration-300">
              <span
                id="splash-author-signature"
                className="font-['Playfair_Display',serif] italic font-semibold text-lg sm:text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-cyan-300 to-indigo-200 tracking-wide drop-shadow-[0_0_18px_rgba(6,182,212,0.5)]"
              >
                por Robert Pacheco
              </span>
            </div>
          </div>
        </div>

        {/* Subtitle / Conceptual Tagline */}
        <p className="mt-8 md:mt-10 text-xs sm:text-sm md:text-base font-mono text-slate-400 max-w-xl mx-auto leading-relaxed tracking-wide">
          Transformación cartesiana de palabras en armónicos continuos y síntesis espacial en tiempo real.
        </p>

        {/* Entry / Transition Button */}
        <div className="mt-10 sm:mt-14">
          <button
            id="splash-enter-btn"
            type="button"
            onClick={handleEnter}
            className="group relative inline-flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-[#060a22]/80 hover:bg-[#0a1138] border border-cyan-400/50 hover:border-cyan-300 text-white font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-sm sm:text-base tracking-wider transition-all duration-300 shadow-[0_0_30px_rgba(6,182,212,0.35)] hover:shadow-[0_0_45px_rgba(6,182,212,0.65)] hover:scale-105 active:scale-95 cursor-pointer"
          >
            {/* Glowing ring animation on hover */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/20 via-sky-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <span className="relative z-10 flex items-center gap-2.5">
              <span>Comenzar Exploración</span>
              <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform duration-200" />
            </span>
          </button>
        </div>

        {/* Subtle tip below button */}
        <span className="mt-4 text-[11px] font-mono text-slate-500/70 tracking-widest">
          Presiona Enter o haz clic para activar el audio
        </span>
      </div>
    </div>
  );
};
