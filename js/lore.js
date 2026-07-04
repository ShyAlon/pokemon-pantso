'use strict';

// ============================================================
//  js/lore.js — Pokémon lore modal
// ============================================================

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

  $('#lore-modal').classList.add('active');
  Game.audio.play('click');
}

function hideLore() {
  console.log('[Bantso:lore] Hiding lore modal');
  $('#lore-modal').classList.remove('active');
}
