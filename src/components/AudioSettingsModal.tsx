import React, { useEffect } from 'react';
import {
  X,
  Sliders,
  Repeat,
  Compass,
  Volume2,
  Filter,
  Waves,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { AudioSettings, ReverbPreset } from '../types';
import { SignalChainDiagram } from './SignalChainDiagram';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AudioSettings;
  isPlaying: boolean;
  onSettingsChange: (newSettings: Partial<AudioSettings>) => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  isPlaying,
  onSettingsChange,
}) => {
  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    onSettingsChange({
      bpm: 120,
      pitchShift: 0,
      volume: 0.7,
      filterCutoff: 3500,
      filterResonance: 3.5,
      delayTime: 0.28,
      delayFeedback: 0.45,
      delayMix: 0.35,
      reverbSpace: 'galaxia',
      reverbDecay: 3.2,
      reverbMix: 0.4,
    });
  };

  return (
    <div
      id="audio-settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="audio-settings-modal-card"
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-[#06091f] border border-indigo-500/30 shadow-[0_0_60px_rgba(79,70,229,0.3)] text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-indigo-500/20 bg-[#080d28]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-sky-500/20 border border-sky-400/40 flex items-center justify-center text-cyan-400 shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-['Cinzel',serif] tracking-wide text-white flex items-center gap-2">
                <span>Ajustes de Audio y Efectos Espaciales</span>
              </h2>
              <p className="text-xs text-slate-400">
                Parámetros de síntesis, filtrado analógico y acústica 3D por convolución
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="reset-dsp-settings-btn"
              type="button"
              onClick={handleResetDefaults}
              className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-indigo-950/50 border border-transparent hover:border-indigo-500/30 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
              title="Restablecer valores recomendados"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Restablecer</span>
            </button>

            <button
              id="audio-settings-modal-close-btn"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-indigo-950/60 border border-transparent hover:border-indigo-500/30 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-indigo-500/30">
          {/* SECTION 1: CONTROLES BÁSICOS */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              1. Controles Básicos de Interpretación
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Tempo / BPM */}
              <div className="bg-[#090e2a]/90 border border-indigo-500/20 rounded-xl p-4 space-y-2 shadow-inner">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-sky-400" />
                    Tempo (BPM)
                  </span>
                  <span className="text-sky-300 font-bold">{settings.bpm} BPM</span>
                </div>
                <input
                  id="settings-tempo-slider"
                  type="range"
                  min={60}
                  max={240}
                  step={1}
                  value={settings.bpm}
                  onChange={(e) => onSettingsChange({ bpm: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400/80">
                  <span>60 Lento</span>
                  <span>240 Rápido</span>
                </div>
              </div>

              {/* Pitch Shift */}
              <div className="bg-[#090e2a]/90 border border-indigo-500/20 rounded-xl p-4 space-y-2 shadow-inner">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-400" />
                    Tono Base (Pitch)
                  </span>
                  <span className="text-indigo-300 font-bold">
                    {settings.pitchShift > 0 ? `+${settings.pitchShift}` : settings.pitchShift} st
                  </span>
                </div>
                <input
                  id="settings-pitch-slider"
                  type="range"
                  min={-24}
                  max={24}
                  step={1}
                  value={settings.pitchShift}
                  onChange={(e) => onSettingsChange({ pitchShift: Number(e.target.value) })}
                  className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400/80">
                  <span>-2 Octavas</span>
                  <span>0</span>
                  <span>+2 Octavas</span>
                </div>
              </div>

              {/* Master Volume */}
              <div className="bg-[#090e2a]/90 border border-indigo-500/20 rounded-xl p-4 space-y-2 shadow-inner">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    Volumen General
                  </span>
                  <span className="text-emerald-300 font-bold">
                    {Math.round(settings.volume * 100)}%
                  </span>
                </div>
                <input
                  id="settings-volume-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.volume}
                  onChange={(e) => onSettingsChange({ volume: Number(e.target.value) })}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400/80">
                  <span>Silencio</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: FILTRO LOWPASS */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              2. Filtro Analógico Pasa-Bajos (BiquadFilter Lowpass)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Filter Cutoff */}
              <div className="bg-[#090e2a]/90 border border-indigo-500/20 rounded-xl p-4 space-y-2 shadow-inner">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-cyan-400" />
                    Corte de Frecuencia (Cutoff)
                  </span>
                  <span className="text-cyan-300 font-bold">
                    {Math.round(settings.filterCutoff)} Hz
                  </span>
                </div>
                <input
                  id="settings-cutoff-slider"
                  type="range"
                  min={100}
                  max={18000}
                  step={50}
                  value={settings.filterCutoff}
                  onChange={(e) => onSettingsChange({ filterCutoff: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400/80">
                  <span>100 Hz (Cálido)</span>
                  <span>18 kHz (Brillante)</span>
                </div>
              </div>

              {/* Filter Resonance Q */}
              <div className="bg-[#090e2a]/90 border border-indigo-500/20 rounded-xl p-4 space-y-2 shadow-inner">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5 text-purple-400" />
                    Resonancia (Factor Q)
                  </span>
                  <span className="text-purple-300 font-bold">
                    {settings.filterResonance.toFixed(1)}
                  </span>
                </div>
                <input
                  id="settings-resonance-slider"
                  type="range"
                  min={0.5}
                  max={15}
                  step={0.1}
                  value={settings.filterResonance}
                  onChange={(e) => onSettingsChange({ filterResonance: Number(e.target.value) })}
                  className="w-full accent-purple-400 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400/80">
                  <span>Plano (0.5)</span>
                  <span>Auto-Oscilación (15.0)</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: EFECTOS ESPACIALES */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              3. Efectos Espaciales (Delay Estéreo & Reverberación Convolutiva)
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Delay Section */}
              <div className="bg-[#090e2a]/90 border border-indigo-500/20 rounded-xl p-4 space-y-3.5 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
                  <span className="text-xs font-mono font-bold text-sky-300 flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5 text-sky-400" />
                    Delay Espacial
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Eco y retroalimentación
                  </span>
                </div>

                {/* Delay Time */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Tiempo de Retardo:</span>
                    <span className="text-sky-300 font-bold">{Math.round(settings.delayTime * 1000)} ms</span>
                  </div>
                  <input
                    id="settings-delay-time"
                    type="range"
                    min={0.02}
                    max={1.0}
                    step={0.01}
                    value={settings.delayTime}
                    onChange={(e) => onSettingsChange({ delayTime: Number(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400/80">
                    <span>20 ms</span>
                    <span>1000 ms (1s)</span>
                  </div>
                </div>

                {/* Delay Feedback */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Retroalimentación (Feedback):</span>
                    <span className="text-sky-300 font-bold">{Math.round(settings.delayFeedback * 100)}%</span>
                  </div>
                  <input
                    id="settings-delay-feedback"
                    type="range"
                    min={0}
                    max={0.85}
                    step={0.01}
                    value={settings.delayFeedback}
                    onChange={(e) => onSettingsChange({ delayFeedback: Number(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
                  />
                </div>

                {/* Delay Mix */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Mezcla (Dry / Wet):</span>
                    <span className="text-sky-300 font-bold">{Math.round(settings.delayMix * 100)}%</span>
                  </div>
                  <input
                    id="settings-delay-mix"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={settings.delayMix}
                    onChange={(e) => onSettingsChange({ delayMix: Number(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
                  />
                </div>
              </div>

              {/* Reverb Section */}
              <div className="bg-[#090e2a]/90 border border-indigo-500/20 rounded-xl p-4 space-y-3.5 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
                  <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Reverberación Convolutiva
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Acústica 3D algorítmica
                  </span>
                </div>

                {/* Space Selector */}
                <div className="space-y-1.5">
                  <span className="text-xs font-mono text-slate-300 block">Espacio Acústico:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['salon', 'cueva', 'galaxia'] as ReverbPreset[]).map((preset) => (
                      <button
                        key={preset}
                        id={`reverb-preset-${preset}`}
                        type="button"
                        onClick={() => onSettingsChange({ reverbSpace: preset })}
                        className={`py-2 px-2 text-center text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                          settings.reverbSpace === preset
                            ? 'bg-purple-600/40 border-purple-400 text-white shadow-[0_0_12px_rgba(192,132,252,0.35)] font-bold'
                            : 'bg-[#090d28] border-indigo-500/20 text-slate-300 hover:border-indigo-400/50'
                        }`}
                      >
                        {preset === 'salon' && 'Salón'}
                        {preset === 'cueva' && 'Cueva'}
                        {preset === 'galaxia' && 'Galaxia'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reverb Decay */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Decaimiento (Decay):</span>
                    <span className="text-purple-300 font-bold">{settings.reverbDecay.toFixed(1)} s</span>
                  </div>
                  <input
                    id="settings-reverb-decay"
                    type="range"
                    min={0.5}
                    max={8.0}
                    step={0.1}
                    value={settings.reverbDecay}
                    onChange={(e) => onSettingsChange({ reverbDecay: Number(e.target.value) })}
                    className="w-full accent-purple-400 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400/80">
                    <span>0.5 s (Seco)</span>
                    <span>8.0 s (Inmersivo)</span>
                  </div>
                </div>

                {/* Reverb Mix */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Mezcla (Dry / Wet):</span>
                    <span className="text-purple-300 font-bold">{Math.round(settings.reverbMix * 100)}%</span>
                  </div>
                  <input
                    id="settings-reverb-mix"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={settings.reverbMix}
                    onChange={(e) => onSettingsChange({ reverbMix: Number(e.target.value) })}
                    className="w-full accent-purple-400 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: DIAGRAMA DE FLUJO DE LA CADENA DE SEÑAL */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              4. Diagrama de Flujo: Cadena de Señal Web Audio API
            </h3>
            <SignalChainDiagram settings={settings} isPlaying={isPlaying} />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-indigo-500/20 bg-[#080d28]/80">
          <button
            id="close-audio-settings-btn"
            type="button"
            onClick={onClose}
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-semibold text-xs font-mono tracking-wide shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            Listo / Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
