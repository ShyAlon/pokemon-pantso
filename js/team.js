'use strict';

// ============================================================
//  js/team.js — Team selection overlay
// ============================================================

function openTeamOverlay(context) {
  console.log('[Bantso:team] Opening team overlay | context:', context);
  Game.teamContext = context;
  const overlay = $('#team-overlay');
  overlay.classList.add('active');
  renderTeamGrid();
}

function closeTeamOverlay() {
  console.log('[Bantso:team] Closing team overlay');
  $('#team-overlay').classList.remove('active');
  Game.pendingEvolutionId = null;
  Game.teamContext = null;
}

function renderTeamGrid() {
  const grid = $('#team-grid');
  if (!grid) return;

  if (Game.collection.length === 0) {
    grid.innerHTML = '<div class="team-empty">No Pokémon yet!</div>';
    return;
  }

  let html = '';
  const modeMessage = $('#team-mode-message');
  if (Game.pendingEvolutionId) {
    modeMessage.textContent = 'Choose another Pokémon to release for this evolution.';
    modeMessage.classList.add('show');
  } else if (Game.hardMode) {
    modeMessage.textContent = `🔥 Hard Mode · ${Game.collection.length}/${HARD_MODE_RULES.maxTeamSize} Pokémon · New teammates need ${HARD_MODE_RULES.adjustmentFights} fights to adjust; fighters rest after ${HARD_MODE_RULES.fightsBeforeRest} fights.`;
    modeMessage.classList.add('show');
  } else {
    modeMessage.classList.remove('show');
  }
  for (const p of Game.collection) {
    const species = getSpecies(p.speciesId);
    const stats = Game.getEffectiveStats(p);
    const hpPct = Math.max(0, (p.currentHp / stats.maxHp) * 100);
    const isActive = p.id === Game.activePokemonId;
    const evolution = getEvolution(p.speciesId);
    const isPendingEvolution = Game.pendingEvolutionId === p.id;
    const canRelease = Game.pendingEvolutionId && !isPendingEvolution;
    const fightStatus = Game.getPokemonFightStatus(p);
    const cardClass = isActive ? 'team-card active-pokemon' : 'team-card';
    html += `
      <div class="${cardClass}" data-pokemon-id="${p.id}" onclick="selectTeamPokemon('${p.id}')">
        <button class="card-info-icon" onclick="event.stopPropagation();showLore('${p.speciesId}')" title="Trainer guide" aria-label="Open ${species.name} trainer guide"><img src="trainer.svg" alt=""></button>
        <div class="mini-sprite" data-pokemon-id="${p.id}" style="background-color:${species.color}">
          <img class="pokemon-rendered-image mini-img" alt="">
          <span class="emoji-fallback" style="font-size:38px"></span>
        </div>
        <div class="mini-name">${species.name}</div>
        <div class="type-badges">${renderTypeBadges(species.types)}</div>
        <div class="mini-hp-bar">
          <div class="mini-hp-fill" style="width:${hpPct}%"></div>
        </div>
        <div style="font-size:11px">${Math.max(0,p.currentHp)} / ${stats.maxHp}</div>
        ${renderFightStatus(fightStatus)}
        ${evolution && Game.teamContext !== 'battle' && !Game.pendingEvolutionId ? `<button class="evolve-btn" onclick="event.stopPropagation();requestEvolution('${p.id}')">✨ EVOLVE</button>` : ''}
        ${isPendingEvolution ? '<div class="hard-status">✨ Evolving</div>' : ''}
        ${canRelease ? `<button class="release-btn" onclick="event.stopPropagation();releaseForEvolution('${p.id}')">🕊️ RELEASE</button>` : ''}
        ${isActive ? '<div style="font-size:12px;color:#FFD700">⭐ Active</div>' : ''}
      </div>`;
  }
  grid.innerHTML = html;
  $$('.mini-sprite').forEach(sprite => {
    const pokemon = Game.collection.find(candidate => candidate.id === sprite.dataset.pokemonId);
    if (pokemon) {
      applyPokemonSprite(
        sprite.querySelector('.pokemon-rendered-image'),
        sprite.querySelector('.emoji-fallback'),
        pokemon.speciesId
      );
    }
  });
}

function renderFightStatus(status) {
  if (!status) return '';
  const icon = status.type === 'adjusting' ? '🧭' : '😴';
  return `<div class="hard-status">${icon} ${status.message}</div>`;
}

function requestEvolution(pokemonId) {
  if (!Game.hardMode) {
    evolvePokemon(pokemonId);
    return;
  }
  if (Game.collection.length < 2) {
    const message = $('#team-mode-message');
    message.textContent = 'Catch another Pokémon before evolving.';
    message.classList.add('show');
    return;
  }
  Game.pendingEvolutionId = pokemonId;
  renderTeamGrid();
}

async function releaseForEvolution(releaseId) {
  const evolutionId = Game.pendingEvolutionId;
  if (!evolutionId || releaseId === evolutionId) return;
  const released = Game.collection.find(pokemon => pokemon.id === releaseId);
  Game.collection = Game.collection.filter(pokemon => pokemon.id !== releaseId);
  if (Game.activePokemonId === releaseId) Game.activePokemonId = evolutionId;
  Game.caughtSpecies = [...new Set(Game.collection.map(p => p.baseSpeciesId || p.speciesId))];
  Game.caughtCount = Game.collection.length;
  Game.pendingEvolutionId = null;
  if (released && Game.db) await dbDelete(Game.db, 'collection', released.id);
  await evolvePokemon(evolutionId);
}

async function evolvePokemon(pokemonId) {
  const pokemon = Game.collection.find(candidate => candidate.id === pokemonId);
  if (!pokemon) return;
  const evolution = getEvolution(pokemon.speciesId);
  if (!evolution) return;

  const oldSpeciesId = pokemon.speciesId;
  const oldStats = Game.getEffectiveStats(pokemon);
  const healthRatio = oldStats.maxHp > 0 ? pokemon.currentHp / oldStats.maxHp : 1;
  pokemon.baseSpeciesId = pokemon.baseSpeciesId || oldSpeciesId;
  pokemon.speciesId = evolution.id;
  pokemon.name = evolution.name;
  // Evolution renews the Pokémon so Hard Mode cannot leave the team with no
  // eligible fighter after another teammate is released.
  pokemon.hardCooldown = 0;
  pokemon.fightsSinceRest = 0;
  delete pokemon.skipCooldownTick;
  const newStats = Game.getEffectiveStats(pokemon);
  pokemon.currentHp = Math.max(1, Math.round(newStats.maxHp * healthRatio));

  console.log('[Bantso:team] Evolved', oldSpeciesId, 'into', evolution.id);
  Game.audio.play('levelUp');
  spawnConfetti(35);
  await saveGame();
  renderTeamGrid();
}

function selectTeamPokemon(pokemonId) {
  const pokemon = Game.collection.find(p => p.id === pokemonId);
  if (!pokemon) return;
  if (pokemon.currentHp <= 0) {
    console.log('[Bantso:team] Cannot select fainted Pokémon:', pokemonId);
    Game.audio.play('catchFail');
    return;
  }
  if (!Game.canPokemonFight(pokemon) && Game.teamContext === 'battle') {
    console.log('[Bantso:team] Pokémon unavailable in Hard Mode:', pokemonId);
    const status = Game.getPokemonFightStatus(pokemon);
    const message = $('#team-mode-message');
    message.textContent = `${pokemon.name} cannot fight yet. ${status?.message || 'This Pokémon is unavailable.'}`;
    message.classList.add('show');
    Game.audio.play('catchFail');
    return;
  }

  console.log('[Bantso:team] Selected Pokémon:', pokemonId, '| context:', Game.teamContext);
  Game.audio.play('click');

  if (Game.teamContext === 'battle') {
    if (Game.leagueBattle) {
      leagueSwap(pokemonId);
    } else {
      playerSwap(pokemonId);
    }
  } else {
    Game.activePokemonId = pokemonId;
    closeTeamOverlay();
    saveGame();
  }
}
