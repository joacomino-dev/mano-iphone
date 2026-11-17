// Motion pass (CW-CL-085, user 2026-11-17): stamp particles are event-driven, few, bounded,
// decorative, never in the grid or with Reduce Motion, and leave nothing behind.
// Synthetic library on the dev server; browser timing is not phone timing.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { installAppleFixture } from './apple-fixture.mjs';
const url = process.env.APPLE_AUDIT_URL || 'http://127.0.0.1:4186/native.html';
const browser = await chromium.launch({ channel: process.env.APPLE_BROWSER_CHANNEL || 'msedge', headless: true });
const results = [];
async function open(reducedMotion) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion });
  await context.addInitScript(installAppleFixture, {});
  await context.addInitScript(() => { window.appleFixture.assets = Array.from({ length: 120 }, (_, i) => ({ id: `fixture-${i}`, kind: 'photo', date: 1700000000000 - i * 3600000, width: 1000, height: 1500, duration: 0, hasLocation: false, demo: true, bytes: 1000000 + i })); });
  const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url); await page.locator('.photo-card.front').waitFor(); await page.waitForFunction(() => !document.querySelector('.splash-lockup'));
  // Count particles at every frame, to catch even short-lived ones.
  await page.evaluate(() => { window.__peak = 0; window.__seen = 0; const tick = () => { const n = document.querySelectorAll('.cw-particle').length; window.__peak = Math.max(window.__peak, n); window.__seen += n; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  return { context, page, errors };
}
const keep = page => page.locator('.decision-bar').first().getByRole('button', { name: /^Conservar/ }).click();
const state = page => page.evaluate(() => ({ peak: window.__peak, seen: window.__seen, live: document.querySelectorAll('.cw-particle').length, layers: document.querySelectorAll('.cw-particles').length, hidden: document.querySelector('.cw-particles')?.getAttribute('aria-hidden'), events: document.querySelector('.cw-particles') && getComputedStyle(document.querySelector('.cw-particles')).pointerEvents }));
try {
  {
    const { context, page, errors } = await open('no-preference');
    await keep(page); await page.waitForTimeout(900);
    let s = await state(page);
    assert.ok(s.peak > 0 && s.peak <= 8, `a keep leaves a few ink dots (peak ${s.peak})`);
    assert.equal(s.live, 0, 'particles are removed when their animation ends');
    assert.equal(s.hidden, 'true'); assert.equal(s.events, 'none');
    results.push(`keep: ${s.peak} ink dots, gone after; layer decorative`);
    // Rapid decisions replace the burst, never queue it.
    await page.evaluate(() => { window.__peak = 0; });
    for (let k = 0; k < 6; k++) { await keep(page); await page.waitForTimeout(40); }
    await page.waitForTimeout(1200); s = await state(page);
    assert.ok(s.peak <= 8, `rapid decisions never stack bursts (peak ${s.peak})`); assert.equal(s.live, 0);
    results.push(`six quick keeps: peak ${s.peak}, nothing left`);
    // Twenty decisions: no growth in particle nodes or layers.
    for (let k = 0; k < 20; k++) { await keep(page); await page.waitForTimeout(80); }
    await page.waitForTimeout(1200); s = await state(page);
    assert.equal(s.live, 0); assert.equal(s.layers, 1, 'one shared layer, reused');
    results.push('twenty keeps: one layer, no particle nodes left');
    // The round-end paper burst (SessionDone) and the global cap, through the module itself:
    // twenty pieces plus a second burst never exceed 24 alive, and all are gone after.
    await page.evaluate(() => { window.__peak = 0; });
    await page.evaluate(async () => { const m = await import('/src/particles.ts'); m.burst('done', { x: 195, y: 300 }, 'paper', 20); m.burst('stamp', { x: 195, y: 400 }, 'ink', 8); });
    await page.waitForTimeout(1800); s = await state(page);
    assert.ok(s.peak >= 10 && s.peak <= 24, `paper burst within the global budget (peak ${s.peak})`); assert.equal(s.live, 0);
    results.push(`paper burst + ink: peak ${s.peak} (cap 24), gone after`);
    assert.deepEqual(errors, []); await context.close();
  }
  {
    const { context, page, errors } = await open('no-preference');
    // In the grid the pile is hidden: a decision there emits nothing.
    const card = await page.locator('.photo-card.front').boundingBox(), x = card.x + card.width / 2, y = card.y + card.height / 2;
    const cdp = await context.newCDPSession(page); const touch = (type, d) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: x - d, y, id: 1 }, { x: x + d, y, id: 2 }] });
    await touch('touchStart', 100); for (let k = 1; k <= 8; k++) await touch('touchMove', 100 - 65 * k / 8); await touch('touchEnd', 35);
    await page.locator('.library-grid.cols-3').waitFor(); await page.waitForTimeout(900);
    await page.locator('.grid-tile').nth(4).click(); await page.evaluate(() => { window.__peak = 0; });
    await page.locator('.grid-dock').getByRole('button', { name: /^Conservar/ }).click(); await page.waitForTimeout(900);
    const s = await state(page); assert.equal(s.peak, 0, 'no particles over the grid');
    results.push('grid decision: no particles');
    assert.deepEqual(errors, []); await context.close();
  }
  {
    const { context, page, errors } = await open('reduce');
    await keep(page); await page.waitForTimeout(900);
    const s = await state(page); assert.equal(s.seen, 0, 'Reduce Motion: no particles at all');
    results.push('Reduce Motion: no particles');
    assert.deepEqual(errors, []); await context.close();
  }
  console.log('PASS ' + results.join('; '));
} catch (e) { console.log('FAIL motion flow', e.message); process.exitCode = 1; } finally { await browser.close(); }
