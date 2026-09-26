'use strict';

// ============================================================
//  js/persist.js — Save / load game state to IndexedDB
// ============================================================

async function saveGame() {
  if (!Game.db) { console.warn('[Bantso:persist] saveGame called but db is null'); return; }
  console.log('[Bantso:persist] Saving game… level:', Game.playerLevel, 'collection:', Game.collection.length);
  await dbPut(Game.db, 'playerState', {
    id: 'main_player',
    level: Game.playerLevel,
    caughtCount: Game.caughtCount,
    caughtSpecies: Game.caughtSpecies,
    activePokemonId: Game.activePokemonId,
    leagueUnlocked: Game.leagueUnlocked,
  });
  for (const p of Game.collection) {
    await dbPut(Game.db, 'collection', p);
  }
  await dbPut(Game.db, 'leagueState', {
    id: 'league',
    wins: Game.leagueWins,
  });
  console.log('[Bantso:persist] Save complete');
}

async function loadGame() {
  console.log('[Bantso:persist] Loading game…');
  const db = await openDB();
  Game.db = db;

  const state = await dbGet(db, 'playerState', 'main_player');
  const collection = await dbGetAll(db, 'collection');
  const leagueState = await dbGet(db, 'leagueState', 'league');

  console.log('[Bantso:persist] Loaded state:', state ? 'found' : 'none', '| collection:', collection.length, '| leagueState:', leagueState ? 'found' : 'none');

  if (state) {
    Game.caughtCount = state.caughtCount || 1;
    Game.caughtSpecies = state.caughtSpecies || ['pikachu'];
    Game.activePokemonId = state.activePokemonId || null;
    Game.leagueUnlocked = state.leagueUnlocked || false;
  }

  if (leagueState) {
    Game.leagueWins = leagueState.wins || 0;
  }

  // Retroactive unlock for legacy players already at max level
  if (!Game.leagueUnlocked && Game.isMaxLevel) {
    console.log('[Bantso:persist] Retroactive league unlock — player already at max level');
    Game.leagueUnlocked = true;
    await dbPut(db, 'playerState', {
      id: 'main_player',
      level: Game.playerLevel,
      caughtCount: Game.caughtCount,
      caughtSpecies: Game.caughtSpecies,
      activePokemonId: Game.activePokemonId,
      leagueUnlocked: true,
    });
  }

  if (collection && collection.length > 0) {
    Game.collection = collection;
    if (!Game.activePokemonId) {
      Game.activePokemonId = collection[0].id;
    }
    // Rebuild caughtSpecies from actual collection — don't trust stale saved state
    const uniqueFromCollection = [...new Set(collection.map(p => p.baseSpeciesId || p.speciesId))];
    if (uniqueFromCollection.length !== Game.caughtSpecies.length) {
      console.log('[Bantso:persist] Rebuilding caughtSpecies from collection:', uniqueFromCollection.length, 'unique (was', Game.caughtSpecies.length, ')');
      Game.caughtSpecies = uniqueFromCollection;
      Game.caughtCount = collection.length;
    }
  } else {
    console.log('[Bantso:persist] No collection found — creating starter Pikachu');
    const starter = {
      id: 'pikachu_01',
      speciesId: 'pikachu',
      baseSpeciesId: 'pikachu',
      name: 'Pikachu',
      currentHp: 100,
    };
    Game.collection = [starter];
    Game.activePokemonId = starter.id;
    Game.caughtCount = 1;
    Game.caughtSpecies = ['pikachu'];
    await saveGame();
    healAllPokemon();
    await saveGame();
  }
  console.log('[Bantso:persist] Load complete | level:', Game.playerLevel, '| league:', Game.leagueUnlocked);
}

function healAllPokemon() {
  console.log('[Bantso:persist] Healing all Pokémon');
  for (const p of Game.collection) {
    const stats = Game.getEffectiveStats(p);
    p.currentHp = stats.maxHp;
  }
}

async function clearAllData() {
  if (!Game.db) return;
  console.warn('[Bantso:persist] Clearing ALL data!');
  await dbClear(Game.db, 'playerState');
  await dbClear(Game.db, 'collection');
  await dbClear(Game.db, 'leagueState');
  console.log('[Bantso:persist] All data cleared');
}
