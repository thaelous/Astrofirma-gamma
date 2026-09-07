import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LetterPoint, MathMode } from '../types';
import { evaluateLagrange, evaluateFourier, computeFourierCoefficients } from '../utils/math';
import { Activity, Eye } from 'lucide-react';

interface CartesianCanvasProps {
  points: LetterPoint[];
  mode: MathMode;
  audioProgress: number; // 0 to 1
  activeStep: number;
  isPlaying: boolean;
}

interface HoverInfo {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  point: LetterPoint | null;
  val: number;
}

export const CartesianCanvas: React.FC<CartesianCanvasProps> = ({
  points,
  mode,
  audioProgress,
  activeStep,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  // Redraw canvas with proper High-DPI and mobile viewport handling
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : (canvas.clientWidth || 360);
    const height = rect.height > 0 ? rect.height : (canvas.clientHeight || 340);

    // Sync buffer dimensions to DPR
    const bufferWidth = Math.floor(width * dpr);
    const bufferHeight = Math.floor(height * dpr);
    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
    }

    // Clean reset of transform and canvas area
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Responsive padding optimized for mobile viewports
    const isMobile = width < 640;
    const padding = {
      left: isMobile ? 40 : 56,
      right: isMobile ? 18 : 36,
      top: isMobile ? 44 : 44,
      bottom: isMobile ? 38 : 48,
    };

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    if (plotWidth <= 0 || plotHeight <= 0 || points.length === 0) return;

    // X Range: 0 to points.length - 1 (or 0 to 1 if only 1 point)
    const maxX = Math.max(1, points.length - 1);
    const minX = 0;

    // Continuous Curve Evaluation Function
    const fourierCoeffs = computeFourierCoefficients(points);
    const evaluate = (xVal: number) => {
      if (mode === 'lagrange') {
        return evaluateLagrange(points, xVal);
      } else {
        return evaluateFourier(fourierCoeffs, points.length, xVal);
      }
    };

    // Sample continuous curve across entire domain [minX, maxX] to find true extrema
    // This guarantees the exact Lagrange curve peaks and valleys are 100% visible on mobile and desktop
    const asciiList = points.map((p) => p.ascii);
    let curveMinY = Math.min(...asciiList);
    let curveMaxY = Math.max(...asciiList);

    const testSamples = 120;
    for (let i = 0; i <= testSamples; i++) {
      const xSample = minX + (i / testSamples) * (maxX - minX);
      const yVal = evaluate(xSample);
      if (Number.isFinite(yVal)) {
        if (yVal < curveMinY) curveMinY = yVal;
        if (yVal > curveMaxY) curveMaxY = yVal;
      }
    }

    // Allocate 15% breathing room above and below true curve extrema
    const ySpan = Math.max(12, curveMaxY - curveMinY);
    const minY = Math.floor(Math.max(0, curveMinY - ySpan * 0.15));
    const maxY = Math.ceil(curveMaxY + ySpan * 0.15);

    const mapX = (xVal: number) => {
      return padding.left + ((xVal - minX) / (maxX - minX)) * plotWidth;
    };

    const mapY = (yVal: number) => {
      return height - padding.bottom - ((yVal - minY) / (maxY - minY)) * plotHeight;
    };

    // 1. Draw millimeter grid
    ctx.lineWidth = 1;
    // Subgrid
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.07)';
    const subStepY = (maxY - minY) / 20;
    for (let y = minY; y <= maxY; y += subStepY) {
      const cy = mapY(y);
      ctx.beginPath();
      ctx.moveTo(padding.left, cy);
      ctx.lineTo(width - padding.right, cy);
      ctx.stroke();
    }
    const subStepX = (maxX - minX) / (points.length * 4);
    for (let x = minX; x <= maxX; x += subStepX) {
      const cx = mapX(x);
      ctx.beginPath();
      ctx.moveTo(cx, padding.top);
      ctx.lineTo(cx, height - padding.bottom);
      ctx.stroke();
    }

    // Main grid lines and Y labels
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.fillStyle = 'rgba(165, 180, 252, 0.65)';
    ctx.font = isMobile ? '9px "JetBrains Mono", monospace' : '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yDivisions = isMobile ? 4 : 6;
    const yStep = Math.max(2, Math.round((maxY - minY) / yDivisions));
    for (let y = minY; y <= maxY; y += yStep) {
      const cy = mapY(y);
      ctx.beginPath();
      ctx.moveTo(padding.left - 4, cy);
      ctx.lineTo(width - padding.right, cy);
      ctx.stroke();

      ctx.fillText(y.toString(), padding.left - 7, cy);
    }

    // Main grid lines and X labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = isMobile ? '9px "JetBrains Mono", monospace' : '10px "JetBrains Mono", monospace';

    points.forEach((p) => {
      const cx = mapX(p.index);
      ctx.beginPath();
      ctx.moveTo(cx, padding.top);
      ctx.lineTo(cx, height - padding.bottom + 4);
      ctx.stroke();

      const label = isMobile ? `${p.char}` : `x=${p.index}`;
      ctx.fillText(label, cx, height - padding.bottom + 8);
    });

    // 2. Axes
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.6)';
    ctx.lineWidth = 1.5;
    // X Axis
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
    // Y Axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.stroke();

    // Axis titles
    ctx.font = isMobile ? '9px "JetBrains Mono", monospace' : '11px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(199, 210, 254, 0.8)';
    ctx.textAlign = 'left';
    ctx.fillText(isMobile ? 'y (ASCII)' : 'Valor ASCII (y)', padding.left, padding.top - 18);

    ctx.textAlign = 'right';
    ctx.fillText(
      isMobile ? 'x (Letra) →' : 'Posición Letra (x) →',
      width - padding.right,
      height - padding.bottom + (isMobile ? 22 : 28)
    );

    // 3. Draw Continuous Curve (Lagrange or Fourier)
    const curveSamples = Math.max(200, Math.floor(plotWidth * 1.5));
    const curvePoints: { x: number; y: number }[] = [];

    for (let i = 0; i <= curveSamples; i++) {
      const t = i / curveSamples;
      const xVal = minX + t * (maxX - minX);
      const yVal = evaluate(xVal);
      curvePoints.push({
        x: mapX(xVal),
        y: mapY(yVal),
      });
    }

    // Glow and area under curve
    if (curvePoints.length > 1) {
      // Shaded area under curve
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(curvePoints[0].x, height - padding.bottom);
      curvePoints.forEach((pt) => ctx.lineTo(pt.x, pt.y));
      ctx.lineTo(curvePoints[curvePoints.length - 1].x, height - padding.bottom);
      ctx.closePath();

      const gradFill = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradFill.addColorStop(0, mode === 'lagrange' ? 'rgba(99, 102, 241, 0.22)' : 'rgba(56, 189, 248, 0.22)');
      gradFill.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = gradFill;
      ctx.fill();
      ctx.restore();

      // Outer glow line
      ctx.save();
      ctx.shadowColor = mode === 'lagrange' ? '#6366f1' : '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = mode === 'lagrange' ? '#818cf8' : '#38bdf8';

      ctx.beginPath();
      ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
      for (let i = 1; i < curvePoints.length; i++) {
        ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
      }
      ctx.stroke();
      ctx.restore();

      // Inner crisp line
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
      for (let i = 1; i < curvePoints.length; i++) {
        ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
      }
      ctx.stroke();
    }

    // 4. Data points (Nodes for each letter) with adaptive density for up to 500 points
    const totalPoints = points.length;
    const isDense = totalPoints > 35;
    const isSuperDense = totalPoints > 100;
    const labelStep = isSuperDense ? Math.ceil(totalPoints / 25) : isDense ? Math.ceil(totalPoints / 30) : 1;

    points.forEach((p, idx) => {
      const cx = mapX(p.index);
      const cy = mapY(p.ascii);
      const isCurrent = activeStep === p.index;

      if (!isDense || isCurrent) {
        // Outer halo
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, isCurrent ? 12 : 7, 0, Math.PI * 2);
        ctx.fillStyle = isCurrent ? 'rgba(56, 189, 248, 0.4)' : 'rgba(99, 102, 241, 0.2)';
        ctx.fill();
        ctx.restore();
      }

      // Core point
      ctx.save();
      ctx.beginPath();
      const dotRadius = isCurrent ? 6 : (isSuperDense ? 2 : isDense ? 3 : 4);
      ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = isCurrent ? '#38bdf8' : (isDense ? '#818cf8' : '#a5b4fc');
      if (!isSuperDense || isCurrent) {
        ctx.shadowColor = isCurrent ? '#38bdf8' : '#818cf8';
        ctx.shadowBlur = isCurrent ? 12 : 4;
      }
      ctx.fill();
      ctx.restore();

      // Top letter label
      if (isCurrent || (!isSuperDense && idx % labelStep === 0) || (isSuperDense && (idx === 0 || idx === totalPoints - 1 || idx % labelStep === 0))) {
        ctx.save();
        ctx.font = isMobile || isDense
          ? 'bold 9px "JetBrains Mono", monospace'
          : 'bold 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = isCurrent ? '#38bdf8' : '#c7d2fe';
        const pointText = (isDense && !isCurrent) ? `${p.char}` : (isMobile ? `${p.char}` : `${p.char} (${p.ascii})`);
        ctx.fillText(pointText, cx, cy - (isCurrent ? 10 : 6));
        ctx.restore();
      }
    });

    // 5. Audio-synchronized Glowing Playhead Cursor
    if (isPlaying && audioProgress >= 0) {
      const currentXVal = minX + audioProgress * (maxX - minX);
      const currentYVal = evaluate(currentXVal);
      const curCanvasX = mapX(currentXVal);
      const curCanvasY = mapY(currentYVal);

      // Vertical scan line
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(curCanvasX, padding.top);
      ctx.lineTo(curCanvasX, height - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Glowing cosmic playhead beacon
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(curCanvasX, curCanvasY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Pulsing ring
      ctx.beginPath();
      ctx.arc(curCanvasX, curCanvasY, 14, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }, [points, mode, audioProgress, activeStep, isPlaying]);

  // Setup ResizeObserver to handle window and container resizes
  useEffect(() => {
    const handleResize = () => {
      draw();
    };

    handleResize();

    const ro = new ResizeObserver(() => handleResize());
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [draw]);

  // Redraw when properties change
  useEffect(() => {
    draw();
  }, [draw]);

  // Pointer position evaluator (shared between mouse and touch)
  const processPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const isMobile = rect.width < 640;
    const padding = {
      left: isMobile ? 40 : 56,
      right: isMobile ? 18 : 36,
      top: isMobile ? 44 : 44,
      bottom: isMobile ? 38 : 48,
    };
    const plotWidth = rect.width - padding.left - padding.right;
    const plotHeight = rect.height - padding.top - padding.bottom;

    if (mouseX < padding.left || mouseX > rect.width - padding.right) {
      setHoverInfo(null);
      return;
    }

    const maxX = Math.max(1, points.length - 1);
    const minX = 0;
    const xVal = ((mouseX - padding.left) / plotWidth) * maxX;

    const fourierCoeffs = computeFourierCoefficients(points);
    const evaluate = (x: number) =>
      mode === 'lagrange'
        ? evaluateLagrange(points, x)
        : evaluateFourier(fourierCoeffs, points.length, x);

    const yVal = evaluate(xVal);

    // Compute curve range bounds
    const asciiList = points.map((pt) => pt.ascii);
    let curveMinY = Math.min(...asciiList);
    let curveMaxY = Math.max(...asciiList);
    for (let i = 0; i <= 60; i++) {
      const v = evaluate(minX + (i / 60) * (maxX - minX));
      if (Number.isFinite(v)) {
        if (v < curveMinY) curveMinY = v;
        if (v > curveMaxY) curveMaxY = v;
      }
    }
    const ySpan = Math.max(12, curveMaxY - curveMinY);
    const minY = Math.floor(Math.max(0, curveMinY - ySpan * 0.15));
    const maxY = Math.ceil(curveMaxY + ySpan * 0.15);

    // Check if near any actual point
    let nearestPoint: LetterPoint | null = null;
    let minDist = isMobile ? 36 : 25;
    points.forEach((p) => {
      const px = padding.left + (p.index / maxX) * plotWidth;
      const py = rect.height - padding.bottom - ((p.ascii - minY) / (maxY - minY)) * plotHeight;
      const dist = Math.hypot(mouseX - px, mouseY - py);
      if (dist < minDist) {
        minDist = dist;
        nearestPoint = p;
      }
    });

    setHoverInfo({
      x: xVal,
      y: yVal,
      canvasX: mouseX,
      canvasY: mouseY,
      point: nearestPoint,
      val: yVal,
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[330px] sm:h-[380px] bg-[#06091f]/90 border border-indigo-500/20 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md"
    >
      {/* Canvas top bar status */}
      <div className="absolute top-3 left-3 sm:left-4 z-10 flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono text-indigo-200 bg-[#0c1236]/80 px-2 sm:px-2.5 py-1 rounded-md border border-indigo-500/30 backdrop-blur-md shadow-sm">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Curva {mode === 'lagrange' ? 'Lagrange Exacta' : 'Fourier Armónica'}</span>
        </div>
        <div className="hidden md:flex items-center gap-1 text-[11px] font-mono text-indigo-300/60">
          <Eye className="w-3 h-3 text-cyan-400/80" />
          Toca o pasa el cursor para inspeccionar
        </div>
      </div>

      <canvas
        id="cartesian-canvas"
        ref={canvasRef}
        onMouseMove={(e) => processPointer(e.clientX, e.clientY)}
        onMouseLeave={() => setHoverInfo(null)}
        onTouchStart={(e) => {
          if (e.touches[0]) processPointer(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchMove={(e) => {
          if (e.touches[0]) processPointer(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchEnd={() => setHoverInfo(null)}
        className="w-full h-full cursor-crosshair block touch-none"
      />

      {/* Floating Hover / Touch Tooltip */}
      {hoverInfo && (
        <div
          className="pointer-events-none absolute z-20 rounded-xl bg-[#070b24]/95 border border-cyan-400/60 px-3 py-2 text-xs font-mono text-white shadow-[0_0_20px_rgba(56,189,248,0.35)] backdrop-blur-md transition-all -translate-x-1/2 -translate-y-full"
          style={{
            left: `${Math.max(60, Math.min(hoverInfo.canvasX, (containerRef.current?.clientWidth || 360) - 60))}px`,
            top: `${Math.max(48, hoverInfo.canvasY - 12)}px`,
          }}
        >
          {hoverInfo.point ? (
            <div className="space-y-0.5">
              <div className="text-sky-300 font-bold flex items-center gap-2">
                <span className="text-base font-extrabold text-white">{hoverInfo.point.char}</span>
                <span className="text-cyan-400">(Punto #{hoverInfo.point.index})</span>
              </div>
              <div className="text-slate-300">
                ASCII: <strong className="text-cyan-300">{hoverInfo.point.ascii}</strong>
              </div>
              <div className="text-slate-300">
                Nota: <strong className="text-amber-300">{hoverInfo.point.noteName}</strong> ({hoverInfo.point.frequency.toFixed(1)} Hz)
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="text-slate-300">
                x: <strong className="text-white">{hoverInfo.x.toFixed(2)}</strong>
              </div>
              <div className="text-slate-300">
                y(x): <strong className="text-cyan-300">{hoverInfo.y.toFixed(2)}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
