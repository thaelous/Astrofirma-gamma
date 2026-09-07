import React, { useEffect } from 'react';
import {
  X,
  BookOpen,
  Binary,
  FunctionSquare,
  Music,
  Disc3,
  Compass,
  Sparkles,
  Mic,
} from 'lucide-react';

interface MathGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MathGuideModal: React.FC<MathGuideModalProps> = ({ isOpen, onClose }) => {
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

  return (
    <div
      id="math-guide-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="math-guide-modal-card"
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-[#06091f] border border-indigo-500/30 shadow-[0_0_60px_rgba(79,70,229,0.3)] text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-indigo-500/20 bg-[#080d28]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-sky-500/20 border border-sky-400/40 flex items-center justify-center text-cyan-400 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-['Cinzel',serif] tracking-wide text-white flex items-center gap-2">
                <span>Fundamento Matemático y Acústico</span>
              </h2>
              <p className="text-xs text-slate-400">
                De la tipografía a la geometría cartesiana y la síntesis sonora espacial
              </p>
            </div>
          </div>

          <button
            id="math-guide-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-indigo-950/60 border border-transparent hover:border-indigo-500/30 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-indigo-500/30 leading-relaxed text-sm">
          {/* SECTION 1: DE LETRA A COORDENADA */}
          <div className="p-5 rounded-xl bg-[#090e2a]/90 border border-indigo-500/20 space-y-3 shadow-inner">
            <div className="flex items-center gap-2.5 text-sky-300 font-bold font-mono text-sm pb-2 border-b border-indigo-500/20">
              <Binary className="w-4 h-4 text-sky-400" />
              <span>1. De Letra a Coordenada Cartesiana</span>
            </div>
            <p className="text-xs text-slate-300">
              Cada carácter alfanumérico que compone tu nombre posee un código entero determinista en el estándar universal <strong className="text-white">ASCII (American Standard Code for Information Interchange)</strong>. Por ejemplo, en <span className="font-mono text-amber-300 font-bold">ALTAIR</span>:
            </p>
            <div className="grid grid-cols-6 gap-2 text-center font-mono text-xs my-2">
              <div className="bg-[#040614] p-2 rounded border border-indigo-500/20">
                <span className="text-white block font-bold">A</span>
                <span className="text-cyan-400 text-[11px]">65</span>
              </div>
              <div className="bg-[#040614] p-2 rounded border border-indigo-500/20">
                <span className="text-white block font-bold">L</span>
                <span className="text-cyan-400 text-[11px]">76</span>
              </div>
              <div className="bg-[#040614] p-2 rounded border border-indigo-500/20">
                <span className="text-white block font-bold">T</span>
                <span className="text-cyan-400 text-[11px]">84</span>
              </div>
              <div className="bg-[#040614] p-2 rounded border border-indigo-500/20">
                <span className="text-white block font-bold">A</span>
                <span className="text-cyan-400 text-[11px]">65</span>
              </div>
              <div className="bg-[#040614] p-2 rounded border border-indigo-500/20">
                <span className="text-white block font-bold">I</span>
                <span className="text-cyan-400 text-[11px]">73</span>
              </div>
              <div className="bg-[#040614] p-2 rounded border border-indigo-500/20">
                <span className="text-white block font-bold">R</span>
                <span className="text-cyan-400 text-[11px]">82</span>
              </div>
            </div>
            <p className="text-xs text-slate-300">
              Estos valores forman una secuencia ordenada de puntos discretos <span className="font-mono text-cyan-300 font-medium">(xᵢ, yᵢ)</span> en el plano cartesiano bidimensional ℝ², donde la abscisa <span className="font-mono text-indigo-300">xᵢ</span> representa el índice temporal cardinal y la ordenada <span className="font-mono text-cyan-300">yᵢ</span> representa la magnitud o código de altura inicial.
            </p>
          </div>

          {/* SECTION 2: LA ECUACIÓN CONTINUA */}
          <div className="p-5 rounded-xl bg-[#090e2a]/90 border border-indigo-500/20 space-y-3 shadow-inner">
            <div className="flex items-center gap-2.5 text-indigo-300 font-bold font-mono text-sm pb-2 border-b border-indigo-500/20">
              <FunctionSquare className="w-4 h-4 text-indigo-400" />
              <span>2. La Ecuación Continua (Lagrange & Fourier)</span>
            </div>
            <p className="text-xs text-slate-300">
              Para unir los puntos discretos en una curva matemática suave y continua sin recurrir a trazos arbitrarios, se implementan dos aproximaciones analíticas rigurosas:
            </p>
            <div className="space-y-3">
              <div className="bg-[#040614] p-3 rounded-lg border border-indigo-500/25 space-y-1.5">
                <span className="text-xs font-mono font-bold text-sky-300 block">
                  &bull; Polinomio de Interpolación de Lagrange:
                </span>
                <p className="text-xs text-slate-400">
                  Calcula un polinomio analítico único de grado N - 1 que pasa con exactitud matemática absoluta por todos y cada uno de los puntos (xᵢ, yᵢ):
                </p>
                <div className="py-1 text-center font-mono text-xs text-cyan-300 bg-[#070b24] rounded border border-indigo-500/20">
                  P(x) = &sum;<sub>i=0</sub><sup>N-1</sup> y<sub>i</sub> &prod;<sub>j &ne; i</sub> [(x - x<sub>j</sub>) / (x<sub>i</sub> - x<sub>j</sub>)]
                </div>
              </div>

              <div className="bg-[#040614] p-3 rounded-lg border border-indigo-500/25 space-y-1.5">
                <span className="text-xs font-mono font-bold text-purple-300 block">
                  &bull; Serie Armónica Truncada de Fourier:
                </span>
                <p className="text-xs text-slate-400">
                  Aplica la Transformada Discreta de Fourier (DFT) para descomponer la silueta en una superposición de armónicos ortogonales de senos y cosenos:
                </p>
                <div className="py-1 text-center font-mono text-xs text-purple-300 bg-[#070b24] rounded border border-indigo-500/20">
                  f(t) = a<sub>0</sub> + &sum;<sub>k=1</sub><sup>K</sup> [a<sub>k</sub> cos(k &omega; t) + b<sub>k</sub> sin(k &omega; t)]
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: DE COORDENADA A NOTA MUSICAL */}
          <div className="p-5 rounded-xl bg-[#090e2a]/90 border border-indigo-500/20 space-y-3 shadow-inner">
            <div className="flex items-center gap-2.5 text-teal-300 font-bold font-mono text-sm pb-2 border-b border-indigo-500/20">
              <Music className="w-4 h-4 text-teal-400" />
              <span>3. De Coordenada a Nota Musical (Afinación Temperada)</span>
            </div>
            <p className="text-xs text-slate-300">
              El valor entero y<sub>i</sub> se vincula directamente a un número de tecla en el protocolo internacional <strong className="text-white">MIDI</strong> (Musical Instrument Digital Interface), donde 60 corresponde a C4 (Do central) y 69 corresponde a A4 (La 440 Hz).
            </p>
            <div className="bg-[#040614] p-3 rounded-lg border border-teal-500/25 space-y-1.5">
              <div className="text-center font-mono text-sm text-teal-300 font-bold">
                f = 440 &times; 2<sup>(MIDI - 69) / 12</sup>
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Fórmula universal de frecuencia física en la escala temperada de 12 tonos (12-TET)
              </p>
            </div>
            <p className="text-xs text-slate-300">
              Dado que la relación entre semitonos consecutivos es constante (¹²&radic;2 &asymp; 1.05946), la estructura ortográfica de cada palabra genera una firma sonora armónica única e irrepetible.
            </p>
          </div>

          {/* SECTION 4: TIMBRE Y GEOMETRÍA ESPACIAL */}
          <div className="p-5 rounded-xl bg-[#090e2a]/90 border border-indigo-500/20 space-y-3 shadow-inner">
            <div className="flex items-center gap-2.5 text-purple-300 font-bold font-mono text-sm pb-2 border-b border-indigo-500/20">
              <Disc3 className="w-4 h-4 text-purple-400" />
              <span>4. Timbre y Geometría Espacial 3D</span>
            </div>
            <p className="text-xs text-slate-300">
              En el <strong className="text-white">Modo Tono Timbral</strong>, la forma geométrica de la firma modula directamente la textura acústica. Mediante la API <span className="font-mono text-cyan-300">PeriodicWave</span> de Web Audio, los coeficientes de Fourier (a<sub>k</sub>, b<sub>k</sub>) actúan como ponderaciones armónicas en una síntesis aditiva en tiempo real.
            </p>
            <div className="p-3 bg-[#040614] rounded-lg border border-purple-500/25 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-2 text-purple-300 font-semibold font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                Acústica 3D por Convolución Estéreo
              </div>
              <p className="text-[11px] text-slate-400">
                La señal atraviesa un <strong className="text-white">ConvolverNode</strong> cargado con una respuesta de impulso estéreo sintetizada algorítmicamente. La dispersión simula reflexiones primarias y cola de reverberación difusa en tres entornos acústicos seleccionables: <strong className="text-sky-300">Salón</strong> (cálido y controlado), <strong className="text-cyan-300">Cueva</strong> (profundo y resonante) o <strong className="text-purple-300">Galaxia</strong> (etéreo y expansivo).
              </p>
            </div>
          </div>

          {/* SECTION 5: DECODIFICACIÓN ACÚSTICA INVERSA (MODO RECEPTOR) */}
          <div className="p-5 rounded-xl bg-[#090e2a]/90 border border-cyan-500/30 space-y-3 shadow-inner">
            <div className="flex items-center gap-2.5 text-cyan-300 font-bold font-mono text-sm pb-2 border-b border-indigo-500/20">
              <Mic className="w-4 h-4 text-cyan-400" />
              <span>5. Decodificación Acústica Inversa (Modo Receptor)</span>
            </div>
            <p className="text-xs text-slate-300">
              El <strong className="text-white">Modo Receptor</strong> implementa el proceso inverso matemático en tiempo real a través del micrófono del navegador (<span className="font-mono text-cyan-300">getUserMedia</span>):
            </p>
            <div className="bg-[#040614] p-3 rounded-lg border border-cyan-500/25 space-y-2 text-xs">
              <div className="text-cyan-300 font-mono font-semibold">
                &bull; Detección de Tono por Autocorrelación Temporal:
              </div>
              <p className="text-[11px] text-slate-400 font-mono pl-3">
                r(k) = &Sigma; x[i] &bull; x[i + k] &emsp;&rarr;&emsp; Interpolación parabólica en k* para estimar f en Hz
              </p>
              <div className="text-cyan-300 font-mono font-semibold">
                &bull; Ecuación Inversa de Hertz a MIDI y ASCII:
              </div>
              <div className="bg-[#080d28] p-2 rounded text-center font-mono text-sm text-sky-200">
                MIDI = round( 69 + 12 &times; log<sub>2</sub>( f / 440 ) ) &emsp;&rarr;&emsp; Carácter = String.fromCharCode(MIDI)
              </div>
            </div>
            <p className="text-xs text-slate-300">
              Al concluir la secuencia por silencio natural, se reconstruye el nombre letra a letra y se traza de inmediato su polinomio cartesiano original.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-indigo-500/20 bg-[#080d28]/80">
          <button
            id="close-math-guide-btn"
            type="button"
            onClick={onClose}
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white font-semibold text-xs font-mono tracking-wide shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
