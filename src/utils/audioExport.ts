import { AudioSettings, LetterPoint, ReverbPreset, SynthMode } from '../types';
import { generatePeriodicWaveArrays, midiToFrequency } from './math';

export interface ExportOptions {
  word: string;
  points: LetterPoint[];
  settings: AudioSettings;
  mode: SynthMode;
  loops?: number; // for melodic mode (default 2)
  durationSeconds?: number; // for timbral mode (default 8)
  sampleRate?: number; // 44100 or 48000 (default 44100)
}

export interface ExportResult {
  blob: Blob;
  url: string;
  duration: number;
  filename: string;
  sizeBytes: number;
}

/**
 * Generates an algorithmic stereo impulse response for convolution reverb
 */
export function createReverbImpulse(
  ctx: BaseAudioContext,
  preset: ReverbPreset,
  decay: number
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * Math.max(0.3, Math.min(8.0, decay)));
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  let diffusion = 1.0;
  let warmth = 0.5;
  if (preset === 'salon') {
    diffusion = 0.7;
    warmth = 0.8;
  } else if (preset === 'cueva') {
    diffusion = 1.2;
    warmth = 0.3;
  } else if (preset === 'galaxia') {
    diffusion = 1.8;
    warmth = 0.1;
  }

  let lastLeft = 0;
  let lastRight = 0;

  for (let i = 0; i < length; i++) {
    const t = i / length;
    const env = Math.pow(1 - t, decay * 0.9) * Math.exp(-t * (4 / decay));
    const noiseL = Math.random() * 2 - 1;
    const noiseR = Math.random() * 2 - 1;
    lastLeft = lastLeft * warmth + noiseL * (1 - warmth);
    lastRight = lastRight * warmth + noiseR * (1 - warmth);
    left[i] = lastLeft * env * diffusion;
    right[i] = lastRight * env * diffusion;
  }

  return impulse;
}

/**
 * Converts an AudioBuffer to an uncompressed 16-bit PCM Stereo WAV Blob
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM format
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const numSamples = buffer.length;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF chunk descriptor */
  writeString(0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');

  /* "fmt " subchunk */
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels (2 = Stereo)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample (16-bit)

  /* "data" subchunk */
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave and write 16-bit signed PCM samples
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      // Hard clamp safely within [-1, 1]
      if (sample > 1) sample = 1;
      else if (sample < -1) sample = -1;

      // Scale to signed 16-bit int
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Renders the exact mathematical audio signature offline with all DSP effects
 */
export async function renderAudioSignatureOffline(options: ExportOptions): Promise<ExportResult> {
  const {
    word,
    points,
    settings,
    mode,
    loops = 2,
    durationSeconds = 8,
    sampleRate = 44100,
  } = options;

  if (!points || points.length === 0) {
    throw new Error('No hay puntos o caracteres disponibles para sintetizar la firma.');
  }

  const stepSeconds = 60 / settings.bpm;
  let activeContentDuration = 0;

  if (mode === 'melodic') {
    activeContentDuration = points.length * Math.max(1, loops) * stepSeconds;
  } else {
    activeContentDuration = Math.max(2, durationSeconds);
  }

  // Reverb tail padding so the spatial acoustic response decays completely naturally
  const reverbTail = Math.max(2.0, settings.reverbDecay + 1.0);
  const totalDuration = activeContentDuration + reverbTail;
  const totalSamples = Math.ceil(totalDuration * sampleRate);

  const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

  // 1. Lowpass Filter
  const filter = offlineCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(settings.filterCutoff, 0);
  filter.Q.setValueAtTime(settings.filterResonance, 0);

  // 2. Delay Network
  const delayNode = offlineCtx.createDelay(2.5);
  delayNode.delayTime.setValueAtTime(settings.delayTime, 0);

  const delayFeedbackGain = offlineCtx.createGain();
  delayFeedbackGain.gain.setValueAtTime(Math.min(0.85, settings.delayFeedback), 0);

  const delayDryGain = offlineCtx.createGain();
  const delayWetGain = offlineCtx.createGain();
  const clampedDelayMix = Math.max(0, Math.min(1, settings.delayMix));
  delayDryGain.gain.setValueAtTime(1 - clampedDelayMix * 0.7, 0);
  delayWetGain.gain.setValueAtTime(clampedDelayMix, 0);

  delayNode.connect(delayFeedbackGain);
  delayFeedbackGain.connect(delayNode);

  filter.connect(delayDryGain);
  filter.connect(delayNode);
  delayNode.connect(delayWetGain);

  const delaySum = offlineCtx.createGain();
  delayDryGain.connect(delaySum);
  delayWetGain.connect(delaySum);

  // 3. Reverb Convolver Network
  const convolver = offlineCtx.createConvolver();
  convolver.buffer = createReverbImpulse(offlineCtx, settings.reverbSpace, settings.reverbDecay);

  const reverbDryGain = offlineCtx.createGain();
  const reverbWetGain = offlineCtx.createGain();
  const clampedReverbMix = Math.max(0, Math.min(1, settings.reverbMix));
  reverbDryGain.gain.setValueAtTime(1 - clampedReverbMix * 0.6, 0);
  reverbWetGain.gain.setValueAtTime(clampedReverbMix * 1.2, 0);

  delaySum.connect(reverbDryGain);
  delaySum.connect(convolver);
  convolver.connect(reverbWetGain);

  const reverbSum = offlineCtx.createGain();
  reverbDryGain.connect(reverbSum);
  reverbWetGain.connect(reverbSum);

  // 4. Master Gain & Soft Dynamics Compressor
  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(settings.volume, 0);

  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-3, 0);
  compressor.knee.setValueAtTime(6, 0);
  compressor.ratio.setValueAtTime(8, 0);
  compressor.attack.setValueAtTime(0.003, 0);
  compressor.release.setValueAtTime(0.15, 0);

  reverbSum.connect(masterGain);
  masterGain.connect(compressor);
  compressor.connect(offlineCtx.destination);

  // 5. Synthesizer Voice Event Scheduling
  if (mode === 'melodic') {
    const noteDuration = stepSeconds * 0.85;
    const attack = 0.015;
    const decay = 0.08;
    const sustainLevel = 0.45;
    const release = Math.max(0.08, noteDuration * 0.3);

    for (let l = 0; l < loops; l++) {
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const startTime = (l * points.length + i) * stepSeconds;
        const shiftedMidi = p.midiNote + settings.pitchShift;
        const freq = midiToFrequency(shiftedMidi);

        const osc1 = offlineCtx.createOscillator();
        const osc2 = offlineCtx.createOscillator();
        const noteGain = offlineCtx.createGain();

        // Sawtooth core + micro-detuned Triangle shimmer
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, startTime);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 1.003, startTime);

        // ADSR envelope
        noteGain.gain.setValueAtTime(0, startTime);
        noteGain.gain.linearRampToValueAtTime(0.7, startTime + attack);
        noteGain.gain.exponentialRampToValueAtTime(sustainLevel * 0.7, startTime + attack + decay);
        noteGain.gain.setValueAtTime(sustainLevel * 0.7, startTime + noteDuration);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + noteDuration + release);

        osc1.connect(noteGain);
        osc2.connect(noteGain);
        noteGain.connect(filter);

        osc1.start(startTime);
        osc2.start(startTime);

        const stopTime = startTime + noteDuration + release + 0.05;
        osc1.stop(stopTime);
        osc2.stop(stopTime);
      }
    }
  } else {
    // Timbral Mode with PeriodicWave
    const { real, imag } = generatePeriodicWaveArrays(points);
    const periodicWave = offlineCtx.createPeriodicWave(real, imag, { disableNormalization: false });

    const droneOsc = offlineCtx.createOscillator();
    const droneGain = offlineCtx.createGain();

    droneOsc.setPeriodicWave(periodicWave);

    const avgAscii = points.reduce((s, p) => s + p.ascii, 0) / points.length;
    const baseMidi = avgAscii + settings.pitchShift;
    droneOsc.frequency.setValueAtTime(midiToFrequency(baseMidi), 0);

    // Smooth drone envelope
    droneGain.gain.setValueAtTime(0.001, 0);
    droneGain.gain.exponentialRampToValueAtTime(0.65, 0.4);
    droneGain.gain.setValueAtTime(0.65, Math.max(0.5, activeContentDuration - 0.6));
    droneGain.gain.exponentialRampToValueAtTime(0.0001, activeContentDuration);

    droneOsc.connect(droneGain);
    droneGain.connect(filter);

    droneOsc.start(0);
    droneOsc.stop(activeContentDuration + 0.1);
  }

  // 6. Fast Offline Render
  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWav(renderedBuffer);
  const url = URL.createObjectURL(wavBlob);

  const cleanWord = (word.trim().toUpperCase() || 'FIRMA').replace(/[^A-Z0-9_-]/g, '_');
  const filename = `${cleanWord}_astrofirma_${mode}.wav`;

  return {
    blob: wavBlob,
    url,
    duration: renderedBuffer.duration,
    filename,
    sizeBytes: wavBlob.size,
  };
}

/**
 * Triggers native browser download for a Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
  }, 2000);
}
