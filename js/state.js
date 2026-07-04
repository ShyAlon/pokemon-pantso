'use strict';

// ============================================================
//  js/state.js — Central game state
// ============================================================

const Game = {
  db: null,
  audio: null,
  screen: 'forest',
  level: 1,
  caughtCount: 0,
  caughtSpecies: [],
  activePokemonId: null,
  collection: [],
  battle: null,
  busy: false,
  teamContext: null,
  scrollOffset: 0,
  leagueUnlocked: false,
  leagueWins: 0,
  leagueBattle: null,

  get totalUniqueCaught() {
    return this.caughtSpecies.length;
  },

  get playerLevel() {
    return Math.floor(this.totalUniqueCaught / 2) + 1;
  },

  get maxLevel() { return 10; },

  get isMaxLevel() {
    return this.playerLevel >= this.maxLevel;
  },

  getActivePokemon() {
    const p = this.collection.find(p => p.id === this.activePokemonId);
    if (!p) console.warn('[Bantso:state] activePokemonId', this.activePokemonId, 'not found in collection');
    return p;
  },

  getEffectiveStats(pokemon) {
    const level = this.playerLevel;
    const species = getSpecies(pokemon.speciesId);
    const maxHp = species.baseHp + (level - 1) * 15;
    const damage = species.baseDmg + (level - 1) * 2;
    return { maxHp, damage };
  },
};

console.log('[Bantso:state] Game state object initialized');
