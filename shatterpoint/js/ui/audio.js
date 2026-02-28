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
  // SOUNDTRACK — Sci-fi noir generative score
  // ═══════════════════════════════════════

  // Musical constants
  _bpm: 72,
  _chords: [
    // Am9       → Dm9       → Fmaj7     → Em7add11
    [55, 164.81, 261.63, 329.63, 493.88],
    [73.42, 174.61, 261.63, 329.63, 440],
    [87.31, 174.61, 261.63, 329.63, 392],
    [82.41, 164.81, 246.94, 329.63, 440]
  ],
  _arpIntervals: null,
  _seqIndex: 0,

  /**
   * Start the generative ambient score.
   * Layers: pad chords, walking bass, arpeggiator, subtle percussion, atmosphere.
   */
  startMusic() {
    if (!this.initialized || this.musicPlaying) return;
    this.musicPlaying = true;
    this._seqIndex = 0;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const beatLen = 60 / this._bpm;

    // Fade in
    this.musicGain.gain.setValueAtTime(0, now);
    this.musicGain.gain.linearRampToValueAtTime(0.30, now + 4);

    // --- Layer 1: Evolving pad (chord tones through filtered sawtooth) ---
    this._startPad(ctx, now);

    // --- Layer 2: Walking bass line ---
    this._startBass(ctx, now, beatLen);

    // --- Layer 3: Arpeggiator ---
    this._startArp(ctx, now, beatLen);

    // --- Layer 4: Subtle hi-hat / noise percussion ---
    this._startPerc(ctx, now, beatLen);

    // --- Layer 5: Atmospheric texture (filtered noise + distant tone) ---
    this._startAtmosphere(ctx, now);
  },

  /** Warm pad: two detuned sawtooths through a low-pass filter, chord changes every 4 bars. */
  _startPad(ctx, now) {
    const padGain = ctx.createGain();
    padGain.gain.value = 0.09;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 900;
    padFilter.Q.value = 1.5;
    padFilter.connect(padGain);
    padGain.connect(this.musicGain);

    const barLen = (60 / this._bpm) * 4;
    const chordLen = barLen * 4; // 4 bars per chord

    // Create oscillators for 5 chord tones x 2 (detuned pair)
    const oscs = [];
    for (let i = 0; i < 5; i++) {
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      o1.type = 'sawtooth';
      o2.type = 'sawtooth';
      o1.frequency.value = this._chords[0][i];
      o2.frequency.value = this._chords[0][i] * 1.003; // slight detune
      const mix = ctx.createGain();
      mix.gain.value = i === 0 ? 0.15 : 0.1; // root slightly louder
      o1.connect(mix);
      o2.connect(mix);
      mix.connect(padFilter);
      o1.start(now);
      o2.start(now);
      oscs.push(o1, o2);
    }

    // Schedule chord changes
    this._padInterval = setInterval(() => {
      if (!this.musicPlaying) return;
      this._seqIndex = (this._seqIndex + 1) % this._chords.length;
      const chord = this._chords[this._seqIndex];
      const t = ctx.currentTime;
      for (let i = 0; i < 5; i++) {
        oscs[i * 2].frequency.linearRampToValueAtTime(chord[i], t + 2);
        oscs[i * 2 + 1].frequency.linearRampToValueAtTime(chord[i] * 1.003, t + 2);
      }
      // Gentle filter sweep per chord
      const fc = 700 + Math.random() * 600;
      padFilter.frequency.linearRampToValueAtTime(fc, t + 3);
    }, chordLen * 1000);

    this.musicNodes.push(...oscs);
    this._padNodes = { oscs, padGain, padFilter };
  },

  /** Walking bass: root note with rhythmic variation, follows chord root. */
  _startBass(ctx, now, beatLen) {
    const bassGain = ctx.createGain();
    bassGain.gain.value = 0.18;
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 300;
    bassFilter.Q.value = 3;
    bassFilter.connect(bassGain);
    bassGain.connect(this.musicGain);

    const playBassNote = (freq, time, dur) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0.001, time);
      env.gain.linearRampToValueAtTime(1, time + 0.04);
      env.gain.exponentialRampToValueAtTime(0.3, time + dur * 0.5);
      env.gain.linearRampToValueAtTime(0.001, time + dur);
      osc.connect(env);
      env.connect(bassFilter);
      osc.start(time);
      osc.stop(time + dur + 0.01);
    };

    // Bass pattern: root, fifth-below, root-octave-up, walk note
    const scheduleBass = () => {
      if (!this.musicPlaying) return;
      const chord = this._chords[this._seqIndex];
      const root = chord[0];
      const fifth = root * 1.5;
      const pattern = [root, root, fifth, root * 0.75, root, fifth, root, root * 1.25];
      const t = ctx.currentTime;
      for (let i = 0; i < 8; i++) {
        playBassNote(pattern[i], t + i * beatLen, beatLen * 0.85);
      }
      this._bassTimeout = setTimeout(scheduleBass, beatLen * 8 * 1000);
    };
    scheduleBass();
  },

  /** Arpeggiator: picks chord tones in a pattern, gentle sine plinks. */
  _startArp(ctx, now, beatLen) {
    const arpGain = ctx.createGain();
    arpGain.gain.value = 0.06;
    const arpDelay = ctx.createDelay(1);
    arpDelay.delayTime.value = beatLen * 0.75;
    const arpFeedback = ctx.createGain();
    arpFeedback.gain.value = 0.3;
    const arpFilter = ctx.createBiquadFilter();
    arpFilter.type = 'bandpass';
    arpFilter.frequency.value = 2000;
    arpFilter.Q.value = 1;

    arpGain.connect(arpFilter);
    arpFilter.connect(this.musicGain);
    arpGain.connect(arpDelay);
    arpDelay.connect(arpFeedback);
    arpFeedback.connect(arpGain);

    const arpPatterns = [
      [0, 2, 3, 4, 3, 2],  // up-down
      [4, 3, 2, 0, 2, 3],  // down-up
      [0, 4, 2, 3, 0, 2],  // skip
      [3, 2, 4, 0, 3, 2],  // alternate
    ];
    let patIdx = 0;

    const scheduleArp = () => {
      if (!this.musicPlaying) return;
      const chord = this._chords[this._seqIndex];
      const pattern = arpPatterns[patIdx % arpPatterns.length];
      patIdx++;
      const t = ctx.currentTime;
      const sixteenth = beatLen / 2;

      for (let i = 0; i < pattern.length; i++) {
        const freq = chord[pattern[i]] * 2; // one octave up
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const noteTime = t + i * sixteenth;
        env.gain.setValueAtTime(0.001, noteTime);
        env.gain.linearRampToValueAtTime(0.6 + Math.random() * 0.4, noteTime + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, noteTime + sixteenth * 1.8);
        osc.connect(env);
        env.connect(arpGain);
        osc.start(noteTime);
        osc.stop(noteTime + sixteenth * 2);
      }

      this._arpTimeout = setTimeout(scheduleArp, sixteenth * pattern.length * 1000);
    };

    // Start arp after 2 bars
    this._arpTimeout = setTimeout(scheduleArp, beatLen * 8 * 1000);
  },

  /** Subtle percussion: filtered noise hits on beats 2 and 4, ghost hits on 16ths. */
  _startPerc(ctx, now, beatLen) {
    const percGain = ctx.createGain();
    percGain.gain.value = 0.04;
    percGain.connect(this.musicGain);

    const noiseBuffer = this._createNoiseBuffer(0.1);

    const playHit = (time, loud) => {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const env = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = loud ? 6000 : 8000;
      env.gain.setValueAtTime(loud ? 0.8 : 0.2, time);
      env.gain.exponentialRampToValueAtTime(0.001, time + (loud ? 0.08 : 0.04));
      src.connect(filter);
      filter.connect(env);
      env.connect(percGain);
      src.start(time);
      src.stop(time + 0.1);
    };

    const schedulePerc = () => {
      if (!this.musicPlaying) return;
      const t = ctx.currentTime;
      // 8 beats worth
      for (let b = 0; b < 8; b++) {
        const beatTime = t + b * beatLen;
        // Accent on 2 and 4 (within 4-beat bars)
        const inBar = b % 4;
        if (inBar === 1 || inBar === 3) {
          playHit(beatTime, true);
        }
        // Ghost note on the "and" (some randomness)
        if (Math.random() > 0.5) {
          playHit(beatTime + beatLen * 0.5, false);
        }
      }
      this._percTimeout = setTimeout(schedulePerc, beatLen * 8 * 1000);
    };
    schedulePerc();
  },

  /** Atmosphere: very quiet filtered noise + distant high tone with slow vibrato. */
  _startAtmosphere(ctx, now) {
    // Noise bed
    const noiseBuffer = this._createNoiseBuffer(4);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2500;
    noiseFilter.Q.value = 0.3;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.015;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.musicGain);
    noise.start(now);

    // Distant high tone with vibrato
    const high = ctx.createOscillator();
    high.type = 'sine';
    high.frequency.value = 1318.5; // E6
    const vibrato = ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = 4.5;
    const vibGain = ctx.createGain();
    vibGain.gain.value = 8;
    vibrato.connect(vibGain);
    vibGain.connect(high.frequency);
    const highGain = ctx.createGain();
    highGain.gain.value = 0.012;
    high.connect(highGain);
    highGain.connect(this.musicGain);
    high.start(now);
    vibrato.start(now);

    this.musicNodes.push(noise, high, vibrato);
    this._driftLoop(noiseFilter.frequency, 1500, 3500, 20);
  },

  /**
   * Stop the soundtrack with fade-out.
   */
  stopMusic() {
    if (!this.initialized || !this.musicPlaying) return;
    this.musicPlaying = false;
    const now = this.ctx.currentTime;
    this.musicGain.gain.linearRampToValueAtTime(0, now + 2);

    clearInterval(this._padInterval);
    clearTimeout(this._bassTimeout);
    clearTimeout(this._arpTimeout);
    clearTimeout(this._percTimeout);

    const nodes = this.musicNodes;
    setTimeout(() => {
      nodes.forEach(n => { try { n.stop(); } catch(e) {} });
    }, 2500);
    if (this._padNodes) {
      this._padNodes.oscs.forEach(o => { try { o.stop(); } catch(e) {} });
    }
    this.musicNodes = [];
    this._padNodes = null;
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
