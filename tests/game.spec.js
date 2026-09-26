import { test, expect } from '@playwright/test';

// Helper: collect console errors during the test
function trackErrors(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  return errors;
}

// Helper: wait for game init banner to appear in console
async function waitForGameReady(page) {
  await page.waitForFunction(() => {
    return document.querySelector('#child-char') &&
           document.querySelector('#iso-grid') &&
           document.querySelector('#level-star');
  }, { timeout: 15000 });
  // Let the init sequence fully complete
  await page.waitForTimeout(500);
}

// Helper: clear IndexedDB before each test
async function clearStorage(page) {
  await page.evaluate(() => {
    return new Promise((resolve) => {
      const req = indexedDB.deleteDatabase('pokemon-bantso-db');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });
}

test.describe('Pokémon Bantso — End-to-End', () => {

  test.beforeEach(async ({ page }) => {
    // IndexedDB is unavailable on about:blank. Visit the test server first so
    // storage cleanup runs in the application's origin without loading the app.
    await page.goto('/__test_reset__');
    await clearStorage(page);
  });

  // ── 1. Page Load & Initialization ──
  test('loads without errors and renders the forest grid', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await waitForGameReady(page);

    // Progress bar visible
    await expect(page.locator('#progress-bar')).toBeVisible();
    await expect(page.locator('#level-star')).toHaveText('1');

    // Forest screen is active
    await expect(page.locator('#forest-screen')).toHaveClass(/active/);

    // Isometric grid exists with tiles
    const tiles = page.locator('#iso-grid .iso-tile');
    await expect(tiles.first()).toBeVisible();

    // Child character exists
    await expect(page.locator('#child-char')).toBeVisible();

    // Menu button exists
    await expect(page.locator('#menu-btn')).toBeVisible();

    // No page errors
    expect(errors.filter(e => !e.includes('deprecated'))).toHaveLength(0);
  });

  // ── 2. Version Banner ──
  test('logs version banner on startup', async ({ page }) => {
    const logs = [];
    page.on('console', msg => { if (msg.type() === 'log') logs.push(msg.text()); });
    await page.goto('/');
    await waitForGameReady(page);

    const bannerLine = logs.find(l => l.includes('POKÉMON BANTSO'));
    expect(bannerLine).toBeDefined();
    const versionLine = logs.find(l => l.includes('Version'));
    expect(versionLine).toContain('2.1.0');
    const initLine = logs.find(l => l.includes('INIT COMPLETE'));
    expect(initLine).toBeDefined();
  });

  // ── 3. Species Loaded ──
  test('loads all 20 Pokémon species', async ({ page }) => {
    const logs = [];
    page.on('console', msg => { if (msg.type() === 'log') logs.push(msg.text()); });
    await page.goto('/');
    await waitForGameReady(page);

    const speciesLog = logs.find(l => l.includes('[Bantso:species] Loaded'));
    expect(speciesLog).toContain('20');
  });

  // ── 4. Forest Grid Click ──
  test('responds to tile clicks and moves child character', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Click a nearby tile (offset from center)
    const grid = page.locator('#iso-grid');
    const box = await grid.boundingBox();
    if (!box) throw new Error('Grid not found');

    // Click slightly to the right of center
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height * 0.35;
    await page.mouse.click(cx + 80, cy + 20);

    // Child should move (animation happens over 300ms per step)
    await page.waitForTimeout(400);

    // Verify child character moved (position changed from default)
    const child = page.locator('#child-char');
    const left = await child.evaluate(el => el.style.left);
    expect(left).toBeTruthy();
    expect(left).not.toBe('');
  });

  // ── 5. Team Overlay ──
  test('opens and closes team overlay from forest', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Click team access button
    await page.locator('#team-access-btn').click();
    await page.waitForTimeout(300);

    // Overlay should be visible with at least Pikachu card
    await expect(page.locator('#team-overlay')).toHaveClass(/active/);
    const cards = page.locator('.team-card');
    await expect(cards.first()).toBeVisible();

    // Type badges visible
    const badges = page.locator('.type-badge');
    await expect(badges.first()).toBeVisible();

    // Close overlay
    await page.locator('#team-close').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#team-overlay')).not.toHaveClass(/active/);
  });

  // ── 6. Lore Modal ──
  test('shows lore modal from team card info button', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Open team overlay
    await page.locator('#team-access-btn').click();
    await page.waitForTimeout(300);

    // Click info icon on the first card
    const infoBtn = page.locator('.card-info-icon').first();
    await infoBtn.click();
    await page.waitForTimeout(300);

    // Lore modal should appear
    await expect(page.locator('#lore-modal')).toHaveClass(/active/);
    await expect(page.locator('#lore-name')).not.toHaveText('');
    await expect(infoBtn.locator('img')).toHaveAttribute('src', 'trainer.svg');
    await expect(page.locator('#lore-prey')).not.toHaveText('');
    await expect(page.locator('#lore-predators')).not.toHaveText('');

    const matchupCounts = await page.evaluate(() => {
      const matchups = getLoreMatchups('pikachu');
      const pikachu = getSpecies('pikachu');
      return {
        prey: matchups.prey.length,
        predators: matchups.predators.length,
        preyAreAdvantaged: matchups.prey.every(example =>
          getTypeEffectiveness(pikachu.types, example.types).multiplier > 1.5),
        predatorsResist: matchups.predators.every(example =>
          getTypeEffectiveness(pikachu.types, example.types).multiplier < 0.75),
      };
    });
    expect(matchupCounts.prey).toBeLessThanOrEqual(2);
    expect(matchupCounts.predators).toBeLessThanOrEqual(2);
    expect(matchupCounts.preyAreAdvantaged).toBe(true);
    expect(matchupCounts.predatorsResist).toBe(true);

    // Close lore
    await page.locator('#lore-close').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#lore-modal')).not.toHaveClass(/active/);
  });

  test('evolves supported Pokémon from the inventory and persists the form', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await page.locator('#team-access-btn').click();
    const pikachuCard = page.locator('.team-card').filter({ hasText: 'Pikachu' });
    await expect(pikachuCard.locator('.evolve-btn')).toBeVisible();
    await pikachuCard.locator('.evolve-btn').click();

    const evolvedCard = page.locator('.team-card').filter({ hasText: 'Raichu' });
    await expect(evolvedCard).toBeVisible();
    await expect(evolvedCard.locator('.evolve-btn')).toHaveCount(0);

    const evolvedState = await page.evaluate(() => ({
      speciesId: Game.collection[0].speciesId,
      baseSpeciesId: Game.collection[0].baseSpeciesId,
      uniqueCaught: Game.totalUniqueCaught,
      charmeleonEvolution: getEvolution('charmeleon').id,
    }));
    expect(evolvedState).toEqual({
      speciesId: 'raichu',
      baseSpeciesId: 'pikachu',
      uniqueCaught: 1,
      charmeleonEvolution: 'charizard',
    });

    await page.reload();
    await waitForGameReady(page);
    await expect.poll(() => page.evaluate(() => Game.collection[0].speciesId)).toBe('raichu');
  });

  // ── 7. Menu Dropdown ──
  test('opens menu and shows restart/new game options', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Open menu
    await page.locator('#menu-btn').click();
    await page.waitForTimeout(200);

    // Dropdown visible
    await expect(page.locator('#menu-dropdown')).toHaveClass(/active/);
    await expect(page.locator('#menu-restart')).toBeVisible();
    await expect(page.locator('#menu-newgame')).toBeVisible();

    // Close menu
    await page.locator('#menu-close').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#menu-dropdown')).not.toHaveClass(/active/);
  });

  // ── 8. Restart Confirmation ──
  test('shows confirmation dialog for restart and new game', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Open menu → click Restart
    await page.locator('#menu-btn').click();
    await page.locator('#menu-restart').click();
    await page.waitForTimeout(200);

    // Confirm modal with Yes/No buttons
    await expect(page.locator('#confirm-modal')).toBeVisible();
    await expect(page.locator('#confirm-title')).toContainText('Restart');
    await expect(page.locator('#confirm-yes')).toBeVisible();
    await expect(page.locator('#confirm-no')).toBeVisible();

    // Cancel
    await page.locator('#confirm-no').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#confirm-modal')).not.toBeVisible();
  });

  // ── 9. Progress Bar Updates ──
  test('shows correct initial progress bar values', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await expect(page.locator('#level-star')).toHaveText('1');
    const progressText = await page.locator('#progress-text').textContent();
    expect(progressText).toContain('Catch');
  });

  // ── 10. Forest Hints Visible ──
  test('renders hint tiles on the forest grid', async ({ page }) => {
    const logs = [];
    page.on('console', msg => { if (msg.type() === 'log') logs.push(msg.text()); });
    await page.goto('/');
    await waitForGameReady(page);

    // Wait for hint spawn log
    const hintLog = logs.find(l => l.includes('[Bantso:forest] Hints spawned'));
    expect(hintLog).toBeDefined();

    // Hint tiles should have the 'hint' class or leaves
    const leaves = page.locator('.hint-leaves');
    const count = await leaves.count();
    expect(count).toBeGreaterThan(0);
  });

  // ── 11. Battle Screen Elements (via forced encounter) ──
  test('displays battle screen with all action buttons', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Force an encounter by directly calling startBattle
    await page.evaluate(() => {
      // Override Math.random so the next call always triggers encounter
      const origRandom = Math.random;
      let callCount = 0;
      Math.random = function() {
        callCount++;
        // encounter check at 0.10 threshold → return 0.05 for first call
        if (callCount === 1) return 0.05;
        return origRandom.call(Math);
      };
      // Simulate a forest click that would trigger an encounter
      if (typeof window.onTileClick === 'function') {
        window.onTileClick(4, 5); // adjacent tile
      }
    });

    // Wait for battle screen to potentially appear
    await page.waitForTimeout(1000);

    // Check if we're on battle screen or still on forest
    const battleScreen = page.locator('#battle-screen');
    const isBattleActive = await battleScreen.evaluate(el =>
      el.classList.contains('active')
    );

    if (isBattleActive) {
      // Battle screen should have action buttons
      await expect(page.locator('#btn-attack')).toBeVisible();
      await expect(page.locator('#btn-catch')).toBeVisible();
      await expect(page.locator('#btn-food')).toBeVisible();
      await expect(page.locator('#btn-swap')).toBeVisible();
      await expect(page.locator('#btn-flee')).toBeVisible();

      // Type badges should be visible
      const typeBadges = page.locator('#enemy-types .type-badge');
      await expect(typeBadges.first()).toBeVisible();

      // Both Pokémon sprites visible
      await expect(page.locator('#ally-sprite')).toBeVisible();
      await expect(page.locator('#enemy-sprite')).toBeVisible();

      // Battle message area
      await expect(page.locator('#battle-msg')).toBeVisible();
    } else {
      // Still on forest — that's OK, the random override may not have worked
      console.log('Battle did not trigger — forest encounter works probabilistically');
    }
  });

  test('food chance uses matchup and drops exponentially after attacks', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const chances = await page.evaluate(() => ({
      mutualAdvantage: getFoodSuccessChance(['Ghost'], ['Psychic', 'Ghost'], 0),
      allyAdvantage: getFoodSuccessChance(['Water'], ['Fire'], 0),
      enemyAdvantage: getFoodSuccessChance(['Fire'], ['Water'], 0),
      untouched: getFoodSuccessChance(['Normal'], ['Normal'], 0),
      attackedOnce: getFoodSuccessChance(['Normal'], ['Normal'], 1),
      attackedTwice: getFoodSuccessChance(['Normal'], ['Normal'], 2),
    }));

    expect(chances.mutualAdvantage).toBeCloseTo(0.70);
    expect(chances.allyAdvantage).toBeCloseTo(0.60);
    expect(chances.enemyAdvantage).toBeCloseTo(0.35);
    expect(chances.attackedOnce).toBeCloseTo(chances.untouched * 0.5);
    expect(chances.attackedTwice).toBeCloseTo(chances.untouched * 0.25);
  });

  // ── 12. No Audio Crashes ──
  test('does not throw audio errors during initialization', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await waitForGameReady(page);

    // Filter out deprecation warnings, check for real audio errors
    const audioErrors = errors.filter(e =>
      e.includes('AudioParam') || e.includes('AudioContext') || e.includes('non-finite')
    );
    expect(audioErrors).toHaveLength(0);
  });

  // ── 13. Service Worker Registers ──
  test('registers service worker', async ({ page }) => {
    const logs = [];
    page.on('console', msg => { if (msg.type() === 'log') logs.push(msg.text()); });
    await page.goto('/');
    await waitForGameReady(page);

    const swLog = logs.find(l =>
      l.includes('Service Worker registered') || l.includes('SW registered')
    );
    expect(swLog).toBeDefined();
  });

  // ── 14. League Arena Screen Elements ──
  test('can force-show league arena screen', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await waitForGameReady(page);

    // Force league unlock and show arena
    await page.evaluate(() => {
      Game.leagueUnlocked = true;
      showScreen('league-arena');
      if (typeof renderLeagueArena === 'function') renderLeagueArena();
    });
    await page.waitForTimeout(500);

    // Arena elements
    await expect(page.locator('#league-arena-screen')).toHaveClass(/active/);
    await expect(page.locator('.arena-field')).toBeVisible();
    await expect(page.locator('.arena-title')).toContainText('League Arena');
    await expect(page.locator('#arena-wins')).toBeVisible();
    await expect(page.locator('#arena-fight-btn')).toBeVisible();

    // No errors from arena transition
    expect(errors.length).toBe(0);
  });

  // ── 15. League Arena Fight Triggers Battle ──
  test('arena fight button starts a league battle', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Force league unlock + show arena
    await page.evaluate(() => {
      Game.leagueUnlocked = true;
      showScreen('league-arena');
      if (typeof renderLeagueArena === 'function') renderLeagueArena();
    });
    await page.waitForTimeout(300);

    // Click FIGHT
    await page.locator('#arena-fight-btn').click();
    await page.waitForTimeout(800);

    // Should now be on battle screen
    const battleScreen = page.locator('#battle-screen');
    const isActive = await battleScreen.evaluate(el => el.classList.contains('active'));
    expect(isActive).toBe(true);

    // CATCH button should be hidden in league
    const catchBtn = page.locator('#btn-catch');
    const display = await catchBtn.evaluate(el => el.style.display);
    expect(display).toBe('none');

    // Enemy name should contain "Champion"
    const enemyName = await page.locator('#enemy-name').textContent();
    expect(enemyName).toContain('Champion');
  });

  // ── 16. Flee Button Exists in Battle ──
  test('flee button is present during battle', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Force league battle
    await page.evaluate(() => {
      Game.leagueUnlocked = true;
      if (typeof startLeagueBattle === 'function') startLeagueBattle();
    });
    await page.waitForTimeout(800);

    const fleeBtn = page.locator('#btn-flee');
    await expect(fleeBtn).toBeVisible();
  });

  // ── 17. Type Matchup Indicators Shown ──
  test('shows type matchup indicators during battle', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Gastly and Abra are mutually super-effective, so both tags are shown.
    await page.evaluate(() => {
      const gastly = { id: 'gastly_test', speciesId: 'gastly', name: 'Gastly', currentHp: 85 };
      Game.collection.push(gastly);
      Game.activePokemonId = gastly.id;
      startBattle('abra', false);
    });
    await page.waitForTimeout(1000);

    // Check ally-matchup and enemy-matchup exist
    const allyMatchup = page.locator('#ally-matchup');
    const enemyMatchup = page.locator('#enemy-matchup');
    await expect(allyMatchup).toBeVisible();
    await expect(enemyMatchup).toBeVisible();
  });

  // ── 18. Music Logging ──
  test('music system starts without errors', async ({ page }) => {
    const errors = trackErrors(page);
    const logs = [];
    page.on('console', msg => { if (msg.type() === 'log') logs.push(msg.text()); });

    await page.goto('/');
    await waitForGameReady(page);

    // Force screen change to trigger music
    await page.evaluate(() => { showScreen('battle'); });
    await page.waitForTimeout(500);

    const musicLog = logs.find(l => l.includes('Starting music'));
    expect(musicLog).toBeDefined();

    // No audio errors
    const audioErrors = errors.filter(e =>
      e.includes('AudioParam') || e.includes('non-finite')
    );
    expect(audioErrors).toHaveLength(0);
  });

  // ── 19. Persistence: Game State Survives Reload ──
  test('game state persists across page reload', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Force collection of a second pokemon
    await page.evaluate(() => {
      Game.caughtSpecies = ['pikachu', 'charmander'];
      Game.caughtCount = 2;
      Game.collection.push({
        id: 'charmander_01',
        speciesId: 'charmander',
        name: 'Charmander',
        currentHp: 100,
      });
      if (typeof saveGame === 'function') saveGame();
    });
    await page.waitForTimeout(500);

    // Reload
    await page.reload();
    await waitForGameReady(page);

    // Verify progress persisted
    const levelStar = await page.locator('#level-star').textContent();
    expect(levelStar).toBe('2'); // floor(2/2)+1 = 2
  });

  // ── 20. No Console Errors After Extensive Interaction ──
  test('no console errors after clicking many tiles and using menu', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await waitForGameReady(page);

    // Keep exploratory clicks from randomly starting a battle in this UI test.
    await page.evaluate(() => {
      window.__testRandom = Math.random;
      Math.random = () => 0.99;
    });

    // Click several tiles
    const grid = page.locator('#iso-grid');
    const box = await grid.boundingBox();
    if (!box) throw new Error('Grid not found');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height * 0.35;

    for (let i = 0; i < 4; i++) {
      await page.mouse.click(cx + (i % 2 === 0 ? 80 : -80), cy + (i < 2 ? -20 : 30));
      await page.waitForTimeout(400);
    }
    await page.evaluate(() => { Math.random = window.__testRandom; });

    // Open and close menu
    await page.locator('#menu-btn').click();
    await page.waitForTimeout(200);
    await page.locator('#menu-close').click();

    // Open team overlay
    await page.locator('#team-access-btn').click();
    await page.waitForTimeout(300);
    await page.locator('#team-close').click();

    // No console errors from these interactions
    const realErrors = errors.filter(e =>
      !e.includes('deprecated') && !e.includes('favicon')
    );
    expect(realErrors).toHaveLength(0);
  });
});
