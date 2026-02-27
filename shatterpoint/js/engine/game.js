// === SHATTERPOINT: Game Loop ===

class Game {
  constructor() {
    this.state = new GameState();
    this.sceneManager = new SceneManager(this.state);
    this.running = false;
    this.inputLocked = false;
    this.gameStarted = false;
  }

  async start() {
    Renderer.init();
    this.running = true;
    this.bindInput();

    // Show title screen
    await Renderer.showTitleScreen();
  }

  async beginGame() {
    if (this.gameStarted) return;
    this.gameStarted = true;

    Renderer.hideTitleScreen();

    // Check for autosave
    const autosave = SaveLoad.loadAutosave();
    if (autosave) {
      // For now, always start fresh. Load available through L key.
    }

    // Load first scene
    await this.transitionToScene('act1_scene01');
  }

  async loadGame(saveData) {
    this.state = saveData.state;
    this.sceneManager = new SceneManager(this.state);
    this.gameStarted = true;
    Renderer.hideTitleScreen();
    await this.transitionToScene(this.state.currentScene);
  }

  async transitionToScene(sceneId) {
    this.inputLocked = true;
    Renderer.clearChoices();

    // Handle restart -> title screen
    if (sceneId === 'act1_scene01' && this.state.hasFlag('act1_complete')) {
      this.state = new GameState();
      this.sceneManager = new SceneManager(this.state);
      this.gameStarted = false;
      await Renderer.showTitleScreen();
      return;
    }

    Effects.sceneTransition(async () => {
      const scene = this.sceneManager.loadScene(sceneId);
      if (!scene) {
        console.error('Scene not found:', sceneId);
        this.inputLocked = false;
        return;
      }

      const choices = this.sceneManager.getAvailableChoices();
      await Renderer.renderScene(scene, this.state, choices, (choiceId) => {
        this.handleChoice(choiceId);
      });

      this.inputLocked = false;
    });
  }

  async handleChoice(choiceId) {
    if (this.inputLocked) return;

    // If typewriter is running, skip it first
    if (Effects.isTypewriting()) {
      Effects.skipTypewriter(Renderer.fullNarrativeText, Renderer.elements.narrative);
      return;
    }

    this.inputLocked = true;

    const result = this.sceneManager.executeChoice(choiceId);
    if (!result) {
      this.inputLocked = false;
      return;
    }

    // Update stats display immediately
    Renderer.updateStats(this.state);
    Renderer.updateInventory(this.state);

    // Show flavor text if any
    if (result.flavor) {
      Renderer.appendNarrative('\n' + result.flavor);
      await this.delay(800);
    }

    // Check game over conditions
    if (this.state.suspicion >= 100) {
      await this.gameOver('captured');
      return;
    }

    // Transition to next scene
    if (result.nextScene) {
      await this.delay(300);
      await this.transitionToScene(result.nextScene);
    } else {
      this.inputLocked = false;
    }
  }

  async gameOver(type) {
    if (type === 'captured') {
      await this.transitionToScene('game_over_captured');
    }
  }

  bindInput() {
    document.addEventListener('keydown', (e) => {
      // Title screen — any key starts game
      if (!this.gameStarted) {
        if (!e.repeat) {
          this.beginGame();
        }
        return;
      }

      // Handle overlays
      if (Renderer.isJournalOpen()) {
        if (e.key === 'j' || e.key === 'J' || e.key === 'Escape') {
          Renderer.hideJournal();
        }
        return;
      }

      if (Renderer.isSaveModalOpen()) {
        if (e.key === 'Escape') {
          Renderer.hideSaveModal();
        }
        return;
      }

      // Skip typewriter on any key
      if (Effects.isTypewriting()) {
        Effects.skipTypewriter(Renderer.fullNarrativeText, Renderer.elements.narrative);
        // Re-render choices after skip
        const choices = this.sceneManager.getAvailableChoices();
        Renderer.renderChoices(choices, (choiceId) => this.handleChoice(choiceId));
        return;
      }

      // Hotkeys
      if (e.key === 's' || e.key === 'S') {
        this.showSave();
        return;
      }
      if (e.key === 'l' || e.key === 'L') {
        this.showLoad();
        return;
      }
      if (e.key === 'j' || e.key === 'J') {
        Renderer.showJournal(this.state.journal);
        return;
      }

      // Number keys for choices
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        const choices = this.sceneManager.getAvailableChoices();
        if (num <= choices.length && choices[num - 1].available) {
          this.handleChoice(choices[num - 1].id);
        }
      }
    });

    // Title screen click
    document.getElementById('title-screen').addEventListener('click', () => {
      this.beginGame();
    });
  }

  showSave() {
    Renderer.showSaveModal('save', (slot) => {
      const success = SaveLoad.save(slot, this.state);
      Renderer.hideSaveModal();
      if (success) {
        Renderer.appendNarrative('\n[SYSTEM: Game saved.]');
      }
    });
  }

  showLoad() {
    Renderer.showSaveModal('load', (slot) => {
      const data = SaveLoad.load(slot);
      if (data) {
        Renderer.hideSaveModal();
        this.loadGame(data);
      }
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
