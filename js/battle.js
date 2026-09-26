'use strict';

// ============================================================
//  js/battle.js — Turn-based battle system
// ============================================================

function getWildPokemonSpecies() {
  const uncaught = SPECIES.filter(s => !Game.caughtSpecies.includes(s.id));
  const pool = uncaught.length > 0 ? uncaught : SPECIES;
  console.log('[Bantso:battle] getWildPokemonSpecies | uncaught available:', uncaught.length);
  return pool[Math.floor(Math.random() * pool.length)];
}

function createEnemyPokemon(species) {
  const activePkmn = Game.getActivePokemon();
  if (!activePkmn) { console.error('[Bantso:battle] createEnemyPokemon: no active Pokémon'); return null; }
  const playerStats = Game.getEffectiveStats(activePkmn);
  const enemyMaxHp = Math.floor(playerStats.maxHp * 0.70);
  console.log('[Bantso:battle] Creating enemy', species.name, '| enemyMaxHp:', enemyMaxHp, '| playerMaxHp:', playerStats.maxHp);
  return {
    speciesId: species.id,
    name: species.name,
    color: species.color,
    emoji: species.emoji,
    maxHp: enemyMaxHp,
    currentHp: enemyMaxHp,
    damage: Math.floor(playerStats.maxHp * 0.15),
  };
}

function startBattle(forcedSpeciesId, ambush) {
  const species = forcedSpeciesId ? getSpecies(forcedSpeciesId) : getWildPokemonSpecies();
  const enemy = createEnemyPokemon(species);
  if (!enemy) return;

  console.log('[Bantso:battle] Starting battle with', enemy.name, ambush ? '(AMBUSH!)' : '');
  Game.battle = { enemy: enemy, turn: ambush ? 'enemy' : 'player', attacksReceived: 0 };
  Game.busy = false;

  showScreen('battle');
  $('#btn-catch').style.display = 'flex';
  $('#btn-food').style.display = 'flex';
  renderBattle();
  if (ambush) {
    // Ambush: red flash, enemy attacks first
    $('#battle-msg').textContent = '⚠️ Ambush! ' + enemy.name + '!';
    $('#battle-msg').style.color = '#ff6666';
    flashScreen(250);
    // Briefly flash red instead of white
    const flashEl = $('#flash');
    flashEl.style.background = '#ff0000';
    setTimeout(() => { flashEl.style.background = 'white'; }, 300);
  } else {
    $('#battle-msg').textContent = enemy.name + ' appeared!';
    $('#battle-msg').style.color = '';
    flashScreen(300);
  }
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

  if (ambush) {
    // Enemy strikes first after entrance animation
    updateBattleActions();
    setTimeout(() => {
      $('#battle-msg').style.color = '';
      $('#battle-msg').textContent = enemy.name + ' attacks first!';
      setTimeout(() => enemyTurn(), 600);
    }, 600);
  }
}

function renderBattle() {
  if (!Game.battle) return;
  const enemy = Game.battle.enemy;
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

  updateBattleActions();
}

function renderHealthBar(barId, textId, current, max) {
  const bar = $(`#${barId}`);
  const text = $(`#${textId}`);
  if (!bar || !text) return;
  const pct = Math.max(0, (current / max) * 100);
  bar.style.width = pct + '%';
  text.textContent = `${Math.max(0, current)} / ${max}`;
  bar.classList.remove('green', 'yellow', 'red');
  if (pct > 50) bar.classList.add('green');
  else if (pct > 25) bar.classList.add('yellow');
  else bar.classList.add('red');
}

// Show type matchup indicator — atkTypes vs defTypes
function renderMatchup(elId, atkTypes, defTypes) {
  const el = $(`#${elId}`);
  if (!el) return;
  const eff = getTypeEffectiveness(atkTypes, defTypes);
  el.classList.remove('strong', 'weak');
  if (eff.multiplier > 1.5) {
    el.textContent = '⚔️ Advantage!';
    el.classList.add('strong');
  } else if (eff.multiplier < 0.75) {
    el.textContent = '🛡️ Resist…';
    el.classList.add('weak');
  } else {
    el.textContent = '';
  }
}

function updateBattleActions() {
  const disabled = Game.busy || Game.battle?.turn !== 'player';
  $('#btn-attack').disabled = disabled;
  $('#btn-catch').disabled = disabled;
  $('#btn-food').disabled = disabled;
  $('#btn-swap').disabled = disabled;
  $('#btn-flee').disabled = disabled;
}

// Narration templates — Pokémon name + action, 20 variants
const ATTACK_FLAVORS = [
  (n,d) => `${n} strikes! — ${d} HP`,
  (n,d) => `Go, ${n}! — ${d} HP`,
  (n,d) => `${n} slashes through! — ${d} HP`,
  (n,d) => `${n} lands a hit! — ${d} HP`,
  (n,d) => `Nice one, ${n}! — ${d} HP`,
  (n,d) => `${n} tackles hard! — ${d} HP`,
  (n,d) => `${n} is unstoppable! — ${d} HP`,
  (n,d) => `Whoa! ${n} smashes! — ${d} HP`,
  (n,d) => `${n} with a quick attack! — ${d} HP`,
  (n,d) => `Bam! ${n} hits! — ${d} HP`,
  (n,d) => `${n} swipes fiercely! — ${d} HP`,
  (n,d) => `${n} doesn't hold back! — ${d} HP`,
  (n,d) => `A powerful blow from ${n}! — ${d} HP`,
  (n,d) => `${n} charges forward! — ${d} HP`,
  (n,d) => `${n} leaps into action! — ${d} HP`,
  (n,d) => `${n} lands a critical hit! — ${d} HP`,
  (n,d) => `Right on target, ${n}! — ${d} HP`,
  (n,d) => `${n} shows its strength! — ${d} HP`,
  (n,d) => `${n} pounces! — ${d} HP`,
  (n,d) => `Great form, ${n}! — ${d} HP`,
];
function pickAttackFlavor(name, damage) {
  const fn = ATTACK_FLAVORS[Math.floor(Math.random() * ATTACK_FLAVORS.length)];
  return fn(name, damage);
}

function playerAttack() {
  if (Game.busy || !Game.battle || Game.battle.turn !== 'player') return;
  console.log('[Bantso:battle] Player attacks');
  Game.busy = true;
  Game.battle.turn = 'animating';
  updateBattleActions();

  const activePkmn = Game.getActivePokemon();
  if (!activePkmn) return;
  const allySpecies = getSpecies(activePkmn.speciesId);
  const enemySpecies = getSpecies(Game.battle.enemy.speciesId);
  const stats = Game.getEffectiveStats(activePkmn);
  const variation = Math.floor(Math.random() * 7) - 3;
  const rawDamage = Math.max(1, stats.damage + variation);

  // Type effectiveness
  const eff = getTypeEffectiveness(allySpecies.types, enemySpecies.types);
  const damage = Math.max(1, Math.round(rawDamage * eff.multiplier));
  console.log('[Bantso:battle] Damage:', damage, '(raw:', rawDamage, 'x', eff.multiplier.toFixed(1), eff.label, ')');

  Game.battle.enemy.currentHp = Math.max(0, Game.battle.enemy.currentHp - damage);
  Game.battle.attacksReceived = (Game.battle.attacksReceived || 0) + 1;
  Game.audio.play('attack');
  shakeSprite('#enemy-sprite');
  showSlash(300);
  const msg = pickAttackFlavor(allySpecies.name, damage);
  $('#battle-msg').textContent = eff.label ? msg + ' — ' + eff.label : msg;
  renderBattle();

  setTimeout(() => {
    if (Game.battle.enemy.currentHp <= 0) {
      console.log('[Bantso:battle] Enemy fainted');
      endBattle('win');
    } else {
      Game.battle.turn = 'enemy';
      updateBattleActions();
      $('#battle-msg').textContent = Game.battle.enemy.name + ' attacks!';
      setTimeout(() => enemyTurn(), 1200);
    }
  }, 600);
}

function playerCatch() {
  if (Game.busy || !Game.battle || Game.battle.turn !== 'player') return;
  Game.busy = true;
  Game.battle.turn = 'animating';
  updateBattleActions();

  const enemy = Game.battle.enemy;
  const hpRatio = enemy.currentHp / enemy.maxHp;
  const catchChance = 0.30 + (1.0 - hpRatio) * 0.50;
  const success = Math.random() < catchChance;
  console.log('[Bantso:battle] Catch attempt | hpRatio:', hpRatio.toFixed(2), '| chance:', (catchChance*100).toFixed(0) + '%', '| success:', success);

  $('#battle-msg').textContent = 'Throwing Ball...';
  showCatchAnimation(success);

  if (success) {
    setTimeout(() => {
      addPokemonToCollection(enemy);
      endBattle('caught');
    }, 1600);
  } else {
    setTimeout(() => {
      Game.busy = false;
      Game.battle.turn = 'enemy';
      updateBattleActions();
      $('#battle-msg').textContent = 'Oh no! Broke free!';
      setTimeout(() => {
        $('#battle-msg').textContent = Game.battle.enemy.name + ' attacks!';
        setTimeout(() => enemyTurn(), 600);
      }, 1000);
    }, 1100);
  }
}

// Food works best when the two Pokémon recognize one another as worthy rivals.
// Every attack received halves the chance again, so kindness works best early.
function getFoodSuccessChance(allyTypes, enemyTypes, attacksReceived) {
  const allyMultiplier = getTypeEffectiveness(allyTypes, enemyTypes).multiplier;
  const enemyMultiplier = getTypeEffectiveness(enemyTypes, allyTypes).multiplier;
  const allyAdvantage = allyMultiplier > 1.5;
  const enemyAdvantage = enemyMultiplier > 1.5;
  const allyResisted = allyMultiplier < 0.75;
  const enemyResisted = enemyMultiplier < 0.75;

  let baseChance = 0.50;
  if (allyAdvantage && enemyAdvantage) baseChance = 0.70;
  else if (allyAdvantage) baseChance = 0.60;
  else if (enemyAdvantage) baseChance = 0.35;
  else if (allyResisted && enemyResisted) baseChance = 0.45;

  return baseChance * Math.pow(0.5, Math.max(0, attacksReceived || 0));
}

function playerOfferFood() {
  if (Game.busy || !Game.battle || Game.battle.turn !== 'player') return;
  Game.busy = true;
  Game.battle.turn = 'animating';
  updateBattleActions();

  const activePkmn = Game.getActivePokemon();
  if (!activePkmn) return;
  const allySpecies = getSpecies(activePkmn.speciesId);
  const enemy = Game.battle.enemy;
  const enemySpecies = getSpecies(enemy.speciesId);
  const chance = getFoodSuccessChance(
    allySpecies.types,
    enemySpecies.types,
    Game.battle.attacksReceived
  );
  const success = Math.random() < chance;
  console.log('[Bantso:battle] Food offer | attacks:', Game.battle.attacksReceived,
    '| chance:', (chance * 100).toFixed(1) + '%', '| success:', success);

  $('#battle-msg').textContent = 'Offering food to ' + enemy.name + '... 🍎';
  Game.audio.play('click');

  setTimeout(() => {
    if (success) {
      addPokemonToCollection(enemy);
      $('#battle-msg').textContent = enemy.name + ' trusts you!';
      endBattle('befriended');
    } else {
      Game.busy = false;
      Game.battle.turn = 'enemy';
      updateBattleActions();
      $('#battle-msg').textContent = enemy.name + ' refused the food!';
      setTimeout(() => {
        if (!Game.battle) return;
        $('#battle-msg').textContent = Game.battle.enemy.name + ' attacks!';
        setTimeout(() => enemyTurn(), 600);
      }, 1000);
    }
  }, 900);
}

function addPokemonToCollection(enemy) {
  const species = getSpecies(enemy.speciesId);
  const isNew = !Game.caughtSpecies.includes(enemy.speciesId);
  if (isNew) {
    Game.caughtSpecies.push(enemy.speciesId);
    console.log('[Bantso:battle] New species caught:', enemy.speciesId, '| total unique:', Game.caughtSpecies.length);
  }
  Game.caughtCount++;
  const count = Game.collection.filter(p => p.speciesId === enemy.speciesId).length;
  const newPkmn = {
    id: enemy.speciesId + '_' + (count + 1),
    speciesId: enemy.speciesId,
    name: enemy.name,
    currentHp: species.baseHp + (Game.playerLevel - 1) * 15,
  };
  Game.collection.push(newPkmn);
  console.log('[Bantso:battle] Added to collection:', newPkmn.id, '| collection size:', Game.collection.length);
}

function enemyTurn() {
  if (!Game.battle || Game.battle.enemy.currentHp <= 0) return;
  const activePkmn = Game.getActivePokemon();
  if (!activePkmn) return;

  const damage = Game.battle.enemy.damage;
  activePkmn.currentHp = Math.max(0, activePkmn.currentHp - damage);
  console.log('[Bantso:battle] Enemy attacks | damage:', damage, '| player HP left:', activePkmn.currentHp);

  Game.audio.play('attack');
  shakeSprite('#ally-sprite');
  renderBattle();
  $('#battle-msg').textContent = `Wild ${Game.battle.enemy.name} hits! -${damage} HP`;

  if (activePkmn.currentHp <= 0) {
    const alive = Game.collection.filter(p => p.id !== activePkmn.id && p.currentHp > 0);
    if (alive.length > 0) {
      Game.activePokemonId = alive[0].id;
      console.log('[Bantso:battle] Pokémon fainted! Auto-switch to', alive[0].id);
      $('#battle-msg').textContent = activePkmn.name + ' fainted! Switch!';
      setTimeout(() => {
        renderBattle();
        Game.battle.turn = 'player';
        Game.busy = false;
        updateBattleActions();
        $('#battle-msg').textContent = 'Go, ' + getSpecies(alive[0].speciesId).name + '!';
      }, 800);
    } else {
      console.log('[Bantso:battle] All Pokémon fainted — loss');
      endBattle('loss');
    }
  } else {
    setTimeout(() => {
      Game.battle.turn = 'player';
      Game.busy = false;
      updateBattleActions();
      $('#battle-msg').textContent = 'Your turn!';
    }, 600);
  }
}

function playerSwap(pokemonId) {
  if (!Game.battle) return;
  console.log('[Bantso:battle] Player swaps to', pokemonId);
  Game.activePokemonId = pokemonId;
  closeTeamOverlay();

  if (Game.teamContext === 'battle' && Game.battle.turn === 'player') {
    Game.busy = true;
    Game.battle.turn = 'animating';
    updateBattleActions();
    const species = getSpecies(Game.collection.find(p => p.id === pokemonId)?.speciesId);
    $('#battle-msg').textContent = 'Go, ' + (species?.name || 'Pokémon') + '!';
    renderBattle();
    setTimeout(() => {
      Game.battle.turn = 'enemy';
      updateBattleActions();
      $('#battle-msg').textContent = Game.battle.enemy.name + ' attacks!';
      setTimeout(() => enemyTurn(), 1200);
    }, 800);
  } else {
    renderBattle();
  }
  saveGame();
}

// Attempt to flee from battle — 50% success, risk of losing a Pokémon
function playerFlee() {
  const isLeague = !!Game.leagueBattle;
  const battle = isLeague ? Game.leagueBattle : Game.battle;
  if (Game.busy || !battle || battle.turn !== 'player') return;
  console.log('[Bantso:battle] Player attempts to flee | league:', isLeague);
  Game.busy = true;
  battle.turn = 'animating';
  updateBattleActions();

  const success = Math.random() < 0.50;

  if (success) {
    $('#battle-msg').textContent = 'Got away safely!';
    Game.audio.play('click');
    setTimeout(() => isLeague ? endLeagueBattle('fled') : endBattle('fled'), 800);
  } else {
    // Failed to flee — enemy attacks + risk of losing a Pokémon
    const loseMon = Math.random() < 0.25;
    const candidates = Game.collection.filter(p => p.speciesId !== 'pikachu');
    let lostName = null;

    if (loseMon && candidates.length > 0) {
      const victim = candidates[Math.floor(Math.random() * candidates.length)];
      lostName = getSpecies(victim.speciesId).name;
      console.warn('[Bantso:battle] Flee failed — lost', lostName);
      Game.collection = Game.collection.filter(p => p.id !== victim.id);
      Game.caughtSpecies = [...new Set(Game.collection.map(p => p.speciesId))];
      Game.caughtCount = Game.collection.length;
      if (Game.activePokemonId === victim.id && Game.collection.length > 0) {
        Game.activePokemonId = Game.collection[0].id;
      }
    }

    const msg = lostName
      ? 'Failed! Lost ' + lostName + '! Enemy attacks!'
      : 'Failed to flee! Enemy attacks!';
    $('#battle-msg').textContent = msg;
    $('#battle-msg').style.color = '#ff6666';
    Game.audio.play('catchFail');

    setTimeout(() => {
      $('#battle-msg').style.color = '';
      battle.turn = 'enemy';
      updateBattleActions();
      $('#battle-msg').textContent = battle.enemy.name + ' attacks!';
      setTimeout(() => isLeague ? leagueEnemyTurn() : enemyTurn(), 600);
    }, 1200);
  }
}

function endBattle(result) {
  console.log('[Bantso:battle] endBattle result:', result);
  Game.busy = true;
  if (result === 'win' || result === 'caught' || result === 'befriended') {
    Game.audio.play('victory');
    showCheckmark(1500);
    spawnConfetti(50);
    $('#battle-msg').textContent = result === 'caught'
      ? 'Gotcha!'
      : result === 'befriended' ? 'New Friend!' : 'You Win!';
  } else if (result === 'fled') {
    // Fleeing — just return to forest/arena, no fanfare
    Game.audio.play('click');
  } else {
    $('#battle-msg').textContent = 'Try Again!';
  }

  healAllPokemon();
  saveGame().then(() => {
    setTimeout(() => {
      Game.battle = null;
      Game.busy = false;
      updateProgressBar();

      const newLevel = Game.playerLevel;
      if (newLevel > Game.level) {
        Game.level = newLevel;
        console.log('[Bantso:battle] Level up! New level:', newLevel);
        Game.audio.play('levelUp');
        flashScreen(200);
        const allySprite = $('#ally-sprite');
        if (allySprite) {
          allySprite.classList.add('level-glow');
          spawnHealSparkles(allySprite);
          setTimeout(() => allySprite.classList.remove('level-glow'), 800);
        }
      }

      if (Game.isMaxLevel && !Game.leagueUnlocked) {
        console.log('[Bantso:battle] League unlocked!');
        Game.leagueUnlocked = true;
        saveGame().then(() => {
          showScreen('league');
          Game.audio.play('levelUp');
          spawnConfetti(80);
          setTimeout(() => {
            showScreen('league-arena');
            renderLeagueArena();
          }, 3000);
        });
      } else {
        showScreen('forest');
        renderForestScreen();
      }

      updateProgressBar();
    }, 1800);
  });
}
