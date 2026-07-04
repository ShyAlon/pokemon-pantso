'use strict';

// ============================================================
//  js/forest.js — Isometric grid exploration
// ============================================================

const GRID_SIZE = 9;
const TILE_HW = 38;  // half-width of diamond
const TILE_HH = 19;  // half-height of diamond

// Per-tile terrain: 'grass' | 'bush' | 'trees'
let gridTerrain = [];
// Hint tiles: [{row, col}]
let hintTiles = [];
// Player position on the grid
let playerPos = { row: 4, col: 4 };
// Hint spawn timer handle
let hintTimer = null;

function renderForestScreen() {
  console.log('[Bantso:forest] Rendering isometric forest');
  updateProgressBar();
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
  gridDelegationSetup = true;
  console.log('[Bantso:forest] Grid delegation active');
}

function initGrid() {
  gridTerrain = [];
  const terrains = ['grass', 'grass', 'grass', 'bush', 'trees'];
  for (let r = 0; r < GRID_SIZE; r++) {
    gridTerrain[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      // Weighted random terrain, more grass near center
      const distFromCenter = Math.abs(r - 4) + Math.abs(c - 4);
      if (distFromCenter <= 2) {
        gridTerrain[r][c] = terrains[Math.floor(Math.random() * 3)]; // mostly grass
      } else if (distFromCenter <= 4) {
        gridTerrain[r][c] = terrains[Math.floor(Math.random() * 4)]; // grass/bush
      } else {
        gridTerrain[r][c] = terrains[2 + Math.floor(Math.random() * 3)]; // bush/trees
      }
    }
  }
  // Starting position is always grass
  gridTerrain[playerPos.row][playerPos.col] = 'grass';
  console.log('[Bantso:forest] Grid initialized | size:', GRID_SIZE + 'x' + GRID_SIZE);
}

function tileToScreen(row, col) {
  const gridEl = $('#iso-grid');
  if (!gridEl) return { x: 0, y: 0 };
  const rect = gridEl.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height * 0.35;
  return {
    x: cx + (col - row) * TILE_HW,
    y: cy + (col + row) * TILE_HH
  };
}

function screenToTile(sx, sy) {
  const gridEl = $('#iso-grid');
  if (!gridEl) return null;
  const rect = gridEl.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height * 0.35;
  const dx = sx - cx;
  const dy = sy - cy;
  const col = (dx / TILE_HW + dy / TILE_HH) / 2;
  const row = (dy / TILE_HH - dx / TILE_HW) / 2;
  const rr = Math.round(row);
  const cc = Math.round(col);
  if (rr < 0 || rr >= GRID_SIZE || cc < 0 || cc >= GRID_SIZE) return null;
  return { row: rr, col: cc };
}

function renderIsometricGrid() {
  const gridEl = $('#iso-grid');
  if (!gridEl) return;

  const rect = gridEl.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height * 0.35;

  let html = '';
  // Add decorative clouds
  html += '<div style="position:absolute;top:3%;left:10%;font-size:36px;opacity:0.5;pointer-events:none">☁️</div>';
  html += '<div style="position:absolute;top:8%;right:15%;font-size:28px;opacity:0.4;pointer-events:none">☁️</div>';

  // Render tiles back-to-front for proper layering
  for (let sum = 0; sum < (GRID_SIZE - 1) * 2 + 1; sum++) {
    for (let r = 0; r < GRID_SIZE; r++) {
      const c = sum - r;
      if (c < 0 || c >= GRID_SIZE) continue;

      const { x, y } = tileToScreen(r, c);
      const terrain = gridTerrain[r][c];
      const isHint = hintTiles.some(h => h.row === r && h.col === c);
      const z = (r + c) * 2;
      const tileClass = isHint ? 'iso-tile hint' : 'iso-tile ' + terrain;

      html += `<div class="${tileClass}" style="left:${x - 37}px;top:${y - 37}px;z-index:${z}"
        data-row="${r}" data-col="${c}"></div>`;

      // Decorations on top of tile
      if (terrain === 'trees') {
        html += `<div class="iso-tree-top" style="left:${x - 16}px;top:${y - 55}px;z-index:${z + 5}"></div>`;
        html += `<div class="iso-tree-trunk" style="left:${x - 4}px;top:${y - 21}px;z-index:${z + 4}"></div>`;
      } else if (terrain === 'bush') {
        html += `<div class="iso-bush" style="left:${x - 14}px;top:${y - 30}px;z-index:${z + 5}"></div>`;
        html += `<div class="iso-bush" style="left:${x + 2}px;top:${y - 34}px;z-index:${z + 5};width:22px;height:16px"></div>`;
      }

      // Hint leaves
      if (isHint) {
        html += `<div class="hint-leaves" style="left:${x - 8}px;top:${y - 50}px">🍃</div>`;
        html += `<div class="hint-leaves" style="left:${x + 10}px;top:${y - 44}px;animation-delay:0.25s">🌿</div>`;
        html += `<div class="hint-leaves" style="left:${x - 14}px;top:${y - 38}px;animation-delay:0.15s;font-size:14px">✨</div>`;
      }
    }
  }

  gridEl.innerHTML = html;
  updateChildPosition();
  console.log('[Bantso:forest] Grid rendered | hints:', hintTiles.length);
}

function updateChildPosition() {
  const charEl = $('#child-char');
  if (!charEl) return;
  const { x, y } = tileToScreen(playerPos.row, playerPos.col);
  charEl.style.left = (x - 18) + 'px';
  charEl.style.top = (y - 52) + 'px';
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
  hintTiles = candidates.slice(0, count);

  console.log('[Bantso:forest] Hints spawned:', count, '| at', hintTiles.map(h => '(' + h.row + ',' + h.col + ')').join(' '));

  // Schedule hint refresh
  if (hintTimer) clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    if (Game.screen === 'forest' && !Game.busy) {
      spawnHints();
      renderIsometricGrid();
    }
  }, 12000); // Refresh hints every 12 seconds
}

function onTileClick(row, col) {
  if (Game.busy || Game.screen !== 'forest' || Game.isMaxLevel) {
    console.log('[Bantso:forest] Tile click blocked | busy:', Game.busy, '| screen:', Game.screen);
    return;
  }

  console.log('[Bantso:forest] Tile clicked:', row, col, '| player at:', playerPos.row, playerPos.col);

  // If clicking same tile, just bounce
  if (row === playerPos.row && col === playerPos.col) {
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

  console.log('[Bantso:forest] Path length:', path.length);
  Game.busy = true;
  walkPath(path, 0);
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

function walkPath(path, idx) {
  if (idx >= path.length) {
    Game.busy = false;
    console.log('[Bantso:forest] Walk complete');
    return;
  }

  const step = path[idx];
  playerPos = step;
  updateChildPosition();
  bounceChild();
  Game.audio.play('click');

  // Check for encounter on this step
  const isHint = hintTiles.some(h => h.row === step.row && h.col === step.col);
  const encounterChance = isHint ? 0.95 : 0.35;
  const encounter = Math.random() < encounterChance;

  console.log('[Bantso:forest] Step', idx + 1, '| pos:', step.row, step.col, '| hint:', isHint, '| encounter:', encounter ? 'YES!' : 'no');

  if (encounter) {
    // Clear hints since we're entering battle
    hintTiles = [];
    if (hintTimer) clearTimeout(hintTimer);
    // Keep busy=true until startBattle takes over (it resets busy)
    setTimeout(() => startBattle(), 150);
  } else {
    setTimeout(() => walkPath(path, idx + 1), 350);
  }
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
