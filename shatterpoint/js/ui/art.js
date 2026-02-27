// === SHATTERPOINT: ASCII Art Loader ===

const ArtLoader = {
  cache: {},

  /**
   * Load ASCII art from a .txt file in the art/ directory.
   * Returns cached version if available.
   */
  async load(filename) {
    if (this.cache[filename]) {
      return this.cache[filename];
    }

    try {
      const response = await fetch('art/' + filename);
      if (!response.ok) {
        console.warn('Art not found:', filename);
        return this.placeholder(filename);
      }
      const text = await response.text();
      this.cache[filename] = text;
      return text;
    } catch (e) {
      console.warn('Failed to load art:', filename, e);
      return this.placeholder(filename);
    }
  },

  /**
   * Generate a placeholder when art file is missing.
   */
  placeholder(filename) {
    const name = filename.replace('.txt', '').replace(/-/g, ' ').toUpperCase();
    return [
      '+----------------------------------+',
      '|                                  |',
      '|     [ ' + name.padEnd(24) + ' ]  |',
      '|                                  |',
      '|          .  *  .  .  *           |',
      '|       .  .  .  .  .  .  .        |',
      '|          *  .  .  .  *           |',
      '|       .  .  .  .  .  .  .        |',
      '|          .  *  .  .  *           |',
      '|                                  |',
      '+----------------------------------+'
    ].join('\n');
  }
};
