import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  RotateCcw,
  Volume2,
  Activity,
  Sliders,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Info,
  Copy,
  Check,
  Music,
  LineChart,
  Radio,
} from 'lucide-react';
import { parseWordToPoints, midiToNoteName, acousticMidiToChar } from '../utils/math';
import { CartesianCanvas } from './CartesianCanvas';
import { LetterPoint } from '../types';

interface DecodedLetter {
  id: string;
  char: string;
  ascii: number;
  midi: number;
  frequency: number;
  noteName: string;
  centsOff: number;
  timestamp: number;
}

interface AcousticDecoderProps {
  onSendToEmitter: (word: string) => void;
}

export const AcousticDecoder: React.FC<AcousticDecoderProps> = ({ onSendToEmitter }) => {
  // Listening state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [hasPermissionError, setHasPermissionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Listo para escuchar. Presiona "Comenzar a Escuchar" para activar el micrófono.'
  );
  const [statusPhase, setStatusPhase] = useState<'idle' | 'waiting' | 'detecting' | 'completed'>(
    'idle'
  );

  // Decoded sequence
  const [decodedLetters, setDecodedLetters] = useState<DecodedLetter[]>([]);
  const [isSequenceCompleted, setIsSequenceCompleted] = useState<boolean>(false);
  const [completedWord, setCompletedWord] = useState<string>('');
  const [completedPoints, setCompletedPoints] = useState<LetterPoint[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  // Live audio metrics
  const [liveFreq, setLiveFreq] = useState<number | null>(null);
  const [liveNoteName, setLiveNoteName] = useState<string>('---');
  const [liveMidi, setLiveMidi] = useState<number | null>(null);
  const [liveRms, setLiveRms] = useState<number>(0);

  // Decoder adjustable parameters
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [noiseThreshold, setNoiseThreshold] = useState<number>(0.020); // RMS threshold
  const [tuningToleranceCents, setTuningToleranceCents] = useState<number>(45); // +/- 45 cents (+/- 0.45 semitonos)
  const [holdTimeMs, setHoldTimeMs] = useState<number>(130); // ms note must be held
  const [silenceTimeoutSec, setSilenceTimeoutSec] = useState<number>(2.4); // sec of silence to complete

  // Refs for Web Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tracking state refs for autocorrelation & state machine inside the audio loop
  const trackingRef = useRef<{
    gateState: 'ESPERA_NOTA' | 'CONFIRMANDO_NOTA' | 'ESPERA_SILENCIO';
    candidateMidi: number | null;
    candidateFreq: number;
    candidateStartTime: number;
    consecutiveFrames: number;
    lastRegisteredMidi: number | null;
    lastRegisteredTime: number;
    silenceStartTime: number | null;
    silenceGateStartTime: number;
    hasLettersSinceStart: boolean;
    noteGapDetected: boolean;
  }>({
    gateState: 'ESPERA_NOTA',
    candidateMidi: null,
    candidateFreq: 0,
    candidateStartTime: 0,
    consecutiveFrames: 0,
    lastRegisteredMidi: null,
    lastRegisteredTime: 0,
    silenceStartTime: null,
    silenceGateStartTime: 0,
    hasLettersSinceStart: false,
    noteGapDetected: true,
  });

  // Keep settings synced in refs to avoid restarting audio loop on slider drag
  const settingsRef = useRef({
    noiseThreshold,
    tuningToleranceCents,
    holdTimeMs,
    silenceTimeoutSec,
  });

  useEffect(() => {
    settingsRef.current = {
      noiseThreshold,
      tuningToleranceCents,
      holdTimeMs,
      silenceTimeoutSec,
    };
  }, [noiseThreshold, tuningToleranceCents, holdTimeMs, silenceTimeoutSec]);

  /**
   * 2. Algoritmo de Autocorrelación Normalizada Robusto:
   * - Busca el PRIMER pico fuerte en el dominio del tiempo (evitando saltos de octava o falsos dobles).
   * - Búfer de 2048 y rango de desfases (lags) entre 150 Hz y 1400 Hz (abecedario ASCII/MIDI).
   */
  const detectPitch = (
    buffer: Float32Array,
    sampleRate: number,
    threshold: number
  ): { freq: number | null; rms: number; clarity: number } => {
    const bufferLength = buffer.length; // 2048

    // 1. Calcular RMS
    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      const val = buffer[i];
      sumSquares += val * val;
    }
    const rms = Math.sqrt(sumSquares / bufferLength);

    if (rms < threshold) {
      return { freq: null, rms, clarity: 0 };
    }

    // 2. Rango de desfases (lags) para notas válidas ASCII/MIDI (110 Hz a 1400 Hz)
    // Permite MIDI 48 (Espacio C3 = 130.81 Hz) hasta MIDI 91 (Ñ D#6 = 1244.51 Hz)
    const minLag = Math.floor(sampleRate / 1400);
    const maxLag = Math.ceil(sampleRate / 110);

    if (maxLag >= bufferLength) {
      return { freq: null, rms, clarity: 0 };
    }

    // Normalizador de energía en lag 0
    const windowLength = bufferLength - maxLag;
    let r0 = 0;
    for (let i = 0; i < windowLength; i++) {
      r0 += buffer[i] * buffer[i];
    }
    if (r0 <= 0.00001) {
      return { freq: null, rms, clarity: 0 };
    }

    const corrValues = new Float32Array(maxLag + 2);
    for (let lag = minLag; lag <= maxLag; lag++) {
      let rLag = 0;
      for (let i = 0; i < windowLength; i++) {
        rLag += buffer[i] * buffer[i + lag];
      }
      corrValues[lag] = rLag / r0;
    }

    // 3. Resolución Anti-Armónica (Evita confusión 'C' 392 Hz vs 'O' 784 Hz):
    // Hallar primero la máxima correlación en toda la banda
    let maxCorr = 0;
    for (let lag = minLag + 1; lag < maxLag; lag++) {
      const c = corrValues[lag];
      if (c > corrValues[lag - 1] && c >= corrValues[lag + 1] && c > maxCorr) {
        maxCorr = c;
      }
    }

    if (maxCorr < 0.52) {
      return { freq: null, rms, clarity: maxCorr };
    }

    // El periodo fundamental corresponde al PRIMER pico local que alcance al menos el 82% de maxCorr
    // Esto asegura que la frecuencia fundamental (lag mayor T0) no sea reemplazada por el segundo armónico 2x (lag menor T0/2)
    let bestLag = -1;
    let bestCorr = 0;
    for (let lag = minLag + 1; lag < maxLag; lag++) {
      const c = corrValues[lag];
      if (c > corrValues[lag - 1] && c >= corrValues[lag + 1] && c >= 0.82 * maxCorr && c >= 0.52) {
        bestLag = lag;
        bestCorr = c;
        break;
      }
    }

    if (bestLag <= 0) {
      return { freq: null, rms, clarity: maxCorr };
    }

    // 4. Interpolación parabólica para afinación continua sub-muestra
    const y1 = corrValues[bestLag - 1] || bestCorr;
    const y2 = corrValues[bestLag];
    const y3 = corrValues[bestLag + 1] || bestCorr;

    const denominator = 2 * (2 * y2 - y1 - y3);
    let delta = 0;
    if (Math.abs(denominator) > 0.000001) {
      delta = (y3 - y1) / denominator;
    }
    const refinedLag = bestLag + delta;
    const fundamentalFreq = sampleRate / refinedLag;

    // Validar dentro del rango exacto 110 Hz - 1400 Hz
    if (fundamentalFreq < 110 || fundamentalFreq > 1400) {
      return { freq: null, rms, clarity: 0 };
    }

    return {
      freq: fundamentalFreq,
      rms,
      clarity: bestCorr,
    };
  };

  // Stop microphone and clean up audio context
  const stopListening = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setIsListening(false);
    setLiveFreq(null);
    setLiveNoteName('---');
    setLiveMidi(null);
    setLiveRms(0);
    setStatusPhase('idle');
    setStatusMessage('Escucha detenida. Micrófono desactivado.');
  }, []);

  // Register a new identified letter into state
  const handleRegisterLetter = useCallback(
    (midi: number, freq: number, centsOff: number) => {
      // Validar rango acústico calibrado
      if (midi < 32 || midi > 126) {
        return;
      }
      // Traduce usando el diccionario acústico estandarizado (Espacio=60, Ñ=91, A-Z=65-90)
      const char = acousticMidiToChar(midi);
      const noteName = midiToNoteName(midi);

      const newLetter: DecodedLetter = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        char,
        ascii: midi,
        midi,
        frequency: freq,
        noteName,
        centsOff,
        timestamp: Date.now(),
      };

      setDecodedLetters((prev) => {
        const updated = [...prev, newLetter];
        const constructed = updated.map((l) => l.char).join('');
        setCompletedWord(constructed);
        setCompletedPoints(parseWordToPoints(constructed));

        // Regla de Cierre de Firma: 3 espacios consecutivos al final
        if (constructed.endsWith('   ') || (updated.length >= 3 && updated.slice(-3).every(l => l.char === ' '))) {
          setIsSequenceCompleted(true);
          setStatusPhase('completed');
          setStatusMessage('¡Firma rematada con éxito! Triple espacio acústico ("   ") detectado.');
        }

        return updated;
      });

      setStatusPhase('detecting');
      setStatusMessage(`Nota detectada: ${noteName} (${char === ' ' ? 'ESPACIO' : char}) a ${freq.toFixed(1)} Hz`);
    },
    []
  );

  // Audio Processing Loop
  const startAudioLoop = useCallback(
    (analyser: AnalyserNode, sampleRate: number) => {
      const bufferLength = analyser.fftSize; // 2048
      const timeDomainBuffer = new Float32Array(bufferLength);
      const canvas = canvasRef.current;
      const ctx = canvas ? canvas.getContext('2d') : null;

      let frameCounter = 0;

      const loop = () => {
        frameCounter++;
        analyser.getFloatTimeDomainData(timeDomainBuffer);

        const { noiseThreshold, holdTimeMs, silenceTimeoutSec } = settingsRef.current;

        // Run robust normalized autocorrelation (first strong peak, 150 Hz - 1400 Hz)
        const { freq, rms } = detectPitch(timeDomainBuffer, sampleRate, noiseThreshold);

        const now = performance.now();
        const tracking = trackingRef.current;

        // Live visual RMS update (every 2 frames)
        if (frameCounter % 2 === 0) {
          setLiveRms(rms);
        }

        // Máquina de estados del Gate de Silencio Estricto
        // Estado 1 (SILENCIO / ESPERA): El RMS debe caer por debajo de 0.02 antes de aceptar cualquier nueva letra
        if (tracking.gateState === 'ESPERA_SILENCIO') {
          if (rms < 0.02) {
            // Caída de volumen confirmada por debajo de 0.02: se desbloquea para la siguiente letra
            tracking.gateState = 'ESPERA_NOTA';
            tracking.candidateMidi = null;
            tracking.consecutiveFrames = 0;
            tracking.silenceGateStartTime = 0;
          }

          if (frameCounter % 4 === 0) {
            setLiveFreq(freq || null);
          }
        } else {
          // Estado 2 (TONO VÁLIDO): El RMS debe superar 0.04 y nota estable durante al menos 4 cuadros consecutivos (~70-90 ms)
          if (rms > 0.04 && freq && freq >= 110 && freq <= 1400) {
            tracking.silenceStartTime = null;

            // 3. Cuantización y Calibración MIDI Precisa:
            const exactMidi = 69 + 12 * Math.log2(freq / 440);
            const midiValue = Math.round(exactMidi);
            const deviation = Math.abs(exactMidi - midiValue); // semitonos

            // Filtro de Rango Válido Estricto:
            // Espacio (48 / C3, 60 / 32), A-Z (65-90), a-z (97-122), Ñ dedicada (91 o 92), Dígitos (49-58)
            const isValidRange =
              midiValue === 48 ||
              midiValue === 60 ||
              midiValue === 32 ||
              (midiValue >= 65 && midiValue <= 90) ||
              (midiValue >= 97 && midiValue <= 122) ||
              midiValue === 91 ||
              midiValue === 92 ||
              (midiValue >= 49 && midiValue <= 58);

            // Descartar si desviación > 0.45 semitonos o fuera de rango
            if (deviation <= 0.45 && isValidRange) {
              const centsOff = (exactMidi - midiValue) * 100;

              if (frameCounter % 2 === 0) {
                setLiveFreq(freq);
                setLiveMidi(midiValue);
                setLiveNoteName(midiToNoteName(midiValue));
              }

              if (tracking.candidateMidi === midiValue) {
                tracking.consecutiveFrames++;
                tracking.gateState = 'CONFIRMANDO_NOTA';

                // Exige al menos 4 cuadros consecutivos estables (~70-90 ms)
                if (tracking.consecutiveFrames >= 4) {
                  tracking.lastRegisteredMidi = midiValue;
                  tracking.lastRegisteredTime = now;
                  tracking.hasLettersSinceStart = true;
                  handleRegisterLetter(midiValue, freq, centsOff);

                  // Regla 3: Pasar inmediatamente a requerir Estado 1 (SILENCIO, RMS < 0.02)
                  // para impedir duplicaciones de letras "OO" y asegurar separación nítida
                  tracking.gateState = 'ESPERA_SILENCIO';
                  tracking.silenceGateStartTime = 0;
                  tracking.consecutiveFrames = 0;
                  tracking.candidateMidi = null;
                }
              } else {
                tracking.candidateMidi = midiValue;
                tracking.candidateFreq = freq;
                tracking.consecutiveFrames = 1;
                tracking.gateState = 'CONFIRMANDO_NOTA';
              }
            } else {
              // Ruido o frecuencia fuera de rango
              tracking.candidateMidi = null;
              tracking.consecutiveFrames = 0;
              tracking.gateState = 'ESPERA_NOTA';
            }
          } else if (rms < 0.02) {
            // Silencio inter-pulsos confirmado
            tracking.candidateMidi = null;
            tracking.consecutiveFrames = 0;
            tracking.gateState = 'ESPERA_NOTA';

            if (frameCounter % 4 === 0) {
              setLiveFreq(null);
              setLiveNoteName('---');
              setLiveMidi(null);
            }
          }

          // Check silence timeout to finalize sequence
          if (tracking.hasLettersSinceStart) {
            if (tracking.silenceStartTime === null) {
              tracking.silenceStartTime = now;
            } else {
              const silenceElapsed = (now - tracking.silenceStartTime) / 1000;
              if (silenceElapsed >= silenceTimeoutSec) {
                // Silence threshold exceeded: finalize sequence!
                tracking.hasLettersSinceStart = false;
                tracking.silenceStartTime = null;
                setIsSequenceCompleted(true);
                setStatusPhase('completed');
                setStatusMessage('¡Secuencia completada! Palabra reconstruida y graficada.');
              } else if (silenceElapsed > 0.6) {
                setStatusPhase('waiting');
                setStatusMessage(
                  `Esperando siguiente nota... (${(silenceTimeoutSec - silenceElapsed).toFixed(
                    1
                  )}s para finalizar)`
                );
              }
            }
          }
        }

        // Draw Live Canvas Visualizer
        if (canvas && ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Subtle dark background
          ctx.fillStyle = '#050718';
          ctx.fillRect(0, 0, w, h);

          // Center horizon line
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();

          // Waveform
          const sliceWidth = w / bufferLength;
          let x = 0;

          // Color based on whether signal is active
          const isSignal = rms >= noiseThreshold;
          const gradient = ctx.createLinearGradient(0, 0, w, 0);
          if (isSignal) {
            gradient.addColorStop(0, '#06b6d4');
            gradient.addColorStop(0.5, '#38bdf8');
            gradient.addColorStop(1, '#818cf8');
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 8;
          } else {
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
            gradient.addColorStop(1, 'rgba(148, 163, 184, 0.35)');
            ctx.shadowBlur = 0;
          }

          ctx.lineWidth = isSignal ? 2.2 : 1.2;
          ctx.strokeStyle = gradient;
          ctx.beginPath();

          for (let i = 0; i < bufferLength; i += 4) {
            const v = timeDomainBuffer[i];
            const y = (v + 1) * (h / 2);

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth * 4;
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Threshold Indicator Line
          const threshY = (1 - noiseThreshold * 8) * (h / 2);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, threshY);
          ctx.lineTo(w, threshY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        animFrameIdRef.current = requestAnimationFrame(loop);
      };

      loop();
    },
    [handleRegisterLetter]
  );

  // Start microphone listening
  const startListening = async () => {
    setHasPermissionError(null);
    setIsSequenceCompleted(false);

    try {
      // 1. Request microphone access
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta captura de micrófono mediante getUserMedia.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      mediaStreamRef.current = stream;

      // 2. Initialize AudioContext
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // 3. Audio Graph: Mic Source -> Filtro Pasa-Bajos (1600 Hz) -> Analyser (2048 buffer)
      const source = audioCtx.createMediaStreamSource(stream);

      // 1. Filtro Pasa-Bajos en la Entrada del Micrófono (Antiartefactos):
      // Elimina armónicos agudos indeseados permitiendo leer la frecuencia fundamental pura.
      const micFilter = audioCtx.createBiquadFilter();
      micFilter.type = 'lowpass';
      micFilter.frequency.value = 1600;

      // Filtro pasa-altos suave a 90 Hz para admitir limpio el espacio C3 (130.8 Hz) y cortar rumble infrasónico
      const highpass = audioCtx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 90;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048; // Buffer exacto de 2048 para autocorrelación
      analyser.smoothingTimeConstant = 0.05;
      analyserRef.current = analyser;

      // Conexión en cadena: Mic -> Pasa-Altos (120Hz) -> Pasa-Bajos (1600Hz) -> Analizador
      source.connect(highpass);
      highpass.connect(micFilter);
      micFilter.connect(analyser);

      // Reset tracking state
      trackingRef.current = {
        candidateMidi: null,
        candidateFreq: 0,
        candidateStartTime: 0,
        lastRegisteredMidi: null,
        lastRegisteredTime: 0,
        silenceStartTime: null,
        hasLettersSinceStart: false,
        noteGapDetected: true,
      };

      setIsListening(true);
      setStatusPhase('waiting');
      setStatusMessage('Esperando señal acústica... Reproduce la firma sonora cerca de este micrófono.');

      // Start detection loop
      startAudioLoop(analyser, audioCtx.sampleRate);
    } catch (err: unknown) {
      console.error('Error al acceder al micrófono:', err);
      const errMsg =
        err instanceof Error
          ? err.message
          : 'No se pudo acceder al micrófono. Verifica los permisos de audio en tu navegador.';
      setHasPermissionError(errMsg);
      setStatusPhase('idle');
      setStatusMessage('Error de acceso al micrófono. Por favor concede permisos.');
      stopListening();
    }
  };

  // Reset and clear sequence
  const handleReset = () => {
    setDecodedLetters([]);
    setCompletedWord('');
    setCompletedPoints([]);
    setIsSequenceCompleted(false);
    trackingRef.current = {
      gateState: 'ESPERA_NOTA',
      candidateMidi: null,
      candidateFreq: 0,
      candidateStartTime: 0,
      consecutiveFrames: 0,
      lastRegisteredMidi: null,
      lastRegisteredTime: 0,
      silenceStartTime: null,
      silenceGateStartTime: 0,
      hasLettersSinceStart: false,
      noteGapDetected: true,
    };
    if (isListening) {
      setStatusPhase('waiting');
      setStatusMessage('Secuencia reiniciada. Esperando notas acústicas...');
    } else {
      setStatusPhase('idle');
      setStatusMessage('Listo para escuchar. Presiona "Comenzar a Escuchar".');
    }
  };

  // Copy reconstructed word
  const handleCopyWord = () => {
    if (completedWord) {
      navigator.clipboard.writeText(completedWord);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return (
    <div className="w-full space-y-6">
      {/* 1. Header Banner & Instructions */}
      <div className="bg-[#06091f]/90 border border-indigo-500/25 rounded-2xl p-5 md:p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-400/30 text-cyan-300 text-xs font-mono">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Decodificador Acústico Inverso en Tiempo Real</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-['Cinzel',serif] text-white tracking-wide">
              Receptor de Firma Sonora (Micrófono)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              Escucha las notas acústicas transmitidas por el altavoz de otro dispositivo (teléfono o
              computadora) a través del aire. El algoritmo de autocorrelación calcula los Hertz de cada tono,
              obtiene el número MIDI mediante la fórmula inversa y reconstruye el nombre letra por letra sin
              servidores ni latencia externa.
            </p>
          </div>

          {/* Action Buttons: Listen & Reset & Settings */}
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
            {!isListening ? (
              <button
                id="btn-start-listening"
                type="button"
                onClick={startListening}
                className="w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-[0_0_20px_rgba(6,182,212,0.45)] hover:shadow-[0_0_28px_rgba(6,182,212,0.65)] transition-all cursor-pointer active:scale-95"
              >
                <Mic className="w-4 h-4 text-cyan-100 shrink-0" />
                <span>Comenzar a Escuchar</span>
              </button>
            ) : (
              <button
                id="btn-stop-listening"
                type="button"
                onClick={stopListening}
                className="w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-rose-600/90 hover:bg-rose-500 border border-rose-400/40 text-white font-mono text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-[0_0_20px_rgba(244,63,94,0.45)] transition-all cursor-pointer active:scale-95 animate-pulse"
              >
                <MicOff className="w-4 h-4 shrink-0" />
                <span>Detener Micrófono</span>
              </button>
            )}

            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
              <button
                id="btn-reset-decoder"
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto justify-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-[#090d28] hover:bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 hover:text-white font-mono text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Reiniciar y borrar secuencia"
              >
                <RotateCcw className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Limpiar</span>
              </button>

              <button
                id="btn-toggle-decoder-settings"
                type="button"
                onClick={() => setShowSettings((s) => !s)}
                className={`w-full sm:w-auto justify-center px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-xl border font-mono text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  showSettings
                    ? 'bg-indigo-600/40 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                    : 'bg-[#090d28] border-indigo-500/30 text-slate-300 hover:text-white hover:bg-indigo-950/50'
                }`}
                title="Ajustes de Sensibilidad y Tolerancia de Afinación"
              >
                <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Ajustes</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Notice if permissions rejected */}
        {hasPermissionError && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs font-mono flex items-start gap-2.5">
            <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Permiso de micrófono requerido: </span>
              <span>{hasPermissionError}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Adjustable Settings Panel (Collapsible) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="bg-[#070b24] border border-cyan-500/30 rounded-2xl p-3.5 sm:p-5 shadow-lg space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-indigo-500/20 pb-2">
                <div className="flex items-center gap-2 text-cyan-300 font-mono text-xs font-semibold uppercase tracking-wider">
                  <Sliders className="w-4 h-4 shrink-0" />
                  <span>Calibración de Entrada y Tolerancia Acústica</span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
                  Optimiza para altavoces o ruido ambiental
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Sensibilidad del Micrófono (Umbral RMS) */}
                <div className="space-y-1.5 bg-[#0a0f30]/80 p-3 rounded-xl border border-indigo-500/20">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Sensibilidad (Umbral RMS):</span>
                    <span className="text-cyan-400 font-bold">{(noiseThreshold * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.008"
                    max="0.08"
                    step="0.002"
                    value={noiseThreshold}
                    onChange={(e) => setNoiseThreshold(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Sensible (silencioso)</span>
                    <span>Estricto (ruidoso)</span>
                  </div>
                </div>

                {/* 2. Tolerancia de Afinación (cents) */}
                <div className="space-y-1.5 bg-[#0a0f30]/80 p-3 rounded-xl border border-indigo-500/20">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Tolerancia de Afinación:</span>
                    <span className="text-cyan-400 font-bold">&plusmn;{tuningToleranceCents} cents</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="50"
                    step="1"
                    value={tuningToleranceCents}
                    onChange={(e) => setTuningToleranceCents(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Estricto (&plusmn;20c)</span>
                    <span>Tolerante (&plusmn;50c)</span>
                  </div>
                </div>

                {/* 3. Ventana Mínima de Nota (Hold time ms) */}
                <div className="space-y-1.5 bg-[#0a0f30]/80 p-3 rounded-xl border border-indigo-500/20">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Ventana Mínima de Nota:</span>
                    <span className="text-cyan-400 font-bold">{holdTimeMs} ms</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="350"
                    step="25"
                    value={holdTimeMs}
                    onChange={(e) => setHoldTimeMs(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Rápido (100ms)</span>
                    <span>Estable (350ms)</span>
                  </div>
                </div>

                {/* 4. Tiempo Fin de Secuencia (silence timeout) */}
                <div className="space-y-1.5 bg-[#0a0f30]/80 p-3 rounded-xl border border-indigo-500/20">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Pausa Fin de Secuencia:</span>
                    <span className="text-cyan-400 font-bold">{silenceTimeoutSec.toFixed(1)} s</span>
                  </div>
                  <input
                    type="range"
                    min="1.4"
                    max="4.0"
                    step="0.2"
                    value={silenceTimeoutSec}
                    onChange={(e) => setSilenceTimeoutSec(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>1.4 s</span>
                    <span>4.0 s</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Visualizador de Entrada Espectral & Métricas en Vivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Live Audio Oscilloscope Canvas */}
        <div className="lg:col-span-2 bg-[#06091f]/90 border border-indigo-500/20 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between backdrop-blur-md shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-2">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-200">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
              <span className="font-semibold uppercase tracking-wider truncate">
                Monitor de Entrada Acústica (Tiempo Real)
              </span>
            </div>

            {/* Signal indicator */}
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  isListening
                    ? liveRms >= noiseThreshold
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                      : 'bg-amber-400/80'
                    : 'bg-slate-600'
                }`}
              />
              <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
                {isListening
                  ? liveRms >= noiseThreshold
                    ? 'Tono en el Aire'
                    : 'Silencio / Esperando'
                  : 'Inactivo'}
              </span>
            </div>
          </div>

          <div className="relative w-full h-32 sm:h-36 rounded-xl overflow-hidden border border-indigo-500/20 bg-[#040615]">
            <canvas ref={canvasRef} width={640} height={144} className="w-full h-full block" />

            {/* Noise Gate threshold label on canvas */}
            <div className="absolute top-2 left-2 text-[10px] font-mono text-rose-400/80 pointer-events-none bg-[#050718]/80 px-1.5 py-0.5 rounded border border-rose-500/30">
              Umbral Ruido: {(noiseThreshold * 100).toFixed(1)}%
            </div>

            {/* Current status pill overlay */}
            <div className="absolute bottom-2 right-2 max-w-[calc(100%-16px)] truncate text-[10px] sm:text-[11px] font-mono text-cyan-300 bg-[#080d28]/90 px-2.5 py-1 rounded-lg border border-cyan-500/30 shadow-md">
              {statusMessage}
            </div>
          </div>
        </div>

        {/* Live Metrics: Frequency, MIDI, Note Name */}
        <div className="bg-[#06091f]/90 border border-indigo-500/20 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between backdrop-blur-md shadow-xl space-y-3">
          <div className="text-xs font-mono text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Frecuencia & Nota Detectada</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Live Note Name */}
            <div className="bg-[#090d29] p-2.5 sm:p-3 rounded-xl border border-indigo-500/25 flex flex-col items-center justify-center">
              <span className="text-[10px] font-mono text-slate-400">Nota Musical</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-cyan-300 tracking-wider">
                {liveNoteName}
              </span>
            </div>

            {/* Live MIDI number */}
            <div className="bg-[#090d29] p-2.5 sm:p-3 rounded-xl border border-indigo-500/25 flex flex-col items-center justify-center">
              <span className="text-[10px] font-mono text-slate-400">MIDI / ASCII</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-indigo-200 tracking-wider">
                {liveMidi !== null ? liveMidi : '---'}
              </span>
            </div>
          </div>

          {/* Hertz Display */}
          <div className="bg-[#090d29] p-2.5 rounded-xl border border-indigo-500/25 flex items-center justify-between px-3 sm:px-4">
            <span className="text-xs font-mono text-slate-400">Frecuencia:</span>
            <span className="text-sm sm:text-base font-bold font-mono text-white">
              {liveFreq !== null ? `${liveFreq.toFixed(1)} Hz` : '--- Hz'}
            </span>
          </div>

          {/* VU Meter (Input level) */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Nivel Entrada (RMS)</span>
              <span>{(liveRms * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-indigo-500/30">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  liveRms >= noiseThreshold
                    ? 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                    : 'bg-indigo-500/40'
                }`}
                style={{ width: `${Math.min(100, (liveRms / 0.1) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Progressive Revelation Card: Letras Reconstruidas */}
      <div className="bg-[#06091f]/90 border border-indigo-500/20 rounded-2xl p-3.5 sm:p-5 backdrop-blur-md shadow-xl space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-indigo-500/20 pb-3">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold font-mono text-white tracking-wider uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Revelación Progresiva del Nombre</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 font-mono">
              Las letras emergen conforme se valida cada tono por autocorrelación
            </p>
          </div>

          {/* Letter count badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] sm:text-xs font-mono px-2.5 sm:px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300">
              {decodedLetters.length} {decodedLetters.length === 1 ? 'letra captada' : 'letras captadas'}
            </span>

            {isSequenceCompleted && (
              <span className="text-[10px] sm:text-xs font-mono px-2.5 sm:px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Secuencia Cerrada</span>
              </span>
            )}
          </div>
        </div>

        {/* Letters Tape */}
        {decodedLetters.length === 0 ? (
          <div className="py-8 sm:py-12 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-indigo-500/25 rounded-xl bg-[#080d28]/40 px-4">
            <Radio className="w-8 h-8 text-cyan-400/50 animate-pulse" />
            <p className="text-xs sm:text-sm font-mono text-slate-300">Ninguna nota detectada aún</p>
            <p className="text-[11px] sm:text-xs font-mono text-slate-400/70 max-w-md">
              Activa el micrófono y reproduce la firma sonora en otro teléfono. Cada tono se
              decodificará automáticamente aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-indigo-500/40">
            <div className="flex items-stretch gap-2 sm:gap-2.5 min-w-max">
              {decodedLetters.map((l, idx) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, scale: 0.8, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-xl border border-cyan-400/50 bg-gradient-to-b from-indigo-950/70 via-[#0a0f30] to-[#0c143c] min-w-[78px] sm:min-w-[88px] shadow-[0_0_15px_rgba(6,182,212,0.25)] select-none"
                >
                  {/* Step order */}
                  <span className="text-[9px] sm:text-[10px] font-mono text-indigo-300/80 font-semibold">
                    Paso {idx + 1}
                  </span>

                  {/* Decoded Character */}
                  <div className="my-1 text-2xl sm:text-3xl font-black font-mono text-cyan-200 drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]">
                    {l.char}
                  </div>

                  {/* ASCII & MIDI */}
                  <div className="text-[10px] sm:text-[11px] font-mono text-cyan-300 bg-[#060b22] px-1.5 sm:px-2 py-0.5 rounded border border-cyan-500/30 mb-1 sm:mb-1.5 shadow-inner">
                    ASCII {l.ascii}
                  </div>

                  {/* Musical Note & Hz */}
                  <div className="flex flex-col items-center text-center">
                    <div className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold font-mono text-white">
                      <Music className="w-3 h-3 text-sky-400 shrink-0" />
                      <span>{l.noteName}</span>
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-mono text-slate-400">
                      {l.frequency.toFixed(1)} Hz
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Result Reconstructed Word Card & Cartesian Auto-Graphing */}
      {completedWord.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-[#060b28] via-[#091138] to-[#06091f] border-2 border-cyan-400/40 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md space-y-4 sm:space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-500/30 pb-4">
            <div className="max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-500/40">
              <span className="text-[10px] sm:text-[11px] font-mono text-cyan-300 uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Texto Completo Reconstruido por el Aire ({completedWord.length} caract.)</span>
              </span>
              <h3 className="text-xl sm:text-3xl font-black font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-sky-100 to-indigo-200 drop-shadow-[0_0_20px_rgba(56,189,248,0.5)] uppercase mt-1 break-words select-all">
                {completedWord}
              </h3>
            </div>

            {/* Actions for the Reconstructed Word */}
            <div className="grid grid-cols-1 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                id="btn-copy-decoded-word"
                type="button"
                onClick={handleCopyWord}
                className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-[#0c1544] hover:bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 font-mono text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Texto'}</span>
              </button>

              <button
                id="btn-send-to-emitter"
                type="button"
                onClick={() => onSendToEmitter(completedWord)}
                className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-mono text-xs font-semibold flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all cursor-pointer active:scale-95"
              >
                <span>Cargar en Modo Emisor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Automatic Cartesian Curve Display of Reconstructed Name */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
                <LineChart className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Curva Cartesiana Interpolada</span>
              </h4>
              <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
                Polinomio generado a partir de las notas captadas
              </span>
            </div>

            <div className="h-[260px] sm:h-[320px]">
              <CartesianCanvas
                points={completedPoints}
                mode="lagrange"
                audioProgress={0}
                activeStep={-1}
                isPlaying={false}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
