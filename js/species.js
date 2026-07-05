'use strict';

// ============================================================
//  js/species.js — Pokémon species, types, and effectiveness
// ============================================================

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

// Type colours for UI badges
const TYPE_COLORS = {
  Normal:'#A8A878', Fire:'#F08030', Water:'#6890F0', Electric:'#F8D030',
  Grass:'#78C850', Ice:'#98D8D8', Fighting:'#C03028', Poison:'#A040A0',
  Ground:'#E0C068', Flying:'#A890F0', Psychic:'#F85888', Bug:'#A8B820',
  Rock:'#B8A038', Ghost:'#705898', Dragon:'#7038F8', Dark:'#705848',
  Steel:'#B8B8D0', Fairy:'#EE99AC',
};

// Type effectiveness: attacker type → { defender type → multiplier }
const TYPE_CHART = {
  Normal:   { Rock:0.5, Ghost:0, Steel:0.5 },
  Fire:     { Fire:0.5, Water:0.5, Grass:2, Ice:2, Bug:2, Rock:0.5, Dragon:0.5, Steel:2 },
  Water:    { Fire:2, Water:0.5, Grass:0.5, Ground:2, Rock:2, Dragon:0.5 },
  Electric: { Water:2, Electric:0.5, Grass:0.5, Ground:0, Flying:2, Dragon:0.5 },
  Grass:    { Fire:0.5, Water:2, Grass:0.5, Poison:0.5, Ground:2, Flying:0.5, Bug:0.5, Rock:2, Dragon:0.5, Steel:0.5 },
  Ice:      { Fire:0.5, Water:0.5, Grass:2, Ice:0.5, Ground:2, Flying:2, Dragon:2, Steel:0.5 },
  Fighting: { Normal:2, Ice:2, Poison:0.5, Flying:0.5, Psychic:0.5, Bug:0.5, Rock:2, Ghost:0, Dark:2, Steel:2, Fairy:0.5 },
  Poison:   { Grass:2, Poison:0.5, Ground:0.5, Rock:0.5, Ghost:0.5, Steel:0, Fairy:2 },
  Ground:   { Fire:2, Electric:2, Grass:0.5, Poison:2, Flying:0, Rock:2, Bug:0.5, Steel:2 },
  Flying:   { Electric:0.5, Grass:2, Fighting:2, Bug:2, Rock:0.5, Steel:0.5 },
  Psychic:  { Fighting:2, Poison:2, Psychic:0.5, Dark:0, Steel:0.5 },
  Bug:      { Fire:0.5, Grass:2, Fighting:0.5, Poison:0.5, Flying:0.5, Psychic:2, Ghost:0.5, Dark:2, Steel:0.5, Fairy:0.5 },
  Rock:     { Fire:2, Ice:2, Fighting:0.5, Ground:0.5, Flying:2, Bug:2, Steel:0.5 },
  Ghost:    { Normal:0, Psychic:2, Ghost:2, Dark:0.5 },
  Dragon:   { Dragon:2, Steel:0.5, Fairy:0 },
  Dark:     { Fighting:0.5, Psychic:2, Ghost:2, Dark:0.5, Fairy:0.5 },
  Steel:    { Fire:0.5, Water:0.5, Electric:0.5, Ice:2, Rock:2, Steel:0.5, Fairy:2 },
  Fairy:    { Fire:0.5, Fighting:2, Poison:0.5, Dragon:2, Dark:2, Steel:0.5 },
};

// Hint emoji per type for the forest grid
const TYPE_HINT_EMOJI = {
  Normal:'🌟', Fire:'🔥', Water:'💧', Electric:'⚡',
  Grass:'🍃', Ice:'❄️', Fighting:'💥', Poison:'🟣',
  Ground:'💨', Flying:'🪶', Psychic:'🔮', Bug:'🐛',
  Rock:'🪨', Ghost:'👻', Dragon:'🐉', Dark:'🌑',
  Steel:'✨', Fairy:'💫',
};

// ---- Species definitions ----
const SPECIES = [
  { id:'pikachu',    name:'Pikachu',    types:['Electric'],             dex:25,  color:'#FFD700', emoji:'⚡', baseHp:100, baseDmg:25, lore:'Stores electricity in its cheeks. Raises its tail to check its surroundings.' },
  { id:'charmander', name:'Charmander', types:['Fire'],                 dex:4,   color:'#FF6B35', emoji:'🔥', baseHp:95,  baseDmg:26, lore:'The flame on its tail shows its health. Born with fiery power.' },
  { id:'bulbasaur',  name:'Bulbasaur',  types:['Grass','Poison'],       dex:1,   color:'#4CAF50', emoji:'🌿', baseHp:105, baseDmg:23, lore:'A seed on its back grows with it. Soaks up sun for energy.' },
  { id:'squirtle',   name:'Squirtle',   types:['Water'],                dex:7,   color:'#2196F3', emoji:'💧', baseHp:100, baseDmg:24, lore:'Its shell is not just for defense. Grooved surface helps it swim fast.' },
  { id:'jigglypuff', name:'Jigglypuff', types:['Normal','Fairy'],       dex:39,  color:'#FFB6C1', emoji:'🎵', baseHp:115, baseDmg:20, lore:'Sings a lullaby that makes everyone fall asleep. Very bouncy!' },
  { id:'meowth',     name:'Meowth',     types:['Normal'],               dex:52,  color:'#FFF8DC', emoji:'😺', baseHp:90,  baseDmg:22, lore:'Loves shiny coins. The gold coin on its head brings good luck.' },
  { id:'psyduck',    name:'Psyduck',    types:['Water'],                dex:54,  color:'#FFD700', emoji:'🤯', baseHp:95,  baseDmg:23, lore:'Always has a headache. When it gets too bad, amazing powers awaken!' },
  { id:'growlithe',  name:'Growlithe',  types:['Fire'],                 dex:58,  color:'#FF8C00', emoji:'🐕', baseHp:100, baseDmg:25, lore:'Brave and loyal. Barks to protect its trainer from danger.' },
  { id:'abra',       name:'Abra',       types:['Psychic'],              dex:63,  color:'#8B6914', emoji:'🔮', baseHp:85,  baseDmg:28, lore:'Sleeps 18 hours a day. Can teleport even while dreaming!' },
  { id:'machop',     name:'Machop',     types:['Fighting'],             dex:66,  color:'#808080', emoji:'💪', baseHp:110, baseDmg:24, lore:'Trains by lifting heavy rocks. Its muscles never get tired.' },
  { id:'geodude',    name:'Geodude',    types:['Rock','Ground'],        dex:74,  color:'#A0522D', emoji:'🪨', baseHp:105, baseDmg:22, lore:'Lives on mountain paths. Looks like a rock, so watch your step!' },
  { id:'ponyta',     name:'Ponyta',     types:['Fire'],                 dex:77,  color:'#FFE4B5', emoji:'🐴', baseHp:95,  baseDmg:26, lore:'Its fiery mane grows hotter when it runs fast. Very gentle.' },
  { id:'slowpoke',   name:'Slowpoke',   types:['Water','Psychic'],      dex:79,  color:'#FFB6C1', emoji:'🦥', baseHp:120, baseDmg:20, lore:'Very slow and dreamy. It takes 5 seconds to feel pain!' },
  { id:'magnemite',  name:'Magnemite',  types:['Electric','Steel'],     dex:81,  color:'#C0C0C0', emoji:'🧲', baseHp:90,  baseDmg:26, lore:'Floats using magnetic waves. Its two magnets never miss a signal.' },
  { id:'doduo',      name:'Doduo',      types:['Normal','Flying'],      dex:84,  color:'#8B7355', emoji:'🐦', baseHp:95,  baseDmg:24, lore:'Two heads work together. Runs super fast on long legs.' },
  { id:'seel',       name:'Seel',       types:['Water'],                dex:86,  color:'#F0F8FF', emoji:'🦭', baseHp:105, baseDmg:22, lore:'Loves cold water. Its thick fur keeps it warm in the iciest seas.' },
  { id:'grimer',     name:'Grimer',     types:['Poison'],               dex:88,  color:'#800080', emoji:'🟣', baseHp:110, baseDmg:23, lore:'Born from sludge. Wherever it slides by, no plants will ever grow.' },
  { id:'gastly',     name:'Gastly',     types:['Ghost','Poison'],       dex:92,  color:'#4B0082', emoji:'👻', baseHp:85,  baseDmg:27, lore:'Made of gas! It can slip through any wall. Loves to surprise people.' },
  { id:'onix',       name:'Onix',       types:['Rock','Ground'],        dex:95,  color:'#696969', emoji:'🐍', baseHp:115, baseDmg:21, lore:'A giant rock snake. Digs tunnels underground at 50 miles per hour!' },
  { id:'eevee',      name:'Eevee',      types:['Normal'],               dex:133, color:'#C4A46C', emoji:'🦊', baseHp:100, baseDmg:25, lore:'Its DNA is special. Can evolve into many different forms!' },
];

console.log('[Bantso:species] Loaded', SPECIES.length, 'species');

function getSpecies(id) {
  const s = SPECIES.find(s => s.id === id);
  if (!s) console.warn('[Bantso:species] Unknown species id:', id);
  return s || SPECIES[0];
}

function getSpriteUrl(speciesId) {
  const s = getSpecies(speciesId);
  return SPRITE_BASE + s.dex + '.png';
}

// ---- Type effectiveness ----
// Returns { multiplier, label } where label is '' / 'Super effective!' / 'Not very effective…'
function getTypeEffectiveness(atkTypes, defTypes) {
  let mult = 1;
  for (const atk of atkTypes) {
    for (const def of defTypes) {
      const m = (TYPE_CHART[atk] && TYPE_CHART[atk][def]) ?? 1;
      mult *= m;
    }
  }
  if (mult > 1.5)  return { multiplier: mult, label: 'Super effective!' };
  if (mult < 0.75) return { multiplier: mult, label: 'Not very effective…' };
  return { multiplier: mult, label: '' };
}

// Render type badges as small coloured pills — returns HTML string
function renderTypeBadges(types) {
  return types.map(t => {
    const c = TYPE_COLORS[t] || '#888';
    return `<span class="type-badge" style="background:${c}">${t.substring(0,3).toUpperCase()}</span>`;
  }).join('');
}
