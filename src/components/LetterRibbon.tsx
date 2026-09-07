import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { LetterPoint } from '../types';
import { Music, Hash, Volume2 } from 'lucide-react';

interface LetterRibbonProps {
  points: LetterPoint[];
  activeStep: number;
  pitchShift: number;
  onPreviewNote: (frequency: number) => void;
}

export const LetterRibbon: React.FC<LetterRibbonProps> = ({
  points,
  activeStep,
  pitchShift,
  onPreviewNote,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [previewStep, setPreviewStep] = useState<number | null>(null);

  // Auto-scroll the ribbon to smoothly center the letter currently sounding
  useEffect(() => {
    const currentActive = activeStep >= 0 ? activeStep : previewStep;
    if (currentActive !== null && currentActive !== undefined && currentActive >= 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeCard = document.getElementById(`letter-card-${currentActive}`);
      if (activeCard) {
        const containerRect = container.getBoundingClientRect();
        const cardRect = activeCard.getBoundingClientRect();

        // Calculate scroll offset to center the active card
        const offsetWithinContainer = cardRect.left - containerRect.left;
        const targetScrollLeft =
          container.scrollLeft +
          offsetWithinContainer -
          containerRect.width / 2 +
          cardRect.width / 2;

        container.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: 'smooth',
        });
      }
    }
  }, [activeStep, previewStep]);

  const handleCardClick = (index: number, freq: number) => {
    setPreviewStep(index);
    onPreviewNote(freq);
    setTimeout(() => {
      setPreviewStep((prev) => (prev === index ? null : prev));
    }, 450);
  };

  return (
    <div className="w-full bg-[#06091f]/85 border border-indigo-500/20 rounded-2xl p-3.5 sm:p-4.5 backdrop-blur-md shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-2.5 sm:mb-3">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-cyan-400 shrink-0" />
          <h2 className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-slate-200 font-mono truncate">
            Mapeo de Datos & Equivalencias Acústicas
          </h2>
        </div>
        <div className="text-[10px] sm:text-xs text-slate-400 font-mono truncate">
          Fórmula:&nbsp;
          <span className="text-sky-300 font-medium">f = 440 &times; 2^((MIDI - 69) / 12)</span>
        </div>
      </div>

      {/* Horizontal ribbon / tape with auto-scroll tracking */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-indigo-500/40 scrollbar-track-transparent scroll-smooth"
      >
        <div className="flex items-stretch gap-2 sm:gap-2.5 min-w-max px-1">
          {points.map((p, idx) => {
            const isActive = activeStep === p.index || previewStep === p.index;
            const shiftedMidi = p.midiNote + pitchShift;
            const currentFreq = 440 * Math.pow(2, (shiftedMidi - 69) / 12);

            return (
              <motion.div
                key={`${p.index}-${p.char}`}
                id={`letter-card-${p.index}`}
                initial={{ opacity: 0, y: 14, scale: 0.94 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: isActive ? 1.08 : 1,
                }}
                transition={{
                  duration: 0.35,
                  delay: idx * 0.045,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -3, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleCardClick(p.index, currentFreq)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleCardClick(p.index, currentFreq);
                  }
                }}
                className={`group relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer min-w-[76px] sm:min-w-[84px] select-none ${
                  isActive
                    ? 'bg-gradient-to-b from-indigo-500/60 via-cyan-500/40 to-sky-600/35 border-cyan-300 shadow-[0_0_28px_rgba(56,189,248,0.7),inset_0_0_14px_rgba(56,189,248,0.35)] ring-2 ring-cyan-400/60 z-20'
                    : 'bg-[#090e29]/80 border-indigo-500/20 hover:border-indigo-400/60 hover:bg-[#0c133a]/80'
                }`}
              >
                {/* Active glow beacon */}
                {isActive && (
                  <span className="absolute -top-1.5 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-85"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-300 shadow-[0_0_8px_#38bdf8]"></span>
                  </span>
                )}

                {/* Top: Position X */}
                <span
                  className={`text-[10px] font-mono transition-colors ${
                    isActive
                      ? 'text-cyan-200 font-bold drop-shadow-[0_0_4px_rgba(56,189,248,0.8)]'
                      : 'text-indigo-300/70'
                  }`}
                >
                  x = {p.index}
                </span>

                {/* Big Character */}
                <div
                  className={`my-1 text-2xl font-bold font-mono tracking-wider transition-all ${
                    isActive
                      ? 'text-cyan-100 drop-shadow-[0_0_12px_rgba(56,189,248,1)] font-black'
                      : 'text-white group-hover:text-cyan-300'
                  }`}
                >
                  {p.char}
                </div>

                {/* ASCII Code (Y) */}
                <div
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border mb-1.5 shadow-inner transition-all ${
                    isActive
                      ? 'bg-cyan-950/90 text-cyan-200 border-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.5)] font-bold'
                      : 'bg-[#0c1236] text-indigo-200 border-indigo-500/30'
                  }`}
                >
                  y = {p.ascii}
                </div>

                {/* Musical Note & Hz */}
                <div className="flex flex-col items-center gap-0.5 text-center">
                  <div
                    className={`flex items-center gap-1 text-xs font-semibold font-mono transition-colors ${
                      isActive
                        ? 'text-cyan-200 drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]'
                        : 'text-sky-300'
                    }`}
                  >
                    <Music
                      className={`w-3 h-3 ${
                        isActive ? 'text-cyan-300 animate-bounce' : 'text-sky-400'
                      }`}
                    />
                    <span>{p.noteName}</span>
                  </div>
                  <div
                    className={`text-[10px] font-mono transition-colors ${
                      isActive ? 'text-cyan-200/90 font-medium' : 'text-slate-400'
                    }`}
                  >
                    {currentFreq.toFixed(1)} Hz
                  </div>
                </div>

                {/* Audio preview icon on hover */}
                <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400">
                  <Volume2 className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
