import React, { useState } from 'react';
import { Sparkles, Sliders, BookOpen, Download, Radio, Mic } from 'lucide-react';

interface HeaderProps {
  currentWord: string;
  onGenerate: (word: string) => void;
  isPlaying: boolean;
  onOpenAudioSettings: () => void;
  onOpenMathGuide: () => void;
  onOpenExport?: () => void;
  appMode: 'emitter' | 'receiver';
  onSelectMode: (mode: 'emitter' | 'receiver') => void;
}

const PRESETS = ['ALTAIR', 'ALDEBARÁN', 'COSMOS', 'AURORA', 'ORION', 'QUANTUM', 'NEBULA'];

export const Header: React.FC<HeaderProps> = ({
  currentWord,
  onGenerate,
  isPlaying,
  onOpenAudioSettings,
  onOpenMathGuide,
  onOpenExport,
  appMode,
  onSelectMode,
}) => {
  const [inputVal, setInputVal] = useState(currentWord);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal && inputVal.length > 0) {
      onGenerate(inputVal.toUpperCase());
    }
  };

  const handlePreset = (preset: string) => {
    setInputVal(preset);
    onGenerate(preset);
  };

  return (
    <header className="relative border-b border-indigo-500/20 bg-[#050718]/90 backdrop-blur-xl px-3.5 py-4 sm:px-6 md:px-8 shadow-xl">
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Top subtle bar: Title + Mode Switcher + Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/30 to-sky-500/20 border border-indigo-400/30 flex items-center justify-center text-cyan-300 shadow-inner shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold font-['Cinzel',serif] tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-sky-200 to-indigo-300">
                  AstroFirma Sonora
                </h1>
                {isPlaying && appMode === 'emitter' && (
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 shrink-0">
                    <Radio className="w-2.5 h-2.5 animate-ping text-cyan-400" />
                    EMITIENDO
                  </span>
                )}
                {appMode === 'receiver' && (
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 shrink-0">
                    <Mic className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                    RECEPTOR
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono truncate">
                {appMode === 'emitter'
                  ? 'Fórmula cartesiana • Gráfica continua • Síntesis espacial'
                  : 'Escucha y Decodificación Acústica Inversa por Micrófono'}
              </p>
            </div>
          </div>

          {/* Center Mode Switcher: Emisor vs Receptor */}
          <div className="grid grid-cols-2 sm:inline-flex rounded-xl bg-[#080d28] p-1 border border-indigo-500/30 shadow-inner w-full sm:w-auto gap-1">
            <button
              id="mode-emitter-btn"
              type="button"
              onClick={() => onSelectMode('emitter')}
              className={`flex items-center justify-center gap-2 px-2.5 sm:px-3.5 py-2 sm:py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                appMode === 'emitter'
                  ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] font-bold'
                  : 'text-indigo-200/80 hover:text-white hover:bg-indigo-950/40'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="sm:hidden">Emisor (Generar)</span>
              <span className="hidden sm:inline">Modo Emisor (Generar)</span>
            </button>

            <button
              id="mode-receiver-btn"
              type="button"
              onClick={() => onSelectMode('receiver')}
              className={`flex items-center justify-center gap-2 px-2.5 sm:px-3.5 py-2 sm:py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                appMode === 'receiver'
                  ? 'bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)] font-bold'
                  : 'text-indigo-200/80 hover:text-white hover:bg-indigo-950/40'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              <span className="sm:hidden">Receptor (Escuchar)</span>
              <span className="hidden sm:inline">Modo Receptor (Escuchar)</span>
            </button>
          </div>

          {/* Quick Access Modal Buttons */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              id="header-audio-settings-btn"
              type="button"
              onClick={onOpenAudioSettings}
              className="h-9 px-2 sm:px-3 rounded-xl bg-[#090e2e] hover:bg-indigo-950/50 border border-indigo-500/30 hover:border-cyan-400 text-xs font-mono text-cyan-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              title="Abrir Ajustes de Audio y Efectos"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="sm:hidden">Ajustes</span>
              <span className="hidden sm:inline">Ajustes Síntesis</span>
            </button>

            <button
              id="header-math-guide-btn"
              type="button"
              onClick={onOpenMathGuide}
              className="h-9 px-2 sm:px-3 rounded-xl bg-[#090e2e] hover:bg-indigo-950/50 border border-indigo-500/30 hover:border-indigo-400 text-xs font-mono text-indigo-200 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              title="Abrir Explicación Matemática y Acústica"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="sm:hidden">Teoría</span>
              <span className="hidden sm:inline">Explicación Matemática</span>
            </button>

            {onOpenExport && (
              <button
                id="header-export-wav-btn"
                type="button"
                onClick={onOpenExport}
                className="h-9 px-2 sm:px-3 rounded-xl bg-[#090e2e] hover:bg-cyan-950/50 border border-cyan-500/30 hover:border-cyan-400 text-xs font-mono text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                title="Exportar archivo de audio WAV"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="sm:hidden">WAV</span>
                <span className="hidden sm:inline">Exportar WAV</span>
              </button>
            )}
          </div>
        </div>

        {/* Word Input & Action (visible in Emitter mode) */}
        {appMode === 'emitter' && (
          <div className="space-y-2.5 pt-1 border-t border-indigo-500/15">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch">
              <div className="relative flex-1">
                <textarea
                  id="word-input"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.code === 'Space') {
                      e.stopPropagation();
                    }
                  }}
                  spellCheck={false}
                  maxLength={500}
                  rows={2}
                  placeholder="Ingresa texto, frase o código largo a codificar (hasta 500 caracteres)..."
                  className="w-full rounded-xl bg-[#090e2e]/90 border border-indigo-500/35 p-3 pr-24 text-sm font-mono tracking-wider text-white placeholder-slate-400/40 shadow-inner focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition-all uppercase resize-none leading-relaxed"
                />
                <span className={`absolute right-3 bottom-2.5 text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-full border pointer-events-none transition-colors ${
                  inputVal.length >= 480
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                    : 'bg-indigo-950/80 text-indigo-300/80 border-indigo-500/30'
                }`}>
                  {inputVal.length}/500
                </span>
              </div>

              <button
                id="generate-button"
                type="submit"
                className="h-auto min-h-[48px] px-5 sm:px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 text-white font-semibold font-['Plus_Jakarta_Sans',sans-serif] text-sm tracking-wide shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 sm:self-center"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generar Firma</span>
              </button>
            </form>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5">
              <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 mr-1 shrink-0">Pruebas:</span>
              {PRESETS.map((preset) => {
                const isSelected = currentWord.toUpperCase() === preset;
                return (
                  <button
                    key={preset}
                    id={`preset-${preset.toLowerCase()}`}
                    onClick={() => handlePreset(preset)}
                    className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-mono rounded-lg transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/40 border-cyan-400 text-white shadow-[0_0_10px_rgba(56,189,248,0.3)] font-semibold'
                        : 'bg-[#090e29]/70 border-indigo-500/20 text-slate-300 hover:border-indigo-400/50 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
