// === SHATTERPOINT: Visual Effects ===

const Effects = {
  typewriterTimer: null,
  typewriterResolve: null,

  /**
   * Typewriter effect — reveals text character by character.
   * Returns a promise that resolves when complete.
   */
  typewriter(text, element, speed = 20) {
    return new Promise((resolve) => {
      this.cancelTypewriter();
      element.innerHTML = '';
      let i = 0;
      const chars = text;

      this.typewriterResolve = resolve;
      this.typewriterTimer = setInterval(() => {
        if (i < chars.length) {
          // Handle HTML tags — write them all at once
          if (chars[i] === '<') {
            const closeIdx = chars.indexOf('>', i);
            if (closeIdx !== -1) {
              element.innerHTML += chars.substring(i, closeIdx + 1);
              i = closeIdx + 1;
              return;
            }
          }
          element.innerHTML += chars[i];
          i++;

          // Auto-scroll
          element.scrollTop = element.scrollHeight;
        } else {
          clearInterval(this.typewriterTimer);
          this.typewriterTimer = null;
          this.typewriterResolve = null;
          resolve();
        }
      }, speed);
    });
  },

  /**
   * Skip/complete the current typewriter animation instantly.
   */
  cancelTypewriter() {
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
      if (this.typewriterResolve) {
        this.typewriterResolve();
        this.typewriterResolve = null;
      }
    }
  },

  isTypewriting() {
    return this.typewriterTimer !== null;
  },

  /**
   * Completes typewriter and shows full text immediately.
   */
  skipTypewriter(fullText, element) {
    this.cancelTypewriter();
    element.innerHTML = fullText;
    element.scrollTop = element.scrollHeight;
  },

  /**
   * Glitch effect on an element.
   */
  glitch(element, duration = 300) {
    element.classList.add('glitch');
    setTimeout(() => element.classList.remove('glitch'), duration);
  },

  /**
   * Screen flicker effect.
   */
  flicker(element) {
    element.classList.add('flicker');
    setTimeout(() => element.classList.remove('flicker'), 150);
  },

  /**
   * Apply degradation CSS class based on resonance level.
   */
  updateDegradation(level) {
    const terminal = document.getElementById('terminal');
    terminal.classList.remove('degraded-light', 'degraded-medium', 'degraded-heavy');
    if (level !== 'none') {
      terminal.classList.add('degraded-' + level);
    }
  },

  /**
   * Inject random noise characters into an element's text.
   * Returns the original text for restoration.
   */
  injectNoise(element, intensity = 0.05) {
    const noiseChars = '#@%&$!?*~^';
    const original = element.textContent;
    const chars = original.split('');

    for (let i = 0; i < chars.length; i++) {
      if (chars[i] !== ' ' && chars[i] !== '\n' && Math.random() < intensity) {
        chars[i] = noiseChars[Math.floor(Math.random() * noiseChars.length)];
      }
    }

    element.textContent = chars.join('');
    return original;
  },

  /**
   * Insert an intrusive thought into the narrative.
   */
  intrusiveThought(narrativeEl) {
    const thoughts = [
      "...glass eyes staring through you...",
      "...the sound of a mind unraveling...",
      "...who are you who are you who are—...",
      "...the Lattice hums. it knows. it always knows...",
      "...sera. her name was sera...",
      "...they took her apart thought by thought...",
      "...you could be next...",
      "...static. nothing but static...",
      "...was that your thought or someone else's?...",
      "...the Thread itches. it always itches now..."
    ];

    const thought = thoughts[Math.floor(Math.random() * thoughts.length)];
    const span = document.createElement('div');
    span.className = 'intrusive-thought';
    span.textContent = thought;
    narrativeEl.appendChild(span);
    narrativeEl.scrollTop = narrativeEl.scrollHeight;

    // Fade out after a moment
    setTimeout(() => {
      span.style.transition = 'opacity 2s';
      span.style.opacity = '0.2';
    }, 3000);
  },

  /**
   * Scene transition effect — flicker then callback.
   */
  sceneTransition(callback) {
    const terminal = document.getElementById('terminal');
    this.flicker(terminal);
    Audio.sfxTransition();
    setTimeout(() => {
      callback();
    }, 200);
  },

  /**
   * Stat change flash — briefly highlights a stat bar.
   */
  flashStat(statId, type = 'damage') {
    const el = document.getElementById(statId + '-bar');
    if (!el) return;
    const color = type === 'damage' ? 'var(--red)' : 'var(--green)';
    el.style.textShadow = `0 0 8px ${color}`;
    setTimeout(() => {
      el.style.textShadow = '';
    }, 500);
  }
};
