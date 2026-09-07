import React, { useRef, useEffect } from 'react';
import { Waves, Radio, Camera } from 'lucide-react';

interface OscilloscopeCanvasProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  onCapturePoster?: () => void;
}

export const OscilloscopeCanvas: React.FC<OscilloscopeCanvasProps> = ({ analyser, isPlaying, onCapturePoster }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bufferLength = 1024;
    let dataArray = new Uint8Array(bufferLength);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark fade effect for subtle persistence trail
      ctx.fillStyle = 'rgba(7, 11, 36, 0.25)';
      ctx.fillRect(0, 0, width, height);

      if (analyser && isPlaying) {
        bufferLength = analyser.frequencyBinCount;
        if (dataArray.length !== bufferLength) {
          dataArray = new Uint8Array(bufferLength);
        }
        analyser.getByteTimeDomainData(dataArray);

        // Draw glowing oscilloscope waveform
        ctx.save();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14;

        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0; // 0 to 2
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();

        // Inner bright core
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.restore();
      } else {
        // Resting quiescent cosmic line
        ctx.save();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
        ctx.shadowColor = '#6366f1';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.restore();
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [analyser, isPlaying]);

  return (
    <div className="relative w-full h-full min-h-[160px] bg-[#06091f]/90 border border-indigo-500/20 rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col justify-between backdrop-blur-md">
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-200 font-medium">
          <Waves className="w-4 h-4 text-cyan-400" />
          <span>Osciloscopio en Tiempo Real</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          {isPlaying ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Captura activa
            </span>
          ) : (
            <span className="flex items-center gap-1 text-indigo-300/60">
              <Radio className="w-3 h-3" />
              En espera
            </span>
          )}
        </div>
      </div>

      <div className="relative flex-1 w-full my-2 rounded-xl overflow-hidden border border-indigo-500/20 bg-[#03040e] shadow-inner">
        {/* Horizontal center guideline */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-px border-b border-indigo-500/20"></div>
        </div>
        <canvas
          id="oscilloscope-canvas"
          ref={canvasRef}
          width={600}
          height={180}
          className="w-full h-full block"
        />
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400/80 z-10 px-1">
        <span>Web Audio API AnalyserNode (1024 FFT)</span>
        <span>Dominio Temporal (Time-Domain)</span>
      </div>

      {onCapturePoster && (
        <button
          id="btn-capture-signature-poster"
          type="button"
          onClick={onCapturePoster}
          className="mt-2.5 w-full h-10 sm:h-11 px-4 rounded-xl bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border border-indigo-500/35 hover:border-cyan-400 hover:shadow-[0_0_16px_rgba(34,211,238,0.25)] text-cyan-200 hover:text-white font-semibold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] z-10"
          title="Capturar y descargar ficha PNG con la gráfica y el oscilograma en tiempo real"
        >
          <Camera className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>📸 Capturar Firma y Oscilograma</span>
        </button>
      )}
    </div>
  );
};
