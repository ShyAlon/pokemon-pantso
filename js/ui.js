'use strict';

// ============================================================
//  js/ui.js — DOM helpers, screen switching, progress bar
// ============================================================

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function showScreen(name) {
  console.log('[Bantso:ui] showScreen:', name);
  Game.screen = name;
  $$('.screen').forEach(s => { s.classList.remove('active'); s.classList.remove('fade-in'); });
  const screenEl = $(`#${name}-screen`);
  if (screenEl) { screenEl.classList.add('active'); screenEl.classList.add('fade-in'); }

  const exploreBtn = $('#explore-btn');
  const leagueBtn = $('#league-btn');
  const teamBtn = $('#team-access-btn');

  // Music switching
  if (name === 'forest' || name === 'league-arena') {
    Game.audio.playMusic('forest');
  } else if (name === 'battle') {
    Game.audio.playMusic('battle');
  } else {
    Game.audio.stopMusic();
  }

  if (name === 'forest') {
    if (exploreBtn) exploreBtn.style.display = 'none'; // grid click replaces EXPLORE
    if (leagueBtn) leagueBtn.style.display = Game.leagueUnlocked ? 'flex' : 'none';
    if (teamBtn) teamBtn.style.display = 'flex';
  } else if (name === 'league-arena') {
    if (exploreBtn) exploreBtn.style.display = 'none';
    if (leagueBtn) leagueBtn.style.display = 'none';
    if (teamBtn) teamBtn.style.display = 'none';
  } else if (name === 'league') {
    if (exploreBtn) exploreBtn.style.display = 'none';
    if (leagueBtn) leagueBtn.style.display = 'none';
    if (teamBtn) teamBtn.style.display = 'none';
  } else {
    if (exploreBtn) exploreBtn.style.display = 'none';
    if (leagueBtn) leagueBtn.style.display = 'none';
    if (teamBtn) teamBtn.style.display = 'none';
  }
}

function updateProgressBar() {
  const level = Game.playerLevel;
  const maxLevel = Game.maxLevel;
  const totalNeeded = maxLevel > 1 ? (maxLevel - 1) * 2 : 18;
  const caughtForProgress = Math.min(Game.totalUniqueCaught, totalNeeded);
  const pct = totalNeeded > 0 ? Math.max(8, (caughtForProgress / totalNeeded) * 100) : 100;

  $('#level-star').textContent = level;
  $('#progress-fill').style.width = pct + '%';
  $('#progress-text').textContent = `${Game.totalUniqueCaught} / ${totalNeeded} Catch to Unlock!`;

  if (level >= maxLevel) {
    $('#progress-fill').style.width = '100%';
    $('#progress-text').textContent = 'MAX LEVEL!';
  }
  console.log('[Bantso:ui] Progress updated | level:', level, '| caught:', Game.totalUniqueCaught, '| bar:', Math.round(pct) + '%');
}

function updateExploreButton() {
  const btn = $('#explore-btn');
  if (!btn) return;
  if (Game.leagueUnlocked && Game.isMaxLevel) {
    btn.style.display = 'none';
  }
}
