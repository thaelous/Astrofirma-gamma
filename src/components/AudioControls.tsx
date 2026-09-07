import React from 'react';
import { AudioSettings, SynthMode, ReverbPreset } from '../types';
import {
  Play,
  Pause,
  Square,
  Volume2,
  Sliders,
  Sparkles,
  Repeat,
  Compass,
  AudioWaveform,
  Download,
} from 'lucide-react';

interface AudioControlsProps {
  settings: AudioSettings;
  isPlaying: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onOpenExport: () => void;
  onSettingsChange: (newSettings: Partial<AudioSettings>) => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  settings,
  isPlaying,
  isPaused,
  onPlay,
  onPause,
  onStop,
  onOpenExport,
  onSettingsChange,
}) => {
  return (
    <div className="w-full bg-[#06091f]/85 border border-indigo-500/20 rounded-2xl p-5 backdrop-blur-md shadow-xl space-y-6">
      {/* Top row: Transport buttons & Mode Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-indigo-500/20">
        {/* Playback Transport Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isPlaying ? (
            <button
              id="play-button"
              type="button"
              onClick={onPlay}
              className="h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isPaused ? 'Reanudar' : 'Iniciar Síntesis'}</span>
            </button>
          ) : (
            <button
              id="pause-button"
              type="button"
              onClick={onPause}
              className="h-11 px-5 rounded-xl bg-amber-600/90 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-amber-600/25 hover:bg-amber-600 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-white" />
              <span>Pausar</span>
            </button>
          )}

          <button
            id="stop-button"
            type="button"
            onClick={onStop}
            className="h-11 px-4 rounded-xl bg-[#090e2a] border border-indigo-500/30 text-indigo-200 hover:text-white hover:border-cyan-400 font-medium text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Detener</span>
          </button>

          <button
            id="export-audio-button"
            type="button"
            onClick={onOpenExport}
            className="h-11 px-4 rounded-xl bg-[#0b1238] border border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-950/50 hover:border-cyan-400 font-medium text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.12)]"
            title="Exportar firma de audio en formato WAV sin pérdida"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Exportar Firma (WAV)</span>
          </button>
        </div>

        {/* Synthesis Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">Modo Acústico:</span>
          <div className="inline-flex rounded-xl bg-[#090d28]/90 p-1 border border-indigo-500/30 shadow-inner">
            <button
              id="mode-melodic"
              type="button"
              onClick={() => onSettingsChange({ mode: 'melodic' })}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                settings.mode === 'melodic'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)] font-semibold'
                  : 'text-indigo-200/80 hover:text-white hover:bg-indigo-950/40'
              }`}
            >
              <AudioWaveform className="w-3.5 h-3.5" />
              <span>Secuencia Melódica (MIDI)</span>
            </button>

            <button
              id="mode-timbral"
              type="button"
              onClick={() => onSettingsChange({ mode: 'timbral' })}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                settings.mode === 'timbral'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)] font-semibold'
                  : 'text-indigo-200/80 hover:text-white hover:bg-indigo-950/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tono Timbral (Wavetable)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Synthesizer Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tempo / BPM */}
        <div className="bg-[#090e2a]/80 border border-indigo-500/20 rounded-xl p-3.5 space-y-2 shadow-inner">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-sky-400" />
              Tempo (BPM)
            </span>
            <span className="text-sky-300 font-bold">{settings.bpm} BPM</span>
          </div>
          <input
            id="tempo-slider"
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
        <div className="bg-[#090e2a]/80 border border-indigo-500/20 rounded-xl p-3.5 space-y-2 shadow-inner">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              Tono / Pitch
            </span>
            <span className="text-indigo-300 font-bold">
              {settings.pitchShift > 0 ? `+${settings.pitchShift}` : settings.pitchShift} st
            </span>
          </div>
          <input
            id="pitch-slider"
            type="range"
            min={-12}
            max={12}
            step={1}
            value={settings.pitchShift}
            onChange={(e) => onSettingsChange({ pitchShift: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400/80">
            <span>-1 Octava</span>
            <span>0</span>
            <span>+1 Octava</span>
          </div>
        </div>

        {/* Master Volume */}
        <div className="bg-[#090e2a]/80 border border-indigo-500/20 rounded-xl p-3.5 space-y-2 shadow-inner">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              Volumen Máster
            </span>
            <span className="text-emerald-300 font-bold">{Math.round(settings.volume * 100)}%</span>
          </div>
          <input
            id="volume-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.volume}
            onChange={(e) => onSettingsChange({ volume: Number(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400/80">
            <span>0% Silencio</span>
            <span>100% Máx</span>
          </div>
        </div>

        {/* Lowpass Filter Cutoff & Resonance */}
        <div className="bg-[#090e2a]/80 border border-indigo-500/20 rounded-xl p-3.5 space-y-2 shadow-inner">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Filtro Pasa-Bajos
            </span>
            <span className="text-cyan-300 font-bold">{Math.round(settings.filterCutoff)} Hz</span>
          </div>
          <input
            id="filter-cutoff-slider"
            type="range"
            min={100}
            max={16000}
            step={50}
            value={settings.filterCutoff}
            onChange={(e) => onSettingsChange({ filterCutoff: Number(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400/80">
            <span>Corte: {Math.round(settings.filterCutoff)}Hz</span>
            <span>Q: {settings.filterResonance.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Spatial FX Section: Delay and Reverb */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Delay Section */}
        <div className="bg-[#080d28]/85 border border-indigo-500/20 rounded-xl p-4 space-y-3 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
            <div className="text-xs font-semibold font-mono text-sky-300 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
              <span>Efecto Espacial: Delay Estéreo</span>
            </div>
            <span className="text-[11px] font-mono text-slate-300">
              Mix: {Math.round(settings.delayMix * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <div className="text-slate-300 mb-1 text-[11px]">
                Tiempo ({Math.round(settings.delayTime * 1000)}ms)
              </div>
              <input
                id="delay-time-slider"
                type="range"
                min={0.05}
                max={0.8}
                step={0.01}
                value={settings.delayTime}
                onChange={(e) => onSettingsChange({ delayTime: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
              />
            </div>
            <div>
              <div className="text-slate-300 mb-1 text-[11px]">
                Feedback ({Math.round(settings.delayFeedback * 100)}%)
              </div>
              <input
                id="delay-feedback-slider"
                type="range"
                min={0}
                max={0.85}
                step={0.01}
                value={settings.delayFeedback}
                onChange={(e) => onSettingsChange({ delayFeedback: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
              />
            </div>
            <div>
              <div className="text-slate-300 mb-1 text-[11px]">
                Dry/Wet ({Math.round(settings.delayMix * 100)}%)
              </div>
              <input
                id="delay-mix-slider"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={settings.delayMix}
                onChange={(e) => onSettingsChange({ delayMix: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
              />
            </div>
          </div>
        </div>

        {/* Reverb Section */}
        <div className="bg-[#080d28]/85 border border-indigo-500/20 rounded-xl p-4 space-y-3 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
            <div className="text-xs font-semibold font-mono text-purple-300 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-400"></div>
              <span>Reverberación Convolutiva</span>
            </div>
            <span className="text-[11px] font-mono text-slate-300">
              Decay: {settings.reverbDecay.toFixed(1)}s
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Space selector */}
            <div className="flex-1">
              <label className="text-[11px] font-mono text-slate-300 mb-1 block">Espacio Cósmico</label>
              <div className="grid grid-cols-3 gap-1">
                {(['salon', 'cueva', 'galaxia'] as ReverbPreset[]).map((preset) => {
                  const label =
                    preset === 'salon' ? 'Salón' : preset === 'cueva' ? 'Cueva' : 'Galaxia';
                  const isSelected = settings.reverbSpace === preset;
                  return (
                    <button
                      key={preset}
                      id={`reverb-preset-${preset}`}
                      type="button"
                      onClick={() => onSettingsChange({ reverbSpace: preset })}
                      className={`px-2 py-1 text-[11px] font-mono rounded border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600/40 border-purple-400 text-white font-semibold shadow-[0_0_10px_rgba(192,132,252,0.35)]'
                          : 'bg-[#0b1034] border-indigo-500/20 text-indigo-200/80 hover:border-purple-400/50 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Decay and Mix */}
            <div className="flex-1 grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <div className="text-slate-300 mb-1 text-[11px]">
                  Decay ({settings.reverbDecay.toFixed(1)}s)
                </div>
                <input
                  id="reverb-decay-slider"
                  type="range"
                  min={0.5}
                  max={8.0}
                  step={0.1}
                  value={settings.reverbDecay}
                  onChange={(e) => onSettingsChange({ reverbDecay: Number(e.target.value) })}
                  className="w-full accent-purple-400 cursor-pointer h-1.5 bg-[#0d1238] rounded-lg appearance-none"
                />
              </div>
              <div>
                <div className="text-slate-300 mb-1 text-[11px]">
                  Dry/Wet ({Math.round(settings.reverbMix * 100)}%)
                </div>
                <input
                  id="reverb-mix-slider"
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
      </div>
    </div>
  );
};
