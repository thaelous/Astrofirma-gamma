import React, { useRef, useEffect, useState } from 'react';
import { Flame, Radio, Zap } from 'lucide-react';

interface Spectral3DCanvasProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

// Thermal palette mapping: from cosmic cold indigo to incandescent white-hot
function getThermalColor(value: number, alpha: number = 1.0): string {
  // value: 0 to 1
  const v = Math.max(0, Math.min(1, value));
  let r = 0;
  let g = 0;
  let b = 0;

  if (v < 0.2) {
    // 0.0 -> 0.2: Deep space violet to dark magenta
    const t = v / 0.2;
    r = Math.round(18 + t * (90 - 18));
    g = Math.round(12 + t * (15 - 12));
    b = Math.round(55 + t * (140 - 55));
  } else if (v < 0.45) {
    // 0.2 -> 0.45: Dark magenta to vibrant crimson flame
    const t = (v - 0.2) / 0.25;
    r = Math.round(90 + t * (220 - 90));
    g = Math.round(15 + t * (25 - 15));
    b = Math.round(140 + t * (50 - 140));
  } else if (v < 0.7) {
    // 0.45 -> 0.7: Crimson flame to fiery molten orange
    const t = (v - 0.45) / 0.25;
    r = Math.round(220 + t * (255 - 220));
    g = Math.round(25 + t * (140 - 25));
    b = Math.round(50 + t * (10 - 50));
  } else if (v < 0.9) {
    // 0.7 -> 0.9: Molten orange to radiant golden yellow
    const t = (v - 0.7) / 0.2;
    r = 255;
    g = Math.round(140 + t * (235 - 140));
    b = Math.round(10 + t * (60 - 10));
  } else {
    // 0.9 -> 1.0: Golden yellow to incandescent white-hot peak
    const t = (v - 0.9) / 0.1;
    r = 255;
    g = Math.round(235 + t * (255 - 235));
    b = Math.round(60 + t * (255 - 60));
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const Spectral3DCanvas: React.FC<Spectral3DCanvasProps> = ({ analyser, isPlaying }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const [peakFreq, setPeakFreq] = useState<number>(0);
  const [spectralEnergy, setSpectralEnergy] = useState<number>(-60);

  // Mouse parallax interaction for 3D tilt
  const tiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Number of frequency bands per slice (log-distributed)
    const BANDS = 54;
    // Number of waterfall history slices in depth
    const SLICES = 32;

    // History buffer: array of Float32Array (or number[]) for each slice
    const history: Float32Array[] = [];
    for (let s = 0; s < SLICES; s++) {
      history.push(new Float32Array(BANDS));
    }

    let rawFreqBuffer: Uint8Array | null = null;
    let frameCount = 0;

    // Resize handling
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    };

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    updateSize();

    const render = () => {
      frameCount++;
      const width = canvas.width;
      const height = canvas.height;
      const dpr = window.devicePixelRatio || 1;

      // Extract current frequency data
      const currentSlice = new Float32Array(BANDS);
      let maxEnergy = 0;
      let dominantIndex = 0;
      let totalEnergy = 0;

      if (analyser && isPlaying) {
        const binCount = analyser.frequencyBinCount;
        if (!rawFreqBuffer || rawFreqBuffer.length !== binCount) {
          rawFreqBuffer = new Uint8Array(binCount);
        }
        analyser.getByteFrequencyData(rawFreqBuffer);

        // Group into BANDS logarithmically across 30Hz - 12kHz
        const minBin = 1;
        const maxBin = Math.min(binCount - 1, Math.floor(binCount * 0.75));

        for (let b = 0; b < BANDS; b++) {
          const logStart = minBin * Math.pow(maxBin / minBin, b / BANDS);
          const logEnd = minBin * Math.pow(maxBin / minBin, (b + 1) / BANDS);
          const startIdx = Math.max(0, Math.floor(logStart));
          const endIdx = Math.min(binCount - 1, Math.max(startIdx + 1, Math.ceil(logEnd)));

          let sum = 0;
          for (let k = startIdx; k < endIdx; k++) {
            sum += rawFreqBuffer[k];
          }
          const avg = sum / (endIdx - startIdx);
          const normalized = avg / 255.0; // 0 to 1
          currentSlice[b] = normalized;

          totalEnergy += normalized;
          if (normalized > maxEnergy) {
            maxEnergy = normalized;
            dominantIndex = b;
          }
        }

        // Throttle UI stat updates
        if (frameCount % 6 === 0) {
          const nyquist = (analyser.context?.sampleRate || 44100) / 2;
          const approxFreq = Math.round(
            (minBin * Math.pow(maxBin / minBin, (dominantIndex + 0.5) / BANDS) * nyquist) / binCount
          );
          setPeakFreq(approxFreq);
          const avgEnergy = totalEnergy / BANDS;
          const dB = avgEnergy > 0.001 ? Math.round(20 * Math.log10(avgEnergy)) : -60;
          setSpectralEnergy(dB);
        }
      } else {
        // Subtle resting idle breathing cosmic noise
        const time = Date.now() * 0.0015;
        for (let b = 0; b < BANDS; b++) {
          const restingWave = Math.sin(time + b * 0.25) * 0.04 + 0.05;
          currentSlice[b] = Math.max(0, restingWave);
        }
        if (frameCount % 15 === 0) {
          setPeakFreq(0);
          setSpectralEnergy(-60);
        }
      }

      // Shift history and insert newest slice in front
      history.pop();
      history.unshift(currentSlice);

      // Clear Canvas with cosmic gradient
      ctx.save();
      ctx.clearRect(0, 0, width, height);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#03040c');
      bgGrad.addColorStop(0.5, '#050718');
      bgGrad.addColorStop(1, '#070a20');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Perspective Geometry Parameters
      const centerX = width / 2 + tiltRef.current.x * (40 * dpr);
      const horizonY = height * 0.22 + tiltRef.current.y * (20 * dpr);
      const frontY = height * 0.88;
      const frontSpread = width * 0.84;
      const backSpread = width * 0.36;
      const peakMaxHeight = height * 0.38;

      // Draw background horizon grid & glow
      ctx.save();
      const horizonGlow = ctx.createRadialGradient(
        centerX,
        horizonY,
        10 * dpr,
        centerX,
        horizonY,
        width * 0.6
      );
      horizonGlow.addColorStop(0, 'rgba(99, 102, 241, 0.18)');
      horizonGlow.addColorStop(0.4, 'rgba(236, 72, 153, 0.08)');
      horizonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // Longitudinal perspective guide lines (floor wireframe)
      ctx.save();
      ctx.lineWidth = 1 * dpr;
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)';
      const guideColumns = 8;
      for (let g = 0; g <= guideColumns; g++) {
        const u = g / guideColumns;
        const xFront = centerX + (u - 0.5) * frontSpread;
        const xBack = centerX + (u - 0.5) * backSpread;
        ctx.beginPath();
        ctx.moveTo(xBack, horizonY);
        ctx.lineTo(xFront, frontY);
        ctx.stroke();
      }
      ctx.restore();

      // Project function for a given slice index s (0 = front, SLICES-1 = back horizon) and band b (0 to BANDS-1)
      const projectPoint = (s: number, b: number, amplitude: number) => {
        const depthT = s / (SLICES - 1); // 0 (front) to 1 (back)
        // Non-linear depth curve for realistic geometric recession
        const curveT = Math.pow(depthT, 0.85);

        const currentSpread = frontSpread * (1 - curveT) + backSpread * curveT;
        const u = b / (BANDS - 1); // 0 (bass) to 1 (treble)
        const x = centerX + (u - 0.5) * currentSpread;

        const baseY = frontY * (1 - curveT) + horizonY * curveT;
        // Slices further away have scaled-down amplitude for 3D perspective
        const scaleFactor = (1 - curveT * 0.65) * dpr;
        const y = baseY - amplitude * peakMaxHeight * scaleFactor;

        return { x, y, baseY, curveT };
      };

      // Render 3D slices from BACK (SLICES-1) to FRONT (0) for correct depth occlusion (Painter's Algorithm)
      for (let s = SLICES - 1; s >= 0; s--) {
        const slice = history[s];
        const depthT = s / (SLICES - 1);
        const alpha = Math.max(0.2, 1 - depthT * 0.65);

        // First, draw the filled occlusion base (hides curves behind this ridge)
        ctx.beginPath();
        const firstPt = projectPoint(s, 0, slice[0]);
        ctx.moveTo(firstPt.x, firstPt.baseY + 2 * dpr);
        ctx.lineTo(firstPt.x, firstPt.y);

        for (let b = 1; b < BANDS; b++) {
          const pt = projectPoint(s, b, slice[b]);
          ctx.lineTo(pt.x, pt.y);
        }

        const lastPt = projectPoint(s, BANDS - 1, slice[BANDS - 1]);
        ctx.lineTo(lastPt.x, lastPt.baseY + 2 * dpr);
        ctx.closePath();

        // Dark occlusion fill with subtle thermal under-glow
        const sliceOcclusionGrad = ctx.createLinearGradient(0, firstPt.y, 0, firstPt.baseY);
        sliceOcclusionGrad.addColorStop(0, `rgba(18, 12, 38, ${0.85 * alpha})`);
        sliceOcclusionGrad.addColorStop(1, `rgba(5, 7, 22, ${0.98 * alpha})`);
        ctx.fillStyle = sliceOcclusionGrad;
        ctx.fill();

        // Subtle longitudinal wireframe connectors from this slice to the previous one
        if (s < SLICES - 1 && s % 2 === 0) {
          ctx.save();
          ctx.lineWidth = 0.8 * dpr;
          const nextSlice = history[s + 1];
          for (let b = 0; b < BANDS; b += 3) {
            const p1 = projectPoint(s, b, slice[b]);
            const p2 = projectPoint(s + 1, b, nextSlice[b]);
            const wireVal = (slice[b] + nextSlice[b]) * 0.5;
            ctx.strokeStyle = getThermalColor(wireVal, 0.18 * alpha);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Draw the illuminated thermal ridge line
        ctx.save();
        const isFrontRidge = s === 0;
        ctx.lineWidth = (isFrontRidge ? 3.0 : 1.6) * dpr;
        if (isFrontRidge) {
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 12 * dpr;
        }

        // Draw segment by segment with accurate thermal coloring
        for (let b = 0; b < BANDS - 1; b++) {
          const p1 = projectPoint(s, b, slice[b]);
          const p2 = projectPoint(s, b + 1, slice[b + 1]);
          const avgVal = (slice[b] + slice[b + 1]) * 0.5;

          ctx.strokeStyle = getThermalColor(avgVal, alpha);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw projected frequency labels at the front rim
      ctx.save();
      ctx.font = `${Math.round(10 * dpr)}px monospace`;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.textAlign = 'center';

      const keyMarkers = [
        { label: '60 Hz', band: Math.floor(BANDS * 0.08) },
        { label: '250 Hz', band: Math.floor(BANDS * 0.28) },
        { label: '1 kHz', band: Math.floor(BANDS * 0.52) },
        { label: '4 kHz', band: Math.floor(BANDS * 0.76) },
        { label: '10 kHz', band: Math.floor(BANDS * 0.94) },
      ];

      for (const m of keyMarkers) {
        const pt = projectPoint(0, m.band, 0);
        ctx.fillText(m.label, pt.x, pt.baseY + 16 * dpr);
        // Little tick mark
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.baseY + 2 * dpr);
        ctx.lineTo(pt.x, pt.baseY + 6 * dpr);
        ctx.stroke();
      }
      ctx.restore();

      ctx.restore();

      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
      resizeObserver.disconnect();
    };
  }, [analyser, isPlaying]);

  // Subtle mouse tilt for immersive 3D depth
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    tiltRef.current = { x: nx * 0.8, y: ny * 0.8 };
  };

  const handleMouseLeave = () => {
    tiltRef.current = { x: 0, y: 0 };
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[360px] sm:h-[420px] lg:h-[460px] bg-[#06091f]/90 border border-indigo-500/20 rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col justify-between backdrop-blur-md transition-all select-none"
    >
      {/* Header with Stats & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 via-orange-600/20 to-purple-600/20 border border-orange-500/30">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-200 font-mono flex items-center gap-2">
              <span>Espectro 3D & Cascada Térmica</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Densidad espectral en perspectiva tridimensional
            </span>
          </div>
        </div>

        {/* Real-time stats pills */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <div className="px-2.5 py-1 rounded-lg bg-[#090d28]/90 border border-indigo-500/30 text-sky-300 flex items-center gap-1.5 shadow-inner">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Pico:</span>
            <span className="font-bold text-white">
              {peakFreq > 0 ? `${peakFreq} Hz` : '---'}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-[#090d28]/90 border border-indigo-500/30 text-sky-300 flex items-center gap-1.5 shadow-inner">
            <span>Energía:</span>
            <span
              className={`font-bold ${
                spectralEnergy > -20
                  ? 'text-amber-300'
                  : spectralEnergy > -40
                  ? 'text-sky-300'
                  : 'text-slate-400'
              }`}
            >
              {spectralEnergy} dB
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-[#090d28]/90 border border-indigo-500/30 flex items-center gap-1.5">
            {isPlaying ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Captura Activa</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-indigo-300/60">
                <Radio className="w-3 h-3" />
                <span>En Espera</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main 3D Canvas Area */}
      <div className="relative flex-1 w-full my-2 rounded-xl overflow-hidden border border-indigo-500/20 bg-[#03040e] shadow-inner">
        <canvas
          id="spectral-3d-canvas"
          ref={canvasRef}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Subtle helper tooltip hint */}
        <div className="absolute top-2.5 right-3 pointer-events-none text-[10px] font-mono text-slate-400/50 bg-[#050718]/70 px-2 py-0.5 rounded border border-indigo-500/20">
          Inclinación 3D interactiva
        </div>
      </div>

      {/* Thermal Gradient Legend & Bottom Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono text-slate-400/90 z-10 px-1 pt-1">
        {/* Thermal Bar Legend */}
        <div className="flex items-center gap-2">
          <span className="text-indigo-300/70">Escala Térmica:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500">Frío</span>
            <div className="w-24 sm:w-36 h-2 rounded-full bg-gradient-to-r from-[#120a37] via-[#a81478] via-[#e62828] via-[#f59e0b] to-[#ffffff] border border-indigo-500/30 shadow-inner" />
            <span className="text-[9px] text-amber-300 font-semibold">Caliente</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <span>Cascada 3D (32 Cortes Temporales)</span>
          <span className="hidden sm:inline">&bull;</span>
          <span className="hidden sm:inline">FFT 2048 / 54 Bandas Log</span>
        </div>
      </div>
    </div>
  );
};
