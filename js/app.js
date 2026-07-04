'use strict';

// ============================================================
//  js/app.js — Initialization, version, main entry point
// ============================================================

const VERSION = '2.1.0';
const BUILD_DATE = '2026-07-04';

console.log('');
console.log('╔══════════════════════════════════════╗');
console.log('║   🐾  POKÉMON BANTSO  🐾           ║');
console.log('║   Version ' + VERSION + '                    ║');
console.log('║   Build  ' + BUILD_DATE + '               ║');
console.log('╚══════════════════════════════════════╝');
console.log('');

async function init() {
  console.log('[Bantso:app] ===== INIT START =====');
  console.log('[Bantso:app] Version:', VERSION);
  console.log('[Bantso:app] User-Agent:', navigator.userAgent);

  // Audio
  Game.audio = new SoundEngine();
  Game.audio.init();

  // Load saved game (or create fresh)
  await loadGame();

  Game.level = Game.playerLevel;
  healAllPokemon();
  await saveGame();

  console.log('[Bantso:app] Post-load state | level:', Game.level, '| uniqueCaught:', Game.totalUniqueCaught, '| collection:', Game.collection.length, '| leagueUnlocked:', Game.leagueUnlocked, '| leagueWins:', Game.leagueWins);

  // Set up all event handlers
  setupEventHandlers();

  // Render initial screen
  renderForestScreen();
  updateProgressBar();
  updateExploreButton();

  if (Game.leagueUnlocked) {
    console.log('[Bantso:app] League is unlocked — showing league button');
    $('#league-btn').style.display = 'flex';
  }

  // Register service worker for offline
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('[Bantso:app] Service Worker registered:', reg.scope);
    } catch(e) {
      console.warn('[Bantso:app] Service Worker registration failed:', e);
    }
  }

  // If league already unlocked, go straight to arena
  if (Game.leagueUnlocked) {
    console.log('[Bantso:app] Directing to league arena');
    showScreen('league-arena');
    renderLeagueArena();
  }

  console.log('[Bantso:app] ===== INIT COMPLETE =====');
}

// Boot
init().catch(err => {
  console.error('[Bantso:app] INIT FAILED:', err);
  console.error('[Bantso:app] Stack:', err.stack);
  // Fallback: minimal working state
  Game.audio = new SoundEngine();
  Game.audio.init();
  setupEventHandlers();
  renderForestScreen();
  updateProgressBar();
  console.log('[Bantso:app] Fallback init complete (degraded mode)');
});
