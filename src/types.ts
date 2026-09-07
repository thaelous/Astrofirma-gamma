export type MathMode = 'lagrange' | 'fourier';

export type SynthMode = 'melodic' | 'timbral';

export type ReverbPreset = 'salon' | 'cueva' | 'galaxia';

export interface LetterPoint {
  index: number;
  char: string;
  ascii: number;
  midiNote: number;
  noteName: string;
  frequency: number;
  normalized: number; // 0 to 1
}

export interface AudioSettings {
  mode: SynthMode;
  bpm: number;
  pitchShift: number; // in semitones (-24 to +24)
  volume: number; // 0 to 1
  filterCutoff: number; // 100 to 18000 Hz
  filterResonance: number; // 0.1 to 15
  delayTime: number; // 0.05 to 0.8 seconds
  delayFeedback: number; // 0 to 0.85
  delayMix: number; // 0 to 1
  reverbSpace: ReverbPreset;
  reverbDecay: number; // 0.5 to 8.0 seconds
  reverbMix: number; // 0 to 1
}

export interface LagrangeBasis {
  i: number;
  roots: number[];
  divisor: number;
  yi: number;
}

export interface FourierCoefficients {
  a0: number;
  a: number[];
  b: number[];
  harmonics: number;
}
