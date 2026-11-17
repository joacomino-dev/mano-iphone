// Production bundle + generated fixture media only. This exercises real touch
// dispatch and normal motion; it does not measure a physical iPhone/Android.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { installAppleFixture } from './apple-fixture.mjs';

const url = process.env.APPLE_AUDIT_URL || 'http://127.0.0.1:4191/native.html';
const browser = await chromium.launch(process.env.APPLE_BROWSER_EXECUTABLE
  ? { executablePath: process.env.APPLE_BROWSER_EXECUTABLE, headless: true }
  : { channel: process.env.APPLE_BROWSER_CHANNEL || 'msedge', headless: true });
const errors = [];
// The live grid only: during a density change the old layout is a decorative copy on top.
const LIVE_CURRENT = '.grid-scroller .grid-tile.is-current';
async function setup({ platform = 'ios', native = false, video = false, width = 390 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 932 }, hasTouch: true, deviceScaleFactor: 3, reducedMotion: 'no-preference' });
  await context.addInitScript(installAppleFixture, { video });
  await context.addInitScript(({ platform, native, video }) => {
    window.Capacitor.getPlatform = () => platform;
    window.Capacitor.isNativePlatform = () => true;
    if (!video) window.appleFixture.assets = Array.from({ length: 3000 }, (_, i) => ({ id: `fixture-${i}`, kind: 'photo', date: 1700000000000 - i * 3600000, width: 1000, height: 1500, duration: 0, hasLocation: false, demo: !native, bytes: 1000000 + i }));
    window.thumbCalls = []; window.preCacheCalls = [];
    const original = window.Capacitor.nativePromise;
    window.Capacitor.nativePromise = async (...args) => {
      if (args[1] === 'cacheThumbnails') window.preCacheCalls.push(args[2]);
      if (args[1] === 'thumbnail') { window.thumbCalls.push(args[2]); await new Promise(r => setTimeout(r, 20)); }
      return original(...args);
    };
  }, { platform, native, video });
  const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', e => errors.push(e.message));
  await page.goto(url); await page.locator('.photo-card.front').waitFor();
  await page.waitForFunction(() => !document.querySelector('.splash-lockup'));
  const cdp = await context.newCDPSession(page);
  const touch = async (type, x, y, d) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: x - d, y, id: 1 }, { x: x + d, y, id: 2 }] });
  const pinch = async (selector, from, to, wait = 550) => {
    const b = await page.locator(selector).boundingBox(), x = b.x + b.width / 2, y = b.y + b.height * .4;
    await touch('touchStart', x, y, from);
    for (let i = 1; i <= 8; i++) { await touch('touchMove', x, y, from + (to - from) * i / 8); await page.waitForTimeout(16); }
    await touch('touchEnd', x, y, to); if (wait) await page.waitForTimeout(wait);
  };
  return { context, page, touch, pinch };
}
try {
  for (const platform of ['ios', 'android']) {
    const { context, page, touch, pinch } = await setup({ platform });
    await pinch('.photo-card.front', 110, 40); await page.locator('.library-grid.cols-3').waitFor();
    const repeats = platform === 'ios' ? 20 : 5;
    // The photo under the fingers must survive every interrupted round trip (no drift; user 2026-11-16).
    const under = () => page.evaluate(() => { const r = document.querySelector('.grid-scroller').getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height * .4)?.closest('.grid-tile')?.dataset.id; });
    const anchored = await under();
    // The photo being reviewed is the fixed point of a density change (user 2026-11-17: «es vital
    // que la cuadrícula sea constante en su posición»): its centre keeps its height on screen.
    const working = () => page.evaluate(sel => { const b = document.querySelector(sel).getBoundingClientRect(); return b.top + b.height / 2; }, LIVE_CURRENT);
    // Measured once (the scroller never moves), so the interrupting fingers land right after the
    // release, while the ~215 ms finish is still running, even on a busy machine.
    const b = await page.locator('.grid-scroller').boundingBox(), x = b.x + b.width / 2, y = b.y + b.height * .4;
    for (let i = 0; i < repeats; i++) {
      await pinch('.grid-scroller', 110, 85, 20); // release before settling completes
      await touch('touchStart', x, y, 110); await touch('touchMove', x, y, 105);
      await page.waitForTimeout(60);
      const pose = await page.locator(LIVE_CURRENT).getAttribute('style');
      await page.waitForTimeout(300);
      assert.ok(await page.locator('.library-grid.cols-3').count(), 'old completion cannot change density while new fingers hold it');
      assert.equal(await page.locator(LIVE_CURRENT).getAttribute('style'), pose, 'stationary fingers retain the exact pose; no old loop writes over it');
      const before = await working();
      await touch('touchEnd', x, y, 105); await page.locator('.library-grid.cols-5').waitFor(); await page.waitForTimeout(150);
      { const after = await working(); assert.ok(Math.abs(after - before) < 2, `cycle ${i + 1}: the reviewed photo keeps its place at 5 columns (${before.toFixed(1)} → ${after.toFixed(1)})`); }
      assert.equal(await page.locator('.grid-canvas-ghost').count(), 0, 'the old layer is dropped once settled');
      await pinch('.grid-scroller', 55, 95); await page.locator('.library-grid.cols-3').waitFor();
      assert.equal(await under(), anchored, `round trip ${i + 1}: the same photo stays under the fingers`);
    }
    // Reverse density and continue all the way to the normal card in the same
    // two-finger gesture; interruptibility must preserve this existing route.
    const back = await page.locator('.grid-scroller').boundingBox(), bx = back.x + back.width / 2, by = back.y + back.height * .4;
    await touch('touchStart', bx, by, 100);
    for (let k = 1; k <= 8; k++) { await touch('touchMove', bx, by, 100 - 20 * k / 8); await page.waitForTimeout(16); }
    for (let k = 1; k <= 16; k++) { await touch('touchMove', bx, by, 80 + 95 * k / 16); await page.waitForTimeout(16); }
    await touch('touchEnd', bx, by, 175);
    await page.waitForFunction(() => !document.querySelector('.library-grid'));
    assert.ok(await page.locator('.photo-card.front').isVisible());
    console.log(`PASS ${platform}: ${repeats} interrupted 3↔5 cycles; stationary fingers stable; return to card`);
    await context.close();
  }
  {
    const { context, page, pinch } = await setup({ native: true, width: 430 });
    await page.waitForTimeout(300); await page.evaluate(() => window.thumbCalls = []);
    await pinch('.photo-card.front', 110, 40); await page.waitForTimeout(900);
    const visibleFirst = await page.evaluate(() => {
      const sc = document.querySelector('.grid-scroller'), r = sc.getBoundingClientRect();
      const visible = new Set([...sc.querySelectorAll('.grid-tile')].filter(e => { const b = e.getBoundingClientRect(); return b.bottom > r.top && b.top < r.bottom; }).map(e => e.dataset.id));
      window.loadedGridIds = window.thumbCalls.filter(c => c.size === 384).map(c => c.id);
      return visible.has(window.loadedGridIds[0]);
    });
    assert.ok(visibleFirst, 'first thumbnail belongs to a visible cell');
    await page.evaluate(() => { window.thumbCalls = []; window.preCacheCalls = []; }); await pinch('.grid-scroller', 110, 55); await page.waitForTimeout(900);
    const reuse = await page.evaluate(() => ({ total: window.thumbCalls.length, redundant: window.thumbCalls.filter(c => window.loadedGridIds.includes(c.id)), redundantPrecache: window.preCacheCalls.flatMap(c => c.ids).filter(id => window.loadedGridIds.includes(id)) }));
    assert.equal(reuse.redundant.length, 0, '384px local files are reused at 5 columns');
    assert.equal(reuse.redundantPrecache.length, 0, 'PhotoKit does not prepare the already-reused files again');
    assert.ok(reuse.total < 70, 'only newly mounted photos request files');
    console.log(`PASS thumbnails: visible first, no redundant downgrade, ${reuse.total} new requests`);
    await context.close();
  }
  {
    const { context, page, pinch } = await setup({ video: true });
    const video = page.locator('.photo-card.front video'); await video.waitFor();
    await page.waitForFunction(() => { const v = document.querySelector('video'); return v && !v.paused && v.currentTime > .05; });
    await pinch('.photo-card.front', 110, 40);
    assert.equal(await video.evaluate(v => v.paused), true, 'grid suspends hidden playback');
    const at = await video.evaluate(v => v.currentTime); await page.waitForTimeout(250);
    assert.equal(await video.evaluate(v => v.currentTime), at, 'hidden video does not advance');
    await page.getByTestId('grid-exit').click(); await page.waitForFunction(() => !document.querySelector('.library-grid'));
    await page.waitForFunction(() => !document.querySelector('video').paused);
    await page.locator('.photo-card.front').press('Enter'); assert.equal(await video.evaluate(v => v.paused), true);
    await pinch('.photo-card.front', 110, 40); await page.getByTestId('grid-exit').click();
    await page.waitForFunction(() => !document.querySelector('.library-grid'));
    assert.equal(await video.evaluate(v => v.paused), true, 'manual pause survives both transitions');
    console.log('PASS video: hidden playback suspended, resumes, manual pause retained');
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
