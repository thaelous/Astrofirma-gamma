import React from 'react';
import { Play, Pause, Square, AudioWaveform, Sliders } from 'lucide-react';
import { AudioSettings, SynthMode } from '../types';

interface TransportBarProps {
  settings: AudioSettings;
  isPlaying: boolean;
  isPaused: boolean;
  activeStep: number;
  totalSteps: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onModeChange: (mode: SynthMode) => void;
  onOpenSettings: () => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  settings,
  isPlaying,
  isPaused,
  activeStep,
  totalSteps,
  onPlay,
  onPause,
  onStop,
  onModeChange,
  onOpenSettings,
}) => {
  return (
    <div
      id="transport-bar"
      className="w-full bg-[#06091f]/90 border border-indigo-500/25 rounded-2xl p-3.5 sm:p-5 backdrop-blur-xl shadow-2xl space-y-3 sm:space-y-4"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Playback Controls & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          {/* Main Action Buttons Grid on Mobile */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Main Play / Pause Button */}
            {!isPlaying ? (
              <button
                id="main-play-button"
                type="button"
                onClick={onPlay}
                className="h-11 sm:h-12 px-4 sm:px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold font-['Plus_Jakarta_Sans',sans-serif] text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="w-4 sm:w-5 h-4 sm:h-5 fill-white shrink-0" />
                <span>Iniciar Síntesis</span>
              </button>
            ) : (
              <button
                id="main-pause-button"
                type="button"
                onClick={onPause}
                className="h-11 sm:h-12 px-4 sm:px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold font-['Plus_Jakarta_Sans',sans-serif] text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Pause className="w-4 sm:w-5 h-4 sm:h-5 fill-white shrink-0" />
                <span>Pausar</span>
              </button>
            )}

            {/* Stop Button */}
            <button
              id="main-stop-button"
              type="button"
              onClick={onStop}
              className="h-11 sm:h-12 px-3.5 sm:px-5 rounded-xl bg-[#0a0f30] border border-indigo-500/30 hover:border-rose-500/50 hover:bg-rose-950/30 text-slate-200 hover:text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              title="Detener reproducción"
            >
              <Square className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-current text-rose-400 shrink-0" />
              <span>Detener</span>
            </button>
          </div>

          {/* Subtle Status Indicator */}
          <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#090e2a]/90 border border-indigo-500/20 font-mono text-xs w-full sm:w-auto">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {isPlaying && !isPaused ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                </>
              ) : isPaused ? (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-500"></span>
              )}
            </span>
            <span
              className={
                isPlaying && !isPaused
                  ? 'text-emerald-300 font-semibold flex items-center gap-1.5'
                  : isPaused
                  ? 'text-amber-300 font-semibold'
                  : 'text-slate-400'
              }
            >
              {isPlaying && !isPaused ? (
                <>
                  <span>EN REPRODUCCIÓN</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Paso {activeStep + 1}/{totalSteps})
                  </span>
                </>
              ) : isPaused ? (
                'PAUSADO'
              ) : (
                'DETENIDO (LISTO)'
              )}
            </span>
          </div>
        </div>

        {/* Mode Indicator & Quick Settings Access */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full md:w-auto">
          {/* Active Mode Tag */}
          <div className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-mono rounded-xl bg-[#090d28]/90 border border-indigo-500/30 text-sky-300 shadow-inner flex-1 sm:flex-initial">
            <AudioWaveform className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Secuencia Melódica</span>
          </div>

          {/* Quick Settings Button */}
          <button
            id="transport-open-settings-btn"
            type="button"
            onClick={onOpenSettings}
            className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl bg-[#0a0f30] border border-cyan-500/35 hover:border-cyan-400 text-cyan-300 hover:text-white hover:bg-cyan-950/40 text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
            title="Abrir panel de Ajustes de Audio y Efectos"
          >
            <Sliders className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-cyan-400 shrink-0" />
            <span>Ajustes DSP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
