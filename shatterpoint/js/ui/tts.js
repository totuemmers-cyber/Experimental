// === SHATTERPOINT: Text-to-Speech (Web Speech API) ===

const TTS = {
  supported: false,
  enabled: true,
  speaking: false,
  engVoice: null,

  // NPC voice profiles: { pitch, rate }
  voices: {
    narrator:  { pitch: 1.0, rate: 0.95 },
    crowe:     { pitch: 0.9, rate: 0.90 },
    talia:     { pitch: 1.2, rate: 1.00 },
    rook:      { pitch: 0.8, rate: 0.85 },
    rennick:   { pitch: 1.0, rate: 1.10 },
    thane:     { pitch: 0.7, rate: 0.80 },
    psychic:   { pitch: 0.6, rate: 0.75 },
    system:    { pitch: 1.5, rate: 1.20 },
    warning:   { pitch: 1.3, rate: 1.10 }
  },

  init() {
    this.supported = 'speechSynthesis' in window;
    if (!this.supported) {
      console.warn('SpeechSynthesis not available');
      return;
    }
    // Restore saved preference (default ON)
    const saved = localStorage.getItem('shatterpoint_tts');
    this.enabled = saved !== 'false';
    this.updateIndicator();
    this._findEnglishVoice();
    // Voices may load async — listen for the event
    speechSynthesis.addEventListener('voiceschanged', () => this._findEnglishVoice());
  },

  _findEnglishVoice() {
    const voices = speechSynthesis.getVoices();
    // Prefer en-US, then en-GB, then any English
    this.engVoice =
      voices.find(v => v.lang === 'en-US') ||
      voices.find(v => v.lang === 'en-GB') ||
      voices.find(v => v.lang.startsWith('en')) ||
      null;
  },

  toggle() {
    if (!this.supported) return;
    this.enabled = !this.enabled;
    localStorage.setItem('shatterpoint_tts', this.enabled);
    this.updateIndicator();
    if (!this.enabled) {
      this.stop();
    }
  },

  isEnabled() {
    return this.supported && this.enabled;
  },

  updateIndicator() {
    const el = document.getElementById('tts-indicator');
    if (el) {
      el.textContent = this.enabled ? '[V]oice: ON' : '[V]oice: OFF';
      el.style.color = this.enabled ? 'var(--green)' : 'var(--text-dim)';
    }
  },

  /**
   * Speak raw narrative text (before HTML processing).
   * Parses markup into segments with appropriate voice profiles.
   */
  speak(rawText) {
    if (!this.isEnabled()) return;
    this.stop();

    const segments = this.parseSegments(rawText);
    segments.forEach(seg => {
      if (!seg.text.trim()) return;
      const utterance = new SpeechSynthesisUtterance(seg.text);
      utterance.lang = 'en-US';
      if (this.engVoice) utterance.voice = this.engVoice;
      const voice = this.voices[seg.type] || this.voices.narrator;
      utterance.pitch = voice.pitch;
      utterance.rate = voice.rate;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    });

    this.speaking = true;
  },

  /**
   * Stop all queued and current speech.
   */
  stop() {
    if (!this.supported) return;
    speechSynthesis.cancel();
    this.speaking = false;
  },

  /**
   * Parse raw game text into typed segments for voice differentiation.
   * Handles: {npc: text}, *psychic text*, [SYSTEM: text], [WARNING: text]
   */
  parseSegments(text) {
    const segments = [];
    // Regex to match all markup types
    const pattern = /\{(\w+):\s*([^}]+)\}|\*([^*]+)\*|\[SYSTEM:\s*([^\]]+)\]|\[WARNING:\s*([^\]]+)\]/g;

    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      // Add plain text before this match
      if (match.index > lastIndex) {
        const plain = text.substring(lastIndex, match.index);
        if (plain.trim()) {
          segments.push({ type: 'narrator', text: plain });
        }
      }

      if (match[1] && match[2]) {
        // {npc: text} — NPC dialogue
        const npcName = match[1].toLowerCase();
        const voiceType = this.voices[npcName] ? npcName : 'narrator';
        segments.push({ type: voiceType, text: match[2] });
      } else if (match[3]) {
        // *psychic text*
        segments.push({ type: 'psychic', text: match[3] });
      } else if (match[4]) {
        // [SYSTEM: text]
        segments.push({ type: 'system', text: match[4] });
      } else if (match[5]) {
        // [WARNING: text]
        segments.push({ type: 'warning', text: match[5] });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining plain text
    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex);
      if (remaining.trim()) {
        segments.push({ type: 'narrator', text: remaining });
      }
    }

    return segments;
  }
};
