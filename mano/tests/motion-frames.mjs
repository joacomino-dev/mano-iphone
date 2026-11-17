// Frame-by-frame evidence of the motion pass (CW-CL-086): the page clock runs 10× slower while
// recording, so each screenshot lands ~40 ms of app time after the previous one. Synthetic
// fixture art only — never a personal library. Usage: node tests/motion-frames.mjs <out-dir>
// against the dev server (APPLE_AUDIT_URL, default 4186). Browser timing is not phone timing.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { installAppleFixture } from './apple-fixture.mjs';
const out = process.argv[2]; if (!out) throw new Error('usage: motion-frames.mjs <out-dir>'); mkdirSync(out, { recursive: true });
const url = process.env.APPLE_AUDIT_URL || 'http://127.0.0.1:4186/native.html';
const SLOW = 10, STEP = 40;
const browser = await chromium.launch({ channel: process.env.APPLE_BROWSER_CHANNEL || 'msedge', headless: true });
// App time = real time normally, real time / SLOW while recording (performance.now, rAF and
// timers); CSS and WAAPI animations follow through the DevTools Animation domain.
function slowClock(SLOW) {
  const realNow = performance.now.bind(performance), realRaf = requestAnimationFrame.bind(window), realSet = setTimeout.bind(window);
  let base = 0, at = 0, k = 1;
  const now = () => at + (realNow() - base) / k;
  window.__setSlow = on => { at = now(); base = realNow(); k = on ? SLOW : 1; };
  performance.now = now;
  window.requestAnimationFrame = cb => realRaf(() => cb(now()));
  window.setTimeout = (fn, ms = 0, ...a) => realSet(fn, ms * k, ...a);
}
async function setup() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  await context.addInitScript(installAppleFixture, {});
  await context.addInitScript(() => { window.Capacitor.getPlatform = () => 'ios'; window.Capacitor.isNativePlatform = () => true; window.appleFixture.assets = Array.from({ length: 240 }, (_, i) => ({ id: `fixture-${i}`, kind: 'photo', date: 1700000000000 - i * 3600000, width: 1000, height: 1500, duration: 0, hasLocation: false, demo: true, bytes: 1000000 + i })); });
  await context.addInitScript(slowClock, SLOW);
  const page = await context.newPage();
  await page.goto(url); await page.locator('.photo-card.front').waitFor(); await page.waitForFunction(() => !document.querySelector('.splash-lockup'));
  const cdp = await context.newCDPSession(page); await cdp.send('Animation.enable');
  const slow = async on => { await page.evaluate(v => window.__setSlow(v), on); await cdp.send('Animation.setPlaybackRate', { playbackRate: on ? 1 / SLOW : 1 }); };
  const touch = (type, x, y, d) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: x - d, y, id: 1 }, { x: x + d, y, id: 2 }] });
  return { context, page, slow, touch };
}
const shooter = (page, prefix, clipOf) => { let n = 0; return async label => { const clip = await clipOf(); await page.screenshot({ clip, path: `${out}/${prefix}-${String(n++).padStart(2, '0')}${label ? '-' + label : ''}.png` }); }; };
/** Records `frames` shots, one every STEP ms of app time, after `act` starts the effect. */
async function record(page, slow, shot, act, frames) {
  await slow(true); const t0 = Date.now(); await act();
  for (let i = 0; i < frames; i++) { const wait = t0 + i * STEP * SLOW - Date.now(); if (wait > 0) await page.waitForTimeout(wait); await shot(`${i * STEP}ms`); }
  await slow(false);
}
try {
  { // Decisions from the buttons: keep (ink), favourite (hearts), discard (dust), later (postmark).
    const { context, page, slow } = await setup();
    // The card's area, measured once: the front card is in flight while recording.
    const front = await page.locator('.photo-card.front').boundingBox(), area = { x: 0, y: Math.max(0, front.y - 40), width: 390, height: Math.min(560, front.height + 120) };
    const stage = async () => area;
    for (const [kind, name] of [['keep', /^Conservar/], ['favorite', /^Añadir a Favoritas/], ['discard', /^Eliminar/]]) {
      const button = page.locator('.decision-bar').first().getByRole('button', { name }).or(page.getByRole('button', { name })).first();
      await record(page, slow, shooter(page, `stamp-${kind}`, stage), () => button.click(), 14);
      await page.waitForTimeout(1200);
    }
    // «Más tarde» is a swipe down (no button): the postmark rocks, no particles.
    { const c = await page.locator('.photo-card.front').boundingBox(), x0 = c.x + c.width / 2, y0 = c.y + c.height / 2;
      await page.mouse.move(x0, y0); await page.mouse.down(); for (let k = 1; k <= 8; k++) await page.mouse.move(x0, y0 + 18 * k);
      await record(page, slow, shooter(page, 'stamp-later', stage), () => page.mouse.up(), 14); await page.waitForTimeout(1200); }
    // A drag arms the stamp: it drops in over the card.
    await page.locator('.photo-card.front').waitFor(); const b = await page.locator('.photo-card.front').boundingBox(), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    await page.mouse.move(cx, cy); await page.mouse.down(); for (let k = 1; k <= 3; k++) await page.mouse.move(cx + 12 * k, cy);
    await record(page, slow, shooter(page, 'drag-arm', stage), () => page.mouse.move(cx + 70, cy), 7);
    for (let k = 4; k >= 0; k--) await page.mouse.move(cx + 14 * k, cy); await page.mouse.up(); await page.waitForTimeout(500);
    // A sheet opens and closes the same way.
    const full = async () => ({ x: 0, y: 0, width: 390, height: 844 });
    await record(page, slow, shooter(page, 'sheet-open', full), () => page.getByRole('button', { name: /Filtros/ }).first().click(), 9);
    await page.waitForTimeout(400);
    await record(page, slow, shooter(page, 'sheet-close', full), () => page.getByRole('button', { name: 'Cerrar' }).first().click(), 7);
    await context.close();
  }
  { // Density 3 ↔ 5 held at fixed points of the gesture, then released.
    const { context, page, touch } = await setup();
    const b0 = await page.locator('.photo-card.front').boundingBox(), cx = b0.x + b0.width / 2, cy = b0.y + b0.height * .4;
    await touch('touchStart', cx, cy, 110); for (let i = 1; i <= 8; i++) { await touch('touchMove', cx, cy, 110 - 70 * i / 8); await page.waitForTimeout(16); } await touch('touchEnd', 0, 0, 0);
    await page.locator('.library-grid.cols-3').waitFor(); await page.waitForTimeout(900);
    const g = await page.locator('.grid-scroller').boundingBox(), x = g.x + g.width / 2, y = g.y + g.height * .55;
    const mark = () => page.evaluate(() => document.querySelectorAll('.grid-scroller .grid-tile.is-current').forEach(t => { t.style.outline = '3px solid #e33'; }));
    const shot = shooter(page, 'density', async () => { const r = await page.locator('.library-grid').boundingBox(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 560) }; });
    await mark(); await shot('3x3');
    await touch('touchStart', x, y, 120);
    for (const r of [.98, .9, .8, .7, .6]) { await touch('touchMove', x, y, 120 * r); await page.waitForTimeout(60); await mark(); await shot(`to5-spread${r}`); }
    await touch('touchEnd', x, y, 72); await page.waitForTimeout(500); await mark(); await shot('5x5');
    await touch('touchStart', x, y, 70);
    for (const r of [1.02, 1.15, 1.3, 1.45, 1.6]) { await touch('touchMove', x, y, 70 * r); await page.waitForTimeout(60); await mark(); await shot(`to3-spread${r}`); }
    await touch('touchEnd', x, y, 112); await page.waitForTimeout(500); await mark(); await shot('3x3-again');
    await context.close();
  }
  console.log(`PASS frames written to ${out}`);
} finally { await browser.close(); }
