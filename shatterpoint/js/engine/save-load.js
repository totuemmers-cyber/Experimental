// === SHATTERPOINT: Save/Load System ===

const SaveLoad = {
  PREFIX: 'shatterpoint_',
  SLOTS: ['save_1', 'save_2', 'save_3'],
  AUTOSAVE_KEY: 'autosave',

  save(slot, state) {
    const data = {
      state: state.toJSON(),
      timestamp: Date.now(),
      sceneName: SCENES[state.currentScene]?.title || 'Unknown',
      version: 1
    };
    try {
      localStorage.setItem(this.PREFIX + slot, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  },

  load(slot) {
    try {
      const raw = localStorage.getItem(this.PREFIX + slot);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return {
        state: GameState.fromJSON(data.state),
        timestamp: data.timestamp,
        sceneName: data.sceneName
      };
    } catch (e) {
      console.error('Load failed:', e);
      return null;
    }
  },

  autosave(state) {
    this.save(this.AUTOSAVE_KEY, state);
  },

  loadAutosave() {
    return this.load(this.AUTOSAVE_KEY);
  },

  getSlotInfo(slot) {
    try {
      const raw = localStorage.getItem(this.PREFIX + slot);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return {
        timestamp: data.timestamp,
        sceneName: data.sceneName,
        dateStr: new Date(data.timestamp).toLocaleString()
      };
    } catch {
      return null;
    }
  },

  getAllSlotInfo() {
    const info = {};
    for (const slot of this.SLOTS) {
      info[slot] = this.getSlotInfo(slot);
    }
    info[this.AUTOSAVE_KEY] = this.getSlotInfo(this.AUTOSAVE_KEY);
    return info;
  },

  deleteSlot(slot) {
    localStorage.removeItem(this.PREFIX + slot);
  }
};
