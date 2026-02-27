// === SHATTERPOINT: Scene Manager ===

class SceneManager {
  constructor(state) {
    this.state = state;
    this.currentScene = null;
    this.transitioning = false;
  }

  loadScene(sceneId) {
    const scene = SCENES[sceneId];
    if (!scene) {
      console.error('Scene not found:', sceneId);
      return null;
    }

    this.currentScene = { ...scene, id: sceneId };
    this.state.currentScene = sceneId;
    this.state.turnCount++;

    // Track visit
    const firstVisit = !this.state.visitedScene(sceneId);
    this.state.visitScene(sceneId);

    // Process onEnter effects
    if (scene.onEnter) {
      for (const effect of scene.onEnter) {
        this.processEffect(effect, firstVisit);
      }
    }

    // Regen resonance on scene transition (except first scene)
    if (this.state.turnCount > 1) {
      this.state.regenResonance(5);
    }

    // Autosave
    SaveLoad.autosave(this.state);

    return this.currentScene;
  }

  getAvailableChoices() {
    if (!this.currentScene || !this.currentScene.choices) return [];

    return this.currentScene.choices.map(choice => {
      const condition = Conditions.check(choice.requires, this.state);

      // Check if cost is affordable
      let affordable = true;
      let costReason = null;
      if (choice.cost) {
        for (const [stat, delta] of Object.entries(choice.cost)) {
          if (delta < 0 && this.state[stat] + delta < 0) {
            affordable = false;
            costReason = `Not enough ${Conditions.formatStat(stat)}`;
          }
        }
      }

      // Check hidden condition (not_flag, not_choice hide the choice entirely)
      let hidden = false;
      if (choice.requires) {
        if (choice.requires.not_flag) {
          const flags = Array.isArray(choice.requires.not_flag)
            ? choice.requires.not_flag : [choice.requires.not_flag];
          hidden = flags.some(f => this.state.hasFlag(f));
        }
        if (choice.requires.not_choice) {
          const choices = Array.isArray(choice.requires.not_choice)
            ? choice.requires.not_choice : [choice.requires.not_choice];
          hidden = hidden || choices.some(c => this.state.madeChoice(c));
        }
      }

      return {
        ...choice,
        available: condition.met && affordable,
        reason: condition.reason || costReason,
        hidden
      };
    }).filter(c => !c.hidden);
  }

  executeChoice(choiceId) {
    const choices = this.getAvailableChoices();
    const choice = choices.find(c => c.id === choiceId);
    if (!choice || !choice.available) return null;

    // Record the choice
    this.state.recordChoice(choiceId);

    // Apply costs
    if (choice.cost) {
      for (const [stat, delta] of Object.entries(choice.cost)) {
        this.state.modifyStat(stat, delta);
      }
    }

    // Apply effects
    if (choice.effects) {
      this.applyEffects(choice.effects);
    }

    // Flavor text to show before transition
    const result = {
      flavor: choice.flavor || null,
      nextScene: choice.leadsTo,
      choiceText: choice.text
    };

    return result;
  }

  applyEffects(effects) {
    // Stat modifications: { resonance: -10, suspicion: 5 }
    for (const [key, value] of Object.entries(effects)) {
      if (['resonance', 'suspicion', 'quietLevel', 'integrity'].includes(key)) {
        this.state.modifyStat(key, value);
      }

      // NPC trust: { npc_trust: { crowe: 5, talia: -3 } }
      if (key === 'npc_trust' && typeof value === 'object') {
        for (const [npc, delta] of Object.entries(value)) {
          this.state.modifyTrust(npc, delta);
        }
      }

      // Flags
      if (key === 'flags_add') {
        const flags = Array.isArray(value) ? value : [value];
        flags.forEach(f => this.state.setFlag(f));
      }
      if (key === 'flags_remove') {
        const flags = Array.isArray(value) ? value : [value];
        flags.forEach(f => this.state.removeFlag(f));
      }

      // Items
      if (key === 'give_item') {
        const items = Array.isArray(value) ? value : [value];
        items.forEach(i => this.state.addItem(i));
      }
      if (key === 'remove_item') {
        const items = Array.isArray(value) ? value : [value];
        items.forEach(i => this.state.removeItem(i));
      }

      // Journal
      if (key === 'journal') {
        this.state.addJournal(value);
      }
    }
  }

  processEffect(effect, firstVisit) {
    // Conditional effects
    if (effect.condition === 'first_visit' && !firstVisit) return;

    switch (effect.action) {
      case 'set_flag':
        this.state.setFlag(effect.value);
        break;
      case 'remove_flag':
        this.state.removeFlag(effect.value);
        break;
      case 'journal':
        this.state.addJournal(effect.value);
        break;
      case 'modify_stat':
        this.state.modifyStat(effect.stat, effect.value);
        break;
      case 'give_item':
        this.state.addItem(effect.value);
        break;
      case 'modify_trust':
        this.state.modifyTrust(effect.npc, effect.value);
        break;
    }
  }
}
