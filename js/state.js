'use strict';

// ============================================================
//  js/state.js — Central game state
// ============================================================

const STARTER_POKEMON_ID = 'pikachu_01';

const HARD_MODE_RULES = Object.freeze({
  maxTeamSize: 7,
  adjustmentFights: 2,
  fightsBeforeRest: 2,
});

const Game = {
  db: null,
  audio: null,
  screen: 'forest',
  region: 'Kanto',
  gameMinutes: 720,
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
  hardMode: false,
  pendingEvolution: null,
  stones: {},

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

  canPokemonFight(pokemon) {
    return this.getPokemonFightStatus(pokemon) === null;
  },

  getPokemonFightStatus(pokemon) {
    if (!this.hardMode || !pokemon || pokemon.id === STARTER_POKEMON_ID) return null;
    const cooldown = pokemon.hardCooldown || 0;
    if (cooldown > 0) {
      return {
        type: 'adjusting',
        message: `Still adjusting to the team — ready after ${cooldown} more fight${cooldown === 1 ? '' : 's'}.`,
      };
    }
    if ((pokemon.fightsSinceRest || 0) >= HARD_MODE_RULES.fightsBeforeRest) {
      return {
        type: 'fatigued',
        message: 'Fatigued after two fights — must rest for one fight.',
      };
    }
    return null;
  },

  getBattleReadyPokemon(excludedId = null) {
    return this.collection.filter(pokemon =>
      pokemon.id !== excludedId && pokemon.currentHp > 0 && this.canPokemonFight(pokemon)
    );
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
