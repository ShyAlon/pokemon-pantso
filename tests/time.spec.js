import { test, expect } from '@playwright/test';

async function ready(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.goto('/');
  await expect(page.locator('.region-exit')).toHaveCount(4);
  await page.clock.pauseAt(new Date('2026-01-01T12:01:00Z'));
  await page.evaluate(() => resetGameClock());
}

test('starts at noon, advances one minute per second, and wraps at midnight', async ({ page }) => {
  await ready(page);
  await expect(page.locator('#game-clock')).toHaveText('☀ 12:00');
  expect(await page.locator('#forest-screen').evaluate(node => node.style.getPropertyValue('--time-horizon'))).toBe('rgb(176, 224, 230)');
  await page.clock.fastForward(1000);
  await expect(page.locator('#game-clock')).toHaveText('☀ 12:01');
  await page.clock.fastForward(59000);
  await expect(page.locator('#game-clock')).toHaveText('☀ 13:00');
  await page.evaluate(() => resetGameClock(1439));
  await page.clock.fastForward(1000);
  await expect(page.locator('#game-clock')).toHaveText('☾ 00:00');
});

test('sun and moon follow arcs while stars and galaxies remain fixed', async ({ page }) => {
  await ready(page);
  const positionAt = minutes => page.evaluate(minutes => {
    resetGameClock(minutes);
    const body = document.querySelector('#sky-body');
    return { left: parseFloat(body.style.left), top: parseFloat(body.style.top), type: body.className };
  }, minutes);
  const sunrise = await positionAt(360);
  const quarter = await positionAt(540);
  const noon = await positionAt(720);
  expect(quarter.left).toBeCloseTo(50 - Math.SQRT1_2 * 42, 3);
  expect(quarter.top).toBeCloseTo(92 - Math.SQRT1_2 * 64, 3);
  const afternoon = await positionAt(1000);
  expect(sunrise.left).toBeLessThan(noon.left);
  expect(noon.left).toBeLessThan(afternoon.left);
  expect(noon.top).toBeLessThan(sunrise.top);
  expect(noon.top).toBeLessThan(afternoon.top);
  const sunset = await positionAt(1080);
  expect(sunset.type).toBe('moon');
  await expect(page.locator('#forest-screen')).toHaveAttribute('data-time-of-day', 'night');
  const fixed = () => page.locator('.sky-constellation, .sky-galaxy').evaluateAll(nodes => nodes.map(n => ({ markup: n.outerHTML, transform: getComputedStyle(n).transform })));
  const before = await fixed();
  await positionAt(0);
  expect(await fixed()).toEqual(before);
  expect(before).toHaveLength(8);
  expect(await page.locator('#night-sky').evaluate(n => getComputedStyle(n).opacity)).toBe('1');
  await positionAt(360);
  await expect(page.locator('#forest-screen')).toHaveAttribute('data-time-of-day', 'day');
  await positionAt(720);
  expect(await page.locator('#night-sky').evaluate(n => getComputedStyle(n).opacity)).toBe('0');
});

test('time survives saves and region changes and resets with a new game', async ({ page }) => {
  await ready(page);
  await page.evaluate(async () => {
    resetGameClock(1260);
    await saveGame();
  });
  await page.reload();
  await expect(page.locator('#game-clock')).toHaveText('☾ 21:00');
  await page.evaluate(async () => { await travelToRegion(REGION_EXITS[1]); });
  await expect(page.locator('#region-name')).toHaveText('Johto');
  await expect(page.locator('#game-clock')).toHaveText('☾ 21:00');
  await page.evaluate(() => doNewGame());
  await expect(page.locator('#game-clock')).toHaveText('☀ 12:00');
  await expect(page.locator('#forest-screen')).toHaveAttribute('data-time-of-day', 'day');
});

test('night sky fits mobile without blocking map navigation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await ready(page);
  await page.evaluate(() => resetGameClock(0));
  await page.screenshot({ path: '/tmp/pokemon-night.png' });
  await page.locator('#region-help').click();
  await expect(page.locator('#region-guide')).toBeVisible();
  await page.getByRole('button', { name: 'Close region guide' }).click();
  await page.evaluate(() => resetGameClock());
  await page.screenshot({ path: '/tmp/pokemon-day.png' });
});


test('region travel switches hemispheres and the guide names the visible patterns', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => resetGameClock(0));
  await expect(page.locator('#night-stars')).toHaveAttribute('data-hemisphere', 'north');
  await expect(page.locator('[data-constellation="big-dipper"] .sky-star')).toHaveCount(7);
  await expect(page.locator('[data-constellation="cassiopeia"] .sky-star')).toHaveCount(5);
  await page.evaluate(async () => { await travelToRegion(REGION_EXITS[0]); });
  await expect(page.locator('#region-name')).toHaveText('Alola');
  await expect(page.locator('#night-stars')).toHaveAttribute('data-hemisphere', 'south');
  await expect(page.locator('[data-constellation="crux"] .sky-star')).toHaveCount(5);
  await expect(page.locator('[data-constellation="triangulum-australe"] .sky-star')).toHaveCount(3);
  await expect(page.locator('[data-constellation="big-dipper"]')).toHaveCount(0);
  await page.locator('#region-help').click();
  await expect(page.locator('#region-constellations')).toContainText('Southern sky');
  await expect(page.locator('#region-constellations')).toContainText('Crux');
  await page.getByRole('button', { name: 'Close region guide' }).click();
  await page.setViewportSize({ width: 375, height: 667 });
  await page.screenshot({ path: '/tmp/pokemon-southern-constellations.png' });
  await page.reload();
  await expect(page.locator('#night-stars')).toHaveAttribute('data-hemisphere', 'south');
  await page.evaluate(async () => { await travelToRegion(REGION_EXITS[2]); });
  await expect(page.locator('#night-stars')).toHaveAttribute('data-hemisphere', 'north');
  await page.screenshot({ path: '/tmp/pokemon-northern-constellations.png' });
});


test('rich night skies have six constellations, colored stars and restrained twinkling', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => resetGameClock(0));
  await expect(page.locator('.sky-constellation')).toHaveCount(6);
  await expect(page.locator('.ambient-star')).toHaveCount(180);
  const colors = await page.locator('.sky-star').evaluateAll(nodes => [...new Set(nodes.map(n => getComputedStyle(n).fill))]);
  expect(colors.length).toBeGreaterThanOrEqual(4);
  expect(await page.locator('.twinkle').first().evaluate(n => getComputedStyle(n).animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await page.locator('.twinkle').first().evaluate(n => getComputedStyle(n).animationName)).toBe('starTwinkle');
  expect(await page.locator('.sky-star:not(.twinkle)').count()).toBeGreaterThan(10);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.screenshot({ path: '/tmp/pokemon-rich-night-mobile.png' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: '/tmp/pokemon-rich-night-desktop.png' });
  await page.evaluate(async () => { await travelToRegion(REGION_EXITS[0]); });
  await expect(page.locator('.sky-constellation')).toHaveCount(6);
  await expect(page.locator('[data-constellation="scorpius"]')).toHaveCount(1);
  await page.screenshot({ path: '/tmp/pokemon-rich-south.png' });
});


test('menu sits above the map and sets, saves, and continues game time', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 460 });
  await ready(page);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.locator('#menu-time-input')).toHaveValue('12:00');
  const menuAboveMap = await page.locator('#menu-time-input').evaluate(input => {
    const box = input.getBoundingClientRect();
    return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === input;
  });
  expect(menuAboveMap).toBe(true);
  await page.locator('#menu-time-input').fill('23:45');
  await page.getByRole('button', { name: 'Set time', exact: true }).click();
  await expect(page.locator('#game-clock')).toHaveText('☾ 23:45');
  await expect(page.locator('#menu-time-status')).toContainText('Time set to 23:45');
  await page.clock.fastForward(1000);
  await expect(page.locator('#game-clock')).toHaveText('☾ 23:46');
  await page.reload();
  await expect(page.locator('#game-clock')).toHaveText('☾ 23:45');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.locator('#menu-time-input')).toHaveValue('23:45');
  await page.locator('#menu-time-input').fill('08:00');
  await page.getByRole('button', { name: 'Set time', exact: true }).click();
  await expect(page.locator('#game-clock')).toHaveText('☀ 08:00');
  await page.screenshot({ path: '/tmp/pokemon-time-menu.png' });
  await page.locator('#menu-close').click();
  await expect(page.locator('#menu-dropdown')).not.toHaveClass(/active/);
});
