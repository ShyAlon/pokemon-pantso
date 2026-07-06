'use strict';

// ============================================================
//  js/events.js — All event handler setup
// ============================================================

function setupEventHandlers() {
  console.log('[Bantso:events] Setting up event handlers…');

  // Forest screen: click on grid handled via inline onclick in forest.js

  // League button
  $('#league-btn').addEventListener('click', () => {
    if (Game.busy) return;
    console.log('[Bantso:event] LEAGUE button clicked');
    Game.audio.play('click');
    showScreen('league-arena');
    renderLeagueArena();
  });

  // Arena fight button
  $('#arena-fight-btn').addEventListener('click', () => {
    console.log('[Bantso:event] ARENA FIGHT button clicked');
    startLeagueBattle();
  });

  // Battle actions
  $('#btn-attack').addEventListener('click', () => {
    console.log('[Bantso:event] ATTACK button clicked | leagueBattle:', !!Game.leagueBattle);
    if (Game.leagueBattle) { leagueAttack(); } else { playerAttack(); }
  });
  $('#btn-catch').addEventListener('click', () => {
    console.log('[Bantso:event] CATCH button clicked');
    playerCatch();
  });
  $('#btn-swap').addEventListener('click', () => {
    console.log('[Bantso:event] SWAP button clicked');
    openTeamOverlay('battle');
  });
  $('#btn-flee').addEventListener('click', () => {
    console.log('[Bantso:event] FLEE button clicked');
    playerFlee();
  });

  // Team overlay
  $('#team-close').addEventListener('click', () => {
    console.log('[Bantso:event] Team overlay closed');
    closeTeamOverlay();
    Game.audio.play('click');
  });

  $('#team-access-btn').addEventListener('click', () => {
    console.log('[Bantso:event] Team access button clicked (forest)');
    openTeamOverlay('forest');
    Game.audio.play('click');
  });

  // Lore modal
  $('#lore-close').addEventListener('click', () => {
    console.log('[Bantso:event] Lore modal closed');
    hideLore();
  });
  $('#lore-modal').addEventListener('click', (e) => {
    if (e.target === $('#lore-modal')) hideLore();
  });

  // Info buttons on battle sprites
  $('#ally-info').addEventListener('click', (e) => {
    e.stopPropagation();
    const activePkmn = Game.getActivePokemon();
    if (activePkmn) {
      console.log('[Bantso:event] Ally info clicked:', activePkmn.speciesId);
      showLore(activePkmn.speciesId);
    }
  });
  $('#enemy-info').addEventListener('click', (e) => {
    e.stopPropagation();
    if (Game.battle) {
      console.log('[Bantso:event] Enemy info clicked:', Game.battle.enemy.speciesId);
      showLore(Game.battle.enemy.speciesId);
    } else if (Game.leagueBattle) {
      console.log('[Bantso:event] League enemy info clicked:', Game.leagueBattle.enemy.speciesId);
      showLore(Game.leagueBattle.enemy.speciesId);
    }
  });

  // Menu
  $('#menu-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });
  $('#menu-close').addEventListener('click', () => {
    closeMenu();
  });
  $('#menu-restart').addEventListener('click', () => {
    showConfirm('Restart?', 'Keep starter, reset all progress.', doRestart);
  });
  $('#menu-newgame').addEventListener('click', () => {
    showConfirm('New Game?', 'Everything will be deleted!', doNewGame);
  });

  // League screen buttons
  $('#league-enter-btn').addEventListener('click', () => {
    console.log('[Bantso:event] League Enter Arena clicked');
    Game.audio.play('click');
    showScreen('league-arena');
    renderLeagueArena();
  });
  $('#league-forest-btn').addEventListener('click', () => {
    console.log('[Bantso:event] League Forest clicked');
    Game.audio.play('click');
    showScreen('forest');
    renderForestScreen();
    updateProgressBar();
  });
  $('#league-restart-btn').addEventListener('click', () => {
    console.log('[Bantso:event] League Restart clicked');
    showConfirm('Restart?', 'Keep starter, reset progress.', doRestart);
  });

  // Close menu on outside click
  document.addEventListener('click', (e) => {
    const menu = $('#menu-dropdown');
    const menuBtn = $('#menu-btn');
    if (menu && menu.classList.contains('active') && !menu.contains(e.target) && e.target !== menuBtn) {
      closeMenu();
    }
  });

  // Touch to init audio context
  document.addEventListener('click', () => { Game.audio.resume(); }, { once: true });
  document.addEventListener('touchstart', () => { Game.audio.resume(); }, { once: true });

  console.log('[Bantso:events] All event handlers registered');
}
