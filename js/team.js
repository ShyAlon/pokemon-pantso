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

function renderTeamGrid(spentStone = null) {
  const grid = $('#team-grid');
  if (!grid) return;

  const inventory = $('#stone-inventory');
  inventory.innerHTML = Object.entries(STONES).map(([type, { icon, name }]) => {
    const count = Game.stones[type] || 0;
    const spent = type === spentStone;
    return `<span class="stone-label${spent ? ' stone-spent' : ''}" data-stone-type="${type}">
      ${icon} ${name} <strong class="stone-count"${spent ? ` data-previous-count="×${count + 1}"` : ''}><span>×${count}</span></strong>
    </span>`;
  }).join('');
  inventory.querySelector('.stone-spent')?.scrollIntoView({ block: 'nearest' });

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
    const canRelease = Game.pendingEvolution && !isPendingEvolution && p.id !== STARTER_POKEMON_ID;
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
          const missing = stone && !canUseEvolutionStone(type);
          const noteId = `stone-needed-${p.id}-${type}`;
          return `<div class="evolution-option">
            <button class="evolve-btn" aria-label="Evolve into ${getSpecies(target).name}" onclick="event.stopPropagation();requestEvolution('${p.id}', '${type}')"
              ${missing ? `disabled aria-describedby="${noteId}"` : ''}>
              ${getSpecies(target).name}${stone ? ` <small>${stone.icon} ${stone.name}</small>` : ' <small>No stone needed</small>'}
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
  const count = Game.stones[stoneType];
  return stoneType === 'none' || (Object.hasOwn(STONES, stoneType) && Number.isInteger(count) && count > 0);
}

function checkEvolution(pokemonId, requestedStone, phase) {
  const pokemon = Game.collection.find(candidate => candidate.id === pokemonId);
  const options = Object.keys(EVOLUTION_MAP[pokemon?.speciesId] || {});
  const stoneType = requestedStone ?? (options.length === 1 ? options[0] : null);
  const evolution = stoneType ? getEvolution(pokemon?.speciesId, stoneType) : null;
  const countBefore = stoneType && stoneType !== 'none' ? Game.stones[stoneType] ?? 0 : null;
  const details = {
    phase, pokemonId, from: pokemon?.speciesId, to: evolution?.id, stoneType,
    countBefore, hardMode: Game.hardMode,
  };

  let reason;
  if (Game.busy) reason = 'Game is busy';
  else if (Game.teamContext === 'battle') reason = 'Evolution is unavailable during battle';
  else if (!pokemon) reason = 'Pokémon is missing';
  else if (!evolution) reason = 'No evolution for the selected stone';
  else if (!canUseEvolutionStone(stoneType)) reason = 'Required stone is missing or its count is invalid';
  if (reason) {
    console.warn('[Bantso:evolution] Blocked', { ...details, reason });
    return null;
  }
  console.info('[Bantso:evolution] Validated', details);
  return { pokemon, stoneType, evolution, details };
}

function requestEvolution(pokemonId, stoneType) {
  if (Game.pendingEvolution) {
    console.warn('[Bantso:evolution] Blocked', { pokemonId, stoneType, reason: 'Another evolution is pending' });
    return;
  }
  if (!Game.hardMode) return evolvePokemon(pokemonId, stoneType);
  const attempt = checkEvolution(pokemonId, stoneType, 'request');
  if (!attempt) return;
  if (!Game.collection.some(p => p.id !== pokemonId && p.id !== STARTER_POKEMON_ID)) {
    const message = $('#team-mode-message');
    message.textContent = 'Catch another Pokémon before evolving.';
    message.classList.add('show');
    console.warn('[Bantso:evolution] Blocked', { ...attempt.details, reason: 'No teammate can be released' });
    return;
  }
  Game.pendingEvolution = { pokemonId, stoneType: attempt.stoneType };
  renderTeamGrid();
}

function releaseForEvolution(releaseId) {
  const pending = Game.pendingEvolution;
  if (pending) return evolvePokemon(pending.pokemonId, pending.stoneType, releaseId);
}

async function evolvePokemon(pokemonId, requestedStone, releaseId = null) {
  const attempt = checkEvolution(pokemonId, requestedStone, 'apply');
  if (!attempt) return;
  const { pokemon, stoneType, evolution, details } = attempt;
  if (Game.hardMode && (releaseId === pokemonId || releaseId === STARTER_POKEMON_ID || !Game.collection.some(p => p.id === releaseId))) {
    console.warn('[Bantso:evolution] Blocked', { ...details, releaseId, reason: 'Invalid teammate release' });
    return;
  }

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
    console.error('[Bantso:evolution] Save failed, evolution rolled back', { ...details, error });
    return;
  } finally {
    Game.busy = false;
  }

  Game.pendingEvolution = null;
  Game.audio.play('levelUp');
  spawnConfetti(35);
  if (Game.hardMode) updateProgressBar();
  console.info('[Bantso:evolution] Saved', {
    ...details, countAfter: details.countBefore === null ? null : Game.stones[stoneType],
  });
  renderTeamGrid(STONES[stoneType] ? stoneType : null);
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
