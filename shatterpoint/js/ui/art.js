// === SHATTERPOINT: ASCII Art Loader ===

const ArtLoader = {
  cache: {},

  /**
   * Load ASCII art. Uses inline data (ART_INLINE) if available,
   * falls back to fetching from art/ directory.
   */
  async load(filename) {
    if (this.cache[filename]) {
      return this.cache[filename];
    }

    // Try inline data first (works everywhere, including file://)
    if (typeof ART_INLINE !== 'undefined' && ART_INLINE[filename]) {
      this.cache[filename] = ART_INLINE[filename];
      return this.cache[filename];
    }

    // Fall back to fetch (works on http/https)
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
