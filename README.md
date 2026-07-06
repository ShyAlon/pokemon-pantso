# Pokémon Bantso

A Pokémon-themed progressive web app (PWA) designed for young children — optimized for iPad, works completely offline, and relies heavily on visual iconography with minimal text.

**Version:** 2.1.0

---

## How to Run

Serve the project root with any HTTP server and open on iPad (or any modern browser):

```bash
cd /path/to/pokemon
python3 -m http.server 8080
```

Then open `http://localhost:8080` in Safari. For the full PWA experience, tap **Share → Add to Home Screen** to install as a standalone app that runs without browser chrome.

The service worker (v2) caches all game files on first load, so the game works completely offline after that.

---

## Project Structure

```
pokemon/
├── index.html              ← Thin shell (~200 lines) — HTML layout + script tags
├── manifest.json           ← PWA manifest (name, icons, display mode)
├── sw.js                   ← Service worker (cache-first offline strategy, v2)
├── icon.svg                ← Pokéball app icon
├── package.json            ← Playwright test dependency
├── playwright.config.js    ← Playwright configuration
├── README.md               ← This file
├── css/
│   └── game.css            ← All styles (~920 lines) — screens, animations, layout
├── js/
│   ├── app.js              ← Entry point, version banner, init sequence
│   ├── state.js            ← Central Game state object
│   ├── db.js               ← IndexedDB wrapper (open, get, put, clear)
│   ├── persist.js          ← Save/load game, heal Pokémon, clear all data
│   ├── audio.js            ← Web Audio API: SFX + procedural theme music
│   ├── species.js          ← 20 Pokémon: stats, types, lore, type effectiveness
│   ├── ui.js               ← DOM helpers ($, $$), showScreen, progress bar
│   ├── effects.js          ← Animations: confetti, shake, flash, catch sequence
│   ├── battle.js           ← Forest battle system + attack narration + flee
│   ├── league.js           ← League arena: infinite scaling battles
│   ├── forest.js           ← Isometric grid exploration, pathfinding, hints
│   ├── team.js             ← Team selection overlay
│   ├── lore.js             ← Pokémon lore modal (info popup)
│   ├── menu.js             ← ☰ Menu: restart, new game, confirmation
│   └── events.js           ← All event listener setup
└── tests/
    └── game.spec.js        ← Playwright E2E test suite (20 tests)
```

### Load Order

`index.html` loads JS files in dependency order:

```
db.js → audio.js → species.js → state.js → persist.js → ui.js →
effects.js → battle.js → league.js → forest.js → team.js →
lore.js → menu.js → events.js → app.js
```

---

## Core Game Loop

```
[Forest Exploration] → [Turn-Based Battle] → [Catch / Defeat / Flee] → [Level Up] → … → [League Unlocked]
                                                                                              ↓
                                                                                       [Infinite Arena]
```

### 1. Forest Exploration (Isometric View)

- **11×11 isometric diamond-tile grid** with procedurally generated terrain: grass, bushes, and trees
- The player controls a **child character** (blue cap, red shirt, backpack) by tapping any tile
- The character walks there via **BFS shortest-path** — each step takes ~350ms
- Every step has a **10% encounter chance** with a wild Pokémon
- After reaching level 10, exploration ends and the League unlocks

#### Pokémon Hints
- 2–4 tiles glow with a **pulsing golden aura** and floating emojis
- Each hint is pre-assigned a specific Pokémon species — the emojis reflect its **elemental types** (e.g., 🔥 for Fire, 💧 for Water, ⚡ for Electric)
- Stepping onto a hint tile has a **95% encounter chance** with that exact species
- Hints refresh every 12 seconds

#### Ambush
When a **random encounter** triggers (not from a hint tile):
- The battle screen flashes **red** instead of white
- The message reads **"⚠️ Ambush! Charmander!"**
- The **enemy attacks first**, skipping the player's opening turn
- After the ambush strike, normal turn order resumes

---

### 2. Turn-Based Battle

#### Layout
- Split screen: player's Pokémon on the left, wild Pokémon on the right
- Colored health bars (green → yellow → red)
- **Type badges** (colored pills like `FIR`, `WAT`, `ELE`) below each name
- **Matchup indicators** showing type advantage/disadvantage before attacking
- Four action buttons at the bottom: **ATTACK**, **CATCH**, **SWAP**, **RUN**

#### Actions

| Action | Button | Effect |
|--------|--------|--------|
| **ATTACK** | Red ⚔️ | Deals damage with type effectiveness applied |
| **CATCH** | Blue 🔵 | Attempts to catch the wild Pokémon |
| **SWAP** | Yellow 🔄 | Opens team overlay to switch active Pokémon |
| **RUN** | Grey 🏃 | Attempt to flee (see below) |

#### Battle Flow
1. **Player turn**: choose an action (or enemy attacks first during an Ambush)
2. **Animation plays**: damage/catch logic runs, sprites shake, health bars update
3. **Enemy turn**: enemy attacks after a 1.2s delay
4. Repeat until win, catch, flee, or loss

#### Level Scaling
- Wild enemy **level matches the player's current level**
- Enemy **max HP = 70%** of the player's active Pokémon HP
- Enemy **damage = 15%** of the player's max HP
- The player should win roughly 90% of fights

---

### 3. Type Effectiveness

All 20 Pokémon have canonical types (1–2 each). Attacks apply the full **18-type effectiveness chart**:

| Multiplier | Meaning | Example |
|-----------|---------|---------|
| **2×** | Super effective | Water → Fire |
| **1×** | Neutral | Normal → Normal |
| **0.5×** | Not very effective | Fire → Water |
| **0×** | No effect | Normal → Ghost |

Dual-type defenders multiply both matchups. The battle message shows the effectiveness label:

> *"Squirtle tackles hard! — 50 HP — Super effective!"*

> *"Pikachu strikes! — 6 HP — Not very effective…"*

#### Matchup Indicators
Before attacking, each side shows a persistent matchup label under the type badges:
- **⚔️ Advantage!** (green) — that Pokémon's attacks are super effective
- **🛡️ Resist…** (red) — the opponent's types resist those attacks

This lets young players see at a glance whether they have the upper hand.

#### Attack Narration
20 randomized templates with the Pokémon's name and action, e.g.:
- *"Charmander slashes through! — 28 HP"*
- *"Whoa! Pikachu smashes! — 30 HP — Super effective!"*
- *"Bulbasaur lands a critical hit! — 22 HP"*

---

### 4. Catching Pokémon

Catch probability formula:

```
Catch_Chance = 0.30 + (1.0 − Enemy_Current_HP / Enemy_Max_HP) × 0.50
```

| Enemy Health | Catch Chance |
|-------------|-------------|
| Full HP | 30% |
| Half HP | 55% |
| Near 0 HP | 80% |

On success: **Pokéball shakes 3 times**, confetti burst, Pokémon added to collection.
On failure: **Pokéball shakes twice**, cracks open, red **✕** appears.

---

### 5. Fleeing (RUN)

The **🏃 RUN** button appears in all battles:

- **50%** chance to escape — returns to forest/arena with *"Got away safely!"*
- **50%** chance to fail:
  - Enemy gets a free attack
  - **25%** chance of **losing a random Pokémon** from your collection
  - **Pikachu is always safe** — never selected as the loss victim
  - Lost Pokémon are permanently removed; the active Pokémon auto-switches if needed

> *"Failed! Lost Charmander! Enemy attacks!"*

---

### 6. Leveling & Progression

```
Player_Level = ⌊ Unique_Pokémon_Caught / 2 ⌋ + 1
```

- Every **2 new unique species** caught → level up
- Pokémon stats scale with player level:
  - `maxHp = baseHp + (level − 1) × 15`
  - `damage = baseDmg + (level − 1) × 2`
- **Max level: 10** (requires 18 unique species caught)
- Progress bar at the top shows: *"X / 18 Catch to Unlock!"*

At level 10:
1. **League Unlocked** celebration screen — trophy, confetti, fanfare — with buttons to enter the arena, return to the forest, or restart
2. After 3 seconds (or a tap), transitions to the **League Arena**

---

### 7. League Arena (Infinite Mode)

After unlocking the League, an infinite arena mode becomes available:

- **🏟️ LEAGUE** button appears on the forest screen
- Arena has a **soccer field theme** — green pitch with white boundary lines, center circle, goals at each end, and crowd stands
- Arena battles use the same combat system but with **no CATCH option**
- Opponents are "Champion" versions of random Pokémon
- **Opponents scale infinitely** with league wins:

```
scale = 1 + leagueWins × 0.08
enemyMaxHp = playerMaxHp × 0.70 × scale
enemyDamage = playerMaxHp × (0.15 + leagueWins × 0.015)
```

- Win counter displayed on the field
- Unique **arena victory fanfare** on each win
- **RUN** still available in arena battles

---

### 8. Team Collection

- Accessible from the forest (🎒 button) or during battle (SWAP)
- Grid of Pokémon cards showing sprite, name, **type badges**, HP bar
- Tap a card to set it as the active Pokémon
- **ℹ️ info button** on each card (and on battle sprites) opens a lore modal with a short, kid-friendly description

---

### 9. Menu & Data Management

The **☰ menu button** in the progress bar offers:

| Option | Effect |
|--------|--------|
| **🔄 Restart** | Resets to level 1, keeps only starter Pikachu |
| **🗑️ New Game** | Wipes everything — fresh start |
| **✕ Close** | Dismisses the menu |

Both destructive actions show a confirmation dialog before executing.

---

## Audio

All audio is generated procedurally — **no audio files needed**.

### Sound Effects (Web Audio API)
- Encounter chime (rising sawtooth)
- Attack impact (noise burst + low tone)
- Victory fanfare (ascending C–E–G–C)
- Catch success / failure beeps
- UI click, level-up chime, arena win fanfare

### Procedural Theme Music
Two looping melodies generated from note sequences:

| Theme | Context | Tempo | Voices |
|-------|---------|-------|--------|
| **Forest** | Exploration + Arena | 110 BPM | Triangle melody + sine bass (C major pentatonic) |
| **Battle** | Combat | 155 BPM | Square melody + sawtooth bass (A minor) |

Music switches automatically when entering/exiting battle via `showScreen()`.

---

## Persistence

Game state is saved to **IndexedDB** (via a thin native wrapper in `db.js`):

| Store | Contents |
|-------|----------|
| `playerState` | Level, caught count/species, active Pokémon, league unlocked flag |
| `collection` | All owned Pokémon (species, current HP) |
| `leagueState` | League win streak |

- State is saved after every battle, catch, swap, restart, and level-up
- Force-closing and reopening restores the exact game state
- On load, `caughtSpecies` is **rebuilt from the actual collection data** to prevent stale-state bugs

---

## Visual Effects

| Effect | Trigger |
|--------|---------|
| White flash | Encounter start (hint) |
| **Red flash** | Ambush encounter |
| Sprite shake (300ms) | Attack hit |
| Slash overlay (💥) | Attack hit |
| Confetti burst (50 pieces) | Victory / catch success |
| Green checkmark (✅) | Victory |
| Red crossmark (❌) | Failed catch / flee |
| Pokéball wobble (2–3 shakes) | Catch attempt |
| Level-up glow (golden) | Level up |
| Healing sparkles (✨💚) | After battle / level up |
| Screen fade transition | All screen changes |
| Battle entrance slide | Pokémon enter from sides |
| Hint pulse (gold glow) | Isometric hint tiles |
| Floating type emojis | Hint tiles |
| Walking bounce | Character movement |

---

## Pokémon Species (20 Total)

| # | Name | Types | Pokédex | Base HP | Base DMG |
|---|------|-------|---------|---------|----------|
| 1 | Pikachu | Electric | 25 | 100 | 25 |
| 2 | Charmander | Fire | 4 | 95 | 26 |
| 3 | Bulbasaur | Grass / Poison | 1 | 105 | 23 |
| 4 | Squirtle | Water | 7 | 100 | 24 |
| 5 | Jigglypuff | Normal / Fairy | 39 | 115 | 20 |
| 6 | Meowth | Normal | 52 | 90 | 22 |
| 7 | Psyduck | Water | 54 | 95 | 23 |
| 8 | Growlithe | Fire | 58 | 100 | 25 |
| 9 | Abra | Psychic | 63 | 85 | 28 |
| 10 | Machop | Fighting | 66 | 110 | 24 |
| 11 | Geodude | Rock / Ground | 74 | 105 | 22 |
| 12 | Ponyta | Fire | 77 | 95 | 26 |
| 13 | Slowpoke | Water / Psychic | 79 | 120 | 20 |
| 14 | Magnemite | Electric / Steel | 81 | 90 | 26 |
| 15 | Doduo | Normal / Flying | 84 | 95 | 24 |
| 16 | Seel | Water | 86 | 105 | 22 |
| 17 | Grimer | Poison | 88 | 110 | 23 |
| 18 | Gastly | Ghost / Poison | 92 | 85 | 27 |
| 19 | Onix | Rock / Ground | 95 | 115 | 21 |
| 20 | Eevee | Normal | 133 | 100 | 25 |

Sprites are loaded from [PokeAPI's official sprite repository](https://github.com/PokeAPI/sprites) with emoji fallbacks if images fail to load.

---

## Console Logging

Every significant action logs to the browser console with a `[Bantso:module]` prefix for debugging:

```
[Bantso:app]    — Initialization, version banner
[Bantso:db]     — IndexedDB operations
[Bantso:audio]  — AudioContext, music start/stop
[Bantso:species]— Species loaded count
[Bantso:state]  — State initialization
[Bantso:persist]— Save/load game data
[Bantso:ui]     — Screen changes, progress bar updates
[Bantso:battle] — Damage, catch attempts, type effectiveness, flee
[Bantso:league] — League battles, win tracking
[Bantso:forest] — Tile clicks, pathfinding, hint spawns, ambush
[Bantso:team]   — Team overlay open/close, Pokémon selection
[Bantso:lore]   — Lore modal
[Bantso:menu]   — Restart, new game, confirmations
[Bantso:events] — Button clicks, event registration
[Bantso:SW]     — Service worker lifecycle
```

---

## Testing

Automated end-to-end tests are written with **Playwright**. The test suite validates all game systems and detects console errors and exceptions.

### Setup (first time)

```bash
cd /path/to/pokemon
npm install
npx playwright install chromium
```

### Running Tests

```bash
npm test               # run all 20 tests (headless)
npm run test:headed    # run with visible browser window
npm run test:debug     # step through tests one at a time
```

The Playwright config automatically starts `python3 -m http.server 8080` before running tests and shuts it down afterward. IndexedDB is cleared between tests for clean state.

### Viewing Results

- **Terminal output**: pass/fail list with timing for each test
- **HTML report**: after a run, open `playwright-report/index.html` in a browser for a rich visual report with screenshots of failures
- **Trace viewer**: on test retries, run `npx playwright show-trace test-results/.../trace.zip` for a timeline of every action

### Test Coverage

| # | Test | What It Validates |
|---|------|-------------------|
| 1 | Page load | Forest grid renders, child character visible, no errors |
| 2 | Version banner | `v2.1.0` and `INIT COMPLETE` logged to console |
| 3 | Species loaded | All 20 species initialized |
| 4 | Tile click | Child character moves on grid click |
| 5 | Team overlay | Opens from forest, shows cards with type badges, closes |
| 6 | Lore modal | Opens from team card info button, shows lore text |
| 7 | Menu dropdown | Opens, shows Restart/New Game, closes |
| 8 | Confirmation | Restart shows Yes/No dialog, cancels correctly |
| 9 | Progress bar | Shows correct initial values |
| 10 | Forest hints | Hint tiles with floating emojis appear |
| 11 | Battle screen | All 4 action buttons visible, type badges, sprites |
| 12 | No audio errors | Zero `AudioParam` or `non-finite` errors |
| 13 | Service worker | Registers successfully |
| 14 | League arena | Soccer field, win counter, FIGHT button render |
| 15 | League battle | FIGHT triggers battle with "Champion" enemy, CATCH hidden |
| 16 | Flee button | RUN button present during battle |
| 17 | Matchup indicators | ⚔️/🛡️ labels render for both sides |
| 18 | Music system | Music starts on screen change, no errors |
| 19 | Persistence | Catching Charmander persists across page reload |
| 20 | Stress test | Multiple tile clicks + menu + team overlay with zero errors |

---

## PWA & Offline Support

- **manifest.json**: `"display": "standalone"` — runs fullscreen on iOS Home Screen
- **service worker (v2)**: caches all HTML, CSS, JS, and the icon on install; serves from cache first, falls back to network, then to the root page
- **apple-mobile-web-app-capable**: enabled — no Safari chrome when installed
- **IndexedDB**: all game state persists locally — no server required
- **Web Audio API**: all sounds generated client-side — no audio files to download

---

## Design Principles

- **No text walls**: every UI message is ≤ 3 words; heavy reliance on emoji, color, and animation
- **Large touch targets**: all buttons ≥ 64×64px with rounded corners
- **90% win rate**: enemy HP is capped at 70% of the player's, ensuring most fights are winnable
- **Visual feedback**: every action has a distinct animation and sound
- **Kid-friendly**: bright colors, cute character, encouraging messages, no punishing mechanics
- **Zero dependencies at runtime**: pure HTML/CSS/JS — no frameworks, no CDNs needed after sprite caching
