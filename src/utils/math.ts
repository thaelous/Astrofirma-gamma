import { LetterPoint, FourierCoefficients } from '../types';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Converts MIDI note number to note name (e.g. 69 -> "A4", 60 -> "C4")
 */
export function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  const noteIndex = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Calculates frequency in Hz from MIDI note:
 * f = 440 * 2^((MIDI - 69) / 12)
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Normalizes characters to standard Latin uppercase while preserving Ñ
 */
export function normalizeChar(char: string): string {
  if (char === 'Ñ' || char === 'ñ') return 'Ñ';
  if (char === 'á' || char === 'Á') return 'A';
  if (char === 'é' || char === 'É') return 'E';
  if (char === 'í' || char === 'Í') return 'I';
  if (char === 'ó' || char === 'Ó') return 'O';
  if (char === 'ú' || char === 'Ú' || char === 'ü' || char === 'Ü') return 'U';
  return char.toUpperCase();
}

/**
 * Resolves a character to its calibrated acoustic MIDI note.
 * Space (' ') -> MIDI 48 (C3 = 130.81 Hz, distinct low fundamental)
 * 'Ñ' / 'ñ' -> MIDI 91 (D#6 = 1244.5 Hz, dedicated note within the 1600 Hz filter)
 * 'A'-'Z' -> MIDI 65-90 (349 Hz - 1175 Hz)
 * '0'-'9' -> MIDI 49-57 (138 Hz - 220 Hz)
 */
export function getAsciiCode(char: string): number {
  if (char === ' ') {
    return 48; // Dedicated base note C3 (130.81 Hz)
  }
  if (char === 'Ñ' || char === 'ñ') {
    return 91; // Dedicated note D#6 (1244.51 Hz)
  }

  const norm = normalizeChar(char);
  const code = norm.charCodeAt(0);

  if (code >= 65 && code <= 90) {
    return code; // A-Z (MIDI 65-90)
  }
  if (code >= 49 && code <= 57) {
    return code; // 1-9 (MIDI 49-57)
  }
  if (code === 48) {
    return 58; // Mapeo para '0' para no colisionar con el espacio C3 (MIDI 48)
  }

  // Fallback for special characters
  if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) {
    return char.charCodeAt(0);
  }

  return 48;
}

/**
 * Converts MIDI note to its decoded character using the unified acoustic map
 */
export function acousticMidiToChar(midi: number): string {
  if (midi === 48 || midi === 60 || midi === 32) {
    return ' ';
  }
  if (midi === 91 || midi === 92) {
    return 'Ñ';
  }
  if (midi === 58) {
    return '0';
  }
  if (midi >= 65 && midi <= 90) {
    return String.fromCharCode(midi);
  }
  if (midi >= 97 && midi <= 122) {
    return String.fromCharCode(midi).toUpperCase();
  }
  if (midi >= 49 && midi <= 57) {
    return String.fromCharCode(midi);
  }
  return String.fromCharCode(midi);
}

/**
 * Converts input string into array of data points with automatic 3 closing spaces
 */
export function parseWordToPoints(word: string, appendClosingSpaces = false): LetterPoint[] {
  let sanitized = (word && word.length > 0 ? word : 'ALTAIR').slice(0, 500);
  if (appendClosingSpaces && !sanitized.endsWith('   ')) {
    sanitized = sanitized + '   ';
  }
  const chars = Array.from(sanitized);

  if (chars.length === 0) {
    return [];
  }

  const asciiValues = chars.map(getAsciiCode);
  const minAscii = Math.min(...asciiValues);
  const maxAscii = Math.max(...asciiValues);
  const range = maxAscii === minAscii ? 1 : maxAscii - minAscii;

  return chars.map((char, index) => {
    const ascii = getAsciiCode(char);
    const midiNote = ascii;
    const frequency = midiToFrequency(midiNote);
    const normalized = (ascii - minAscii) / range;

    return {
      index,
      char,
      ascii,
      midiNote,
      noteName: midiToNoteName(midiNote),
      frequency,
      normalized,
    };
  });
}

/**
 * Evaluates Piecewise Cubic Spline (Catmull-Rom) at point x
 * Perfectly interpolates all (xi, yi) with C^1 continuity and O(1) time complexity,
 * completely avoiding Runge's phenomenon and numerical collapse for up to 500+ points.
 */
export function evaluatePiecewiseCubicSpline(points: LetterPoint[], x: number): number {
  const n = points.length;
  if (n === 0) return 0;
  if (n === 1) return points[0].ascii;

  // Clamp x to domain [0, n - 1]
  if (x <= 0) return points[0].ascii;
  if (x >= n - 1) return points[n - 1].ascii;

  const i = Math.floor(x);
  const t = x - i;

  const p0 = i > 0 ? points[i - 1].ascii : points[0].ascii - (points[1].ascii - points[0].ascii);
  const p1 = points[i].ascii;
  const p2 = points[i + 1].ascii;
  const p3 = i + 2 < n ? points[i + 2].ascii : points[n - 1].ascii + (points[n - 1].ascii - points[n - 2].ascii);

  const t2 = t * t;
  const t3 = t2 * t;

  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

/**
 * Evaluates Lagrange polynomial at point x (with automatic Spline safeguard for N > 8)
 */
export function evaluateLagrange(points: LetterPoint[], x: number): number {
  const n = points.length;
  if (n === 0) return 0;
  if (n === 1) return points[0].ascii;

  // For N > 8, a single global polynomial suffers from Runge's phenomenon (extreme oscillations
  // and floating point overflow). We automatically switch to Piecewise Cubic Spline.
  if (n > 8) {
    return evaluatePiecewiseCubicSpline(points, x);
  }

  let result = 0;
  for (let i = 0; i < n; i++) {
    const xi = points[i].index;
    const yi = points[i].ascii;
    let term = yi;

    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const xj = points[j].index;
        term *= (x - xj) / (xi - xj);
      }
    }
    result += term;
  }
  return result;
}

/**
 * Computes Discrete Fourier Transform coefficients for harmonic approximation
 */
export function computeFourierCoefficients(points: LetterPoint[]): FourierCoefficients {
  const N = points.length;
  if (N === 0) {
    return { a0: 0, a: [], b: [], harmonics: 0 };
  }

  // Mean (DC offset)
  const a0 = points.reduce((sum, p) => sum + p.ascii, 0) / N;

  const harmonics = Math.min(Math.floor(N / 2), 16);
  const a: number[] = [];
  const b: number[] = [];

  for (let k = 1; k <= harmonics; k++) {
    let sumCos = 0;
    let sumSin = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      sumCos += points[n].ascii * Math.cos(angle);
      sumSin += points[n].ascii * Math.sin(angle);
    }
    a.push((2 / N) * sumCos);
    b.push((2 / N) * sumSin);
  }

  return { a0, a, b, harmonics };
}

/**
 * Evaluates Fourier trigonometric series at point x
 */
export function evaluateFourier(coeffs: FourierCoefficients, N: number, x: number): number {
  if (N <= 0) return 0;
  let val = coeffs.a0;
  for (let k = 1; k <= coeffs.harmonics; k++) {
    const a_k = coeffs.a[k - 1];
    const b_k = coeffs.b[k - 1];
    const angle = (2 * Math.PI * k * x) / N;
    val += a_k * Math.cos(angle) + b_k * Math.sin(angle);
  }
  return val;
}

/**
 * Generates PeriodicWave coefficients (Float32Array) for Web Audio API
 */
export function generatePeriodicWaveArrays(points: LetterPoint[]): { real: Float32Array; imag: Float32Array } {
  const N = Math.max(points.length, 2);
  const numHarmonics = Math.min(32, Math.max(8, N * 2));

  const real = new Float32Array(numHarmonics);
  const imag = new Float32Array(numHarmonics);

  // PeriodicWave expects real[0] and imag[0] to be 0 (DC removed)
  real[0] = 0;
  imag[0] = 0;

  // Center values around 0
  const mean = points.reduce((sum, p) => sum + p.ascii, 0) / points.length;
  const centered = points.map((p) => p.ascii - mean);

  for (let k = 1; k < numHarmonics; k++) {
    let r = 0;
    let im = 0;
    for (let n = 0; n < points.length; n++) {
      const angle = (2 * Math.PI * k * n) / points.length;
      r += centered[n] * Math.cos(angle);
      im += centered[n] * Math.sin(angle);
    }
    // Dampen higher harmonics slightly for smooth warm resonance
    const harmonicDamping = 1 / Math.sqrt(k);
    real[k] = (r / points.length) * harmonicDamping;
    imag[k] = (im / points.length) * harmonicDamping;
  }

  return { real, imag };
}
