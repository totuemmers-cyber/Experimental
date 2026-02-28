// === SHATTERPOINT: Renderer ===

const Renderer = {
  elements: {},
  fullNarrativeText: '',

  init() {
    this.elements = {
      titleScreen: document.getElementById('title-screen'),
      titleArt: document.getElementById('title-art'),
      terminal: document.getElementById('terminal'),
      headerLeft: document.getElementById('header-left'),
      headerRight: document.getElementById('header-right'),
      viewscreenLabel: document.getElementById('viewscreen-label'),
      viewscreen: document.getElementById('viewscreen'),
      resonanceBar: document.getElementById('resonance-bar'),
      resonanceValue: document.getElementById('resonance-value'),
      suspicionBar: document.getElementById('suspicion-bar'),
      suspicionValue: document.getElementById('suspicion-value'),
      quietBar: document.getElementById('quiet-bar'),
      quietValue: document.getElementById('quiet-value'),
      integrityBar: document.getElementById('integrity-bar'),
      integrityValue: document.getElementById('integrity-value'),
      inventoryList: document.getElementById('inventory-list'),
      narrative: document.getElementById('narrative'),
      choices: document.getElementById('choices'),
      locationDisplay: document.getElementById('location-display'),
      journalOverlay: document.getElementById('journal-overlay'),
      journalEntries: document.getElementById('journal-entries'),
      saveOverlay: document.getElementById('save-overlay'),
      saveHeader: document.getElementById('save-header'),
      saveSlots: document.getElementById('save-slots')
    };
  },

  // === Title Screen ===

  async showTitleScreen() {
    const art = await ArtLoader.load('title.txt');
    this.elements.titleArt.textContent = art;
    this.elements.titleScreen.classList.remove('hidden');
    this.elements.terminal.classList.add('hidden');
  },

  hideTitleScreen() {
    this.elements.titleScreen.classList.add('hidden');
    this.elements.terminal.classList.remove('hidden');
  },

  // === Stats ===

  updateStats(state) {
    this.renderBar('resonance', state.resonance, state.maxResonance, 'green');
    this.renderBar('suspicion', state.suspicion, state.maxSuspicion, 'red');
    this.renderBar('quiet', state.quietLevel, state.maxQuiet, 'cyan');
    this.renderBar('integrity', state.integrity, state.maxIntegrity, 'amber');

    // Update degradation
    Effects.updateDegradation(state.getDegradationLevel());
  },

  renderBar(id, value, max, color) {
    const barEl = document.getElementById(id + '-bar');
    const valEl = document.getElementById(id + '-value');
    if (!barEl || !valEl) return;

    const width = 10;
    const filled = Math.round((value / max) * width);
    const empty = width - filled;

    const colorClass = this.getBarColor(id, value, max, color);
    barEl.innerHTML =
      `<span class="${colorClass}">${'█'.repeat(filled)}</span>` +
      `<span class="bar-empty">${'░'.repeat(empty)}</span>`;
    valEl.textContent = value + '%';
  },

  getBarColor(id, value, max, defaultColor) {
    // Suspicion changes color as it rises
    if (id === 'suspicion') {
      if (value > 85) return 'bar-filled-red';
      if (value > 60) return 'bar-filled-amber';
      return 'bar-filled-green';
    }
    // Resonance changes color as it drops
    if (id === 'resonance') {
      if (value < 15) return 'bar-filled-red';
      if (value < 30) return 'bar-filled-amber';
      return 'bar-filled-green';
    }
    return 'bar-filled-' + defaultColor;
  },

  // === Inventory ===

  updateInventory(state) {
    const el = this.elements.inventoryList;
    if (state.inventory.length === 0) {
      el.innerHTML = '<div style="color: var(--text-dim); font-size: 11px;">[ empty ]</div>';
      return;
    }

    el.innerHTML = state.inventory.map(itemId => {
      const item = ITEMS[itemId];
      const name = item ? item.name : itemId;
      return `<div class="inventory-item">${name}</div>`;
    }).join('');
  },

  // === Viewscreen ===

  async updateViewscreen(scene) {
    if (scene.art) {
      const art = await ArtLoader.load(scene.art);
      this.elements.viewscreen.textContent = art;
    } else {
      this.elements.viewscreen.textContent = '';
    }
    this.elements.viewscreenLabel.textContent = scene.title ? `── ${scene.title} ──` : '';
  },

  // === Narrative ===

  async showNarrative(text, instant = false) {
    // Process text markup
    const processed = this.processMarkup(text);
    this.fullNarrativeText = processed;

    if (instant) {
      this.elements.narrative.innerHTML = processed;
      this.elements.narrative.scrollTop = this.elements.narrative.scrollHeight;
    } else {
      await Effects.typewriter(processed, this.elements.narrative, 15);
    }
  },

  appendNarrative(text) {
    const processed = this.processMarkup(text);
    this.elements.narrative.innerHTML += '<br><br>' + processed;
    this.elements.narrative.scrollTop = this.elements.narrative.scrollHeight;
  },

  processMarkup(text) {
    // *italic* -> psychic text
    let processed = text.replace(/\*([^*]+)\*/g, '<span class="psychic-text">$1</span>');
    // {crowe: text} -> NPC colored text
    processed = processed.replace(/\{(\w+):\s*([^}]+)\}/g, (_, npc, content) => {
      return `<span class="npc-${npc}">${content}</span>`;
    });
    // [SYSTEM: text] -> system text
    processed = processed.replace(/\[SYSTEM:\s*([^\]]+)\]/g, '<span class="system-text">$1</span>');
    // [WARNING: text] -> warning text
    processed = processed.replace(/\[WARNING:\s*([^\]]+)\]/g, '<span class="warning-text">$1</span>');
    // Newlines to <br>
    processed = processed.replace(/\n/g, '<br>');
    return processed;
  },

  // === Choices ===

  renderChoices(choices, onSelect) {
    const el = this.elements.choices;
    el.innerHTML = '';

    choices.forEach((choice, index) => {
      const div = document.createElement('div');
      div.className = 'choice' + (choice.available ? '' : ' disabled');

      const num = index + 1;
      let text = `<span class="choice-number">[${num}]</span> `;

      // Highlight psychic verbs
      if (choice.text.match(/^\[(SCAN|PROBE|WHISPER|QUIET|ECHO)\]/)) {
        text += `<span class="choice-psychic">${choice.text}</span>`;
      } else {
        text += choice.text;
      }

      // Show cost
      if (choice.cost) {
        const costs = Object.entries(choice.cost)
          .map(([stat, delta]) => `${Math.abs(delta)} ${Conditions.formatStat(stat)}`)
          .join(', ');
        text += `<span class="choice-cost">(-${costs})</span>`;
      }

      // Show reason for disabled
      if (!choice.available && choice.reason) {
        text += `<span class="choice-cost"> [${choice.reason}]</span>`;
      }

      div.innerHTML = text;
      div.dataset.index = num;
      div.dataset.choiceId = choice.id;

      if (choice.available) {
        div.addEventListener('click', () => onSelect(choice.id));
        div.addEventListener('mouseenter', () => Audio.sfxHover());
      }

      el.appendChild(div);
    });
  },

  clearChoices() {
    this.elements.choices.innerHTML = '';
  },

  // === Location ===

  updateLocation(scene) {
    this.elements.locationDisplay.textContent = scene.location || scene.title || '';
  },

  // === Journal ===

  showJournal(journal) {
    const el = this.elements.journalEntries;
    if (journal.length === 0) {
      el.innerHTML = '<div style="color: var(--text-dim);">No entries yet.</div>';
    } else {
      el.innerHTML = journal.map((entry, i) => {
        return `<div class="journal-entry">` +
          `<span class="journal-entry-number">${String(i + 1).padStart(2, '0')}.</span>` +
          `${entry.text}</div>`;
      }).join('');
    }
    this.elements.journalOverlay.classList.remove('hidden');
  },

  hideJournal() {
    this.elements.journalOverlay.classList.add('hidden');
  },

  isJournalOpen() {
    return !this.elements.journalOverlay.classList.contains('hidden');
  },

  // === Save/Load Modal ===

  showSaveModal(mode, onSelect) {
    const el = this.elements.saveSlots;
    this.elements.saveHeader.textContent = mode === 'save'
      ? '═══ SAVE GAME ═══'
      : '═══ LOAD GAME ═══';

    const slots = SaveLoad.getAllSlotInfo();
    el.innerHTML = '';

    const allSlots = mode === 'load'
      ? ['autosave', ...SaveLoad.SLOTS]
      : SaveLoad.SLOTS;

    allSlots.forEach(slot => {
      const info = slots[slot];
      const div = document.createElement('div');
      div.className = 'save-slot';

      const label = slot === 'autosave' ? 'AUTOSAVE' : slot.replace('save_', 'SLOT ');
      let infoText = 'Empty';
      if (info) {
        infoText = `${info.sceneName} — ${info.dateStr}`;
      }

      div.innerHTML = `<div class="save-slot-label">${label}</div>` +
        `<div class="save-slot-info">${infoText}</div>`;

      if (mode === 'load' && !info) {
        div.classList.add('disabled');
      } else {
        div.addEventListener('click', () => onSelect(slot));
      }

      el.appendChild(div);
    });

    this.elements.saveOverlay.classList.remove('hidden');
  },

  hideSaveModal() {
    this.elements.saveOverlay.classList.add('hidden');
  },

  isSaveModalOpen() {
    return !this.elements.saveOverlay.classList.contains('hidden');
  },

  // === Full Scene Render ===

  async renderScene(scene, state, choices, onSelect) {
    // Update all panels
    this.updateStats(state);
    this.updateInventory(state);
    this.updateLocation(scene);
    await this.updateViewscreen(scene);

    // Build narrative text
    let narrativeText = scene.description || '';

    // Add ambient text occasionally
    if (scene.ambient && Math.random() > 0.5) {
      const ambientLine = Array.isArray(scene.ambient)
        ? scene.ambient[Math.floor(Math.random() * scene.ambient.length)]
        : scene.ambient;
      narrativeText += '\n\n' + ambientLine;
    }

    // Show narrative with typewriter
    await this.showNarrative(narrativeText);

    // Low resonance intrusive thoughts
    if (state.getDegradationLevel() !== 'none' && Math.random() > 0.5) {
      setTimeout(() => {
        Effects.intrusiveThought(this.elements.narrative);
      }, 1000);
    }

    // Render choices
    this.renderChoices(choices, onSelect);
  }
};
