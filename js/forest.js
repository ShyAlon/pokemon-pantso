'use strict';

// ============================================================
//  js/forest.js — Isometric grid exploration
// ============================================================

const GRID_SIZE = 11;
const RIVER_TILES = [
  [1, 0], [1, 1], [1, 2], [2, 2], [2, 3], [3, 3], [3, 4],
  [4, 4], [4, 5], [4, 6], [4, 7], [5, 7], [5, 8], [6, 8], [6, 9], [6, 10],
];
const LANDMARKS = {
  fire:    { name: 'Small campfire', icon: '♨', tiles: [[7, 3], [8, 3]] },
  rocks:   { name: 'Rocky outcrop', icon: '🪨', tiles: [[4, 9], [5, 9], [5, 10]] },
  iceberg: { name: 'Glacier', tiles: [[7, 7], [7, 8], [8, 7], [8, 8]] },
};
const STORM_TILES = [[2, 7], [2, 8], [3, 7], [3, 8]];

let gridTerrain = [];
let hintTiles = [];
let stoneTiles = [];
let unspawnedStoneTypes = [];
let tileWidth = 0;
let tileHeight = 0;
let mapTop = 0;
let mapLeft = 0;
let pickupTimer;
// Player position on the grid
let playerPos = { row: 5, col: 5 };
// Hint spawn timer handle
let hintTimer = null;

function renderForestScreen() {
  console.log('[Bantso:forest] Rendering isometric forest');
  updateProgressBar();
  clearTimeout(pickupTimer);
  $('#stone-pickup').hidden = true;
  initGrid();
  spawnHints();
  renderIsometricGrid();
  setupGridDelegation();
}

// Set up event delegation on the grid (runs once, survives rebuilds)
let gridDelegationSetup = false;
function setupGridDelegation() {
  if (gridDelegationSetup) return;
  const gridEl = $('#iso-grid');
  if (!gridEl) return;
  gridEl.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-row]');
    if (!tile) return;
    const row = parseInt(tile.dataset.row);
    const col = parseInt(tile.dataset.col);
    if (!isNaN(row) && !isNaN(col)) {
      console.log('[Bantso:forest] Delegated click on tile:', row, col);
      onTileClick(row, col);
    }
  });
  window.addEventListener('resize', () => {
    if (Game.screen === 'forest') renderIsometricGrid();
  });
  gridDelegationSetup = true;
  console.log('[Bantso:forest] Grid delegation active');
}

function initGrid() {
  gridTerrain = [];
  const terrains = ['grass', 'grass', 'grass', 'bush', 'trees'];
  for (let r = 0; r < GRID_SIZE; r++) {
    gridTerrain[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      // Weighted random terrain, more grass near center (center is 5,5)
      const distFromCenter = Math.abs(r - 5) + Math.abs(c - 5);
      if (distFromCenter <= 2) {
        gridTerrain[r][c] = terrains[Math.floor(Math.random() * 3)]; // mostly grass
      } else if (distFromCenter <= 5) {
        gridTerrain[r][c] = terrains[Math.floor(Math.random() * 4)]; // grass/bush
      } else {
        gridTerrain[r][c] = terrains[2 + Math.floor(Math.random() * 3)]; // bush/trees
      }
    }
  }
  for (const [terrain, landmark] of Object.entries(LANDMARKS)) {
    for (const [row, col] of landmark.tiles) gridTerrain[row][col] = terrain;
  }
  for (const [row, col] of RIVER_TILES) gridTerrain[row][col] = 'river';
  gridTerrain[2][7] = 'trees';
  gridTerrain[5][5] = 'grass';
  gridTerrain[7][1] = 'trees';
  gridTerrain[8][1] = 'trees';
  console.debug('[Bantso:forest] Terrain initialized', {
    size: GRID_SIZE, riverTiles: RIVER_TILES.length, stormTiles: STORM_TILES, player: playerPos,
  });
}

function tileToScreen(row, col) {
  return {
    x: mapLeft + (GRID_SIZE + col - row) * tileWidth / 2,
    y: mapTop + (col + row + 1) * tileHeight / 2,
  };
}

function renderIsometricGrid() {
  const gridEl = $('#iso-grid');
  const { width, height } = gridEl.parentElement.getBoundingClientRect();
  tileHeight = Math.min(width / (2 * GRID_SIZE), (height - 42) / GRID_SIZE);
  tileWidth = tileHeight * 2;
  mapTop = (height - tileHeight * GRID_SIZE) / 2;
  mapLeft = (width - GRID_SIZE * tileWidth) / 2;
  gridEl.style.setProperty('--tile-width', `${tileWidth}px`);
  gridEl.style.setProperty('--tile-height', `${tileHeight}px`);

  let html = '';
  // Render tiles back-to-front for proper layering
  for (let sum = 0; sum < (GRID_SIZE - 1) * 2 + 1; sum++) {
    for (let r = 0; r < GRID_SIZE; r++) {
      const c = sum - r;
      if (c < 0 || c >= GRID_SIZE) continue;

      const { x, y } = tileToScreen(r, c);
      const terrain = gridTerrain[r][c];
      const hint = hintTiles.find(h => h.row === r && h.col === c);
      const z = (r + c) * 2;
      const tileClass = `iso-tile ${terrain}${hint && !Game.isMaxLevel ? ' hint' : ''}`;
      const landmark = LANDMARKS[terrain];
      const stone = stoneTiles.find(tile => tile.row === r && tile.col === c);

      html += `<div class="${tileClass}" style="left:${x - tileWidth / 2}px;top:${y - tileHeight / 2}px;z-index:${z}"
        data-row="${r}" data-col="${c}"></div>`;

      const position = `left:${x}px;top:${y}px;z-index:${z + 1}`;
      if (landmark?.icon) {
        html += `<span class="terrain-marker ${terrain}" role="img" aria-label="${landmark.name}" style="${position}">${landmark.icon}</span>`;
      } else if (terrain === 'iceberg') {
        html += `<span class="glacier-marker" role="img" aria-label="Glacier" style="${position}"></span>`;
      } else if (terrain === 'trees' || terrain === 'bush') {
        html += `<span class="terrain-marker" aria-hidden="true" style="${position}">${terrain === 'trees' ? '🌲' : '🌿'}</span>`;
      }

      if (stone) {
        const { icon, name, color } = STONES[stone.type];
        html += `<button class="stone-marker ${stone.type}" data-row="${r}" data-col="${c}" data-stone="${stone.type}"
          aria-label="Collect ${name}" title="${name}" style="${position};z-index:60;--stone-color:${color}"><span aria-hidden="true">${stone.type === 'shiny' ? '✦' : icon}</span></button>`;
      } else if (hint && !Game.isMaxLevel) {
        const types = getSpecies(hint.speciesId).types.join(' / ');
        html += `<button class="wild-marker" data-row="${r}" data-col="${c}" aria-label="Wild Pokémon hint"
          title="Wild Pokémon · ${types}" style="left:${x}px;top:${y}px">
          <span class="pokeball-symbol" aria-hidden="true"></span>
        </button>`;
      }
    }
  }

  const stormCenter = tileToScreen(2.5, 7.5);
  html += `<span class="storm-marker" role="img" aria-label="Thunderstorm"
    style="left:${stormCenter.x}px;top:${stormCenter.y}px">⛈️</span>`;

  gridEl.innerHTML = html;
  updateChildPosition();
  console.log('[Bantso:forest] Grid rendered | hints:', hintTiles.length);
}

function updateChildPosition() {
  const charEl = $('#child-char');
  if (!charEl) return;
  const { x, y } = tileToScreen(playerPos.row, playerPos.col);
  charEl.style.left = (x - 18) + 'px';
  charEl.style.top = (y - 50) + 'px';
}

function spawnHints() {
  // Clear old hints
  hintTiles = [];

  // Place 2-4 random hint tiles, not on player position
  const count = 2 + Math.floor(Math.random() * 3);
  const candidates = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (r !== playerPos.row || c !== playerPos.col) {
        candidates.push({ row: r, col: c });
      }
    }
  }

  // Shuffle and pick
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // A shuffled rotation puts one collectible on the map at a time.
  if (!unspawnedStoneTypes.length) {
    unspawnedStoneTypes = Object.keys(STONES);
    for (let i = unspawnedStoneTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unspawnedStoneTypes[i], unspawnedStoneTypes[j]] = [unspawnedStoneTypes[j], unspawnedStoneTypes[i]];
    }
  }
  const type = unspawnedStoneTypes.shift();
  const index = candidates.findIndex(({ row, col }) => canSpawnStone(type, row, col));
  stoneTiles = index < 0 ? [] : [{ ...candidates.splice(index, 1)[0], type }];
  if (index < 0) console.warn('[Bantso:forest] No eligible spawn tile', { type, player: playerPos });
  console.debug('[Bantso:forest] Stone refresh', {
    stone: stoneTiles[0], remainingInRotation: unspawnedStoneTypes.length,
  });

  // Pick uncaught species for each hint
  const uncaught = SPECIES.filter(s => !Game.caughtSpecies.includes(s.id));
  const speciesPool = uncaught.length > 0 ? uncaught : SPECIES;
  hintTiles = candidates.slice(0, count).map(tile => ({
    ...tile,
    speciesId: speciesPool[Math.floor(Math.random() * speciesPool.length)].id,
  }));

  console.log('[Bantso:forest] Hints spawned:', count, '| at', hintTiles.map(h => '(' + h.row + ',' + h.col + ' ' + h.speciesId + ')').join(' '));

  scheduleHintRefresh();
}

function canSpawnStone(type, row, col) {
  if (type === 'shiny') return true;
  if (type === 'thunder') return STORM_TILES.some(([r, c]) => row === r && col === c);
  return gridTerrain[row][col] === STONES[type].terrain;
}

function scheduleHintRefresh() {
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    if (Game.screen !== 'forest') return;
    if (Game.busy || Game.teamContext) {
      console.debug('[Bantso:forest] Refresh deferred', { busy: Game.busy, team: Game.teamContext });
      scheduleHintRefresh();
      return;
    }
    spawnHints();
    renderIsometricGrid();
  }, 12000);
}

function onTileClick(row, col) {
  if (Game.busy || Game.screen !== 'forest') {
    console.log('[Bantso:forest] Tile click blocked | busy:', Game.busy, '| screen:', Game.screen);
    return;
  }

  console.log('[Bantso:forest] Tile clicked:', row, col, '| player at:', playerPos.row, playerPos.col);

  // If clicking same tile, just bounce
  const headingToStone = stoneTiles.some(tile => tile.row === row && tile.col === col);
  if (row === playerPos.row && col === playerPos.col) {
    if (headingToStone) {
      Game.busy = true;
      walkPath([playerPos], 0, true);
      return;
    }
    bounceChild();
    Game.audio.play('click');
    return;
  }

  // Find path using BFS
  const path = findPath(playerPos, { row, col });
  if (path.length === 0) {
    console.log('[Bantso:forest] No path found');
    return;
  }

  console.debug('[Bantso:forest] Route started', { from: playerPos, destination: { row, col }, steps: path.length, headingToStone });
  Game.busy = true;
  walkPath(path, 0, headingToStone);
}

function findPath(from, to) {
  // BFS on the grid (4-directional)
  const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
  const parent = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  const queue = [from];
  visited[from.row][from.col] = true;

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr.row === to.row && curr.col === to.col) {
      // Reconstruct path (excluding start)
      const path = [];
      let p = curr;
      while (p && !(p.row === from.row && p.col === from.col)) {
        path.unshift(p);
        p = parent[p.row][p.col];
      }
      return path;
    }

    const neighbors = [
      { row: curr.row - 1, col: curr.col },
      { row: curr.row + 1, col: curr.col },
      { row: curr.row, col: curr.col - 1 },
      { row: curr.row, col: curr.col + 1 },
    ];

    for (const n of neighbors) {
      if (n.row >= 0 && n.row < GRID_SIZE && n.col >= 0 && n.col < GRID_SIZE && !visited[n.row][n.col]) {
        visited[n.row][n.col] = true;
        parent[n.row][n.col] = curr;
        queue.push(n);
      }
    }
  }

  return [];
}

async function walkPath(path, idx, headingToStone = false) {
  if (idx >= path.length) {
    Game.busy = false;
    console.debug('[Bantso:forest] Route completed', { destination: playerPos, steps: path.length });
    return;
  }

  const step = path[idx];
  playerPos = step;
  updateChildPosition();
  bounceChild();
  Game.audio.play('click');

  const stone = stoneTiles.find(tile => tile.row === step.row && tile.col === step.col);
  if (stone) {
    const count = Game.stones[stone.type] || 0;
    Game.stones[stone.type] = count + 1;
    const pickup = $('#stone-pickup');
    try {
      await saveGame();
      stoneTiles = [];
      console.debug('[Bantso:forest] Collected stone', { ...stone, inventoryCount: count + 1 });
      pickup.textContent = `${STONES[stone.type].icon} Found a ${STONES[stone.type].name}!`;
      Game.audio.play('levelUp');
    } catch (error) {
      Game.stones[stone.type] = count;
      pickup.textContent = 'Could not save the stone. Try again.';
      console.error('[Bantso:forest] Stone pickup could not be saved', { stone, error });
    }
    pickup.hidden = false;
    clearTimeout(pickupTimer);
    pickupTimer = setTimeout(() => { pickup.hidden = true; }, 2400);
    renderIsometricGrid();
  }

  const hint = hintTiles.find(tile => tile.row === step.row && tile.col === step.col);
  const chance = hint ? 0.95 : 0.10;
  const roll = headingToStone || stone || Game.isMaxLevel ? null : Math.random();
  const destination = path.at(-1);
  console.debug('[Bantso:forest] Route step', {
    step: idx + 1, position: step, destination, terrain: gridTerrain[step.row][step.col],
    hint: hint?.speciesId, chance, roll,
  });

  const encounter = roll !== null && roll < chance;
  if (encounter && startBattle(hint?.speciesId, !hint)) {
    clearTimeout(hintTimer);
    console.debug('[Bantso:forest] Route interrupted by battle', { position: step, destination, ambush: !hint });
    return;
  }
  if (encounter) {
    Game.busy = true;
    console.debug('[Bantso:forest] Encounter declined; continuing route', { position: step, destination });
  }
  setTimeout(() => walkPath(path, idx + 1, headingToStone), 350);

}

function bounceChild() {
  const el = $('#child-char');
  if (!el) return;
  el.classList.remove('walking');
  void el.offsetWidth;
  el.classList.add('walking');
}

// Expose for click handler on tiles (called via inline onclick)
window.onTileClick = onTileClick;
