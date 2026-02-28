// === SHATTERPOINT: Audio System (Web Audio API Synth) ===

const Audio = {
  ctx: null,
  masterGain: null,
  musicGain: null,
  sfxGain: null,
  musicNodes: [],
  initialized: false,
  musicPlaying: false,

  /**
   * Initialize audio context (must be called from user gesture).
   */
  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.25;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.4;
      this.sfxGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio not available:', e);
    }
  },

  /**
   * Resume context if suspended (browsers require user gesture).
   */
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  // ═══════════════════════════════════════
  // AMBIENT SOUNDTRACK
  // ═══════════════════════════════════════

  /**
   * Start the ambient drone soundtrack.
   * Layered: sub-bass drone + mid hum + high shimmer + filtered noise.
   */
  startMusic() {
    if (!this.initialized || this.musicPlaying) return;
    this.musicPlaying = true;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Layer 1: Sub-bass drone (fundamental)
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.value = 55; // A1
    bassGain.gain.value = 0.3;
    bass.connect(bassGain);
    bassGain.connect(this.musicGain);
    bass.start(now);

    // Slow pitch drift on bass
    bass.frequency.setValueAtTime(55, now);
    this._driftLoop(bass.frequency, 55, 58, 20);

    // Layer 2: Mid-range hum (octave + fifth)
    const mid = ctx.createOscillator();
    const midGain = ctx.createGain();
    mid.type = 'triangle';
    mid.frequency.value = 82.5; // E2 (fifth above A1)
    midGain.gain.value = 0.12;
    mid.connect(midGain);
    midGain.connect(this.musicGain);
    mid.start(now);
    this._driftLoop(mid.frequency, 82, 84, 15);

    // Layer 3: High shimmer (very quiet, adds texture)
    const high = ctx.createOscillator();
    const highGain = ctx.createGain();
    const highFilter = ctx.createBiquadFilter();
    high.type = 'sawtooth';
    high.frequency.value = 440;
    highGain.gain.value = 0.03;
    highFilter.type = 'bandpass';
    highFilter.frequency.value = 800;
    highFilter.Q.value = 2;
    high.connect(highFilter);
    highFilter.connect(highGain);
    highGain.connect(this.musicGain);
    high.start(now);
    this._driftLoop(highFilter.frequency, 600, 1200, 25);

    // Layer 4: Filtered noise (hiss/static — very quiet)
    const noiseBuffer = this._createNoiseBuffer(2);
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    noiseGain.gain.value = 0.04;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 3000;
    noiseFilter.Q.value = 0.5;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.musicGain);
    noise.start(now);

    // Layer 5: Pulse (very slow, barely audible — like a heartbeat in the Lattice)
    const pulse = ctx.createOscillator();
    const pulseGain = ctx.createGain();
    const pulseLfo = ctx.createOscillator();
    const pulseLfoGain = ctx.createGain();
    pulse.type = 'sine';
    pulse.frequency.value = 110;
    pulseGain.gain.value = 0;
    pulseLfo.type = 'sine';
    pulseLfo.frequency.value = 0.15; // One pulse every ~7 seconds
    pulseLfoGain.gain.value = 0.06;
    pulseLfo.connect(pulseLfoGain);
    pulseLfoGain.connect(pulseGain.gain);
    pulse.connect(pulseGain);
    pulseGain.connect(this.musicGain);
    pulse.start(now);
    pulseLfo.start(now);

    // Fade in
    this.musicGain.gain.setValueAtTime(0, now);
    this.musicGain.gain.linearRampToValueAtTime(0.25, now + 3);

    this.musicNodes = [bass, mid, high, noise, pulse, pulseLfo];
  },

  /**
   * Stop the ambient soundtrack with fade-out.
   */
  stopMusic() {
    if (!this.initialized || !this.musicPlaying) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.linearRampToValueAtTime(0, now + 2);
    const nodes = this.musicNodes;
    setTimeout(() => {
      nodes.forEach(n => { try { n.stop(); } catch(e) {} });
    }, 2500);
    this.musicNodes = [];
    this.musicPlaying = false;
  },

  // ═══════════════════════════════════════
  // SOUND EFFECTS
  // ═══════════════════════════════════════

  /**
   * Hover over a choice — soft, short tick.
   */
  sfxHover() {
    if (!this.initialized) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1800;
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  },

  /**
   * Select a choice — descending two-tone blip.
   */
  sfxSelect() {
    if (!this.initialized) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.value = 880;
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Tone 2 (lower, slight delay)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.value = 660;
    gain2.gain.setValueAtTime(0.10, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.15);
  },

  /**
   * Psychic choice select — eerie rising tone with reverb.
   */
  sfxPsychic() {
    if (!this.initialized) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.3);
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 5;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.5);

    // Shimmer overlay
    const shimmer = ctx.createOscillator();
    const shimGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(600, now);
    shimmer.frequency.exponentialRampToValueAtTime(1800, now + 0.3);
    shimGain.gain.setValueAtTime(0.04, now);
    shimGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    shimmer.connect(shimGain);
    shimGain.connect(this.sfxGain);
    shimmer.start(now);
    shimmer.stop(now + 0.4);
  },

  /**
   * Scene transition — short static burst + tone.
   */
  sfxTransition() {
    if (!this.initialized) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Static burst
    const noiseBuffer = this._createNoiseBuffer(0.15);
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    noise.buffer = noiseBuffer;
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);

    // Confirmation tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 220;
    gain.gain.setValueAtTime(0.08, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now + 0.05);
    osc.stop(now + 0.3);
  },

  /**
   * Typewriter tick — very fast, very quiet click per character.
   */
  sfxTypeTick() {
    if (!this.initialized) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 4000 + Math.random() * 1000;
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.015);
  },

  /**
   * Game over — low ominous descending tone.
   */
  sfxGameOver() {
    if (!this.initialized) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 2);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 2.1);
  },

  // ═══════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════

  _createNoiseBuffer(duration) {
    const ctx = this.ctx;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  },

  /**
   * Slowly drift a parameter between min and max values.
   */
  _driftLoop(param, min, max, period) {
    const ctx = this.ctx;
    const drift = () => {
      if (!this.musicPlaying) return;
      const now = ctx.currentTime;
      const target = min + Math.random() * (max - min);
      param.linearRampToValueAtTime(target, now + period);
      setTimeout(drift, period * 1000);
    };
    drift();
  }
};
