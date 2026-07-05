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
  for (const p of Game.collection) {
    const species = getSpecies(p.speciesId);
    const stats = Game.getEffectiveStats(p);
    const hpPct = Math.max(0, (p.currentHp / stats.maxHp) * 100);
    const isActive = p.id === Game.activePokemonId;
    const cardClass = isActive ? 'team-card active-pokemon' : 'team-card';
    html += `
      <div class="${cardClass}" data-pokemon-id="${p.id}" onclick="selectTeamPokemon('${p.id}')">
        <button class="card-info-icon" onclick="event.stopPropagation();showLore('${p.speciesId}')" title="Info">ℹ️</button>
        <div class="mini-sprite" style="background:${species.color};background-image:url('${getSpriteUrl(p.speciesId)}');background-size:75%;background-position:center;background-repeat:no-repeat">
          <span class="emoji-fallback" style="font-size:38px">${species.emoji}</span>
        </div>
        <div class="mini-name">${species.name}</div>
        <div class="type-badges">${renderTypeBadges(species.types)}</div>
        <div class="mini-hp-bar">
          <div class="mini-hp-fill" style="width:${hpPct}%"></div>
        </div>
        <div style="font-size:11px">${Math.max(0,p.currentHp)} / ${stats.maxHp}</div>
        ${isActive ? '<div style="font-size:12px;color:#FFD700">⭐ Active</div>' : ''}
      </div>`;
  }
  grid.innerHTML = html;
}

function selectTeamPokemon(pokemonId) {
  const pokemon = Game.collection.find(p => p.id === pokemonId);
  if (!pokemon) return;
  if (pokemon.currentHp <= 0) {
    console.log('[Bantso:team] Cannot select fainted Pokémon:', pokemonId);
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
