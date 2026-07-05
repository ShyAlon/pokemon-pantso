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

function startBattle(forcedSpeciesId) {
  const species = forcedSpeciesId ? getSpecies(forcedSpeciesId) : getWildPokemonSpecies();
  const enemy = createEnemyPokemon(species);
  if (!enemy) return;

  console.log('[Bantso:battle] Starting battle with', enemy.name);
  Game.battle = { enemy: enemy, turn: 'player' };
  Game.busy = false;

  showScreen('battle');
  renderBattle();
  $('#battle-msg').textContent = enemy.name + ' appeared!';
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
  renderHealthBar('ally-hp-bar', 'ally-hp-text', activePkmn.currentHp, playerStats.maxHp);

  setSpriteImage('enemy-img', 'enemy-emoji', enemy.speciesId);
  $('#enemy-name').textContent = enemy.name;
  $('#enemy-types').innerHTML = renderTypeBadges(enemySp.types);
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

function updateBattleActions() {
  const disabled = Game.busy || Game.battle?.turn !== 'player';
  $('#btn-attack').disabled = disabled;
  $('#btn-catch').disabled = disabled;
  $('#btn-swap').disabled = disabled;
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

function endBattle(result) {
  console.log('[Bantso:battle] endBattle result:', result);
  Game.busy = true;
  if (result === 'win' || result === 'caught') {
    Game.audio.play('victory');
    showCheckmark(1500);
    spawnConfetti(50);
    $('#battle-msg').textContent = result === 'caught' ? 'Gotcha!' : 'You Win!';
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

      updateExploreButton();
      updateProgressBar();
    }, 1800);
  });
}
