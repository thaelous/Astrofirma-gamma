import { AudioSettings, LetterPoint, ReverbPreset } from '../types';
import { generatePeriodicWaveArrays, midiToFrequency } from './math';
import { createReverbImpulse } from './audioExport';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Filter
  private filter: BiquadFilterNode | null = null;

  // Delay
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayDryGain: GainNode | null = null;
  private delayWetGain: GainNode | null = null;

  // Reverb
  private convolver: ConvolverNode | null = null;
  private reverbDryGain: GainNode | null = null;
  private reverbWetGain: GainNode | null = null;

  // Continuous drone oscillator
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;

  // Active melodic voices
  private activeVoices: Set<{ osc: OscillatorNode; gain: GainNode }> = new Set();

  // State
  private isPlaying = false;
  private isPaused = false;
  private isLooping = false;
  private currentStep = 0;
  private timerId: number | null = null;
  private currentPoints: LetterPoint[] = [];
  private settings: AudioSettings;

  // Listeners
  public onStepChange?: (index: number, progress: number) => void;
  public onStateChange?: (isPlaying: boolean, isPaused: boolean) => void;

  constructor(initialSettings: AudioSettings) {
    this.settings = { ...initialSettings };
  }

  /**
   * Initializes audio context and full spatial signal graph
   */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.buildGraph();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private buildGraph() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Analyser for oscilloscope
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.85;

    // Soft master limiter / compressor
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-3, ctx.currentTime);
    this.compressor.knee.setValueAtTime(6, ctx.currentTime);
    this.compressor.ratio.setValueAtTime(8, ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    this.compressor.release.setValueAtTime(0.15, ctx.currentTime);

    // Master volume gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.settings.volume, ctx.currentTime);

    // Lowpass filter
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(this.settings.filterCutoff, ctx.currentTime);
    this.filter.Q.setValueAtTime(this.settings.filterResonance, ctx.currentTime);

    // Spatial Delay
    this.delayNode = ctx.createDelay(2.0);
    this.delayNode.delayTime.setValueAtTime(this.settings.delayTime, ctx.currentTime);

    this.delayFeedbackGain = ctx.createGain();
    this.delayFeedbackGain.gain.setValueAtTime(this.settings.delayFeedback, ctx.currentTime);

    this.delayDryGain = ctx.createGain();
    this.delayWetGain = ctx.createGain();
    this.setDelayMix(this.settings.delayMix);

    // Feedback loop: delay -> feedbackGain -> delay
    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);

    // Reverb
    this.convolver = ctx.createConvolver();
    this.reverbDryGain = ctx.createGain();
    this.reverbWetGain = ctx.createGain();
    this.updateReverbImpulse(this.settings.reverbSpace, this.settings.reverbDecay);
    this.setReverbMix(this.settings.reverbMix);

    // Signal Routing:
    // Source -> Filter
    // Filter -> DelayDry & DelayNode
    // DelayNode -> DelayWet
    // (DelayDry + DelayWet) -> ReverbDry & Convolver
    // Convolver -> ReverbWet
    // (ReverbDry + ReverbWet) -> MasterGain -> Compressor -> Analyser -> Destination

    this.filter.connect(this.delayDryGain);
    this.filter.connect(this.delayNode);
    this.delayNode.connect(this.delayWetGain);

    const delaySum = ctx.createGain();
    this.delayDryGain.connect(delaySum);
    this.delayWetGain.connect(delaySum);

    delaySum.connect(this.reverbDryGain);
    delaySum.connect(this.convolver);
    this.convolver.connect(this.reverbWetGain);

    const reverbSum = ctx.createGain();
    this.reverbDryGain.connect(reverbSum);
    this.reverbWetGain.connect(reverbSum);

    reverbSum.connect(this.masterGain);
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(ctx.destination);
  }

  /**
   * Generates algorithmic stereo impulse response for convolver
   */
  private updateReverbImpulse(preset: ReverbPreset, decay: number) {
    if (!this.ctx || !this.convolver) return;
    this.convolver.buffer = createReverbImpulse(this.ctx, preset, decay);
  }

  public setDelayMix(mix: number) {
    if (!this.ctx || !this.delayDryGain || !this.delayWetGain) return;
    const clamped = Math.max(0, Math.min(1, mix));
    const now = this.ctx.currentTime;
    this.delayDryGain.gain.setTargetAtTime(1 - clamped * 0.7, now, 0.02);
    this.delayWetGain.gain.setTargetAtTime(clamped, now, 0.02);
  }

  public setReverbMix(mix: number) {
    if (!this.ctx || !this.reverbDryGain || !this.reverbWetGain) return;
    const clamped = Math.max(0, Math.min(1, mix));
    const now = this.ctx.currentTime;
    this.reverbDryGain.gain.setTargetAtTime(1 - clamped * 0.6, now, 0.02);
    this.reverbWetGain.gain.setTargetAtTime(clamped * 1.2, now, 0.02);
  }

  public updateSettings(newSettings: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (newSettings.volume !== undefined && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.settings.volume, now, 0.03);
    }
    if (newSettings.filterCutoff !== undefined && this.filter) {
      this.filter.frequency.setTargetAtTime(this.settings.filterCutoff, now, 0.03);
    }
    if (newSettings.filterResonance !== undefined && this.filter) {
      this.filter.Q.setTargetAtTime(this.settings.filterResonance, now, 0.03);
    }
    if (newSettings.delayTime !== undefined && this.delayNode) {
      this.delayNode.delayTime.setTargetAtTime(this.settings.delayTime, now, 0.05);
    }
    if (newSettings.delayFeedback !== undefined && this.delayFeedbackGain) {
      this.delayFeedbackGain.gain.setTargetAtTime(Math.min(0.88, this.settings.delayFeedback), now, 0.03);
    }
    if (newSettings.delayMix !== undefined) {
      this.setDelayMix(this.settings.delayMix);
    }
    if (newSettings.reverbMix !== undefined) {
      this.setReverbMix(this.settings.reverbMix);
    }
    if (newSettings.reverbSpace !== undefined || newSettings.reverbDecay !== undefined) {
      this.updateReverbImpulse(this.settings.reverbSpace, this.settings.reverbDecay);
    }
    if (newSettings.mode !== undefined && this.isPlaying) {
      // Re-start in new mode
      this.stop();
      this.play(this.currentPoints);
    }
  }

  public async init(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  public setPoints(points: LetterPoint[]) {
    this.currentPoints = points;
    if (this.settings.mode === 'timbral' && this.isPlaying) {
      this.updateDroneWaveform();
    }
  }

  public play(points: LetterPoint[]) {
    this.currentPoints = points;
    if (points.length === 0) return;

    this.ensureContext();
    this.isPlaying = true;
    this.isPaused = false;
    this.notifyState();

    if (this.settings.mode === 'melodic') {
      this.startMelodicSequencer();
    } else {
      this.startContinuousDrone();
    }
  }

  public playSequence(points: LetterPoint[]) {
    this.settings.mode = 'melodic';
    this.play(points);
  }

  public playTimbralDrone(points: LetterPoint[]) {
    this.settings.mode = 'timbral';
    this.play(points);
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPaused = true;
    this.isPlaying = false;
    this.clearAllTimers();
    this.stopAllVoices();
    this.notifyState();
  }

  public stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentStep = 0;
    this.clearAllTimers();
    this.stopAllVoices();
    this.notifyState();
    if (this.onStepChange) {
      this.onStepChange(-1, 0);
    }
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange(this.isPlaying, this.isPaused);
    }
  }

  private clearAllTimers() {
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private stopAllVoices() {
    if (this.droneOsc) {
      try {
        this.droneGain?.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
        this.droneOsc.stop();
        this.droneOsc.disconnect();
      } catch {
        // ignore
      }
      this.droneOsc = null;
      this.droneGain = null;
    }

    this.activeVoices.forEach(({ osc, gain }) => {
      try {
        gain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    });
    this.activeVoices.clear();
  }

  // --- Melodic Mode (Emisión Limpia y Estandarizada por Pulsos Estrictos) ---
  private startMelodicSequencer() {
    this.clearAllTimers();
    this.runSequencerStep();
  }

  private runSequencerStep = () => {
    if (!this.isPlaying || this.currentPoints.length === 0) return;

    const N = this.currentPoints.length;
    const point = this.currentPoints[this.currentStep];

    // Protocolo Estricto de Transmisión:
    // 180 ms de tono senoidal puro + 100 ms de silencio obligatorio (total 280 ms por pulso)
    const noteDuration = 0.180;
    const stepDurationMs = 280;

    // Trigger pure sine tone (diapasón sin reverb ni delay)
    const shiftedMidi = point.midiNote + this.settings.pitchShift;
    const freq = midiToFrequency(shiftedMidi);
    this.playTone(freq, noteDuration);

    const progress = (this.currentStep + 1) / N;
    if (this.onStepChange) {
      this.onStepChange(this.currentStep, progress);
    }

    // Control de Bucle (Loop):
    // Si isLooping está activo, al sonar la última nota (incluyendo los 3 espacios de remate),
    // reinicia inmediatamente la secuencia desde la primera letra sin detenerse.
    // Si está inactivo, se detiene automáticamente al llegar al final.
    if (this.currentStep >= N - 1) {
      if (this.isLooping) {
        this.timerId = window.setTimeout(() => {
          if (!this.isPlaying) return;
          this.currentStep = 0;
          this.runSequencerStep();
        }, stepDurationMs);
      } else {
        this.timerId = window.setTimeout(() => {
          this.stop();
        }, stepDurationMs);
      }
      return;
    }

    this.currentStep++;
    this.timerId = window.setTimeout(this.runSequencerStep, stepDurationMs);
  };

  public getLoop(): boolean {
    return this.isLooping;
  }

  public setLoop(loop: boolean): void {
    this.isLooping = loop;
  }

  /**
   * Emisión limpia y estandarizada:
   * Onda senoidal pura ('sine') de exactamente 180 ms, con rampa suave de ataque/decaimiento de 5 ms
   * para prevenir cualquier chasquido ("pop") acústico y evitar distorsión armónica.
   */
  public playTone(frequency: number, duration: number = 0.180) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();

    // Onda senoidal pura ('sine') sin armónicos secundarios
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);

    // Envolvente rápida y suave de 5 ms para evitar clics acústicos
    const attack = 0.005; // 5 ms
    const decay = 0.005;  // 5 ms
    const sustainTime = Math.max(0.04, duration - decay);
    const peakGain = 0.65; // Amplitud limpia

    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.linearRampToValueAtTime(peakGain, now + attack);
    noteGain.gain.setValueAtTime(peakGain, now + sustainTime);
    noteGain.gain.linearRampToValueAtTime(0.0001, now + duration);
    noteGain.gain.setValueAtTime(0, now + duration);

    // Conexión DIRECTA a masterGain (0% delay, 0% reverb)
    osc.connect(noteGain);
    noteGain.connect(this.masterGain);

    osc.start(now);
    const stopTime = now + duration + 0.002;
    osc.stop(stopTime);

    const voiceEntry = { osc, gain: noteGain };
    this.activeVoices.add(voiceEntry);

    setTimeout(() => {
      this.activeVoices.delete(voiceEntry);
      try {
        osc.disconnect();
        noteGain.disconnect();
      } catch {
        // ignore
      }
    }, (duration + 0.05) * 1000);
  }

  // --- Continuous Timbral Drone Mode ---
  private startContinuousDrone() {
    if (!this.ctx || !this.filter || this.currentPoints.length === 0) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    this.stopAllVoices();

    const { real, imag } = generatePeriodicWaveArrays(this.currentPoints);
    const periodicWave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });

    this.droneOsc = ctx.createOscillator();
    this.droneGain = ctx.createGain();

    this.droneOsc.setPeriodicWave(periodicWave);

    // Base fundamental frequency: average note or chosen pitch
    const avgAscii = this.currentPoints.reduce((s, p) => s + p.ascii, 0) / this.currentPoints.length;
    const baseMidi = avgAscii + this.settings.pitchShift;
    const freq = midiToFrequency(baseMidi);

    this.droneOsc.frequency.setValueAtTime(freq, now);

    this.droneGain.gain.setValueAtTime(0.001, now);
    this.droneGain.gain.exponentialRampToValueAtTime(0.65, now + 0.3);

    this.droneOsc.connect(this.droneGain);
    this.droneGain.connect(this.filter);

    this.droneOsc.start(now);

    // Continuous smooth scan across the word coordinates
    let stepRatio = 0;
    const animateDrone = () => {
      if (!this.isPlaying || this.settings.mode !== 'timbral') return;
      stepRatio = (stepRatio + 0.008) % 1;
      const currentIdx = Math.floor(stepRatio * this.currentPoints.length);
      if (this.onStepChange) {
        this.onStepChange(currentIdx, stepRatio);
      }
      this.timerId = window.setTimeout(animateDrone, 30);
    };
    animateDrone();
  }

  private updateDroneWaveform() {
    if (!this.ctx || !this.droneOsc || this.currentPoints.length === 0) return;
    const { real, imag } = generatePeriodicWaveArrays(this.currentPoints);
    const periodicWave = this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    this.droneOsc.setPeriodicWave(periodicWave);

    const avgAscii = this.currentPoints.reduce((s, p) => s + p.ascii, 0) / this.currentPoints.length;
    const baseMidi = avgAscii + this.settings.pitchShift;
    this.droneOsc.frequency.setTargetAtTime(midiToFrequency(baseMidi), this.ctx.currentTime, 0.05);
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }
}
