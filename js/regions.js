'use strict';

// A wrapping 3×3 travel world; these habitats use Bantso's existing roster.
const REGIONS = [
  { name: 'Kanto', hemisphere: 'north', sky: '#87ceeb', horizon: '#b0e0e6', ground: '#4a8c2a', grass: '#7ab648', trees: '#477f2d', terrain: ['grass','grass','grass','bush','trees'], description: 'Sunny meadows, winding rivers and familiar woodland trails.', pokemon: 'pikachu charmander bulbasaur squirtle jigglypuff meowth psyduck growlithe abra machop geodude ponyta slowpoke magnemite doduo seel grimer gastly onix eevee', rare: 'articuno zapdos moltres mewtwo mew' },
  { name: 'Johto', hemisphere: 'north', sky: '#dba36d', horizon: '#f5d8a2', ground: '#476548', grass: '#8eaa53', trees: '#405b39', terrain: ['grass','bush','trees','trees','trees'], description: 'Amber skies over ancient forests, with thick woodland and quiet clearings.', pokemon: 'togepi forretress eevee gastly growlithe slowpoke bulbasaur', rare: 'lugia ho-oh' },
  { name: 'Hoenn', hemisphere: 'south', sky: '#39b7d1', horizon: '#a9ece0', ground: '#287b5c', grass: '#55b978', trees: '#236d4c', terrain: ['grass','bush','bush','trees','river'], description: 'A lush, rainy landscape with abundant waterways and tropical undergrowth.', pokemon: 'azurill psyduck squirtle bulbasaur geodude machop', rare: 'rayquaza' },
  { name: 'Sinnoh', hemisphere: 'north', sky: '#9faecf', horizon: '#e1eafa', ground: '#687d84', grass: '#9bb9ab', trees: '#507a75', terrain: ['grass','trees','rocks','rocks','iceberg'], description: 'Cool mountain air, rocky slopes and scattered fields of ice.', pokemon: 'seel onix geodude magnemite machop togepi', rare: 'articuno' },
  { name: 'Unova', hemisphere: 'north', sky: '#9c88bc', horizon: '#e2bcd5', ground: '#586052', grass: '#99a565', trees: '#54634b', terrain: ['grass','grass','rocks','bush','trees'], description: 'Violet city skies meet rugged outskirts and broad grassy routes.', pokemon: 'grimer magnemite meowth doduo gastly eevee', rare: 'mewtwo' },
  { name: 'Kalos', hemisphere: 'north', sky: '#deb5d9', horizon: '#fce4da', ground: '#70844d', grass: '#a5c77a', trees: '#638951', terrain: ['grass','grass','bush','bush','rocks'], description: 'Rose-colored skies, soft green gardens and sparkling rocky gardens.', pokemon: 'carbink eevee jigglypuff togepi ponyta abra', rare: 'diancie' },
  { name: 'Alola', hemisphere: 'south', sky: '#37c9df', horizon: '#fff0b6', ground: '#8caa58', grass: '#bad478', trees: '#368c60', terrain: ['grass','bush','river','river','trees'], description: 'Turquoise skies and sunlit island waters, with plenty of tropical greenery.', pokemon: 'pikachu azurill slowpoke meowth psyduck growlithe', rare: 'type-null meltan' },
  { name: 'Galar', hemisphere: 'north', sky: '#718fa4', horizon: '#c7d9d4', ground: '#3b665c', grass: '#6b9d77', trees: '#355b50', terrain: ['grass','grass','trees','rocks','bush'], description: 'Misty green moors, hardy woodland and rocky paths under a slate-blue sky.', pokemon: 'ponyta forretress magnemite eevee onix machop', rare: 'kubfu eternatus' },
  { name: 'Paldea', hemisphere: 'south', sky: '#edac76', horizon: '#ffe6a4', ground: '#9e804d', grass: '#c5bd6c', trees: '#7c8546', terrain: ['grass','grass','grass','rocks','fire'], description: 'Golden open plains, warm skies and dry, stony hills made for exploring.', pokemon: 'doduo charmander geodude onix carbink eevee', rare: 'ronny-hamudi' },
];
const REGION_EXITS = [
  { direction: 'up', row: 0, col: 0, dr: -1, dc: 0, arrow: '↑' },
  { direction: 'right', row: 0, col: 10, dr: 0, dc: 1, arrow: '→' },
  { direction: 'down', row: 10, col: 10, dr: 1, dc: 0, arrow: '↓' },
  { direction: 'left', row: 10, col: 0, dr: 0, dc: -1, arrow: '←' },
];
function currentRegion() { return REGIONS.find(region => region.name === Game.region) || REGIONS[0]; }
function regionDestination(exit) {
  const index = REGIONS.indexOf(currentRegion());
  return REGIONS[((Math.floor(index / 3) + exit.dr + 3) % 3) * 3 + ((index % 3 + exit.dc + 3) % 3)];
}
function regionSpecies(legendary = false) {
  const ids = currentRegion()[legendary ? 'rare' : 'pokemon'].split(' ');
  return (legendary ? LEGENDARY_SPECIES : SPECIES).filter(species => ids.includes(species.id));
}
function applyRegionTheme() {
  const region = currentRegion();
  const screen = $('#forest-screen');
  for (const key of ['sky', 'horizon', 'ground', 'grass', 'trees']) screen.style.setProperty('--region-' + key, region[key]);
  screen.dataset.region = region.name;
  $('#region-name').textContent = region.name;
  renderGameTime();
}
function showRegionGuide() {
  if (Game.busy || Game.teamContext) return;
  const region = currentRegion();
  $('#region-guide-title').textContent = region.name + ' · Field guide';
  $('#region-description').textContent = region.description;
  const sky = CONSTELLATION_SKIES[region.hemisphere];
  $('#region-constellations').textContent = `${sky.name}: ${sky.patterns.map(pattern => pattern.name).join(' · ')}. These stylized star patterns stay fixed throughout the night.`;
  const list = species => species.map(s => `<span class="region-species">${s.emoji} ${s.name}</span>`).join('');
  $('#region-pokemon').innerHTML = list(regionSpecies());
  $('#region-rare').innerHTML = list(regionSpecies(true));
  $('#region-routes').textContent = REGION_EXITS.map(exit => `${exit.arrow} ${regionDestination(exit).name}`).join(' · ');
  $('#region-guide').showModal();
}
async function animateRegionTrainer(materializing) {
  const trainer = $('#child-char');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const solid = { opacity: 1, filter: 'blur(0px) brightness(1)', transform: 'scale(1)' };
  const scattered = { opacity: 0, filter: 'blur(12px) brightness(2.5)', transform: 'scale(1.16)' };
  const animation = trainer.animate(materializing ? [scattered, solid] : [solid, scattered], {
    duration: 450, easing: materializing ? 'ease-out' : 'ease-in', fill: 'forwards',
  });
  await animation.finished.catch(() => {});
  // Retain the invisible state between animations without leaving an animation behind.
  trainer.style.opacity = materializing ? '1' : '0';
  animation.cancel();
}

async function travelToRegion(exit) {
  if (Game.busy || Game.screen !== 'forest' || Game.teamContext || $('#region-guide').open) return;
  Game.busy = true;
  const previousRegion = Game.region;
  const previousPosition = { ...playerPos };
  const destination = regionDestination(exit).name;
  const trainer = $('#child-char');
  trainer.classList.remove('walking');
  trainer.classList.add('region-transfer');
  try {
    await animateRegionTrainer(false);
    Game.region = destination;
    try {
      await saveGame();
    } catch (error) {
      Game.region = previousRegion;
      playerPos = previousPosition;
      $('#stone-pickup').textContent = 'Could not save your journey. Tap the exit to try again.';
      $('#stone-pickup').hidden = false;
      await animateRegionTrainer(true);
      return;
    }
    const opposite = REGION_EXITS.find(candidate => candidate.dr === -exit.dr && candidate.dc === -exit.dc);
    playerPos = { row: opposite.row, col: opposite.col };
    renderForestScreen();
    Game.audio.play('levelUp');
    await animateRegionTrainer(true);
  } finally {
    trainer.style.opacity = '';
    trainer.classList.remove('region-transfer');
    Game.busy = false;
  }
}
