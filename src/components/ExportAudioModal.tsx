import React, { useState } from 'react';
import {
  X,
  Download,
  FileAudio,
  AudioWaveform,
  Sparkles,
  Check,
  Music,
  Sliders,
  Layers,
  Play,
  RotateCcw,
} from 'lucide-react';
import { AudioSettings, LetterPoint, SynthMode } from '../types';
import { renderAudioSignatureOffline, downloadBlob, ExportResult } from '../utils/audioExport';

interface ExportAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  word: string;
  points: LetterPoint[];
  settings: AudioSettings;
}

export const ExportAudioModal: React.FC<ExportAudioModalProps> = ({
  isOpen,
  onClose,
  word,
  points,
  settings,
}) => {
  const [selectedMode, setSelectedMode] = useState<SynthMode>(settings.mode);
  const [loops, setLoops] = useState<number>(2);
  const [durationSeconds, setDurationSeconds] = useState<number>(10);
  const [sampleRate, setSampleRate] = useState<number>(44100);

  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgressText, setRenderProgressText] = useState<string>('');
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate estimated duration
  const stepSeconds = 60 / settings.bpm;
  const reverbTail = Math.max(2.0, settings.reverbDecay + 1.0);
  const estimatedSeconds =
    selectedMode === 'melodic'
      ? points.length * loops * stepSeconds + reverbTail
      : durationSeconds + reverbTail;
  const estimatedKbytes = Math.round((estimatedSeconds * sampleRate * 2 * 2) / 1024);

  const handleStartRender = async () => {
    setIsRendering(true);
    setErrorMsg(null);
    setExportResult(null);
    setRenderProgressText('Iniciando síntesis en OfflineAudioContext...');

    try {
      await new Promise((r) => setTimeout(r, 60)); // Yield to paint UI
      setRenderProgressText('Calculando osciladores armónicos y cadena DSP...');

      const result = await renderAudioSignatureOffline({
        word,
        points,
        settings,
        mode: selectedMode,
        loops,
        durationSeconds,
        sampleRate,
      });

      setRenderProgressText('Codificando WAV PCM 16-bit estéreo...');
      await new Promise((r) => setTimeout(r, 40));

      setExportResult(result);
      // Auto-trigger download
      downloadBlob(result.blob, result.filename);
    } catch (err) {
      console.error('Error exportando firma de audio:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Error al exportar el archivo de audio.');
    } finally {
      setIsRendering(false);
      setRenderProgressText('');
    }
  };

  const handleManualDownload = () => {
    if (exportResult) {
      downloadBlob(exportResult.blob, exportResult.filename);
    }
  };

  const cleanWord = (word.trim().toUpperCase() || 'FIRMA');

  return (
    <div
      id="export-audio-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRendering) {
          onClose();
        }
      }}
    >
      <div
        id="export-audio-modal-card"
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-[#06091f] border border-indigo-500/30 shadow-[0_0_50px_rgba(79,70,229,0.25)] text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-indigo-500/20 bg-[#080d28]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-sky-500/20 border border-sky-400/40 flex items-center justify-center text-cyan-400 shadow-inner">
              <FileAudio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-['Cinzel',serif] tracking-wide text-white flex items-center gap-2">
                <span>Exportar Firma de Audio</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-400/30 text-cyan-300">
                  WAV 16-BIT
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Renderizado sin compresión destructiva con Web Audio API Offline
              </p>
            </div>
          </div>

          <button
            id="modal-close-btn"
            type="button"
            onClick={onClose}
            disabled={isRendering}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-indigo-950/40 border border-transparent hover:border-indigo-500/20 transition-all cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-indigo-500/30">
          {/* Target Word Summary Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#090e2a]/90 border border-indigo-500/25 shadow-inner">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Firma Activa
              </span>
              <div className="text-2xl font-mono font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-indigo-200 to-white">
                {cleanWord}
              </div>
              <div className="text-xs font-mono text-cyan-400/90 mt-1 flex items-center gap-2">
                <span>{points.length} letras</span>
                <span>&bull;</span>
                <span>Tempo {settings.bpm} BPM</span>
                <span>&bull;</span>
                <span>Espacio {settings.reverbSpace.toUpperCase()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-indigo-200 bg-[#0c133a] px-3 py-2 rounded-lg border border-indigo-500/30 self-start sm:self-auto">
              <Music className="w-4 h-4 text-amber-400" />
              <span>
                {points[0]?.noteName || 'C4'} &rarr; {points[points.length - 1]?.noteName || 'C4'}
              </span>
            </div>
          </div>

          {/* Synthesis Mode Choice */}
          <div className="space-y-2.5">
            <label className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. Estilo de Síntesis para Exportación</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                id="export-mode-melodic"
                type="button"
                onClick={() => setSelectedMode('melodic')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedMode === 'melodic'
                    ? 'bg-gradient-to-b from-indigo-950/80 to-[#0c1442] border-cyan-400 shadow-[0_0_18px_rgba(56,189,248,0.25)]'
                    : 'bg-[#080d28]/70 border-indigo-500/20 hover:border-indigo-500/40 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-mono text-sm font-bold text-white">
                    <AudioWaveform className="w-4 h-4 text-sky-400" />
                    <span>Modo Melódico</span>
                  </div>
                  {selectedMode === 'melodic' && (
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Arpegio secuencial de notas calculado directamente desde las coordenadas ASCII de cada letra.
                </p>
              </button>

              <button
                id="export-mode-timbral"
                type="button"
                onClick={() => setSelectedMode('timbral')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedMode === 'timbral'
                    ? 'bg-gradient-to-b from-indigo-950/80 to-[#0c1442] border-cyan-400 shadow-[0_0_18px_rgba(56,189,248,0.25)]'
                    : 'bg-[#080d28]/70 border-indigo-500/20 hover:border-indigo-500/40 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-mono text-sm font-bold text-white">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Modo Timbral (Dron)</span>
                  </div>
                  {selectedMode === 'timbral' && (
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Forma de onda continua generada por la Serie de Fourier de tu firma, rica en armónicos espaciales.
                </p>
              </button>
            </div>
          </div>

          {/* Mode-specific length settings */}
          <div className="space-y-2.5">
            <label className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>2. Duración y Repeticiones</span>
            </label>

            {selectedMode === 'melodic' ? (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { count: 1, label: '1 Ciclo', desc: 'Frase directa' },
                  { count: 2, label: '2 Ciclos', desc: 'Recomendado' },
                  { count: 4, label: '4 Ciclos', desc: 'Secuencia extendida' },
                ].map((item) => (
                  <button
                    key={item.count}
                    id={`export-loop-${item.count}`}
                    type="button"
                    onClick={() => setLoops(item.count)}
                    className={`p-3 rounded-xl border text-center font-mono transition-all cursor-pointer ${
                      loops === item.count
                        ? 'bg-indigo-600/35 border-cyan-400 text-white shadow-sm font-semibold'
                        : 'bg-[#090e29]/80 border-indigo-500/20 text-slate-300 hover:border-indigo-400/50'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { sec: 5, label: '5 Segundos', desc: 'Muestra corta' },
                  { sec: 10, label: '10 Segundos', desc: 'Recomendado' },
                  { sec: 20, label: '20 Segundos', desc: 'Atmósfera larga' },
                ].map((item) => (
                  <button
                    key={item.sec}
                    id={`export-sec-${item.sec}`}
                    type="button"
                    onClick={() => setDurationSeconds(item.sec)}
                    className={`p-3 rounded-xl border text-center font-mono transition-all cursor-pointer ${
                      durationSeconds === item.sec
                        ? 'bg-indigo-600/35 border-cyan-400 text-white shadow-sm font-semibold'
                        : 'bg-[#090e29]/80 border-indigo-500/20 text-slate-300 hover:border-indigo-400/50'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sample rate selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>3. Tasa de Muestreo (Frecuencia de Audio)</span>
            </label>
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <button
                id="export-rate-441"
                type="button"
                onClick={() => setSampleRate(44100)}
                className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                  sampleRate === 44100
                    ? 'bg-indigo-600/35 border-cyan-400 text-white font-semibold'
                    : 'bg-[#090e29]/80 border-indigo-500/20 text-slate-300 hover:border-indigo-400/50'
                }`}
              >
                <div className="font-bold">44.1 kHz &bull; Calidad CD</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Estándar universal para web y reproductores
                </div>
              </button>

              <button
                id="export-rate-480"
                type="button"
                onClick={() => setSampleRate(48000)}
                className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                  sampleRate === 48000
                    ? 'bg-indigo-600/35 border-cyan-400 text-white font-semibold'
                    : 'bg-[#090e29]/80 border-indigo-500/20 text-slate-300 hover:border-indigo-400/50'
                }`}
              >
                <div className="font-bold">48.0 kHz &bull; Calidad Estudio</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Óptimo para producción en DAWs y video
                </div>
              </button>
            </div>
          </div>

          {/* DSP Features Summary */}
          <div className="p-3.5 rounded-xl bg-[#03040e]/90 border border-indigo-500/20 font-mono text-[11px] text-slate-300 space-y-1">
            <div className="text-cyan-400 font-semibold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Cadena de Procesamiento Incluida:
            </div>
            <div className="text-slate-400 pl-5">
              &bull; Doble oscilador con desafinación estéreo y envolvente ADSR
              <br />
              &bull; Filtro Pasa-Bajos ({Math.round(settings.filterCutoff)} Hz, Q: {settings.filterResonance.toFixed(1)})
              <br />
              &bull; Delay estéreo con retroalimentación ({Math.round(settings.delayTime * 1000)} ms)
              <br />
              &bull; Convolución espacial {settings.reverbSpace.toUpperCase()} con cola de reverberación ({settings.reverbDecay.toFixed(1)}s)
              <br />
              &bull; Compresor / Limitador de picos integrado
            </div>
          </div>

          {/* Calculation summary bar */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 bg-[#070c26] p-3 rounded-xl border border-indigo-500/20">
            <span>
              Duración estimada: <strong className="text-white">{estimatedSeconds.toFixed(1)}s</strong>
            </span>
            <span>
              Tamaño archivo: <strong className="text-cyan-300">~{estimatedKbytes} KB</strong>
            </span>
          </div>

          {/* Error display */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-mono">
              {errorMsg}
            </div>
          )}

          {/* Success result player and quick download */}
          {exportResult && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-300 font-bold">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>¡Firma exportada con éxito!</span>
                </div>
                <div className="text-[11px] font-mono text-emerald-400/80">
                  {Math.round(exportResult.sizeBytes / 1024)} KB &bull; {exportResult.duration.toFixed(1)}s
                </div>
              </div>

              {/* Integrated audio preview player */}
              <div className="bg-[#03040e] p-2.5 rounded-lg border border-emerald-500/20 flex flex-col sm:flex-row items-center gap-3">
                <div className="text-xs font-mono text-slate-300 flex items-center gap-1.5 shrink-0">
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Preescucha WAV:</span>
                </div>
                <audio
                  id="preview-rendered-wav"
                  controls
                  src={exportResult.url}
                  className="w-full h-8"
                />
              </div>

              <div className="flex gap-2">
                <button
                  id="re-download-btn"
                  type="button"
                  onClick={handleManualDownload}
                  className="flex-1 h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-xs font-mono flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar de nuevo ({exportResult.filename})</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-indigo-500/20 bg-[#080d28]/70">
          <button
            id="modal-cancel-btn"
            type="button"
            onClick={onClose}
            disabled={isRendering}
            className="px-4 py-2.5 rounded-xl border border-indigo-500/20 text-slate-300 hover:text-white hover:bg-indigo-950/40 text-xs font-mono transition-all cursor-pointer disabled:opacity-40"
          >
            Cerrar
          </button>

          <button
            id="render-export-action-btn"
            type="button"
            onClick={handleStartRender}
            disabled={isRendering}
            className="h-11 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 text-white font-semibold text-xs font-mono tracking-wider flex items-center gap-2 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
          >
            {isRendering ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin text-white" />
                <span>{renderProgressText || 'Renderizando...'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-white" />
                <span>Renderizar y Descargar WAV</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
