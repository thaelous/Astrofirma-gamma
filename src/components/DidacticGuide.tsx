import React from 'react';
import { BookOpen, Binary, Music, Disc3 } from 'lucide-react';

export const DidacticGuide: React.FC = () => {
  return (
    <section className="w-full bg-[#06091f]/85 border border-indigo-500/20 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-6">
      <div className="flex items-center gap-2.5 pb-3 border-b border-indigo-500/20">
        <BookOpen className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-bold font-['Cinzel',serif] tracking-wider text-white">
          ¿Cómo se transforma tu nombre?
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module 1: Math */}
        <div className="rounded-xl bg-[#090e2a]/80 border border-indigo-500/20 p-5 space-y-3 shadow-inner">
          <div className="flex items-center gap-2 text-sky-300 font-semibold font-mono text-sm">
            <Binary className="w-4 h-4 text-sky-400" />
            <span>1. La Matemática (De Letra a Coordenada)</span>
          </div>
          <p className="text-xs text-slate-300/90 leading-relaxed">
            Cada carácter tipográfico ingresado se mapea a su valor entero en la tabla estándar <strong className="text-white">ASCII</strong> (por ejemplo, <span className="font-mono text-amber-300">A = 65</span>, <span className="font-mono text-amber-300">L = 76</span>). Estos forman pares ordenados discretos <span className="font-mono text-cyan-300">(x_i, y_i)</span> donde el índice representa el tiempo o posición ordinal.
          </p>
          <p className="text-xs text-slate-300/90 leading-relaxed">
            El <strong className="text-white">Polinomio de Lagrange</strong> calcula una función continua analítica de grado <span className="font-mono text-indigo-300">N-1</span> que interseca de manera exacta cada nodo. Paralelamente, la <strong className="text-white">Serie de Fourier</strong> descompone la curva en armónicos ortogonales de senos y cosenos.
          </p>
        </div>

        {/* Module 2: Melody */}
        <div className="rounded-xl bg-[#090e2a]/80 border border-indigo-500/20 p-5 space-y-3 shadow-inner">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold font-mono text-sm">
            <Music className="w-4 h-4 text-indigo-400" />
            <span>2. La Melodía (De Coordenada a Nota Musical)</span>
          </div>
          <p className="text-xs text-slate-300/90 leading-relaxed">
            El valor ASCII <span className="font-mono text-cyan-300">y_i</span> se interpreta como una altura en la escala <strong className="text-white">MIDI estándar</strong>. A partir de allí, se aplica la fórmula universal de la escala temperada cromática:
          </p>
          <div className="rounded-lg bg-[#03040e] p-2.5 font-mono text-center text-xs text-sky-300 border border-indigo-500/25 shadow-inner">
            f = 440 &times; 2<sup>(MIDI - 69) / 12</sup>
          </div>
          <p className="text-xs text-slate-300/90 leading-relaxed">
            Cada semitono dista una proporción de <span className="font-mono text-indigo-300">&radic;[12]{2} &approx; 1.05946</span>. Así, letras contiguas generan intervalos armónicos deterministas regidos por la estructura fonética de tu palabra.
          </p>
        </div>

        {/* Module 3: Timbre & Space */}
        <div className="rounded-xl bg-[#090e2a]/80 border border-indigo-500/20 p-5 space-y-3 shadow-inner">
          <div className="flex items-center gap-2 text-purple-300 font-semibold font-mono text-sm">
            <Disc3 className="w-4 h-4 text-purple-400" />
            <span>3. El Timbre y el Espacio Tridimensional</span>
          </div>
          <p className="text-xs text-slate-300/90 leading-relaxed">
            En el <strong className="text-white">Modo Tono Timbral</strong>, la forma de onda ya no es una simple senoidal o sierra: se utiliza una <span className="font-mono text-cyan-300">PeriodicWave</span> sintetizada con la Transformada Discreta de Fourier de tu nombre. La geometría de las letras moldea literalmente el contenido de armónicos pares e impares.
          </p>
          <p className="text-xs text-slate-300/90 leading-relaxed">
            Por último, el <strong className="text-white">Delay</strong> con realimentación y la <strong className="text-white">Convolución estéreo</strong> simulan la dispersión física de la onda en salas acústicas sintéticas (Salón, Cueva, Galaxia), creando profundidad psicoacústica 3D sin librerías externas.
          </p>
        </div>
      </div>
    </section>
  );
};
