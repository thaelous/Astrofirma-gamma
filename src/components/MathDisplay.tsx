import React, { useState, useMemo } from 'react';
import { LetterPoint, MathMode } from '../types';
import { computeFourierCoefficients } from '../utils/math';
import { Sigma, Waves, Copy, Check, Calculator } from 'lucide-react';

interface MathDisplayProps {
  points: LetterPoint[];
  mode: MathMode;
  onModeChange: (mode: MathMode) => void;
}

export const MathDisplay: React.FC<MathDisplayProps> = ({
  points,
  mode,
  onModeChange,
}) => {
  const [copied, setCopied] = useState(false);

  // Compute Lagrange basis representation
  const lagrangeTerms = useMemo(() => {
    const n = points.length;
    if (n === 0) return [];
    return points.map((p, i) => {
      let divisor = 1;
      const roots: number[] = [];
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          divisor *= (p.index - points[j].index);
          roots.push(points[j].index);
        }
      }
      return {
        i: p.index,
        char: p.char,
        yi: p.ascii,
        roots,
        divisor,
      };
    });
  }, [points]);

  // Compute Fourier coefficients
  const fourier = useMemo(() => {
    return computeFourierCoefficients(points);
  }, [points]);

  // Build formula text for copying
  const formulaText = useMemo(() => {
    if (mode === 'lagrange') {
      if (lagrangeTerms.length === 0) return 'P(x) = 0';
      const terms = lagrangeTerms.map((t) => {
        const product = t.roots.map((r) => `(x - ${r})`).join('');
        const sign = t.divisor < 0 ? '-' : '+';
        const absDivisor = Math.abs(t.divisor);
        return ` ${sign} (${t.yi} / ${absDivisor}) * ${product}`;
      }).join('\n');
      return `P(x) =\n${terms}`;
    } else {
      let str = `f(x) = ${fourier.a0.toFixed(2)}`;
      fourier.a.forEach((ak, idx) => {
        const k = idx + 1;
        const bk = fourier.b[idx];
        const aSign = ak >= 0 ? '+' : '-';
        const bSign = bk >= 0 ? '+' : '-';
        str += `\n  ${aSign} ${Math.abs(ak).toFixed(2)}*cos(2π*${k}*x/${points.length}) ${bSign} ${Math.abs(bk).toFixed(2)}*sin(2π*${k}*x/${points.length})`;
      });
      return str;
    }
  }, [mode, lagrangeTerms, fourier, points]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formulaText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-[#06091f]/85 border border-indigo-500/20 rounded-2xl p-3.5 sm:p-5 backdrop-blur-md shadow-xl">
      {/* Header with Mode Toggle and Copy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-indigo-500/20">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-cyan-400 shrink-0" />
          <h2 className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-slate-200 font-mono">
            Fórmula Matemática Continua
          </h2>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {/* Toggle buttons */}
          <div className="grid grid-cols-2 sm:inline-flex rounded-xl bg-[#090d28]/90 p-1 border border-indigo-500/30 shadow-inner flex-1 sm:flex-initial gap-1">
            <button
              id="toggle-lagrange"
              type="button"
              onClick={() => onModeChange('lagrange')}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                mode === 'lagrange'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)] font-semibold'
                  : 'text-indigo-200/80 hover:text-white hover:bg-indigo-950/40'
              }`}
            >
              <Sigma className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">Lagrange</span>
              <span className="hidden sm:inline">Polinomio de Lagrange</span>
            </button>
            <button
              id="toggle-fourier"
              type="button"
              onClick={() => onModeChange('fourier')}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                mode === 'fourier'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)] font-semibold'
                  : 'text-indigo-200/80 hover:text-white hover:bg-indigo-950/40'
              }`}
            >
              <Waves className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">Fourier</span>
              <span className="hidden sm:inline">Serie de Fourier</span>
            </button>
          </div>

          <button
            id="copy-formula-btn"
            onClick={handleCopy}
            title="Copiar fórmula matemática"
            className="p-2 rounded-xl bg-[#0a0f2e] border border-indigo-500/30 text-indigo-200 hover:text-white hover:border-cyan-400 transition-all cursor-pointer shadow-sm shrink-0"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Formula Rendering Box */}
      <div className="relative rounded-xl bg-[#03040e]/95 border border-indigo-500/25 p-3 sm:p-4 font-mono text-[11px] sm:text-xs overflow-x-auto text-slate-200 shadow-inner max-h-56 scrollbar-thin scrollbar-thumb-indigo-500/30">
        {mode === 'lagrange' ? (
          <div>
            {/* Mathematical Compact Header */}
            <div className="text-sky-300 font-semibold mb-2 flex flex-wrap items-center gap-2">
              <span>P(x) = &sum;<sub>i=0</sub><sup>N-1</sup> y<sub>i</sub> &sdot; &ell;<sub>i</sub>(x)</span>
              <span className="text-slate-400 font-normal">
                donde &ell;<sub>i</sub>(x) = &prod;<sub>j&ne;i</sub> (x - x<sub>j</sub>)/(x<sub>i</sub> - x<sub>j</sub>)
              </span>
            </div>

            {/* Explicit expansion terms */}
            <div className="space-y-1.5 text-slate-300 leading-relaxed font-mono">
              <div className="text-slate-400">Desarrollo explícito para cada letra:</div>
              {lagrangeTerms.map((t, idx) => (
                <div key={t.i} className="pl-2.5 border-l-2 border-indigo-500/40 py-0.5">
                  <span className="text-amber-300 font-bold">[{t.char}]</span>{' '}
                  <span className="text-cyan-300 font-semibold">{t.yi}</span> &times;&nbsp;
                  <span className="text-indigo-200">
                    [&prod;<sub>j&ne;{t.i}</sub> (x - {t.roots.join(', ')}) / ({t.divisor})]
                  </span>
                  {idx < lagrangeTerms.length - 1 && <span className="text-indigo-400 ml-2">+</span>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Fourier Compact Header */}
            <div className="text-sky-300 font-semibold mb-2">
              f(x) = a<sub>0</sub> + &sum;<sub>k=1</sub><sup>M</sup> [ a<sub>k</sub>&middot;cos(2&pi;kx/N) + b<sub>k</sub>&middot;sin(2&pi;kx/N) ]
            </div>

            <div className="space-y-1.5 text-slate-300 leading-relaxed font-mono">
              <div className="text-slate-400">
                Valor medio (DC): <span className="text-cyan-300 font-semibold">{fourier.a0.toFixed(3)}</span> | Armónicos calculados: <span className="text-cyan-300 font-semibold">{fourier.harmonics}</span>
              </div>
              {fourier.a.map((ak, idx) => {
                const k = idx + 1;
                const bk = fourier.b[idx];
                return (
                  <div key={k} className="pl-2.5 border-l-2 border-indigo-500/40 py-0.5 flex flex-wrap gap-x-2">
                    <span className="text-amber-300 font-bold">k = {k}:</span>
                    <span>
                      <span className="text-indigo-300">a<sub>{k}</sub></span> = <span className="text-cyan-300 font-mono">{ak.toFixed(3)}</span>
                    </span>
                    <span className="text-indigo-500">|</span>
                    <span>
                      <span className="text-indigo-300">b<sub>{k}</sub></span> = <span className="text-cyan-300 font-mono">{bk.toFixed(3)}</span>
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      (frecuencia armónica {k}&times;f<sub>0</sub>)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
