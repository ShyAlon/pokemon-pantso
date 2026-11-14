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
  Game.pendingEvolution = null;
  Game.teamContext = null;
}

function renderTeamGrid() {
  const grid = $('#team-grid');
  if (!grid) return;

  $('#stone-inventory').innerHTML = Object.entries(STONES).map(([type, { icon, name }]) =>
    `<span>${icon} ${name} <strong>×${Game.stones[type] || 0}</strong></span>`
  ).join('');

  if (Game.collection.length === 0) {
    grid.innerHTML = '<div class="team-empty">No Pokémon yet!</div>';
    return;
  }

  let html = '';
  const modeMessage = $('#team-mode-message');
  if (Game.pendingEvolution) {
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
    const evolutions = EVOLUTION_MAP[p.speciesId] || {};
    const isPendingEvolution = Game.pendingEvolution?.pokemonId === p.id;
    const canRelease = Game.pendingEvolution && !isPendingEvolution;
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
        ${Game.teamContext !== 'battle' && !Game.pendingEvolution ? Object.entries(evolutions).map(([type, target]) => {
          const stone = STONES[type];
          const missing = stone && !(Game.stones[type] > 0);
          const noteId = `stone-needed-${p.id}-${type}`;
          return `<div class="evolution-option">
            <button class="evolve-btn" aria-label="Evolve into ${getSpecies(target).name}" onclick="event.stopPropagation();requestEvolution('${p.id}', '${type}')"
              ${missing ? `disabled aria-describedby="${noteId}"` : ''}>
              ${getSpecies(target).name}${stone ? ` <small>${stone.icon} ${stone.name}</small>` : ''}
            </button>
            ${missing ? `<small class="missing-stone" id="${noteId}">Needs a ${stone.name}</small>` : ''}
          </div>`;
        }).join('') : ''}
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

function canUseEvolutionStone(stoneType) {
  return stoneType === 'none' || Game.stones[stoneType] > 0;
}

function requestEvolution(pokemonId, stoneType) {
  if (Game.busy || Game.teamContext === 'battle' || Game.pendingEvolution) return;
  const pokemon = Game.collection.find(candidate => candidate.id === pokemonId);
  if (!pokemon || !getEvolution(pokemon.speciesId, stoneType) || !canUseEvolutionStone(stoneType)) return;
  if (!Game.hardMode) return evolvePokemon(pokemonId, stoneType);
  if (Game.collection.length < 2) {
    const message = $('#team-mode-message');
    message.textContent = 'Catch another Pokémon before evolving.';
    message.classList.add('show');
    return;
  }
  Game.pendingEvolution = { pokemonId, stoneType };
  renderTeamGrid();
}

function releaseForEvolution(releaseId) {
  const pending = Game.pendingEvolution;
  if (pending) return evolvePokemon(pending.pokemonId, pending.stoneType, releaseId);
}

async function evolvePokemon(pokemonId, stoneType, releaseId = null) {
  if (Game.busy || Game.teamContext === 'battle') return;
  const pokemon = Game.collection.find(candidate => candidate.id === pokemonId);
  if (!pokemon) return;
  const evolution = getEvolution(pokemon.speciesId, stoneType);
  stoneType ??= Object.keys(EVOLUTION_MAP[pokemon.speciesId] || {})[0];
  if (!evolution || !canUseEvolutionStone(stoneType)) return;
  if (Game.hardMode && (releaseId === pokemonId || !Game.collection.some(p => p.id === releaseId))) return;

  Game.busy = true;
  const original = { ...pokemon };
  const oldStats = Game.getEffectiveStats(pokemon);
  const { collection, activePokemonId, caughtSpecies, caughtCount } = Game;
  if (Game.hardMode) {
    Game.collection = collection.filter(candidate => candidate.id !== releaseId);
    if (activePokemonId === releaseId) Game.activePokemonId = pokemonId;
    Game.caughtSpecies = [...new Set(Game.collection.map(p => p.baseSpeciesId || p.speciesId))];
    Game.caughtCount = Game.collection.length;
  }
  if (STONES[stoneType]) Game.stones[stoneType]--;

  const oldSpeciesId = pokemon.speciesId;
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

  try {
    await saveGame(Game.hardMode ? releaseId : null);
  } catch (error) {
    Object.assign(Game, { collection, activePokemonId, caughtSpecies, caughtCount });
    Object.assign(pokemon, original);
    if (STONES[stoneType]) Game.stones[stoneType]++;
    const message = $('#team-mode-message');
    message.textContent = 'Could not save the evolution. Try again.';
    message.classList.add('show');
    console.error(error);
    return;
  } finally {
    Game.busy = false;
  }

  Game.pendingEvolution = null;
  Game.audio.play('levelUp');
  spawnConfetti(35);
  if (Game.hardMode) updateProgressBar();
  renderTeamGrid();
}

function selectTeamPokemon(pokemonId) {
  if (Game.teamContext !== 'battle' && Game.busy) return;
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
