import { test, expect } from '@playwright/test';

test('region exits travel, reverse, and persist; guide follows the regional encounter pools', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#iso-grid .region-exit')).toHaveCount(4);
  await expect(page.locator('#region-name')).toHaveText('Kanto');
  await page.locator('#region-help').click();
  await expect(page.locator('#region-guide')).toBeVisible();
  await expect(page.locator('#region-pokemon')).toContainText('Bulbasaur');
  await page.getByRole('button', { name: 'Close region guide' }).click();
  // Walk to the tip before dissolving and transferring.
  await page.evaluate(() => { playerPos = { row: 0, col: 9 }; updateChildPosition(); });
  await page.locator('.region-sign.right').click();
  await expect(page.locator('#region-name')).toHaveText('Johto');
  await page.waitForFunction(() => !Game.busy);
  await expect(page.locator('#forest-screen')).toHaveAttribute('data-region', 'Johto');
  expect(await page.evaluate(() => ({ ...playerPos }))).toEqual({ row: 10, col: 0 });
  await page.reload();
  await expect(page.locator('#region-name')).toHaveText('Johto');
  await page.evaluate(() => { playerPos = { row: 10, col: 1 }; updateChildPosition(); });
  await page.locator('.region-sign.left').click();
  await expect(page.locator('#region-name')).toHaveText('Kanto');
  await page.waitForFunction(() => !Game.busy);
  await page.evaluate(() => { playerPos = { row: 1, col: 0 }; updateChildPosition(); });
  await page.locator('.region-sign.up').click();
  await expect(page.locator('#region-name')).toHaveText('Alola');
});

test('all nine regions have distinct themes, valid rosters, reachable routes and collectible habitats', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#iso-grid .region-exit')).toHaveCount(4);
  const data = await page.evaluate(() => REGIONS.map(region => {
    Game.region = region.name;
    renderForestScreen();
    const pool = regionSpecies();
    return {
      name: region.name,
      valid: pool.length === region.pokemon.split(' ').length && regionSpecies(true).length === region.rare.split(' ').length,
      hints: hintTiles.every(hint => pool.some(s => s.id === hint.speciesId)),
      encounters: Array.from({ length: 30 }, () => getWildPokemonSpecies()).every(s => [...pool, ...regionSpecies(true)].includes(s)),
      reversible: REGION_EXITS.every(exit => {
        const original = Game.region;
        Game.region = regionDestination(exit).name;
        const reverse = REGION_EXITS.find(other => other.dr === -exit.dr && other.dc === -exit.dc);
        const result = regionDestination(reverse).name === original;
        Game.region = original;
        return result;
      }),
      habitats: Object.keys(STONES).every(type => gridTerrain.some((row, r) => row.some((_, c) => canSpawnStone(type, r, c)))),
      sky: getComputedStyle(document.querySelector('#forest-screen')).backgroundImage,
    };
  }));
  expect(data).toHaveLength(9);
  expect(new Set(data.map(r => r.sky)).size).toBe(9);
  for (const region of data) {
    expect(region, region.name).toMatchObject({ valid: true, hints: true, encounters: true, reversible: true, habitats: true });
  }
});

test('region labels fit a phone screen and guide closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await expect(page.locator('.region-sign')).toHaveCount(4);
  for (const sign of await page.locator('.region-sign').all()) {
    const box = await sign.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  }
  await page.locator('#region-help').click();
  await expect(page.locator('#region-guide')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#region-guide')).not.toBeVisible();
  await page.screenshot({ path: '/tmp/pokemon-regions-mobile.png' });
});


test('trainer walks to the corner before dissolving, then materializes on the opposite tip', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.region-exit')).toHaveCount(4);
  await page.evaluate(() => { playerPos = { row: 0, col: 8 }; updateChildPosition(); });
  await page.locator('.region-sign.right').click();
  expect(await page.evaluate(() => ({ ...playerPos }))).toEqual({ row: 0, col: 9 });
  await expect(page.locator('#child-char')).not.toHaveClass(/region-transfer/);
  await expect(page.locator('#region-name')).toHaveText('Kanto');
  await page.evaluate(() => onTileClick(4, 4));
  await expect(page.locator('#child-char')).toHaveClass(/region-transfer/);
  expect(await page.evaluate(() => ({ ...playerPos }))).toEqual({ row: 0, col: 10 });
  await expect(page.locator('#region-name')).toHaveText('Johto');
  await page.waitForFunction(() => !Game.busy);
  expect(await page.evaluate(() => ({ ...playerPos }))).toEqual({ row: 10, col: 0 });
  await expect(page.locator('#child-char')).not.toHaveClass(/region-transfer|walking/);
  expect(await page.locator('#child-char').evaluate(node => getComputedStyle(node).opacity)).toBe('1');
  expect(await page.locator('.region-sign.left').textContent()).toBe('Kanto');
  expect(await page.locator('.region-sign.left').evaluate(node => ({ background: getComputedStyle(node).backgroundColor, border: getComputedStyle(node).borderTopWidth }))).toEqual({ background: 'rgba(0, 0, 0, 0)', border: '0px' });
  await page.screenshot({ path: '/tmp/pokemon-refined-travel.png' });
});

test('all four transfers land on the correct square and failed saves restore the trainer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.region-exit')).toHaveCount(4);
  const arrivals = await page.evaluate(async () => {
    const results = [];
    for (const exit of REGION_EXITS) {
      Game.region = 'Kanto';
      await travelToRegion(exit);
      results.push({ ...playerPos });
    }
    return results;
  });
  expect(arrivals).toEqual([{ row: 10, col: 10 }, { row: 10, col: 0 }, { row: 0, col: 0 }, { row: 0, col: 10 }]);
  const result = await page.evaluate(async () => {
    const originalSave = saveGame;
    const before = { region: Game.region, position: { ...playerPos } };
    saveGame = async () => { throw new Error('test save failure'); };
    try { await travelToRegion(REGION_EXITS[0]); } finally { saveGame = originalSave; }
    return { before, after: { region: Game.region, position: { ...playerPos } }, busy: Game.busy };
  });
  expect(result.after).toEqual(result.before);
  expect(result.busy).toBe(false);
  await expect(page.locator('#child-char')).toBeVisible();
  await expect(page.locator('#stone-pickup')).toContainText('Could not save');
});
