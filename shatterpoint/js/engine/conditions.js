// === SHATTERPOINT: Condition Evaluator ===

const Conditions = {
  /**
   * Check if a choice's requirements are met.
   * Returns { met: boolean, reason: string|null }
   */
  check(requires, state) {
    if (!requires) return { met: true, reason: null };

    for (const [key, value] of Object.entries(requires)) {
      const result = this.evaluateCondition(key, value, state);
      if (!result.met) return result;
    }

    return { met: true, reason: null };
  },

  evaluateCondition(key, value, state) {
    // Stat comparisons: resonance_gte, suspicion_lte, etc.
    const gteMatch = key.match(/^(\w+)_gte$/);
    if (gteMatch) {
      const stat = gteMatch[1];
      const current = state[stat];
      if (current !== undefined && current < value) {
        return { met: false, reason: `Requires ${value} ${this.formatStat(stat)}` };
      }
      return { met: true, reason: null };
    }

    const lteMatch = key.match(/^(\w+)_lte$/);
    if (lteMatch) {
      const stat = lteMatch[1];
      const current = state[stat];
      if (current !== undefined && current > value) {
        return { met: false, reason: `${this.formatStat(stat)} must be below ${value}` };
      }
      return { met: true, reason: null };
    }

    // Flag checks
    if (key === 'has_flag') {
      const flags = Array.isArray(value) ? value : [value];
      for (const flag of flags) {
        if (!state.hasFlag(flag)) {
          return { met: false, reason: 'Requires prior discovery' };
        }
      }
      return { met: true, reason: null };
    }

    if (key === 'not_flag') {
      const flags = Array.isArray(value) ? value : [value];
      for (const flag of flags) {
        if (state.hasFlag(flag)) {
          return { met: false, reason: null }; // silently hide
        }
      }
      return { met: true, reason: null };
    }

    // Item checks
    if (key === 'has_item') {
      const items = Array.isArray(value) ? value : [value];
      for (const item of items) {
        if (!state.hasItem(item)) {
          return { met: false, reason: `Requires: ${ITEMS[item]?.name || item}` };
        }
      }
      return { met: true, reason: null };
    }

    // Trust checks: trust_crowe_gte, etc.
    const trustMatch = key.match(/^trust_(\w+)_gte$/);
    if (trustMatch) {
      const npc = trustMatch[1];
      if (state.getTrust(npc) < value) {
        return { met: false, reason: `Insufficient trust` };
      }
      return { met: true, reason: null };
    }

    const trustLteMatch = key.match(/^trust_(\w+)_lte$/);
    if (trustLteMatch) {
      const npc = trustLteMatch[1];
      if (state.getTrust(npc) > value) {
        return { met: false, reason: null };
      }
      return { met: true, reason: null };
    }

    // Choice checks
    if (key === 'made_choice') {
      const choices = Array.isArray(value) ? value : [value];
      for (const choice of choices) {
        if (!state.madeChoice(choice)) {
          return { met: false, reason: 'Requires prior action' };
        }
      }
      return { met: true, reason: null };
    }

    if (key === 'not_choice') {
      const choices = Array.isArray(value) ? value : [value];
      for (const choice of choices) {
        if (state.madeChoice(choice)) {
          return { met: false, reason: null };
        }
      }
      return { met: true, reason: null };
    }

    // Scene visited
    if (key === 'visited_scene') {
      if (!state.visitedScene(value)) {
        return { met: false, reason: 'Requires prior visit' };
      }
      return { met: true, reason: null };
    }

    // Suspicion level
    if (key === 'suspicion_level') {
      if (state.getSuspicionLevel() !== value) {
        return { met: false, reason: null };
      }
      return { met: true, reason: null };
    }

    return { met: true, reason: null };
  },

  formatStat(stat) {
    const names = {
      resonance: 'Resonance',
      suspicion: 'Suspicion',
      quietLevel: 'Quiet Level',
      integrity: 'Integrity'
    };
    return names[stat] || stat;
  }
};
