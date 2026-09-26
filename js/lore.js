'use strict';

// ============================================================
//  js/lore.js — Pokémon lore modal
// ============================================================

function getLoreMatchups(speciesId) {
  const species = getSpecies(speciesId);
  const matchups = SPECIES
    .filter(candidate => candidate.id !== species.id)
    .map(candidate => ({
      species: candidate,
      multiplier: getTypeEffectiveness(species.types, candidate.types).multiplier,
    }));

  return {
    prey: matchups
      .filter(matchup => matchup.multiplier > 1.5)
      .sort((a, b) => b.multiplier - a.multiplier || a.species.name.localeCompare(b.species.name))
      .slice(0, 2)
      .map(matchup => matchup.species),
    predators: matchups
      .filter(matchup => matchup.multiplier < 0.75)
      .sort((a, b) => a.multiplier - b.multiplier || a.species.name.localeCompare(b.species.name))
      .slice(0, 2)
      .map(matchup => matchup.species),
  };
}

function formatLoreExamples(species) {
  return species.length > 0
    ? species.map(example => example.emoji + ' ' + example.name).join(', ')
    : 'None nearby';
}

function showLore(speciesId) {
  console.log('[Bantso:lore] Showing lore for:', speciesId);
  const species = getSpecies(speciesId);
  const url = getSpriteUrl(speciesId);

  $('#lore-sprite').style.backgroundColor = species.color;
  $('#lore-sprite').style.backgroundImage = `url('${url}')`;
  $('#lore-img').src = url;
  $('#lore-emoji').textContent = species.emoji;
  $('#lore-name').textContent = species.name;
  $('#lore-text').textContent = species.lore;
  const matchups = getLoreMatchups(speciesId);
  $('#lore-prey').textContent = formatLoreExamples(matchups.prey);
  $('#lore-predators').textContent = formatLoreExamples(matchups.predators);

  $('#lore-modal').classList.add('active');
  Game.audio.play('click');
}

function hideLore() {
  console.log('[Bantso:lore] Hiding lore modal');
  $('#lore-modal').classList.remove('active');
}
