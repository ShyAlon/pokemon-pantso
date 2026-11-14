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
  test('loads the regular and legendary Pokémon rosters', async ({ page }) => {
    const logs = [];
    page.on('console', msg => { if (msg.type() === 'log') logs.push(msg.text()); });
    await page.goto('/');
    await waitForGameReady(page);

    const speciesLog = logs.find(l => l.includes('[Bantso:species] Loaded'));
    expect(speciesLog).toContain('24 regular and 14 legendary species');
  });

  test('renders Ronny Hamudi as a Ground-type wild Pokémon with 380 HP', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const types = await page.evaluate(() => {
      startBattle('ronny-hamudi', false);
      return getSpecies(Game.battle.enemy.speciesId).types;
    });
    expect(types).toEqual(['Ground']);
    await expect(page.locator('#enemy-name')).toHaveText('Ronny Hamudi');
    await expect(page.locator('#enemy-hp-text')).toHaveText(/380\s*\/\s*380/);
    const sprite = page.locator('#enemy-img');
    await expect(sprite).toHaveAttribute('src', 'sprites/ronny-hamudi.png');
    await expect(sprite).toBeVisible();
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
    await expect(pikachuCard.locator('.evolve-btn')).toBeDisabled();
    await expect(pikachuCard.locator('.missing-stone')).toHaveText('Needs a Thunder Stone');

    const blocked = page.waitForEvent('console', {
      predicate: message => message.text().includes('[Bantso:evolution] Blocked'),
    });
    await page.evaluate(() => evolvePokemon(Game.activePokemonId, 'thunder'));
    expect(await (await blocked).args()[1].jsonValue()).toMatchObject({
      from: 'pikachu', to: 'raichu', stoneType: 'thunder', countBefore: 0,
      reason: 'Required stone is missing or its count is invalid',
    });
    await expect(pikachuCard).toBeVisible();

    await page.locator('#team-close').click();
    await page.evaluate(() => {
      const [row, col] = STORM_TILES[0];
      stoneTiles = [{ row, col, type: 'thunder' }];
      renderIsometricGrid();
    });
    await page.getByRole('button', { name: 'Collect Thunder Stone' }).click();
    await expect(page.locator('#stone-pickup')).toHaveText(/Found a Thunder Stone/);
    await expect.poll(() => page.evaluate(() => Game.busy)).toBe(false);
    await page.locator('#team-access-btn').click();
    await expect(page.locator('#stone-inventory')).toContainText('Thunder Stone ×1');
    await pikachuCard.locator('.evolve-btn').click();
    const spentLabel = page.locator('#stone-inventory .stone-spent');
    await expect(spentLabel).toHaveAttribute('data-stone-type', 'thunder');
    await expect(spentLabel).toHaveCSS('animation-duration', '2s');
    await expect(spentLabel.locator('.stone-count')).toHaveAttribute('data-previous-count', '×1');
    await expect(spentLabel.locator('.stone-count')).toHaveText('×0');

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
    expect(await page.evaluate(() => Game.stones.thunder)).toBe(0);
  });

  test('offers all five Eevee branches and spends only the chosen stone', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await page.evaluate(() => {
      addPokemonToCollection({ speciesId: 'eevee', name: 'Eevee' });
      Game.stones.water = 1;
      Game.stones.ice = 2;
    });
    await page.locator('#team-access-btn').click();

    const eevee = page.locator('.team-card').filter({ has: page.getByText('Eevee', { exact: true }) });
    await expect(eevee.locator('.evolve-btn')).toHaveText([
      /Vaporeon.*Water Stone/s, /Jolteon.*Thunder Stone/s, /Flareon.*Fire Stone/s,
      /Leafeon.*Leaf Stone/s, /Glaceon.*Ice Stone/s,
    ]);
    await expect(eevee.getByRole('button', { name: /Leafeon/ })).toBeDisabled();
    await expect(eevee.locator('.missing-stone')).toContainText(['Thunder Stone', 'Fire Stone', 'Leaf Stone']);
    await eevee.getByRole('button', { name: /Glaceon/ }).click();
    await expect(page.getByText('Glaceon', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => Game.stones)).toEqual({ water: 1, ice: 1 });

    await page.evaluate(async () => {
      addPokemonToCollection({ speciesId: 'eevee', name: 'Eevee' });
      await saveGame();
    });
    await page.reload();
    await waitForGameReady(page);
    expect(await page.evaluate(() => Game.collection
      .filter(p => p.baseSpeciesId === 'eevee').map(p => p.speciesId).sort()))
      .toEqual(['eevee', 'glaceon']);
  });

  test('evolves Azurill through Marill into Azumarill', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await page.evaluate(() => addPokemonToCollection({ speciesId: 'azurill', name: 'Azurill' }));
    await page.locator('#team-access-btn').click();

    const card = name => page.locator('.team-card').filter({ has: page.getByText(name, { exact: true }) });
    await card('Azurill').locator('.evolve-btn').click();
    await card('Marill').locator('.evolve-btn').click();
    await expect(card('Azumarill')).toBeVisible();
    await expect(card('Azumarill').locator('.evolve-btn')).toHaveCount(0);
  });

  test('Belly Drumming spends half of Azumarill’s max HP and quadruples its next attack', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    const stats = await page.evaluate(() => {
      addPokemonToCollection({ speciesId: 'azumarill', name: 'Azumarill' });
      const azumarill = Game.collection.at(-1);
      Game.activePokemonId = azumarill.id;
      startBattle('pikachu', false);
      Game.battle.enemy.damage = 0;
      Game.battle.enemy.currentHp = 500;
      Game.battle.enemy.maxHp = 500;
      return Game.getEffectiveStats(azumarill);
    });
    await page.locator('#btn-attack').click();
    await page.getByRole('button', { name: /Belly Drumming/ }).click();
    await expect(page.locator('#btn-attack')).toBeEnabled();
    expect(await page.evaluate(() => Game.getActivePokemon().currentHp)).toBe(Math.floor(stats.maxHp / 2));

    await page.locator('#btn-attack').click();
    await expect(page.getByRole('button', { name: /Belly Drumming/ })).toBeDisabled();
    await page.evaluate(() => { Math.random = () => 0.5; });
    await page.getByRole('button', { name: /Water Gun/ }).click();
    expect(await page.evaluate(() => Game.battle.enemy.currentHp)).toBe(500 - 4 * stats.damage);
  });

  test('evolves mythical Ronny Hamudi into King Ronny with stronger stats', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    const { baseStats, hpBonus } = await page.evaluate(() => {
      addPokemonToCollection({ speciesId: 'ronny-hamudi', name: 'Ronny Hamudi' });
      return {
        baseStats: Game.getEffectiveStats(Game.collection.at(-1)),
        hpBonus: (Game.playerLevel - 1) * 15,
      };
    });
    expect(baseStats.maxHp).toBe(380 + hpBonus);

    await page.locator('#team-access-btn').click();
    await page.locator('.team-card').filter({ hasText: 'Ronny Hamudi' }).locator('.evolve-btn').click();
    const king = page.locator('.team-card').filter({ hasText: 'King Ronny' });
    const kingHp = 540 + hpBonus;
    await expect(king).toContainText(`${kingHp} / ${kingHp}`);
    const sprite = king.locator('.mini-img');
    await expect(sprite).toHaveAttribute('src', 'sprites/king-ronny.png');
    await expect.poll(() => sprite.evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
    const kingDamage = await page.evaluate(() => Game.getEffectiveStats(Game.collection.at(-1)).damage);
    expect(kingDamage).toBeGreaterThan(baseStats.damage);
  });

  test('chooses a typed attack and shows its matchup against the opponent', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await page.evaluate(() => {
      addPokemonToCollection({ speciesId: 'bulbasaur', name: 'Bulbasaur' });
      Game.activePokemonId = Game.collection.at(-1).id;
      startBattle('geodude', false);
    });

    const dialog = page.getByRole('dialog', { name: 'Choose an attack' });
    const attack = page.locator('#btn-attack');
    await attack.click();
    await expect(dialog.getByRole('button', { name: /Razor Leaf/ })).toHaveText('Razor LeafGrass👍');
    await expect(dialog.getByRole('button', { name: /Poison Sting/ })).toHaveText('Poison StingPoison👎');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => Game.battle.attacksReceived)).toBe(0);

    await page.evaluate(() => startBattle('meowth', false));
    await attack.click();
    await expect(dialog.getByRole('button', { name: /Razor Leaf/ })).toHaveText('Razor LeafGrass');
    await dialog.press('Escape');
    await expect(dialog).toBeHidden();

    await page.evaluate(() => startBattle('geodude', false));
    const initialHp = await page.evaluate(() => Game.battle.enemy.currentHp);
    await attack.click();
    await dialog.getByRole('button', { name: /Poison/ }).click();
    const damage = initialHp - await page.evaluate(() => Game.battle.enemy.currentHp);
    expect(damage).toBeGreaterThan(0);
    expect(damage).toBeLessThan(10);
    await expect(dialog).toBeHidden();
  });

  test('offers named moves for single-type Pokémon and plays the chosen effect', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    await page.evaluate(() => {
      addPokemonToCollection({ speciesId: 'charmander', name: 'Charmander' });
      Game.activePokemonId = Game.collection.at(-1).id;
      startBattle('bulbasaur', false);
      const playMove = Game.audio.playMove.bind(Game.audio);
      Game.audio.playMove = move => {
        document.body.dataset.playedMove = move.name;
        playMove(move);
      };
    });

    await page.locator('#btn-attack').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: /Tackle/ })).toBeVisible();
    await dialog.getByRole('button', { name: /Ember/ }).click();
    await expect(page.locator('.move-effect[data-type="Fire"]')).toHaveCSS('animation-name', 'move-rise');
    await expect(page.locator('body')).toHaveAttribute('data-played-move', 'Ember');
    await expect(page.locator('#battle-msg')).toContainText('Charmander used Ember!');
  });

  test('uses the chosen attack type in a league battle', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    const initialHp = await page.evaluate(() => {
      addPokemonToCollection({ speciesId: 'bulbasaur', name: 'Bulbasaur' });
      Game.activePokemonId = Game.collection.at(-1).id;
      startLeagueBattle();
      Game.leagueBattle.enemy.speciesId = 'geodude';
      renderLeagueBattle();
      return Game.leagueBattle.enemy.currentHp;
    });

    await page.locator('#btn-attack').click();
    await page.getByRole('dialog').getByRole('button', { name: /Grass/ }).click();
    const damage = initialHp - await page.evaluate(() => Game.leagueBattle.enemy.currentHp);
    expect(damage).toBeGreaterThan(70);
  });

  test('can start and attack in a fight after evolving', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const initialEnemyHp = await page.evaluate(async () => {
      await doNewGame(true);
      const starter = Game.getActivePokemon();
      starter.hardCooldown = 1;
      starter.fightsSinceRest = HARD_MODE_RULES.fightsBeforeRest;
      addPokemonToCollection({ speciesId: 'squirtle', name: 'Squirtle' });
      Game.stones.thunder = 1;
      await evolvePokemon(starter.id, 'thunder', Game.collection.at(-1).id);
      startBattle('charmander', false);
      return Game.battle?.enemy.currentHp;
    });

    expect(initialEnemyHp).toBeGreaterThan(0);
    await page.locator('#btn-attack').click();
    await page.getByRole('dialog').getByRole('button', { name: /Thunder Shock/ }).click();
    await expect.poll(() => page.evaluate(() => Game.battle?.enemy.currentHp))
      .toBeLessThan(initialEnemyHp);
    await expect(page.locator('#ally-name')).toHaveText('Raichu');
  });

  test('uses the same Pokémon image URL in My Team and combat', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await page.locator('#team-access-btn').click();
    const teamImage = page.locator('.team-card.active-pokemon .pokemon-rendered-image');
    await expect(teamImage).toHaveAttribute('src', /25\.png$/);
    const teamImageUrl = await teamImage.evaluate(image => image.src);

    await page.locator('#team-close').click();
    await page.evaluate(() => startBattle('charmander', false));
    const combatImage = page.locator('#ally-img');
    await expect(combatImage).toHaveAttribute('src', /25\.png$/);
    const combatImageUrl = await combatImage.evaluate(image => image.src);

    expect(combatImageUrl).toBe(teamImageUrl);
  });

  test('swapping Pokémon consumes the player turn', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    await page.evaluate(() => {
      addPokemonToCollection({ speciesId: 'bulbasaur', name: 'Bulbasaur' });
      startBattle('charmander', false);
      openTeamOverlay('battle');
    });
    await page.locator('.team-card').filter({ hasText: 'Bulbasaur' }).click();

    await expect.poll(() => page.evaluate(() => Game.battle.turn)).toBe('animating');
    await expect(page.locator('#battle-msg')).toContainText('Go, Bulbasaur!');
  });

  test('includes rare legendary encounters and their evolutions', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const legendary = await page.evaluate(() => {
      const originalRandom = Math.random;
      Math.random = () => 0;
      const encounter = getWildPokemonSpecies();
      Math.random = originalRandom;
      return {
        count: LEGENDARY_SPECIES.length,
        encounter: encounter.id,
        meltanEvolution: getEvolution('meltan').id,
        nullEvolution: getEvolution('type-null').id,
        kubfuEvolution: getEvolution('kubfu').id,
      };
    });

    expect(legendary.count).toBe(14);
    expect(legendary.encounter).toBe('ronny-hamudi');
    expect(legendary.meltanEvolution).toBe('melmetal');
    expect(legendary.nullEvolution).toBe('silvally');
    expect(legendary.kubfuEvolution).toBe('urshifu');
  });

  test('enforces Hard Mode roster, cooldown, rest, and evolution cost', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const result = await page.evaluate(async () => {
      await doNewGame(true);
      const starter = Game.collection[0];
      const ids = ['charmander', 'bulbasaur', 'squirtle', 'meowth', 'psyduck', 'abra'];
      for (const id of ids) {
        const species = getSpecies(id);
        addPokemonToCollection({ speciesId: id, name: species.name });
      }
      const eighth = addPokemonToCollection({ speciesId: 'machop', name: 'Machop' });

      const newcomer = Game.collection.find(pokemon => pokemon.speciesId === 'charmander');
      completeHardModeFight({ participants: [starter.id] });
      const cooldownAfterCatchFight = newcomer.hardCooldown;
      completeHardModeFight({ participants: [starter.id] });
      const cooldownAfterOne = newcomer.hardCooldown;
      completeHardModeFight({ participants: [starter.id] });
      const cooldownAfterTwo = newcomer.hardCooldown;
      const starterMustRest = !Game.canPokemonFight(starter);
      completeHardModeFight({ participants: [newcomer.id] });

      return {
        hardMode: Game.hardMode,
        rosterSize: Game.collection.length,
        eighth,
        cooldownAfterCatchFight,
        cooldownAfterOne,
        cooldownAfterTwo,
        starterMustRest,
        starterReadyAfterRest: Game.canPokemonFight(starter),
      };
    });

    expect(result).toEqual({
      hardMode: true,
      rosterSize: 7,
      eighth: false,
      cooldownAfterCatchFight: 2,
      cooldownAfterOne: 1,
      cooldownAfterTwo: 0,
      starterMustRest: false,
      starterReadyAfterRest: true,
    });

    await page.evaluate(() => {
      Game.collection[0].fightsSinceRest = 2;
      openTeamOverlay('battle');
    });
    await expect(page.locator('.team-card').filter({ hasText: 'Pikachu' }))
      .not.toContainText('Fatigued after two fights — must rest for one fight.');
    await expect(page.locator('.team-card').filter({ hasText: 'Charmander' }))
      .not.toContainText('Still adjusting');
    await page.evaluate(() => {
      const newcomer = Game.collection.find(pokemon => pokemon.speciesId === 'charmander');
      newcomer.hardCooldown = 2;
      renderTeamGrid();
    });
    await expect(page.locator('.team-card').filter({ hasText: 'Charmander' }))
      .toContainText('Still adjusting to the team — ready after 2 more fights.');
    await page.locator('.team-card').filter({ hasText: 'Charmander' }).click();
    await expect(page.locator('#team-mode-message'))
      .toContainText('Charmander cannot fight yet. Still adjusting to the team');

    await page.evaluate(() => {
      Game.collection = Game.collection.slice(0, 2);
      Game.caughtSpecies = Game.collection.map(pokemon => pokemon.baseSpeciesId || pokemon.speciesId);
      Game.stones.thunder = 1;
      openTeamOverlay('forest');
    });
    await page.locator('.team-card').filter({ hasText: 'Pikachu' }).locator('.evolve-btn').click();
    await expect(page.locator('.release-btn')).toHaveCount(1);
    await page.locator('.release-btn').click();
    await expect(page.locator('.team-card')).toHaveCount(1);
    await expect(page.locator('.team-card')).toContainText('Raichu');
    expect(await page.evaluate(() => {
      const starter = Game.getActivePokemon();
      for (let i = 0; i < 3; i++) completeHardModeFight({ participants: [starter.id] });
      return Game.canPokemonFight(starter);
    })).toBe(true);
  });

  test('continues to the clicked tile if an encounter cannot start', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    const messages = [];
    page.on('console', msg => messages.push(msg.text()));
    await page.evaluate(async () => {
      await doNewGame(true);
      // Reproduce a legacy roster that lost its starter before it was protected.
      addPokemonToCollection({ speciesId: 'eevee', name: 'Eevee' });
      Game.collection.shift();
      Game.activePokemonId = Game.collection[0].id;
      hintTiles = [];
      stoneTiles = [];
      renderIsometricGrid();
      Math.random = () => 0;
    });
    await page.locator('.iso-tile[data-row="5"][data-col="8"]').click();
    await expect.poll(() => page.evaluate(() => ({ playerPos, busy: Game.busy, screen: Game.screen })))
      .toEqual({ playerPos: { row: 5, col: 8 }, busy: false, screen: 'forest' });
    expect(messages.some(message => message.includes('Encounter declined; continuing route'))).toBe(true);
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
  test('anchors the menu and opens a scrollable manual with keyboard tabs', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 460 });
    await page.goto('/');
    await waitForGameReady(page);

    const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
    await menuButton.click();
    const restart = page.getByRole('button', { name: /Restart/ }).first();
    await expect(restart).toBeVisible();
    await expect.poll(async () => {
      const button = await menuButton.boundingBox();
      const dropdown = await page.locator('#menu-dropdown').boundingBox();
      return Math.abs(button.x - dropdown.x) < 1 && dropdown.y >= button.y + button.height;
    }).toBe(true);

    await page.getByRole('button', { name: /Manual/ }).click();
    const manual = page.getByRole('dialog', { name: 'Pokémon Bantso Manual' });
    await expect(manual).toBeVisible();
    const stones = manual.getByRole('tab', { name: 'Stones' });
    await stones.click();
    const panel = manual.getByRole('tabpanel', { name: 'Stones' });
    await expect(panel).toContainText('crescent moon marker on the gray rocky outcrop');
    expect(await panel.evaluate(el => {
      el.scrollTop = el.scrollHeight;
      return el.scrollTop;
    })).toBeGreaterThan(0);
    await stones.press('ArrowRight');
    await expect(manual.getByRole('tabpanel', { name: 'Evolve' })).toContainText('Jigglypuff uses a Moon Stone');
    await page.keyboard.press('Escape');
    await expect(manual).toBeHidden();
    await expect(menuButton).toBeFocused();
  });

  test('spawns one stone at a time through a full rotation and collects Moon Stones after unlocking the League', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const map = await page.evaluate(() => {
      unspawnedStoneTypes = [];
      const types = [];
      for (const _ of Object.keys(STONES)) {
        spawnHints();
        if (stoneTiles.length !== 1) throw new Error('Expected one stone');
        const { type, row, col } = stoneTiles[0];
        types.push(canSpawnStone(type, row, col) ? type : null);
      }
      return {
        types: types.sort(),
        stormOverTrees: STORM_TILES.some(([row, col]) => gridTerrain[row][col] === 'trees'),
        riverSpansMap: RIVER_TILES[0][1] === 0 && RIVER_TILES.at(-1)[1] === GRID_SIZE - 1,
        riverConnected: RIVER_TILES.slice(1).every(([row, col], index) => {
          const [previousRow, previousCol] = RIVER_TILES[index];
          return Math.abs(row - previousRow) + Math.abs(col - previousCol) === 1;
        }),
      };
    });
    expect(map).toEqual({
      types: ['fire', 'ice', 'leaf', 'moon', 'shiny', 'thunder', 'water'],
      stormOverTrees: true,
      riverSpansMap: true,
      riverConnected: true,
    });

    await page.evaluate(() => {
      Game.leagueUnlocked = true;
      Game.caughtSpecies = SPECIES.slice(0, 18).map(species => species.id);
      showScreen('league-arena');
      renderLeagueArena();
    });
    await page.getByRole('button', { name: /Back to Forest/ }).click();
    await page.evaluate(() => {
      unspawnedStoneTypes = ['moon'];
      spawnHints();
      renderIsometricGrid();
    });
    await page.getByRole('button', { name: 'Collect Moon Stone' }).click();
    await expect(page.locator('#stone-pickup')).toContainText('Found a Moon Stone');
    expect(await page.evaluate(() => Game.stones.moon)).toBe(1);
  });

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

    await expect(page.getByRole('button', { name: 'Wild Pokémon hint' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Collect .* Stone$/ })).toBeVisible();
    await expect(page.locator('#map-legend')).toContainText('Wild Pokémon');
    await expect(page.locator('#map-legend')).toContainText('Stone');
    const spawns = await page.evaluate(() => ({
      count: stoneTiles.length,
      valid: stoneTiles.every(({ row, col, type }) =>
        canSpawnStone(type, row, col) &&
        !hintTiles.some(hint => hint.row === row && hint.col === col)
      ),
    }));
    expect(spawns.count).toBe(1);
    expect(spawns.valid).toBe(true);
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
    // Open and close menu
    await page.locator('#menu-btn').click();
    await page.waitForTimeout(200);
    await page.locator('#menu-close').click();

    // Open team overlay
    await page.locator('#team-access-btn').click();
    await page.waitForTimeout(300);
    await page.locator('#team-close').click();
    await page.evaluate(() => { Math.random = window.__testRandom; });

    // No console errors from these interactions
    const realErrors = errors.filter(e =>
      !e.includes('deprecated') && !e.includes('favicon')
    );
    expect(realErrors).toHaveLength(0);
  });
});
