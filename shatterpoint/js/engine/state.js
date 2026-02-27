// === SHATTERPOINT: Game State ===

class GameState {
  constructor() {
    this.resonance = 70;
    this.maxResonance = 100;
    this.suspicion = 0;
    this.maxSuspicion = 100;
    this.quietLevel = 0;
    this.maxQuiet = 100;
    this.integrity = 75;
    this.maxIntegrity = 100;

    this.inventory = [];
    this.maxInventory = 8;
    this.flags = new Set();
    this.npcTrust = {
      crowe: 0,
      talia: 0,
      rook: 0,
      rennick: 0,
      thane: 0
    };
    this.journal = [];
    this.currentScene = 'act1_scene01';
    this.choicesMade = [];
    this.scenesVisited = new Set();
    this.turnCount = 0;
  }

  modifyStat(stat, delta) {
    const maxKey = 'max' + stat.charAt(0).toUpperCase() + stat.slice(1);
    if (this[stat] !== undefined) {
      this[stat] = Math.max(0, Math.min(this[maxKey] || 100, this[stat] + delta));
    }
  }

  setStat(stat, value) {
    const maxKey = 'max' + stat.charAt(0).toUpperCase() + stat.slice(1);
    if (this[stat] !== undefined) {
      this[stat] = Math.max(0, Math.min(this[maxKey] || 100, value));
    }
  }

  addItem(itemId) {
    if (this.inventory.length < this.maxInventory && !this.inventory.includes(itemId)) {
      this.inventory.push(itemId);
      return true;
    }
    return false;
  }

  removeItem(itemId) {
    const idx = this.inventory.indexOf(itemId);
    if (idx !== -1) {
      this.inventory.splice(idx, 1);
      return true;
    }
    return false;
  }

  hasItem(itemId) {
    return this.inventory.includes(itemId);
  }

  setFlag(flag) {
    this.flags.add(flag);
  }

  removeFlag(flag) {
    this.flags.delete(flag);
  }

  hasFlag(flag) {
    return this.flags.has(flag);
  }

  modifyTrust(npc, delta) {
    if (this.npcTrust[npc] !== undefined) {
      this.npcTrust[npc] = Math.max(-100, Math.min(100, this.npcTrust[npc] + delta));
    }
  }

  getTrust(npc) {
    return this.npcTrust[npc] || 0;
  }

  addJournal(entry) {
    this.journal.push({
      text: entry,
      turn: this.turnCount,
      scene: this.currentScene
    });
  }

  recordChoice(choiceId) {
    this.choicesMade.push(choiceId);
  }

  madeChoice(choiceId) {
    return this.choicesMade.includes(choiceId);
  }

  visitScene(sceneId) {
    this.scenesVisited.add(sceneId);
  }

  visitedScene(sceneId) {
    return this.scenesVisited.has(sceneId);
  }

  regenResonance(amount = 5) {
    this.modifyStat('resonance', amount);
  }

  getSuspicionLevel() {
    if (this.suspicion <= 30) return 'safe';
    if (this.suspicion <= 60) return 'watched';
    if (this.suspicion <= 85) return 'hunted';
    if (this.suspicion < 100) return 'critical';
    return 'captured';
  }

  getDegradationLevel() {
    if (this.resonance >= 20) return 'none';
    if (this.resonance >= 10) return 'light';
    if (this.resonance >= 5) return 'medium';
    return 'heavy';
  }

  // Serialize for save
  toJSON() {
    return {
      resonance: this.resonance,
      suspicion: this.suspicion,
      quietLevel: this.quietLevel,
      integrity: this.integrity,
      inventory: [...this.inventory],
      flags: [...this.flags],
      npcTrust: { ...this.npcTrust },
      journal: [...this.journal],
      currentScene: this.currentScene,
      choicesMade: [...this.choicesMade],
      scenesVisited: [...this.scenesVisited],
      turnCount: this.turnCount
    };
  }

  // Deserialize from save
  static fromJSON(data) {
    const state = new GameState();
    state.resonance = data.resonance;
    state.suspicion = data.suspicion;
    state.quietLevel = data.quietLevel;
    state.integrity = data.integrity;
    state.inventory = data.inventory || [];
    state.flags = new Set(data.flags || []);
    state.npcTrust = data.npcTrust || {};
    state.journal = data.journal || [];
    state.currentScene = data.currentScene;
    state.choicesMade = data.choicesMade || [];
    state.scenesVisited = new Set(data.scenesVisited || []);
    state.turnCount = data.turnCount || 0;
    return state;
  }
}
