'use strict';

// ============================================================
//  js/species.js — Pokémon species definitions + sprite helpers
// ============================================================

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

const SPECIES = [
  { id:'pikachu',    name:'Pikachu',    dex:25,  color:'#FFD700', emoji:'⚡', baseHp:100, baseDmg:25, lore:'Stores electricity in its cheeks. Raises its tail to check its surroundings.' },
  { id:'charmander', name:'Charmander', dex:4,   color:'#FF6B35', emoji:'🔥', baseHp:95,  baseDmg:26, lore:'The flame on its tail shows its health. Born with fiery power.' },
  { id:'bulbasaur',  name:'Bulbasaur',  dex:1,   color:'#4CAF50', emoji:'🌿', baseHp:105, baseDmg:23, lore:'A seed on its back grows with it. Soaks up sun for energy.' },
  { id:'squirtle',   name:'Squirtle',   dex:7,   color:'#2196F3', emoji:'💧', baseHp:100, baseDmg:24, lore:'Its shell is not just for defense. Grooved surface helps it swim fast.' },
  { id:'jigglypuff', name:'Jigglypuff', dex:39,  color:'#FFB6C1', emoji:'🎵', baseHp:115, baseDmg:20, lore:'Sings a lullaby that makes everyone fall asleep. Very bouncy!' },
  { id:'meowth',     name:'Meowth',     dex:52,  color:'#FFF8DC', emoji:'😺', baseHp:90,  baseDmg:22, lore:'Loves shiny coins. The gold coin on its head brings good luck.' },
  { id:'psyduck',    name:'Psyduck',    dex:54,  color:'#FFD700', emoji:'🤯', baseHp:95,  baseDmg:23, lore:'Always has a headache. When it gets too bad, amazing powers awaken!' },
  { id:'growlithe',  name:'Growlithe',  dex:58,  color:'#FF8C00', emoji:'🐕', baseHp:100, baseDmg:25, lore:'Brave and loyal. Barks to protect its trainer from danger.' },
  { id:'abra',       name:'Abra',       dex:63,  color:'#8B6914', emoji:'🔮', baseHp:85,  baseDmg:28, lore:'Sleeps 18 hours a day. Can teleport even while dreaming!' },
  { id:'machop',     name:'Machop',     dex:66,  color:'#808080', emoji:'💪', baseHp:110, baseDmg:24, lore:'Trains by lifting heavy rocks. Its muscles never get tired.' },
  { id:'geodude',    name:'Geodude',    dex:74,  color:'#A0522D', emoji:'🪨', baseHp:105, baseDmg:22, lore:'Lives on mountain paths. Looks like a rock, so watch your step!' },
  { id:'ponyta',     name:'Ponyta',     dex:77,  color:'#FFE4B5', emoji:'🐴', baseHp:95,  baseDmg:26, lore:'Its fiery mane grows hotter when it runs fast. Very gentle.' },
  { id:'slowpoke',   name:'Slowpoke',   dex:79,  color:'#FFB6C1', emoji:'🦥', baseHp:120, baseDmg:20, lore:'Very slow and dreamy. It takes 5 seconds to feel pain!' },
  { id:'magnemite',  name:'Magnemite',  dex:81,  color:'#C0C0C0', emoji:'🧲', baseHp:90,  baseDmg:26, lore:'Floats using magnetic waves. Its two magnets never miss a signal.' },
  { id:'doduo',      name:'Doduo',      dex:84,  color:'#8B7355', emoji:'🐦', baseHp:95,  baseDmg:24, lore:'Two heads work together. Runs super fast on long legs.' },
  { id:'seel',       name:'Seel',       dex:86,  color:'#F0F8FF', emoji:'🦭', baseHp:105, baseDmg:22, lore:'Loves cold water. Its thick fur keeps it warm in the iciest seas.' },
  { id:'grimer',     name:'Grimer',     dex:88,  color:'#800080', emoji:'🟣', baseHp:110, baseDmg:23, lore:'Born from sludge. Wherever it slides by, no plants will ever grow.' },
  { id:'gastly',     name:'Gastly',     dex:92,  color:'#4B0082', emoji:'👻', baseHp:85,  baseDmg:27, lore:'Made of gas! It can slip through any wall. Loves to surprise people.' },
  { id:'onix',       name:'Onix',       dex:95,  color:'#696969', emoji:'🐍', baseHp:115, baseDmg:21, lore:'A giant rock snake. Digs tunnels underground at 50 miles per hour!' },
  { id:'eevee',      name:'Eevee',      dex:133, color:'#C4A46C', emoji:'🦊', baseHp:100, baseDmg:25, lore:'Its DNA is special. Can evolve into many different forms!' },
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
