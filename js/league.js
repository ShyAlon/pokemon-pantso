'use strict';

// ============================================================
//  js/league.js — League arena infinite mode
// ============================================================

function renderLeagueArena() {
  console.log('[Bantso:league] Rendering arena | wins:', Game.leagueWins);
  $('#arena-wins').textContent = 'Wins: ' + Game.leagueWins;
  const activePkmn = Game.getActivePokemon();
  if (activePkmn) {
    setSpriteImage('arena-img', 'arena-emoji', activePkmn.speciesId);
    $('#arena-pkmn-name').textContent = getSpecies(activePkmn.speciesId).name;
  }
}

function createLeagueOpponent() {
  const activePkmn = Game.getActivePokemon();
  if (!activePkmn) return null;
  const playerStats = Game.getEffectiveStats(activePkmn);

  const scale = 1 + Game.leagueWins * 0.08;
  const enemyMaxHp = Math.floor(playerStats.maxHp * 0.70 * scale);
  const enemyDamage = Math.floor(playerStats.maxHp * (0.15 + Game.leagueWins * 0.015));
  const species = SPECIES[Math.floor(Math.random() * SPECIES.length)];

  console.log('[Bantso:league] Creating opponent |', species.name, '| enemyMaxHp:', enemyMaxHp, '| enemyDamage:', enemyDamage, '| scale:', scale.toFixed(2));
  return {
    speciesId: species.id,
    name: 'Champion ' + species.name,
    color: species.color,
    emoji: species.emoji,
    maxHp: enemyMaxHp,
    currentHp: enemyMaxHp,
    damage: enemyDamage,
  };
}

function startLeagueBattle() {
  if (Game.busy) return;
  console.log('[Bantso:league] Starting league battle');
  const enemy = createLeagueOpponent();
  if (!enemy) return;

  Game.leagueBattle = { enemy: enemy, turn: 'player' };
  Game.busy = false;

  showScreen('battle');
  renderLeagueBattle();
  $('#battle-msg').textContent = enemy.name + ' challenges you!';
  flashScreen(300);
  Game.audio.play('encounter');

  setTimeout(() => {
    const allySprite = $('#ally-sprite');
    const enemySprite = $('#enemy-sprite');
    if (allySprite) allySprite.classList.add('enter-left');
    if (enemySprite) enemySprite.classList.add('enter-right');
    setTimeout(() => {
      if (allySprite) allySprite.classList.remove('enter-left');
      if (enemySprite) enemySprite.classList.remove('enter-right');
    }, 400);
  }, 100);
}

function renderLeagueBattle() {
  if (!Game.leagueBattle) return;
  const enemy = Game.leagueBattle.enemy;
  const activePkmn = Game.getActivePokemon();
  if (!activePkmn) return;

  const playerStats = Game.getEffectiveStats(activePkmn);
  const allySp = getSpecies(activePkmn.speciesId);
  const enemySp = getSpecies(enemy.speciesId);
  setSpriteImage('ally-img', 'ally-emoji', activePkmn.speciesId);
  $('#ally-name').textContent = allySp.name;
  $('#ally-types').innerHTML = renderTypeBadges(allySp.types);
  renderMatchup('ally-matchup', allySp.types, enemySp.types);
  renderHealthBar('ally-hp-bar', 'ally-hp-text', activePkmn.currentHp, playerStats.maxHp);

  setSpriteImage('enemy-img', 'enemy-emoji', enemy.speciesId);
  $('#enemy-name').textContent = enemy.name;
  $('#enemy-types').innerHTML = renderTypeBadges(enemySp.types);
  renderMatchup('enemy-matchup', enemySp.types, allySp.types);
  renderHealthBar('enemy-hp-bar', 'enemy-hp-text', enemy.currentHp, enemy.maxHp);

  $('#btn-catch').style.display = 'none';
  updateLeagueBattleActions();
}

function updateLeagueBattleActions() {
  const disabled = Game.busy || Game.leagueBattle?.turn !== 'player';
  $('#btn-attack').disabled = disabled;
  $('#btn-catch').disabled = true;
  $('#btn-catch').style.display = 'none';
  $('#btn-swap').disabled = disabled;
}

function leagueAttack() {
  if (Game.busy || !Game.leagueBattle || Game.leagueBattle.turn !== 'player') return;
  console.log('[Bantso:league] League attack');
  Game.busy = true;
  Game.leagueBattle.turn = 'animating';
  updateLeagueBattleActions();

  const activePkmn = Game.getActivePokemon();
  if (!activePkmn) return;
  const allySpecies = getSpecies(activePkmn.speciesId);
  const enemySpecies = getSpecies(Game.leagueBattle.enemy.speciesId);
  const stats = Game.getEffectiveStats(activePkmn);
  const variation = Math.floor(Math.random() * 7) - 3;
  const rawDamage = Math.max(1, stats.damage + variation);

  const eff = getTypeEffectiveness(allySpecies.types, enemySpecies.types);
  const damage = Math.max(1, Math.round(rawDamage * eff.multiplier));

  Game.leagueBattle.enemy.currentHp = Math.max(0, Game.leagueBattle.enemy.currentHp - damage);
  Game.audio.play('attack');
  shakeSprite('#enemy-sprite');
  showSlash(300);
  const msg = pickAttackFlavor(allySpecies.name, damage);
  $('#battle-msg').textContent = eff.label ? msg + ' — ' + eff.label : msg;
  renderLeagueBattle();

  setTimeout(() => {
    if (Game.leagueBattle.enemy.currentHp <= 0) {
      endLeagueBattle('win');
    } else {
      Game.leagueBattle.turn = 'enemy';
      updateLeagueBattleActions();
      $('#battle-msg').textContent = Game.leagueBattle.enemy.name + ' attacks!';
      setTimeout(() => leagueEnemyTurn(), 1200);
    }
  }, 600);
}

function leagueEnemyTurn() {
  if (!Game.leagueBattle || Game.leagueBattle.enemy.currentHp <= 0) return;
  const activePkmn = Game.getActivePokemon();
  if (!activePkmn) return;

  const damage = Game.leagueBattle.enemy.damage;
  activePkmn.currentHp = Math.max(0, activePkmn.currentHp - damage);
  Game.audio.play('attack');
  shakeSprite('#ally-sprite');
  renderLeagueBattle();
  $('#battle-msg').textContent = `${Game.leagueBattle.enemy.name} strikes! -${damage} HP`;

  if (activePkmn.currentHp <= 0) {
    const alive = Game.collection.filter(p => p.id !== activePkmn.id && p.currentHp > 0);
    if (alive.length > 0) {
      Game.activePokemonId = alive[0].id;
      $('#battle-msg').textContent = activePkmn.name + ' fainted! Switch!';
      setTimeout(() => {
        renderLeagueBattle();
        Game.leagueBattle.turn = 'player';
        Game.busy = false;
        updateLeagueBattleActions();
        $('#battle-msg').textContent = 'Go, ' + getSpecies(alive[0].speciesId).name + '!';
      }, 800);
    } else {
      endLeagueBattle('loss');
    }
  } else {
    setTimeout(() => {
      Game.leagueBattle.turn = 'player';
      Game.busy = false;
      updateLeagueBattleActions();
      $('#battle-msg').textContent = 'Your turn!';
    }, 600);
  }
}

function leagueSwap(pokemonId) {
  if (!Game.leagueBattle) return;
  console.log('[Bantso:league] Swap to', pokemonId);
  Game.activePokemonId = pokemonId;
  closeTeamOverlay();

  if (Game.teamContext === 'battle' && Game.leagueBattle.turn === 'player') {
    Game.busy = true;
    Game.leagueBattle.turn = 'animating';
    updateLeagueBattleActions();
    const species = getSpecies(Game.collection.find(p => p.id === pokemonId)?.speciesId);
    $('#battle-msg').textContent = 'Go, ' + (species?.name || 'Pokémon') + '!';
    renderLeagueBattle();
    setTimeout(() => {
      Game.leagueBattle.turn = 'enemy';
      updateLeagueBattleActions();
      $('#battle-msg').textContent = Game.leagueBattle.enemy.name + ' attacks!';
      setTimeout(() => leagueEnemyTurn(), 1200);
    }, 800);
  }
  saveGame();
}

function endLeagueBattle(result) {
  console.log('[Bantso:league] endLeagueBattle result:', result);
  Game.busy = true;
  if (result === 'win') {
    Game.leagueWins++;
    console.log('[Bantso:league] League win! Total wins:', Game.leagueWins);
    Game.audio.play('arenaWin');
    showCheckmark(1200);
    spawnConfetti(50);
    $('#battle-msg').textContent = 'Victory!';
    saveGame();
  } else if (result === 'fled') {
    Game.audio.play('click');
  } else {
    $('#battle-msg').textContent = 'Try Again!';
  }

  healAllPokemon();
  saveGame().then(() => {
    setTimeout(() => {
      Game.leagueBattle = null;
      Game.busy = false;
      $('#btn-catch').style.display = 'flex';
      showScreen('league-arena');
      renderLeagueArena();
      renderForestScreen();
    }, 1800);
  });
}
