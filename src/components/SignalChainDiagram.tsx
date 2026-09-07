import React from 'react';
import { ArrowRight, Activity } from 'lucide-react';
import { AudioSettings } from '../types';

interface SignalChainDiagramProps {
  settings: AudioSettings;
  isPlaying: boolean;
}

export const SignalChainDiagram: React.FC<SignalChainDiagramProps> = ({ settings, isPlaying }) => {
  const nodes = [
    {
      id: 'source',
      title: settings.mode === 'melodic' ? 'Secuenciador MIDI' : 'Wavetable (DFT)',
      subtitle: settings.mode === 'melodic' ? 'Dual Saw/Tri ADSR' : 'PeriodicWave Custom',
      activeColor: 'border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.35)]',
    },
    {
      id: 'filter',
      title: 'Filtro Lowpass',
      subtitle: `${Math.round(settings.filterCutoff)}Hz (Q=${settings.filterResonance.toFixed(1)})`,
      activeColor: 'border-indigo-400 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.35)]',
    },
    {
      id: 'delay',
      title: 'Delay Espacial',
      subtitle: `${Math.round(settings.delayTime * 1000)}ms (${Math.round(settings.delayMix * 100)}% wet)`,
      activeColor: 'border-sky-400 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.35)]',
    },
    {
      id: 'reverb',
      title: 'Reverb Convolutiva',
      subtitle: `${settings.reverbSpace} (${settings.reverbDecay.toFixed(1)}s)`,
      activeColor: 'border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(192,132,252,0.35)]',
    },
    {
      id: 'master',
      title: 'Salida Máster',
      subtitle: `Limitador + Analizador`,
      activeColor: 'border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.35)]',
    },
  ];

  return (
    <div className="w-full bg-[#06091f]/85 border border-indigo-500/20 rounded-2xl p-4.5 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-200 font-medium">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Cadena de Señal Web Audio API</span>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Enrutamiento en serie con bifurcaciones Dry/Wet
        </div>
      </div>

      <div className="overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center justify-between gap-1 sm:gap-2 min-w-[620px]">
          {nodes.map((node, index) => (
            <React.Fragment key={node.id}>
              <div
                className={`flex-1 rounded-xl p-2.5 border transition-all text-center ${
                  isPlaying
                    ? `${node.activeColor} bg-[#0c133f]`
                    : 'bg-[#090e29]/80 border-indigo-500/20 text-slate-200'
                }`}
              >
                <div className="text-xs font-bold font-mono tracking-wide mb-0.5 text-white">
                  {node.title}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  {node.subtitle}
                </div>
              </div>

              {index < nodes.length - 1 && (
                <div className="flex items-center justify-center text-indigo-400/40 px-0.5">
                  <ArrowRight
                    className={`w-3.5 h-3.5 transition-all ${
                      isPlaying ? 'text-cyan-400 animate-pulse' : ''
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
